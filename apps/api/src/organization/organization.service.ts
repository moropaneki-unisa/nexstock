import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Plan, Prisma, UserRole } from '@prisma/client';
import axios from 'axios';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PlanLimitsService } from '../plan-limits/plan-limits.service';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { EmailService } from '../email/email.service';

const INVITE_EXPIRY_DAYS = 7;
const INVITE_EXPIRY_MS = INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
const FREE_RATES_API_URL = 'https://api.frankfurter.dev/v1/latest';

type CurrencyRateDto = { code: string; rateToBase: number };

type OrganizationUpdateDto = {
  name?: string;
  slug?: string;
  skuPrefix?: string;
  baseCurrency?: string;
  enabledCurrencies?: string[];
  exchangeRates?: CurrencyRateDto[] | Record<string, number>;
  autoRefreshRates?: boolean;
  industry?: string | null;
  onboardingComplete?: boolean;
  legalName?: string | null;
  tradingName?: string | null;
  registrationNo?: string | null;
  vatNumber?: string | null;
  companySize?: string | null;
  website?: string | null;
  phone?: string | null;
  billingEmail?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country?: string | null;
};

type FrankfurterLatestResponse = {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
};

function requireAdmin(user: CurrentUserPayload) {
  if (user.role !== 'admin') throw new ForbiddenException('Admin role required');
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

function optionalText(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
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
    private readonly planLimits: PlanLimitsService,
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

    const planUsage = await this.planLimits.getUsage(user.organizationId);

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      industry: org.industry,
      onboardingComplete: org.onboardingComplete,
      skuPrefix: org.skuPrefix,
      baseCurrency: org.baseCurrency,
      enabledCurrencies: org.enabledCurrencies,
      exchangeRates: org.exchangeRates,
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
      planLimits: planUsage.limits,
      planUsage: planUsage.usage,
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
        { name: 'free', price: 0, current: org.plan === 'free', description: 'Start a workspace and validate the NexStock workflow before upgrading.' },
        { name: 'starter', price: 19, current: org.plan === 'starter', description: 'Product imports, reusable mapping, inventory movement history, and API keys for small teams.' },
        { name: 'growth', price: 59, current: org.plan === 'growth', description: 'Advanced imports, integration-ready workflows, webhooks, team controls, and priority setup support.' },
        { name: 'business', price: 149, current: org.plan === 'business', disabled: true, description: 'Later plan for purchase orders, vendor operations, multi-location stock, audit logs, and advanced automation.' },
      ],
    };
  }

  async updateOrganization(user: CurrentUserPayload, dto: OrganizationUpdateDto) {
    requireAdmin(user);
    const data: Prisma.OrganizationUpdateInput = {};

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
    if (dto.baseCurrency !== undefined || dto.enabledCurrencies !== undefined || dto.exchangeRates !== undefined) {
      const current = await this.db.organization.findUnique({ where: { id: user.organizationId } });
      if (!current) throw new NotFoundException('Organization not found');
      const baseCurrency = this.normalizeCurrencyCode(dto.baseCurrency ?? current.baseCurrency ?? 'ZAR');
      const enabledCurrencies = this.normalizeCurrencyList(baseCurrency, dto.enabledCurrencies ?? current.enabledCurrencies ?? [baseCurrency]);
      await this.planLimits.assertCanEnableCurrencies(user.organizationId, enabledCurrencies.length);
      const manualRates = this.normalizeExchangeRates(dto.exchangeRates ?? current.exchangeRates, baseCurrency, enabledCurrencies);
      const rates = dto.autoRefreshRates === false ? manualRates : await this.fetchLiveRatesWithFallback(baseCurrency, enabledCurrencies, manualRates);
      data.baseCurrency = baseCurrency;
      data.enabledCurrencies = enabledCurrencies;
      data.exchangeRates = rates as Prisma.InputJsonValue;
    }
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

  async refreshCurrencyRates(user: CurrentUserPayload) {
    requireAdmin(user);
    const org = await this.db.organization.findUnique({ where: { id: user.organizationId } });
    if (!org) throw new NotFoundException('Organization not found');

    const baseCurrency = this.normalizeCurrencyCode(org.baseCurrency || 'ZAR');
    const enabledCurrencies = this.normalizeCurrencyList(baseCurrency, org.enabledCurrencies ?? [baseCurrency]);
    await this.planLimits.assertCanEnableCurrencies(user.organizationId, enabledCurrencies.length);
    const currentRates = this.normalizeExchangeRates(org.exchangeRates, baseCurrency, enabledCurrencies);
    const exchangeRates = await this.fetchLiveRatesWithFallback(baseCurrency, enabledCurrencies, currentRates);

    return this.db.organization.update({
      where: { id: user.organizationId },
      data: { baseCurrency, enabledCurrencies, exchangeRates: exchangeRates as Prisma.InputJsonValue },
    });
  }

  async inviteUser(user: CurrentUserPayload, emailInput: string, roleInput: string) {
    requireAdmin(user);
    await this.planLimits.assertCanInviteMember(user.organizationId);
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
      await this.email.sendOrganizationInviteEmail({ email, organizationName: org.name, inviterEmail, role, inviteUrl, expiresInDays: INVITE_EXPIRY_DAYS });
      return { message: 'Invitation email sent', userId: newUser.id };
    }

    const membership = await this.db.membership.findUnique({ where: { userId_organizationId: { userId: existing.id, organizationId: user.organizationId } } });
    if (membership) throw new BadRequestException('User is already a member of this organization');

    await this.db.membership.create({ data: { userId: existing.id, organizationId: user.organizationId, role } });

    if (!existing.emailVerifiedAt || existing.passwordHash === 'temporary') {
      const inviteToken = generateInviteToken();
      await this.db.user.update({ where: { id: existing.id }, data: { verificationOtpHash: hashInviteToken(inviteToken), verificationOtpExpiry: new Date(Date.now() + INVITE_EXPIRY_MS) } });
      const inviteUrl = frontendUrl(`/invite/accept?token=${inviteToken}&email=${encodeURIComponent(email)}`);
      await this.email.sendOrganizationInviteEmail({ email, organizationName: org.name, inviterEmail, role, inviteUrl, expiresInDays: INVITE_EXPIRY_DAYS });
      return { message: 'Invitation email sent', userId: existing.id };
    }

    await this.email.sendOrganizationAddedEmail({ email, organizationName: org.name, inviterEmail, loginUrl: frontendUrl('/login') });
    return { message: 'User added and notified', userId: existing.id };
  }

  async updateMemberRole(user: CurrentUserPayload, memberId: string, roleInput: string) {
    requireAdmin(user);
    if (memberId === user.id) throw new BadRequestException('You cannot change your own role');
    const role = this.normalizeRole(roleInput);
    const membership = await this.db.membership.findFirst({ where: { userId: memberId, organizationId: user.organizationId } });
    if (!membership) throw new NotFoundException('Member not found');
    return this.db.membership.update({ where: { id: membership.id }, data: { role } });
  }

  async removeMember(user: CurrentUserPayload, memberId: string) {
    requireAdmin(user);
    if (memberId === user.id) throw new BadRequestException('You cannot remove yourself from the organization');
    const membership = await this.db.membership.findFirst({ where: { userId: memberId, organizationId: user.organizationId } });
    if (!membership) throw new NotFoundException('Member not found');
    await this.db.membership.delete({ where: { id: membership.id } });
    return { ok: true };
  }

  async updatePlan(user: CurrentUserPayload, planInput: string) {
    requireAdmin(user);
    const normalizedPlan = planInput === 'pro' ? 'starter' : planInput === 'business' ? 'growth' : planInput;
    if (!['free', 'starter', 'growth'].includes(normalizedPlan)) throw new BadRequestException('Invalid plan');
    return this.db.organization.update({ where: { id: user.organizationId }, data: { plan: normalizedPlan as Plan } });
  }

  private async fetchLiveRatesWithFallback(baseCurrency: string, enabledCurrencies: string[], fallback: CurrencyRateDto[]) {
    const targetCurrencies = enabledCurrencies.filter((code) => code !== baseCurrency);
    if (targetCurrencies.length === 0) return [];
    try {
      const responses = await Promise.all(targetCurrencies.map(async (code) => {
        const response = await axios.get<FrankfurterLatestResponse>(FREE_RATES_API_URL, { params: { base: code, symbols: baseCurrency }, timeout: 7000 });
        const rateToBase = Number(response.data?.rates?.[baseCurrency]);
        if (!Number.isFinite(rateToBase) || rateToBase <= 0) throw new Error(`Missing rate for ${code}`);
        return { code, rateToBase, source: 'frankfurter', date: response.data.date };
      }));
      return responses;
    } catch {
      return fallback;
    }
  }

  private normalizeCurrencyCode(value: string) {
    const code = String(value || '').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) throw new BadRequestException('Currency code must be a 3-letter ISO code');
    return code;
  }

  private normalizeCurrencyList(baseCurrency: string, values: string[]) {
    return Array.from(new Set([baseCurrency, ...(values ?? []).map((code) => this.normalizeCurrencyCode(code))]));
  }

  private normalizeExchangeRates(value: OrganizationUpdateDto['exchangeRates'] | Prisma.JsonValue | null | undefined, baseCurrency: string, enabledCurrencies: string[]) {
    const entries = Array.isArray(value)
      ? value.map((item) => ({ code: this.normalizeCurrencyCode(String((item as any).code ?? '')), rateToBase: Number((item as any).rateToBase ?? 1) }))
      : value && typeof value === 'object'
        ? Object.entries(value as Record<string, unknown>).map(([code, rate]) => {
            if (rate && typeof rate === 'object' && !Array.isArray(rate)) {
              const record = rate as Record<string, unknown>;
              return { code: this.normalizeCurrencyCode(code), rateToBase: Number(record.rateToBase || 1) };
            }
            return { code: this.normalizeCurrencyCode(code), rateToBase: Number(rate || 1) };
          })
        : [];
    return entries.filter((rate) => rate.code !== baseCurrency && enabledCurrencies.includes(rate.code)).map((rate) => ({ code: rate.code, rateToBase: Number.isFinite(rate.rateToBase) && rate.rateToBase > 0 ? rate.rateToBase : 1 }));
  }

  private normalizeRole(value: string): UserRole {
    return value === 'admin' ? 'admin' : 'member';
  }
}
