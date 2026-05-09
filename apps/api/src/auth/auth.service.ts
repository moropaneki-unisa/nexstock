import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AcceptInviteDto, ResetPasswordDto, SignupDto } from './dto';
import { EmailService } from '../email/email.service';
import { requireSecret } from '../common/config/env';

export type TokenMeta = { ip?: string; ua?: string };

const OTP_EXPIRY_MINUTES = 5;
const OTP_EXPIRY_MS = OTP_EXPIRY_MINUTES * 60 * 1000;
const PASSWORD_RESET_EXPIRY_MINUTES = 30;
const PASSWORD_RESET_EXPIRY_MS = PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000;

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashOtp(otp: string) {
  return createHash('sha256').update(otp).digest('hex');
}

function hashInviteToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function appUrl(path = '') {
  const base = process.env.FRONTEND_URL || 'https://www.nexstock.co.za';
  return `${base.replace(/\/$/, '')}${path}`;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly email: EmailService,
  ) {}

  async signup(dto: SignupDto) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already exists');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name: dto.name.trim(),
        verificationOtpHash: otpHash,
        verificationOtpExpiry: new Date(Date.now() + OTP_EXPIRY_MS),
      },
    });

    await this.email.sendOtpEmail(email, otp, OTP_EXPIRY_MINUTES);

    return { requiresVerification: true };
  }

  async verifyEmail(emailInput: string, otp: string, meta: TokenMeta) {
    const email = emailInput.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.verificationOtpHash) throw new UnauthorizedException('Invalid request');

    const hashed = hashOtp(otp.trim());
    if (hashed !== user.verificationOtpHash) throw new UnauthorizedException('Invalid OTP');

    if (!user.verificationOtpExpiry || user.verificationOtpExpiry < new Date()) {
      throw new UnauthorizedException('OTP expired. Please request a new code.');
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        verificationOtpHash: null,
        verificationOtpExpiry: null,
      },
    });

    const org = await this.prisma.organization.create({
      data: {
        name: updated.name || 'My Company',
        slug: `org-${Date.now()}`,
      },
    });

    await this.prisma.membership.create({
      data: {
        userId: updated.id,
        organizationId: org.id,
        role: 'admin',
      },
    });

    return this.issueTokens(updated.id, updated.email, org.id, 'admin', meta);
  }

  async acceptInvite(dto: AcceptInviteDto, meta: TokenMeta) {
    const email = dto.email.toLowerCase().trim();
    const tokenHash = hashInviteToken(dto.token.trim());

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { memberships: { orderBy: { createdAt: 'asc' } } },
    });

    if (!user || !user.verificationOtpHash) {
      throw new UnauthorizedException('Invalid or expired invitation');
    }

    if (user.verificationOtpHash !== tokenHash) {
      throw new UnauthorizedException('Invalid or expired invitation');
    }

    if (!user.verificationOtpExpiry || user.verificationOtpExpiry < new Date()) {
      throw new UnauthorizedException('Invitation expired. Ask an admin to send a new invite.');
    }

    const membership = user.memberships[0];
    if (!membership) throw new UnauthorizedException('Invitation has no organization access');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        name: dto.name?.trim() || user.name || email.split('@')[0],
        emailVerifiedAt: user.emailVerifiedAt || new Date(),
        verificationOtpHash: null,
        verificationOtpExpiry: null,
      },
    });

    return this.issueTokens(updated.id, updated.email, membership.organizationId, membership.role, meta);
  }

  async resendOtp(emailInput: string) {
    const email = emailInput.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { ok: true };

    if (user.emailVerifiedAt) return { ok: true, alreadyVerified: true };

    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verificationOtpHash: otpHash,
        verificationOtpExpiry: new Date(Date.now() + OTP_EXPIRY_MS),
      },
    });

    await this.email.sendOtpEmail(email, otp, OTP_EXPIRY_MINUTES);
    return { ok: true };
  }

  async forgotPassword(emailInput: string) {
    const email = emailInput.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.passwordHash === 'temporary') return { ok: true };

    const token = randomBytes(32).toString('hex');
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verificationOtpHash: hashInviteToken(token),
        verificationOtpExpiry: new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS),
      },
    });

    const resetUrl = appUrl(`/reset-password?token=${token}&email=${encodeURIComponent(email)}`);
    await this.email.sendPasswordResetEmail({ email, resetUrl, expiresInMinutes: PASSWORD_RESET_EXPIRY_MINUTES });
    return { ok: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.verificationOtpHash) throw new UnauthorizedException('Invalid or expired reset link');

    if (!user.verificationOtpExpiry || user.verificationOtpExpiry < new Date()) {
      throw new UnauthorizedException('Reset link expired. Request a new one.');
    }

    const tokenHash = hashInviteToken(dto.token.trim());
    if (tokenHash !== user.verificationOtpHash) throw new UnauthorizedException('Invalid or expired reset link');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        emailVerifiedAt: user.emailVerifiedAt || new Date(),
        verificationOtpHash: null,
        verificationOtpExpiry: null,
      },
    });

    await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    return { ok: true };
  }

  async login(emailInput: string, password: string, meta: TokenMeta) {
    const email = emailInput.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { memberships: { orderBy: { createdAt: 'asc' } } },
    });

    if (!user || user.passwordHash === 'temporary' || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException('Email not verified');
    }

    const membership = user.memberships[0];
    if (!membership) throw new UnauthorizedException('No organization membership found');

    return this.issueTokens(user.id, user.email, membership.organizationId, membership.role, meta);
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) return;
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

    await this.prisma.refreshToken.deleteMany({
      where: { tokenHash },
    });
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
      secret: requireSecret('JWT_ACCESS_SECRET', 'dev-access-secret-change-me'),
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
