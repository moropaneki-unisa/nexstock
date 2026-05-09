import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Plan, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { EmailService } from '../email/email.service';

const INVITE_EXPIRY_DAYS = 7;
const INVITE_EXPIRY_MS = INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

type OrganizationUpdateDto = {
  name?: string;
  slug?: string;
  skuPrefix?: string;
  industry?: string;
  onboardingComplete?: boolean;
  legalName?: string;
  tradingName?: string;
  registrationNo?: string;
  vatNumber?: string;
  companySize?: string;
  website?: string;
  phone?: string;
  billingEmail?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
};

function requireAdmin(user: CurrentUserPayload) {
  if (user.role !== 'admin') {
    throw new ForbiddenException('Admin role required');
  }
}

function frontendUrl(path = '') {
  const base = process.env.FRONTEND_URL || 'https://www.nexstock.co.za';
  return `${base.replace(/\/$/, '')}${path}`;
}

function hashInviteToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function generateInviteToken() {
  return randomBytes(32).toString('hex');
}

function optionalText(value: string | undefined) {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed || null;
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
  constructor(
    private readonly db: PrismaService,
    private readonly email: EmailService,
  ) {}

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
      legalName: org.legalName,
      tradingName: org.tradingName,
      registrationNo: org.registrationNo,
      vatNumber: org.vatNumber,
      companySize: org.companySize,
      website: org.website,
      phone: org.phone,
      billingEmail: org.billingEmail,
      addressLine1: org.addressLine1,
      addressLine2: org.addressLine2,
      city: org.city,
      province: org.province,
      postalCode: org.postalCode,
      country: org.country,
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
        status: !m.user.emailVerifiedAt || m.user.passwordHash === 'temporary' ? 'invited' : 'active',
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

  async updateOrganization(user: CurrentUserPayload, dto: OrganizationUpdateDto) {
    requireAdmin(user);
    const data: Record<string, string | boolean | null> = {};

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('Organization name is required');
      data.name = name;
    }
    if (dto.slug !== undefined) {
      const slug = dto.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      if (!slug) throw new BadRequestException('Workspace slug is required');
      data.slug = slug;
    }
    if (dto.skuPrefix !== undefined) data.skuPrefix = dto.skuPrefix?.trim().toUpperCase() || null;
    if (dto.industry !== undefined) data.industry = optionalText(dto.industry);
    if (dto.onboardingComplete !== undefined) data.onboardingComplete = dto.onboardingComplete;
    if (dto.legalName !== undefined) data.legalName = optionalText(dto.legalName);
    if (dto.tradingName !== undefined) data.tradingName = optionalText(dto.tradingName);
    if (dto.registrationNo !== undefined) data.registrationNo = optionalText(dto.registrationNo);
    if (dto.vatNumber !== undefined) data.vatNumber = optionalText(dto.vatNumber);
    if (dto.companySize !== undefined) data.companySize = optionalText(dto.companySize);
    if (dto.website !== undefined) data.website = optionalText(dto.website);
    if (dto.phone !== undefined) data.phone = optionalText(dto.phone);
    if (dto.billingEmail !== undefined) data.billingEmail = optionalText(dto.billingEmail);
    if (dto.addressLine1 !== undefined) data.addressLine1 = optionalText(dto.addressLine1);
    if (dto.addressLine2 !== undefined) data.addressLine2 = optionalText(dto.addressLine2);
    if (dto.city !== undefined) data.city = optionalText(dto.city);
    if (dto.province !== undefined) data.province = optionalText(dto.province);
    if (dto.postalCode !== undefined) data.postalCode = optionalText(dto.postalCode);
    if (dto.country !== undefined) data.country = optionalText(dto.country);

    return this.db.organization.update({ where: { id: user.organizationId }, data });
  }

  async inviteUser(user: CurrentUserPayload, emailInput: string, roleInput: string) {
    requireAdmin(user);
    const email = emailInput?.toLowerCase().trim();
    if (!email) throw new BadRequestException('Email is required');
    const role = this.normalizeRole(roleInput);

    const org = await this.db.organization.findUnique({ where: { id: user.organizationId } });
    if (!org) throw new NotFoundException('Organization not found');

    const inviter = await this.db.user.findUnique({ where: { id: user.id }, select: { email: true } });
    const inviterEmail = inviter?.email || user.email;

    const existing = await this.db.user.findUnique({ where: { email } });

    if (!existing) {
      const inviteToken = generateInviteToken();
      const newUser = await this.db.user.create({
        data: {
          email,
          passwordHash: 'temporary',
          name: email.split('@')[0],
          verificationOtpHash: hashInviteToken(inviteToken),
          verificationOtpExpiry: new Date(Date.now() + INVITE_EXPIRY_MS),
        },
      });

      await this.db.membership.create({ data: { userId: newUser.id, organizationId: user.organizationId, role } });

      const inviteUrl = frontendUrl(`/invite/accept?token=${inviteToken}&email=${encodeURIComponent(email)}`);
      await this.email.sendOrganizationInviteEmail({
        email,
        organizationName: org.name,
        inviterEmail,
        role,
        inviteUrl,
        expiresInDays: INVITE_EXPIRY_DAYS,
      });

      return { message: 'Invitation email sent', userId: newUser.id };
    }

    const membership = await this.db.membership.findUnique({
      where: { userId_organizationId: { userId: existing.id, organizationId: user.organizationId } },
    });
    if (membership) throw new BadRequestException('User is already a member of this organization');

    await this.db.membership.create({ data: { userId: existing.id, organizationId: user.organizationId, role } });

    if (!existing.emailVerifiedAt || existing.passwordHash === 'temporary') {
      const inviteToken = generateInviteToken();
      await this.db.user.update({
        where: { id: existing.id },
        data: {
          verificationOtpHash: hashInviteToken(inviteToken),
          verificationOtpExpiry: new Date(Date.now() + INVITE_EXPIRY_MS),
        },
      });

      const inviteUrl = frontendUrl(`/invite/accept?token=${inviteToken}&email=${encodeURIComponent(email)}`);
      await this.email.sendOrganizationInviteEmail({
        email,
        organizationName: org.name,
        inviterEmail,
        role,
        inviteUrl,
        expiresInDays: INVITE_EXPIRY_DAYS,
      });

      return { message: 'Invitation email sent', userId: existing.id };
    }

    await this.email.sendOrganizationAddedEmail({
      email,
      organizationName: org.name,
      inviterEmail,
      loginUrl: frontendUrl('/login'),
    });

    return { message: 'User added and notified', userId: existing.id };
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
