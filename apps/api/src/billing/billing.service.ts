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
const PADDLE_TIMEOUT_MS = 10_000;

type PaidPlan = 'starter' | 'growth';

type PaddleWebhookPayload = {
  event_id?: string;
  event_type?: string;
  data?: any;
};

const PLAN_CONFIG: Record<PaidPlan, { amount: number; envKey: string }> = {
  starter: { amount: 19_00, envKey: 'PADDLE_STARTER_PRICE_ID' },
  growth: { amount: 59_00, envKey: 'PADDLE_GROWTH_PRICE_ID' },
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(private readonly db: PrismaService) {}

  private get apiBaseUrl() {
    return process.env.PADDLE_ENVIRONMENT === 'sandbox'
      ? 'https://sandbox-api.paddle.com'
      : 'https://api.paddle.com';
  }

  private requirePaddleApiKey() {
    const key = process.env.PADDLE_API_KEY;
    if (!key) {
      throw new InternalServerErrorException('Billing is not configured. Add PADDLE_API_KEY to the API environment.');
    }
    return key;
  }

  private requirePaddlePriceId(plan: PaidPlan) {
    const priceId = process.env[PLAN_CONFIG[plan].envKey];
    if (!priceId) {
      throw new InternalServerErrorException(`Billing is not configured. Add ${PLAN_CONFIG[plan].envKey} to the API environment.`);
    }
    if (!priceId.startsWith('pri_')) {
      throw new InternalServerErrorException(`${PLAN_CONFIG[plan].envKey} must be a Paddle price ID that starts with pri_.`);
    }
    return priceId;
  }

  private getPaidPlan(plan: string): PaidPlan {
    const normalizedPlan = plan === 'pro' ? 'starter' : plan === 'business' ? 'growth' : plan;
    if (normalizedPlan !== 'starter' && normalizedPlan !== 'growth') {
      throw new BadRequestException('Invalid plan');
    }
    return normalizedPlan;
  }

  private getPaddleErrorMessage(error: unknown) {
    if (!axios.isAxiosError(error)) return (error as Error)?.message || 'Unknown Paddle error';
    const status = error.response?.status;
    const data: any = error.response?.data;
    const responseMessage = data?.error?.detail || data?.error?.message || data?.message || data?.error || error.message;
    return status ? `Paddle ${status}: ${responseMessage}` : responseMessage;
  }

  private throwPaddleCheckoutError(error: unknown): never {
    const message = this.getPaddleErrorMessage(error);
    this.logger.error('Paddle transaction create failed', message);

    if (axios.isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)) {
      throw new ServiceUnavailableException(`Paddle rejected checkout. Check PADDLE_API_KEY and Paddle environment. ${message}`);
    }

    throw new InternalServerErrorException(`Could not start Paddle checkout. ${message}`);
  }

  private frontendUrl(path = '') {
    const base = process.env.FRONTEND_URL || 'https://nexstock.co.za';
    return `${base.replace(/\/$/, '')}${path}`;
  }

  async initialize(user: CurrentUserPayload, planValue: string) {
    const plan = this.getPaidPlan(planValue);
    const org = await this.db.organization.findUnique({ where: { id: user.organizationId } });
    if (!org) throw new BadRequestException('Organization not found');

    const priceId = this.requirePaddlePriceId(plan);
    const apiKey = this.requirePaddleApiKey();
    const amount = PLAN_CONFIG[plan].amount;

    try {
      const response = await axios.post(
        `${this.apiBaseUrl}/transactions`,
        {
          items: [{ price_id: priceId, quantity: 1 }],
          collection_mode: 'automatic',
          custom_data: {
            organizationId: org.id,
            userId: user.sub,
            plan,
            billingCurrency: BILLING_CURRENCY,
          },
          checkout: {
            url: this.frontendUrl('/billing/checkout'),
          },
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: PADDLE_TIMEOUT_MS,
        },
      );

      const transaction = response.data?.data;
      const transactionId = transaction?.id;
      const checkoutUrl = transaction?.checkout?.url;

      if (!transactionId || !checkoutUrl) {
        throw new InternalServerErrorException('Paddle did not return a checkout URL. Confirm default payment link/domain approval in Paddle.');
      }

      await this.db.payment.upsert({
        where: { reference: transactionId },
        create: {
          organizationId: org.id,
          provider: PaymentProvider.paddle,
          status: PaymentStatus.pending,
          plan: plan as Plan,
          amount,
          currency: BILLING_CURRENCY,
          reference: transactionId,
          authorizationUrl: checkoutUrl,
          payload: transaction,
        },
        update: {
          provider: PaymentProvider.paddle,
          status: PaymentStatus.pending,
          amount,
          currency: BILLING_CURRENCY,
          authorizationUrl: checkoutUrl,
          payload: transaction,
        },
      });

      return {
        authorization_url: checkoutUrl,
        checkout_url: checkoutUrl,
        reference: transactionId,
        provider: 'paddle',
      };
    } catch (error) {
      this.throwPaddleCheckoutError(error);
    }
  }

  async verify(user: CurrentUserPayload, reference: string) {
    const apiKey = this.requirePaddleApiKey();

    let transaction: any;
    try {
      const response = await axios.get(`${this.apiBaseUrl}/transactions/${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: PADDLE_TIMEOUT_MS,
      });
      transaction = response.data?.data;
    } catch (error) {
      const message = this.getPaddleErrorMessage(error);
      this.logger.error('Paddle transaction verify failed', message);
      throw new InternalServerErrorException(`Could not verify payment. ${message}`);
    }

    const customData = transaction?.custom_data ?? {};
    const organizationId: string | undefined = customData.organizationId;
    const planValue: string | undefined = customData.plan;

    if (!organizationId || organizationId !== user.organizationId) {
      throw new ForbiddenException('Reference does not belong to this organization');
    }

    const plan = this.getPaidPlan(planValue ?? '');
    const amount = PLAN_CONFIG[plan].amount;
    const isPaid = transaction?.status === 'completed' || transaction?.payments?.some((payment: any) => payment.status === 'captured');

    if (!isPaid) {
      await this.db.payment.updateMany({
        where: { reference, organizationId: user.organizationId },
        data: { status: PaymentStatus.pending, payload: transaction ?? {} },
      });
      return { success: false, status: transaction?.status ?? 'pending' };
    }

    await this.markPaymentSuccess({ organizationId, reference, plan, amount, payload: transaction });
    return { success: true, plan };
  }

  verifyPaddleSignature(rawBody: Buffer | string | undefined, signatureHeader?: string) {
    const secret = process.env.PADDLE_WEBHOOK_SECRET;
    if (!secret) throw new InternalServerErrorException('PADDLE_WEBHOOK_SECRET is not configured.');
    if (!rawBody || !signatureHeader) throw new BadRequestException('Missing Paddle webhook signature.');

    const raw = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
    const parts = Object.fromEntries(signatureHeader.split(';').map((part) => {
      const [key, ...value] = part.split('=');
      return [key, value.join('=')];
    }));

    const timestamp = parts.ts;
    const signature = parts.h1;
    if (!timestamp || !signature) throw new BadRequestException('Invalid Paddle webhook signature header.');

    const signedPayload = `${timestamp}:${raw}`;
    const expected = createHmac('sha256', secret).update(signedPayload).digest('hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    const signatureBuffer = Buffer.from(signature, 'hex');

    if (expectedBuffer.length !== signatureBuffer.length || !timingSafeEqual(expectedBuffer, signatureBuffer)) {
      throw new ForbiddenException('Invalid Paddle webhook signature.');
    }
  }

  async handleWebhook(payload: PaddleWebhookPayload) {
    const eventType = payload.event_type;
    const data = payload.data ?? {};

    if (!eventType) return { ok: true, ignored: true };

    if (eventType === 'transaction.completed' || eventType === 'transaction.paid') {
      await this.handlePaidTransaction(data);
      return { ok: true };
    }

    if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
      await this.handleSubscriptionChange(data);
      return { ok: true };
    }

    if (eventType === 'subscription.canceled' || eventType === 'subscription.paused') {
      await this.handleSubscriptionInactive(data);
      return { ok: true };
    }

    return { ok: true, ignored: true };
  }

  private async handlePaidTransaction(transaction: any) {
    const customData = transaction?.custom_data ?? {};
    const organizationId = customData.organizationId;
    const planValue = customData.plan;
    if (!organizationId || !planValue) return;

    const plan = this.getPaidPlan(planValue);
    await this.markPaymentSuccess({
      organizationId,
      reference: transaction.id,
      plan,
      amount: PLAN_CONFIG[plan].amount,
      payload: transaction,
    });
  }

  private async handleSubscriptionChange(subscription: any) {
    const customData = subscription?.custom_data ?? {};
    const organizationId = customData.organizationId;
    const planValue = customData.plan;
    if (!organizationId || !planValue) return;

    const plan = this.getPaidPlan(planValue);
    await this.db.organization.update({
      where: { id: organizationId },
      data: { plan: plan as Plan },
    });
  }

  private async handleSubscriptionInactive(subscription: any) {
    const customData = subscription?.custom_data ?? {};
    const organizationId = customData.organizationId;
    if (!organizationId) return;

    await this.db.organization.update({
      where: { id: organizationId },
      data: { plan: Plan.free },
    });
  }

  private async markPaymentSuccess({ organizationId, reference, plan, amount, payload }: { organizationId: string; reference: string; plan: PaidPlan; amount: number; payload: any }) {
    await this.db.$transaction([
      this.db.organization.update({ where: { id: organizationId }, data: { plan: plan as Plan } }),
      this.db.payment.upsert({
        where: { reference },
        create: {
          organizationId,
          provider: PaymentProvider.paddle,
          status: PaymentStatus.success,
          plan: plan as Plan,
          amount,
          currency: BILLING_CURRENCY,
          reference,
          paidAt: new Date(),
          payload,
        },
        update: {
          provider: PaymentProvider.paddle,
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
