import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import axios from 'axios';
import { createHmac, timingSafeEqual } from 'crypto';
import { PaymentProvider, PaymentStatus, Plan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';

const BILLING_CURRENCY = 'USD';
const LEMON_API_BASE_URL = 'https://api.lemonsqueezy.com/v1';
const LEMON_TIMEOUT_MS = 10_000;

type PaidPlan = 'starter' | 'growth';

type LemonWebhookPayload = {
  meta?: {
    event_name?: string;
    custom_data?: Record<string, any>;
  };
  data?: {
    id?: string;
    type?: string;
    attributes?: Record<string, any>;
  };
};

const PLAN_CONFIG: Record<PaidPlan, { amount: number; variantEnvKey: string; name: string }> = {
  starter: { amount: 19_00, variantEnvKey: 'LEMON_STARTER_VARIANT_ID', name: 'Starter' },
  growth: { amount: 59_00, variantEnvKey: 'LEMON_GROWTH_VARIANT_ID', name: 'Growth' },
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(private readonly db: PrismaService) {}

  private requireLemonApiKey() {
    const key = process.env.LEMON_SQUEEZY_API_KEY;
    if (!key) {
      throw new InternalServerErrorException('Billing is not configured. Add LEMON_SQUEEZY_API_KEY to the API environment.');
    }
    return key;
  }

  private requireLemonStoreId() {
    const storeId = process.env.LEMON_SQUEEZY_STORE_ID;
    if (!storeId) {
      throw new InternalServerErrorException('Billing is not configured. Add LEMON_SQUEEZY_STORE_ID to the API environment.');
    }
    return storeId;
  }

  private requireLemonVariantId(plan: PaidPlan) {
    const variantId = process.env[PLAN_CONFIG[plan].variantEnvKey];
    if (!variantId) {
      throw new InternalServerErrorException(`Billing is not configured. Add ${PLAN_CONFIG[plan].variantEnvKey} to the API environment.`);
    }
    return variantId;
  }

  private getPaidPlan(plan: string): PaidPlan {
    const normalizedPlan = plan === 'pro' ? 'starter' : plan === 'business' ? 'growth' : plan;
    if (normalizedPlan !== 'starter' && normalizedPlan !== 'growth') {
      throw new BadRequestException('Invalid plan');
    }
    return normalizedPlan;
  }

  private frontendUrl(path = '') {
    const base = process.env.FRONTEND_URL || 'https://nexstock.co.za';
    return `${base.replace(/\/$/, '')}${path}`;
  }

  private getLemonErrorMessage(error: unknown) {
    if (!axios.isAxiosError(error)) return (error as Error)?.message || 'Unknown Lemon Squeezy error';
    const status = error.response?.status;
    const data: any = error.response?.data;
    const firstError = Array.isArray(data?.errors) ? data.errors[0] : undefined;
    const responseMessage = firstError?.detail || firstError?.title || data?.message || data?.error || error.message;
    return status ? `Lemon Squeezy ${status}: ${responseMessage}` : responseMessage;
  }

  private throwLemonCheckoutError(error: unknown): never {
    const message = this.getLemonErrorMessage(error);
    this.logger.error('Lemon Squeezy checkout create failed', message);

    if (axios.isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)) {
      throw new ServiceUnavailableException(`Lemon Squeezy rejected checkout. Check LEMON_SQUEEZY_API_KEY and store/variant IDs. ${message}`);
    }

    throw new InternalServerErrorException(`Could not start Lemon Squeezy checkout. ${message}`);
  }

  async initialize(user: CurrentUserPayload, planValue: string) {
    const plan = this.getPaidPlan(planValue);
    const org = await this.db.organization.findUnique({ where: { id: user.organizationId } });
    if (!org) throw new BadRequestException('Organization not found');

    const apiKey = this.requireLemonApiKey();
    const storeId = this.requireLemonStoreId();
    const variantId = this.requireLemonVariantId(plan);
    const amount = PLAN_CONFIG[plan].amount;

    try {
      const response = await axios.post(
        `${LEMON_API_BASE_URL}/checkouts`,
        {
          data: {
            type: 'checkouts',
            attributes: {
              checkout_options: {
                embed: false,
                media: false,
                logo: true,
              },
              checkout_data: {
                email: user.email,
                name: user.name,
                custom: {
                  organizationId: org.id,
                  userId: user.id,
                  plan,
                  billingCurrency: BILLING_CURRENCY,
                },
              },
              product_options: {
                name: `NexStock ${PLAN_CONFIG[plan].name}`,
                description: `${PLAN_CONFIG[plan].name} subscription for NexStock`,
                redirect_url: this.frontendUrl('/billing/success'),
                receipt_button_text: 'Return to NexStock',
                receipt_link_url: this.frontendUrl('/organization'),
              },
              expires_at: null,
              preview: false,
            },
            relationships: {
              store: { data: { type: 'stores', id: String(storeId) } },
              variant: { data: { type: 'variants', id: String(variantId) } },
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json',
          },
          timeout: LEMON_TIMEOUT_MS,
        },
      );

      const checkout = response.data?.data;
      const checkoutId = checkout?.id;
      const checkoutUrl = checkout?.attributes?.url;
      if (!checkoutId || !checkoutUrl) {
        throw new InternalServerErrorException('Lemon Squeezy did not return a checkout URL. Confirm store and variant IDs.');
      }

      await this.db.payment.upsert({
        where: { reference: checkoutId },
        create: {
          organizationId: org.id,
          provider: PaymentProvider.lemon_squeezy,
          status: PaymentStatus.pending,
          plan: plan as Plan,
          amount,
          currency: BILLING_CURRENCY,
          reference: checkoutId,
          authorizationUrl: checkoutUrl,
          payload: checkout,
        },
        update: {
          provider: PaymentProvider.lemon_squeezy,
          status: PaymentStatus.pending,
          amount,
          currency: BILLING_CURRENCY,
          authorizationUrl: checkoutUrl,
          payload: checkout,
        },
      });

      return {
        authorization_url: checkoutUrl,
        checkout_url: checkoutUrl,
        reference: checkoutId,
        provider: 'lemon_squeezy',
      };
    } catch (error) {
      this.throwLemonCheckoutError(error);
    }
  }

  async verify(user: CurrentUserPayload, reference: string) {
    const payment = await this.db.payment.findFirst({ where: { reference, organizationId: user.organizationId } });
    if (!payment) throw new ForbiddenException('Reference does not belong to this organization');

    if (payment.status === PaymentStatus.success) {
      return { success: true, plan: payment.plan };
    }

    return { success: false, status: payment.status };
  }

  verifyLemonSignature(rawBody: Buffer | string | undefined, signatureHeader?: string) {
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
    if (!secret) throw new InternalServerErrorException('LEMON_SQUEEZY_WEBHOOK_SECRET is not configured.');
    if (!rawBody || !signatureHeader) throw new BadRequestException('Missing Lemon Squeezy webhook signature.');

    const raw = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf8');
    const expected = createHmac('sha256', secret).update(raw).digest('hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    const signatureBuffer = Buffer.from(signatureHeader, 'hex');

    if (expectedBuffer.length !== signatureBuffer.length || !timingSafeEqual(expectedBuffer, signatureBuffer)) {
      throw new ForbiddenException('Invalid Lemon Squeezy webhook signature.');
    }
  }

  async handleWebhook(payload: LemonWebhookPayload) {
    const eventName = payload.meta?.event_name;
    if (!eventName) return { ok: true, ignored: true };

    if (eventName === 'subscription_created' || eventName === 'subscription_updated' || eventName === 'order_created') {
      await this.handleLemonPaidEvent(payload);
      return { ok: true };
    }

    if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired' || eventName === 'subscription_paused') {
      await this.handleLemonInactiveEvent(payload);
      return { ok: true };
    }

    return { ok: true, ignored: true };
  }

  private getCustomData(payload: LemonWebhookPayload) {
    const metaCustom = payload.meta?.custom_data ?? {};
    const attributesCustom = payload.data?.attributes?.custom_data ?? payload.data?.attributes?.custom ?? {};
    return { ...attributesCustom, ...metaCustom };
  }

  private async handleLemonPaidEvent(payload: LemonWebhookPayload) {
    const customData = this.getCustomData(payload);
    const organizationId = customData.organizationId;
    const planValue = customData.plan;
    if (!organizationId || !planValue) return;

    const plan = this.getPaidPlan(planValue);
    const dataId = payload.data?.id;
    const attributes = payload.data?.attributes ?? {};
    const reference = String(attributes.checkout_id || attributes.order_id || attributes.subscription_id || dataId || `${organizationId}-${plan}`);

    await this.markPaymentSuccess({
      organizationId,
      reference,
      plan,
      amount: PLAN_CONFIG[plan].amount,
      payload,
    });
  }

  private async handleLemonInactiveEvent(payload: LemonWebhookPayload) {
    const customData = this.getCustomData(payload);
    const organizationId = customData.organizationId;
    if (!organizationId) return;

    await this.db.organization.update({ where: { id: organizationId }, data: { plan: Plan.free } });
  }

  private async markPaymentSuccess({ organizationId, reference, plan, amount, payload }: { organizationId: string; reference: string; plan: PaidPlan; amount: number; payload: any }) {
    await this.db.$transaction([
      this.db.organization.update({ where: { id: organizationId }, data: { plan: plan as Plan } }),
      this.db.payment.upsert({
        where: { reference },
        create: {
          organizationId,
          provider: PaymentProvider.lemon_squeezy,
          status: PaymentStatus.success,
          plan: plan as Plan,
          amount,
          currency: BILLING_CURRENCY,
          reference,
          paidAt: new Date(),
          payload,
        },
        update: {
          provider: PaymentProvider.lemon_squeezy,
          status: PaymentStatus.success,
          plan: plan as Plan,
          amount,
          currency: BILLING_CURRENCY,
          paidAt: new Date(),
          payload,
        },
      }),
    ]);
  }
}
