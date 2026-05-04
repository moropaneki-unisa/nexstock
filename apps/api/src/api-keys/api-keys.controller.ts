import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import { createHash, randomBytes } from 'crypto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

class CreateApiKeyDto {
  @IsString()
  name!: string;
}

@Controller('api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeysController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload) {
    return this.prisma.apiKey.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        lastUsedAt: true,
        revokedAt: true,
        createdAt: true,
      },
    });
  }

  @Post()
  async create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateApiKeyDto) {
    const secret = `ih_live_${randomBytes(32).toString('hex')}`;
    const keyHash = createHash('sha256').update(secret).digest('hex');
    const keyPrefix = secret.slice(0, 18);
    const record = await this.prisma.apiKey.create({
      data: {
        organizationId: user.organizationId,
        name: dto.name.trim(),
        keyHash,
        keyPrefix,
      },
    });

    return {
      id: record.id,
      name: record.name,
      keyPrefix: record.keyPrefix,
      secret,
      warning: 'Copy this API key now. It will not be shown again.',
    };
  }

  @Delete(':id')
  revoke(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.prisma.apiKey.updateMany({
      where: { id, organizationId: user.organizationId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
