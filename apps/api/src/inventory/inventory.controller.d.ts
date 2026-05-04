import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
declare class InventoryLogQueryDto {
    page?: number;
    limit?: number;
}
export declare class InventoryController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    logs(user: CurrentUserPayload, query: InventoryLogQueryDto): Promise<{
        items: ({
            product: {
                id: string;
                organizationId: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                sku: string;
                description: string | null;
                price: import("@prisma/client/runtime/library").Decimal;
                cost: import("@prisma/client/runtime/library").Decimal | null;
                quantity: number;
                lowStockLevel: number;
                category: string | null;
                images: string[];
                metadata: import("@prisma/client/runtime/library").JsonValue | null;
                status: import(".prisma/client").$Enums.ProductStatus;
                deletedAt: Date | null;
            };
            variant: {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                sku: string;
                price: import("@prisma/client/runtime/library").Decimal | null;
                cost: import("@prisma/client/runtime/library").Decimal | null;
                quantity: number;
                metadata: import("@prisma/client/runtime/library").JsonValue | null;
                productId: string;
                size: string | null;
                color: string | null;
            } | null;
        } & {
            id: string;
            organizationId: string;
            createdAt: Date;
            productId: string;
            variantId: string | null;
            type: import(".prisma/client").$Enums.InventoryMovementType;
            quantityBefore: number;
            quantityAfter: number;
            delta: number;
            reason: string | null;
            source: string | null;
            referenceId: string | null;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
}
export {};
