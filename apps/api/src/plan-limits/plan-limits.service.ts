import { BadRequestException, Injectable } from '@nestjs/common';
import { Plan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type PlanLimitKey =
  | 'products'
  | 'customFields'
  | 'apiKeys'
  | 'webhooks'
  | 'members'
  | 'enabledCurrencies'
  | 'importRows';

export type PlanLimits = Record<PlanLimitKey, number>;

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    products: 50,
    customFields: 5,
    apiKeys: 1,
    webhooks: 0,
    members: 1,
    enabledCurrencies: 2,
    importRows: 100,
  },
  starter: {
    products: 1_000,
    customFields: 30,
    apiKeys: 3,
    webhooks: 2,
    members: 3,
    enabledCurrencies: 5,
    importRows: 1_000,
  },
  growth: {
    products: 10_000,
    customFields: 100,
    apiKeys: 10,
    webhooks: 10,
    members: 10,
    enabledCurrencies: 20,
    importRows: 10_000,
  },
  business: {
    products: 100_000,
    customFields: 250,
    apiKeys: 50,
    webhooks: 50,
    members: 100,
    enabledCurrencies: 50,
    importRows: 50_000,
  },
};

const LIMIT_LABELS: Record<PlanLimitKey, string> = {
  products: 'products',
  customFields: 'layout fields',
  apiKeys: 'API keys',
  webhooks: 'webhooks',
  members: 'team members',
  enabledCurrencies: 'enabled currencies',
  importRows: 'import rows',
};

@Injectable()
export class PlanLimitsService {
  constructor(private readonly prisma: PrismaService) {}

  getLimits(plan: Plan | string | null | undefined): PlanLimits {
    const normalizedPlan = this.normalizePlan(plan);
    return PLAN_LIMITS[normalizedPlan];
  }

  async getOrganizationPlan(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { plan: true },
    });
    return org?.plan ?? Plan.free;
  }

  async assertWithinLimit(organizationId: string, key: PlanLimitKey, nextCount: number) {
    const plan = await this.getOrganizationPlan(organizationId);
    const limit = this.getLimits(plan)[key];
    if (nextCount > limit) {
      throw new BadRequestException(
        `Your ${this.planLabel(plan)} plan allows up to ${limit} ${LIMIT_LABELS[key]}. Upgrade your plan to continue.`,
      );
    }
  }

  async assertCanCreateProduct(organizationId: string, increment = 1) {
    const count = await this.prisma.product.count({ where: { organizationId, deletedAt: null } });
    await this.assertWithinLimit(organizationId, 'products', count + increment);
  }

  async assertCanCreateCustomField(organizationId: string) {
    await this.assertCanCreateLayoutField(organizationId);
  }

  async assertCanCreateLayoutField(organizationId: string) {
    const count = await this.countLayoutFields(organizationId);
    await this.assertWithinLimit(organizationId, 'customFields', count + 1);
  }

  async assertCanCreateApiKey(organizationId: string) {
    const count = await this.prisma.apiKey.count({ where: { organizationId, revokedAt: null } });
    await this.assertWithinLimit(organizationId, 'apiKeys', count + 1);
  }

  async assertCanCreateWebhook(organizationId: string) {
    const count = await this.prisma.webhook.count({ where: { organizationId, isActive: true } });
    await this.assertWithinLimit(organizationId, 'webhooks', count + 1);
  }

  async assertCanInviteMember(organizationId: string) {
    const count = await this.prisma.membership.count({ where: { organizationId } });
    await this.assertWithinLimit(organizationId, 'members', count + 1);
  }

  async assertCanEnableCurrencies(organizationId: string, nextCurrencyCount: number) {
    await this.assertWithinLimit(organizationId, 'enabledCurrencies', nextCurrencyCount);
  }

  async assertCanImportRows(organizationId: string, rowCount: number) {
    await this.assertWithinLimit(organizationId, 'importRows', rowCount);
  }

  async getUsage(organizationId: string) {
    const [organization, products, customFields, apiKeys, webhooks, members] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id: organizationId }, select: { plan: true, enabledCurrencies: true } }),
      this.prisma.product.count({ where: { organizationId, deletedAt: null } }),
      this.countLayoutFields(organizationId),
      this.prisma.apiKey.count({ where: { organizationId, revokedAt: null } }),
      this.prisma.webhook.count({ where: { organizationId, isActive: true } }),
      this.prisma.membership.count({ where: { organizationId } }),
    ]);

    const plan = organization?.plan ?? Plan.free;
    const limits = this.getLimits(plan);

    return {
      plan,
      limits,
      usage: {
        products,
        customFields,
        apiKeys,
        webhooks,
        members,
        enabledCurrencies: organization?.enabledCurrencies?.length ?? 1,
        importRows: 0,
      },
    };
  }

  private async countLayoutFields(organizationId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "ProductTypeField"
      WHERE "organizationId" = ${organizationId} AND "isActive" = true
    `;
    return Number(rows[0]?.count ?? 0);
  }

  private normalizePlan(plan: Plan | string | null | undefined): Plan {
    if (plan === 'starter' || plan === Plan.starter) return Plan.starter;
    if (plan === 'growth' || plan === Plan.growth) return Plan.growth;
    if (plan === 'business' || plan === Plan.business) return Plan.business;
    return Plan.free;
  }

  private planLabel(plan: Plan) {
    return plan.charAt(0).toUpperCase() + plan.slice(1);
  }
}
