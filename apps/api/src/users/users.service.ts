import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';

export type UpdateProfileDto = {
  name?: string | null;
  currentPassword?: string;
  newPassword?: string;
};

@Injectable()
export class UsersService {
  constructor(private readonly db: PrismaService) {}

  async getProfile(user: CurrentUserPayload) {
    const record = await this.db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
        memberships: {
          select: {
            id: true,
            organizationId: true,
            role: true,
            createdAt: true,
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!record) throw new BadRequestException('User profile not found');

    const activeMembership =
      record.memberships.find((membership) => membership.organizationId === user.organizationId) ??
      record.memberships[0] ??
      null;

    const organization = activeMembership?.organization
      ? {
          id: activeMembership.organization.id,
          name: activeMembership.organization.name,
          slug: activeMembership.organization.slug,
          role: activeMembership.role,
        }
      : user.organizationId
        ? {
            id: user.organizationId,
            name: 'Workspace',
            slug: '',
            role: user.role,
          }
        : null;

    return {
      id: record.id,
      email: record.email,
      name: record.name,
      emailVerifiedAt: record.emailVerifiedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      organization,
    };
  }

  async updateProfile(user: CurrentUserPayload, dto: UpdateProfileDto) {
    const data: { name?: string | null; passwordHash?: string } = {};

    if (dto.name !== undefined) {
      const name = dto.name?.trim() ?? '';
      data.name = name || null;
    }

    if (dto.newPassword !== undefined && dto.newPassword.trim()) {
      if (dto.newPassword.length < 8) throw new BadRequestException('New password must be at least 8 characters');
      if (!dto.currentPassword) throw new BadRequestException('Current password is required to change your password');

      const existing = await this.db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
      if (!existing) throw new BadRequestException('User profile not found');
      if (existing.passwordHash === 'temporary') throw new BadRequestException('Set your password from the invitation flow before changing it here');

      const isValid = await bcrypt.compare(dto.currentPassword, existing.passwordHash);
      if (!isValid) throw new BadRequestException('Current password is incorrect');

      data.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    }

    if (Object.keys(data).length === 0) return this.getProfile(user);

    await this.db.user.update({ where: { id: user.id }, data });
    return this.getProfile(user);
  }
}
