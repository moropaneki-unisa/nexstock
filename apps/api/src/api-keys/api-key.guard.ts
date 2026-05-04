import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const auth = req.headers.authorization ?? '';

    if (!auth.startsWith('Bearer ih_')) {
      throw new UnauthorizedException('Missing API key');
    }

    const rawKey = auth.slice('Bearer '.length);
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const apiKey = await this.prisma.apiKey.findFirst({ where: { keyHash, revokedAt: null } });

    if (!apiKey) throw new UnauthorizedException('Invalid API key');

    await this.prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });

    req.apiOrganizationId = apiKey.organizationId;
    req.apiScopes = apiKey.scopes;
    return true;
  }
}
