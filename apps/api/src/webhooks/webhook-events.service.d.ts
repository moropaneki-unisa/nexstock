import { WebhookEvent } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export declare class WebhookEventsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    emit(organizationId: string, event: WebhookEvent, payload: unknown): Promise<void>;
    deliver(deliveryId: string): Promise<void>;
}
