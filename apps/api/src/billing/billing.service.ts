import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import axios from 'axios';
import { PaymentStatus, Plan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';

const BILLING_CURRENCY = 'USD';

const PLAN_PRICES_CENTS: Record<'starter' | 'growth', number> = {
  starter: 19_00,
  growth: 59_00,
};

const PAYSTACK_TIMEOUT_MS = 10_000;

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(private readonly db: PrismaService) {}

  private requirePaystackKey() {
    const key = process.env.PAYSTACK_SECRET_KEY;
    if (!key) {
      this.logger.error('PAYSTACK_SECRET_KEY is not configured');
      throw new InternalServerErrorException('Billing is not configured');
    }
    return key;
  }

  private getPaidPlan(plan: string): 'starter' | 'growth' {
    const normalizedPlan = plan === 'pro' ? 'starter' : plan === 'business' ? 'growth' : plan;
    if (normalizedPlan !== 'starter' && normalizedPlan !== 'growth') {
      throw new BadRequestException('Invalid plan');
    }
    return normalizedPlan;
  }

  async initialize(user: CurrentUserPayload, planValue: string) {
    const plan = this.getPaidPlan(planValue);
    const org = await this.db.organization.findUnique({
      where: { id: user.organizationId },
    });
    if (!org) throw new BadRequestException('Organization not found');

    const amount = PLAN_PRICES_CENTS[plan];
    const key = this.requirePaystackKey();

    try {
      const response = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
          email: org.billingEmail || user.email,
          amount,
          currency: BILLING_CURRENCY,
          metadata: {
            organizationId: org.id,
            plan,
            billingCurrency: BILLING_CURRENCY,
          },
        },
        {
          headers: { Authorization: `Bearer ${key}` },
          timeout: PAYSTACK_TIMEOUT_MS,
        },
      );

      const checkout = response.data?.data;

      if (checkout?.reference) {
        await this.db.payment.upsert({
          where: { reference: checkout.reference },
          create: {
            organizationId: org.id,
            provider: 'paystack',
            status: PaymentStatus.pending,
            plan: plan as Plan,
            amount,
            currency: BILLING_CURRENCY,
            reference: checkout.reference,
            authorizationUrl: checkout.authorization_url,
            payload: checkout,
          },
          update: {
            status: PaymentStatus.pending,
            amount,
            currency: BILLING_CURRENCY,
            authorizationUrl: checkout.authorization_url,
            payload: checkout,
          },
        });
      }

      return checkout;
    } catch (error) {
      this.logger.error('Paystack initialize failed', (error as Error).message);
      throw new InternalServerErrorException('Could not start checkout');
    }
  }

  async verify(user: CurrentUserPayload, reference: string) {
    const key = this.requirePaystackKey();

    let data: any;
    try {
      const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        {
          headers: { Authorization: `Bearer ${key}` },
          timeout: PAYSTACK_TIMEOUT_MS,
        },
      );
      data = response.data?.data;
    } catch (error) {
      this.logger.error('Paystack verify failed', (error as Error).message);
      throw new InternalServerErrorException('Could not verify payment');
    }

    const metadata = data?.metadata ?? {};
    const organizationId: string | undefined = metadata.organizationId;
    const planValue: string | undefined = metadata.plan;

    if (!organizationId || organizationId !== user.organizationId) {
      throw new ForbiddenException('Reference does not belong to this organization');
    }

    const plan = this.getPaidPlan(planValue ?? '');
    const amount = PLAN_PRICES_CENTS[plan];

    if (!data || data.status !== 'success') {
      await this.db.payment.updateMany({
        where: { reference, organizationId: user.organizationId },
        data: {
          status: PaymentStatus.failed,
          payload: data ?? {},
        },
      });
      return { success: false };
    }

    await this.db.$transaction([
      this.db.organization.update({
        where: { id: organizationId },
        data: { plan: plan as Plan },
      }),
      this.db.payment.upsert({
        where: { reference },
        create: {
          organizationId,
          provider: 'paystack',
          status: PaymentStatus.success,
          plan: plan as Plan,
          amount,
          currency: BILLING_CURRENCY,
          reference,
          paidAt: new Date(),
          payload: data,
        },
        update: {
          status: PaymentStatus.success,
          plan: plan as Plan,
          amount,
          currency: BILLING_CURRENCY,
          paidAt: new Date(),
          payload: data,
        },
      }),
    ]);

    return { success: true, plan };
  }
}
