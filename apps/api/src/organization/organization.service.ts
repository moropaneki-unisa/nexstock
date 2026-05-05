import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrganizationService {
  constructor(private readonly db: PrismaService) {}

  async getOrganization(user: any) {
    const org = await this.db.organization.findUnique({
      where: { id: user.organizationId },
      include: {
        memberships: {
          include: { user: true },
        },
      },
    });

    if (!org) throw new NotFoundException('Organization not found');

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      members: org.memberships.map((m) => ({
        id: m.user.id,
        email: m.user.email,
        name: m.user.name,
        role: m.role,
      })),
    };
  }

  async inviteUser(user: any, email: string, role: string) {
    const existing = await this.db.user.findUnique({ where: { email } });

    if (!existing) {
      const newUser = await this.db.user.create({
        data: {
          email,
          passwordHash: 'temporary',
          name: email.split('@')[0],
        },
      });

      await this.db.membership.create({
        data: {
          userId: newUser.id,
          organizationId: user.organizationId,
          role: role === 'admin' ? 'admin' : 'member',
        },
      });

      return { message: 'User invited (created)' };
    }

    await this.db.membership.create({
      data: {
        userId: existing.id,
        organizationId: user.organizationId,
        role: role === 'admin' ? 'admin' : 'member',
      },
    });

    return { message: 'User added to organization' };
  }
}
