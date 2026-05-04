import { Injectable } from '@nestjs/common';
import { WebhookEvent } from '@prisma/client';
import { createHmac } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebhookEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async emit(organizationId: string, event: WebhookEvent, payload: unknown) {
    const hooks = await this.prisma.webhook.findMany({
      where: { organizationId, isActive: true, events: { has: event } },
    });

    for (const hook of hooks) {
      const delivery = await this.prisma.webhookDelivery.create({
        data: {
          webhookId: hook.id,
          event,
          payload: payload as object,
        },
      });

      void this.deliver(delivery.id).catch(() => undefined);
    }
  }

  async deliver(deliveryId: string) {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { webhook: true },
    });

    if (!delivery || !delivery.webhook.isActive) return;

    const body = JSON.stringify({
      event: delivery.event,
      data: delivery.payload,
      createdAt: delivery.createdAt,
    });
    const timestamp = Date.now().toString();
    const signature = createHmac('sha256', delivery.webhook.secret)
      .update(`${timestamp}.${body}`)
      .digest('hex');

    try {
      const response = await fetch(delivery.webhook.url, {
        method: 'POST',
        body,
        headers: {
          'content-type': 'application/json',
          'x-inventoryhub-timestamp': timestamp,
          'x-inventoryhub-signature': `v1=${signature}`,
          'x-inventoryhub-delivery-id': delivery.id,
        },
        signal: AbortSignal.timeout(10000),
      });
      const text = await response.text();

      await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: response.ok ? 'delivered' : 'failed',
          statusCode: response.status,
          response: text.slice(0, 2000),
          deliveredAt: response.ok ? new Date() : undefined,
          attempt: { increment: 1 },
        },
      });
    } catch (error: any) {
      await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'failed',
          response: error.message?.slice(0, 2000) ?? 'Webhook request failed',
          attempt: { increment: 1 },
        },
      });
    }
  }
}
