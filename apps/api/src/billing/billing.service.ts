import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BillingService {
  constructor(private readonly db: PrismaService) {}

  async initialize(user: any, plan: string) {
    const org = await this.db.organization.findUnique({ where: { id: user.organizationId } });
    if (!org) throw new BadRequestException('Organization not found');

    const amountMap: Record<string, number> = {
      pro: 2900,
      business: 9900,
    };

    const amount = amountMap[plan];
    if (!amount) throw new BadRequestException('Invalid plan');

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
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      },
    );

    return response.data.data;
  }

  async verify(reference: string) {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      },
    );

    const data = response.data.data;

    if (data.status === 'success') {
      const { organizationId, plan } = data.metadata;

      await this.db.organization.update({
        where: { id: organizationId },
        data: { plan },
      });

      return { success: true };
    }

    return { success: false };
  }
}
