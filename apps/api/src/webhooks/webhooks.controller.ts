import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { WebhookEvent } from '@prisma/client';
import { IsArray, IsOptional, IsString, IsUrl } from 'class-validator';
import { randomBytes } from 'crypto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookEventsService } from './webhook-events.service';

class CreateWebhookDto {
  @IsUrl({ require_tld: false })
  url!: string;

  @IsArray()
  events!: WebhookEvent[];

  @IsOptional()
  @IsString()
  name?: string;
}

@Controller('webhooks')
@UseGuards(JwtAuthGuard)
export class WebhooksController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookEvents: WebhookEventsService,
  ) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload) {
    return this.prisma.webhook.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: 'desc' },
      include: { deliveries: { take: 5, orderBy: { createdAt: 'desc' } } },
    });
  }

  @Post()
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateWebhookDto) {
    return this.prisma.webhook.create({
      data: {
        organizationId: user.organizationId,
        url: dto.url,
        events: dto.events,
        secret: `whsec_${randomBytes(24).toString('hex')}`,
      },
    });
  }

  @Post(':id/test')
  async test(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    const hook = await this.prisma.webhook.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!hook) return { ok: false, message: 'Webhook not found' };
    await this.webhookEvents.emit(user.organizationId, 'webhook_test', { message: 'NexStock webhook test' });
    return { ok: true };
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.prisma.webhook.updateMany({
      where: { id, organizationId: user.organizationId },
      data: { isActive: false },
    });
  }
}
