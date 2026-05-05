import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import slugify from 'slugify';
import { SignupDto } from './dto';
import { PrismaService } from '../prisma/prisma.service';

export type TokenMeta = { ip?: string; ua?: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async signup(dto: SignupDto, meta: TokenMeta) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already exists');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const baseSlug = slugify(dto.orgName, { lower: true, strict: true }) || 'organization';
    const slug = `${baseSlug}-${randomBytes(3).toString('hex')}`;

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name: dto.name.trim(),
        memberships: {
          create: {
            role: 'admin',
            organization: {
              create: {
                name: dto.orgName.trim(),
                slug,
                legalName: dto.legalName?.trim() || null,
                tradingName: dto.tradingName?.trim() || null,
                registrationNo: dto.registrationNo?.trim() || null,
                vatNumber: dto.vatNumber?.trim() || null,
                industry: dto.industry?.trim() || null,
                companySize: dto.companySize?.trim() || null,
                website: dto.website?.trim() || null,
                phone: dto.phone?.trim() || null,
                billingEmail: dto.billingEmail?.trim() || email,
                addressLine1: dto.addressLine1?.trim() || null,
                addressLine2: dto.addressLine2?.trim() || null,
                city: dto.city?.trim() || null,
                province: dto.province?.trim() || null,
                postalCode: dto.postalCode?.trim() || null,
                country: dto.country?.trim() || null,
              },
            },
          },
        },
      },
      include: { memberships: true },
    });

    const membership = user.memberships[0];
    return this.issueTokens(user.id, user.email, membership.organizationId, membership.role, meta);
  }

  async login(emailInput: string, password: string, meta: TokenMeta) {
    const email = emailInput.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { memberships: { orderBy: { createdAt: 'asc' } } },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const membership = user.memberships[0];
    if (!membership) throw new UnauthorizedException('No organization membership found');

    return this.issueTokens(user.id, user.email, membership.organizationId, membership.role, meta);
  }

  async refresh(refreshRaw: string | undefined, meta: TokenMeta) {
    if (!refreshRaw) throw new UnauthorizedException('Missing refresh token');

    const tokenHash = createHash('sha256').update(refreshRaw).digest('hex');
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { memberships: { orderBy: { createdAt: 'asc' } } } } },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });

    const membership = stored.user.memberships[0];
    if (!membership) throw new UnauthorizedException('No organization membership found');

    return this.issueTokens(stored.user.id, stored.user.email, membership.organizationId, membership.role, meta);
  }

  async logout(refreshRaw: string | undefined) {
    if (!refreshRaw) return { ok: true };
    const tokenHash = createHash('sha256').update(refreshRaw).digest('hex');
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  private async issueTokens(
    userId: string,
    email: string,
    organizationId: string,
    role: UserRole,
    meta: TokenMeta,
  ) {
    const payload = { sub: userId, email, organizationId, role };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-me',
      expiresIn: '15m',
    });

    const refreshRaw = randomBytes(48).toString('hex');
    const tokenHash = createHash('sha256').update(refreshRaw).digest('hex');

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        ip: meta.ip,
        userAgent: meta.ua,
      },
    });

    return { accessToken, refreshToken: refreshRaw };
  }
}
