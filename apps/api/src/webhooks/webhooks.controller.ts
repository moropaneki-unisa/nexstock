import { BadRequestException, Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IsArray, IsIn, IsOptional, IsString, IsUrl } from 'class-validator';
import { randomBytes } from 'crypto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookEventsService, WebhookEventName } from './webhook-events.service';

const WEBHOOK_EVENTS: WebhookEventName[] = [
  'product_created',
  'product_updated',
  'inventory_updated',
  'webhook_test',
];

class CreateWebhookDto {
  @IsUrl({ require_tld: false })
  url!: string;

  @IsArray()
  @IsIn(WEBHOOK_EVENTS, { each: true })
  events!: WebhookEventName[];

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
    const events = this.normalizeEvents(dto.events);

    return this.prisma.webhook.create({
      data: {
        organizationId: user.organizationId,
        url: dto.url,
        events: events as Prisma.InputJsonValue,
        secret: `whsec_${randomBytes(24).toString('hex')}`,
      },
    });
  }

  @Post(':id/test')
  async test(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    const hook = await this.prisma.webhook.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!hook) return { ok: false, message: 'Webhook not found' };
    await this.webhookEvents.emit(user.organizationId, 'webhook_test', { message: 'InventoryHub webhook test' });
    return { ok: true };
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.prisma.webhook.updateMany({
      where: { id, organizationId: user.organizationId },
      data: { isActive: false },
    });
  }

  private normalizeEvents(events: WebhookEventName[]) {
    const unique = Array.from(new Set(events ?? []));
    const invalid = unique.filter((event) => !WEBHOOK_EVENTS.includes(event));

    if (invalid.length) {
      throw new BadRequestException(`Unsupported webhook event(s): ${invalid.join(', ')}`);
    }

    return unique;
  }
}
