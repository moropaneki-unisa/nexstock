import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Plan, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';

function requireAdmin(user: CurrentUserPayload) {
  if (user.role !== 'admin') {
    throw new ForbiddenException('Admin role required');
  }
}

const roleDefinitions: Record<UserRole, { description: string; permissions: string[] }> = {
  admin: {
    description: 'Full organization administration access.',
    permissions: ['Manage organization', 'Manage users', 'Manage products', 'Manage integrations', 'Manage API keys', 'Manage webhooks'],
  },
  member: {
    description: 'Operational access for product and inventory work.',
    permissions: ['Manage products', 'Run imports', 'Run syncs', 'View dashboard'],
  },
};

@Injectable()
export class OrganizationService {
  constructor(private readonly db: PrismaService) {}

  async getOrganization(user: CurrentUserPayload) {
    const org = await this.db.organization.findUnique({
      where: { id: user.organizationId },
      include: {
        memberships: { include: { user: true }, orderBy: { createdAt: 'asc' } },
        apiKeys: true,
        webhooks: true,
        integrations: true,
      },
    });

    if (!org) throw new NotFoundException('Organization not found');

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      industry: org.industry,
      onboardingComplete: org.onboardingComplete,
      skuPrefix: org.skuPrefix,
      nextSkuNumber: org.nextSkuNumber,
      stats: {
        members: org.memberships.length,
        apiKeys: org.apiKeys.filter((key) => !key.revokedAt).length,
        webhooks: org.webhooks.filter((webhook) => webhook.isActive).length,
        integrations: org.integrations.length,
      },
      members: org.memberships.map((m) => ({
        id: m.user.id,
        membershipId: m.id,
        email: m.user.email,
        name: m.user.name,
        role: m.role,
        status: m.user.passwordHash === 'temporary' ? 'invited' : 'active',
        joinedAt: m.createdAt,
      })),
      roles: Object.entries(roleDefinitions).map(([name, definition]) => ({ name, ...definition })),
      security: {
        strongApiKeys: true,
        webhookSigning: org.webhooks.some((webhook) => Boolean(webhook.secret)),
        twoFactor: false,
        auditLog: false,
      },
      plans: [
        { name: 'free', price: 0, current: org.plan === 'free', description: 'Basic product management.' },
        { name: 'pro', price: 29, current: org.plan === 'pro', description: 'Integrations, APIs, webhooks, and team access.' },
        { name: 'business', price: 99, current: org.plan === 'business', description: 'Advanced controls, limits, audit logs, and priority support.' },
      ],
    };
  }

  async updateOrganization(user: CurrentUserPayload, dto: { name?: string; slug?: string; skuPrefix?: string; industry?: string; onboardingComplete?: boolean }) {
    requireAdmin(user);
    const data: { name?: string; slug?: string; skuPrefix?: string | null; industry?: string | null; onboardingComplete?: boolean } = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('Organization name is required');
      data.name = name;
    }
    if (dto.slug !== undefined) {
      const slug = dto.slug.trim().toLowerCase();
      if (!slug) throw new BadRequestException('Workspace slug is required');
      data.slug = slug;
    }
    if (dto.skuPrefix !== undefined) data.skuPrefix = dto.skuPrefix?.trim().toUpperCase() || null;
    if (dto.industry !== undefined) data.industry = dto.industry?.trim() || null;
    if (dto.onboardingComplete !== undefined) data.onboardingComplete = dto.onboardingComplete;
    return this.db.organization.update({ where: { id: user.organizationId }, data });
  }

  async inviteUser(user: CurrentUserPayload, emailInput: string, roleInput: string) {
    requireAdmin(user);
    const email = emailInput?.toLowerCase().trim();
    if (!email) throw new BadRequestException('Email is required');
    const role = this.normalizeRole(roleInput);
    const existing = await this.db.user.findUnique({ where: { email } });

    if (!existing) {
      const newUser = await this.db.user.create({ data: { email, passwordHash: 'temporary', name: email.split('@')[0] } });
      await this.db.membership.create({ data: { userId: newUser.id, organizationId: user.organizationId, role } });
      return { message: 'User invited', userId: newUser.id };
    }

    const membership = await this.db.membership.findUnique({
      where: { userId_organizationId: { userId: existing.id, organizationId: user.organizationId } },
    });
    if (membership) throw new BadRequestException('User is already a member of this organization');

    await this.db.membership.create({ data: { userId: existing.id, organizationId: user.organizationId, role } });
    return { message: 'User added to organization', userId: existing.id };
  }

  async updateMemberRole(user: CurrentUserPayload, memberId: string, roleInput: string) {
    requireAdmin(user);
    if (memberId === user.id) {
      throw new BadRequestException('You cannot change your own role');
    }
    const role = this.normalizeRole(roleInput);
    const membership = await this.db.membership.findFirst({ where: { userId: memberId, organizationId: user.organizationId } });
    if (!membership) throw new NotFoundException('Member not found');
    return this.db.membership.update({ where: { id: membership.id }, data: { role } });
  }

  async removeMember(user: CurrentUserPayload, memberId: string) {
    requireAdmin(user);
    if (memberId === user.id) {
      throw new BadRequestException('You cannot remove yourself from the organization');
    }
    const membership = await this.db.membership.findFirst({ where: { userId: memberId, organizationId: user.organizationId } });
    if (!membership) throw new NotFoundException('Member not found');
    await this.db.membership.delete({ where: { id: membership.id } });
    return { ok: true };
  }

  async updatePlan(user: CurrentUserPayload, planInput: string) {
    requireAdmin(user);
    if (!['free', 'pro', 'business'].includes(planInput)) throw new BadRequestException('Invalid plan');
    return this.db.organization.update({ where: { id: user.organizationId }, data: { plan: planInput as Plan } });
  }

  private normalizeRole(value: string): UserRole {
    return value === 'admin' ? 'admin' : 'member';
  }
}
