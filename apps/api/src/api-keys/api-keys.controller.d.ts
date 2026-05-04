import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
declare class CreateApiKeyDto {
    name: string;
}
export declare class ApiKeysController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(user: CurrentUserPayload): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        name: string;
        keyPrefix: string;
        scopes: string[];
        lastUsedAt: Date | null;
        revokedAt: Date | null;
        createdAt: Date;
    }[]>;
    create(user: CurrentUserPayload, dto: CreateApiKeyDto): Promise<{
        id: string;
        name: string;
        keyPrefix: string;
        secret: string;
        warning: string;
    }>;
    revoke(user: CurrentUserPayload, id: string): import(".prisma/client").Prisma.PrismaPromise<import(".prisma/client").Prisma.BatchPayload>;
}
export {};
