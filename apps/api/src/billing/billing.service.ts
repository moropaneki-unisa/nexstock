import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import axios from 'axios';
import { Plan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';

const PLAN_PRICES_KOBO: Record<string, number> = {
  pro: 2900_00,
  business: 9900_00,
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

  async initialize(user: CurrentUserPayload, plan: string) {
    const org = await this.db.organization.findUnique({
      where: { id: user.organizationId },
    });
    if (!org) throw new BadRequestException('Organization not found');

    const amount = PLAN_PRICES_KOBO[plan];
    if (!amount) throw new BadRequestException('Invalid plan');

    const key = this.requirePaystackKey();

    try {
      const response = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
          email: org.billingEmail || user.email,
          amount,
          metadata: {
            organizationId: org.id,
            plan,
          },
        },
        {
          headers: { Authorization: `Bearer ${key}` },
          timeout: PAYSTACK_TIMEOUT_MS,
        },
      );
      return response.data?.data;
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

    if (!data || data.status !== 'success') {
      return { success: false };
    }

    const metadata = data.metadata ?? {};
    const organizationId: string | undefined = metadata.organizationId;
    const plan: string | undefined = metadata.plan;

    if (!organizationId || organizationId !== user.organizationId) {
      throw new ForbiddenException('Reference does not belong to this organization');
    }
    if (!plan || !PLAN_PRICES_KOBO[plan]) {
      throw new BadRequestException('Invalid plan in payment metadata');
    }

    await this.db.organization.update({
      where: { id: organizationId },
      data: { plan: plan as Plan },
    });

    return { success: true, plan };
  }
}
