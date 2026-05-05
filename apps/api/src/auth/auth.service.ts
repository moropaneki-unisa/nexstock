import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto';
import { EmailService } from '../email/email.service';

export type TokenMeta = { ip?: string; ua?: string };

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashOtp(otp: string) {
  return createHash('sha256').update(otp).digest('hex');
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
        verificationOtpExpiry: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await this.email.sendOtpEmail(email, otp);

    return { requiresVerification: true };
  }

  async verifyEmail(email: string, otp: string, meta: TokenMeta) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.verificationOtpHash) throw new UnauthorizedException('Invalid request');

    const hashed = hashOtp(otp);
    if (hashed !== user.verificationOtpHash) throw new UnauthorizedException('Invalid OTP');

    if (user.verificationOtpExpiry! < new Date()) throw new UnauthorizedException('OTP expired');

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

  async resendOtp(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { ok: true };

    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verificationOtpHash: otpHash,
        verificationOtpExpiry: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await this.email.sendOtpEmail(email, otp);
    return { ok: true };
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

    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException('Email not verified');
    }

    const membership = user.memberships[0];
    if (!membership) throw new UnauthorizedException('No organization membership found');

    return this.issueTokens(user.id, user.email, membership.organizationId, membership.role, meta);
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
