import { WebhookEvent } from '@prisma/client';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookEventsService } from './webhook-events.service';
declare class CreateWebhookDto {
    url: string;
    events: WebhookEvent[];
    name?: string;
}
export declare class WebhooksController {
    private readonly prisma;
    private readonly webhookEvents;
    constructor(prisma: PrismaService, webhookEvents: WebhookEventsService);
    list(user: CurrentUserPayload): import(".prisma/client").Prisma.PrismaPromise<({
        deliveries: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.DeliveryStatus;
            event: string;
            payload: import("@prisma/client/runtime/library").JsonValue;
            attempt: number;
            statusCode: number | null;
            response: string | null;
            nextRetryAt: Date | null;
            deliveredAt: Date | null;
            webhookId: string;
        }[];
    } & {
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        url: string;
        secret: string;
        events: import(".prisma/client").$Enums.WebhookEvent[];
    })[]>;
    create(user: CurrentUserPayload, dto: CreateWebhookDto): import(".prisma/client").Prisma.Prisma__WebhookClient<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        url: string;
        secret: string;
        events: import(".prisma/client").$Enums.WebhookEvent[];
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    test(user: CurrentUserPayload, id: string): Promise<{
        ok: boolean;
        message: string;
    } | {
        ok: boolean;
        message?: undefined;
    }>;
    remove(user: CurrentUserPayload, id: string): import(".prisma/client").Prisma.PrismaPromise<import(".prisma/client").Prisma.BatchPayload>;
}
export {};
