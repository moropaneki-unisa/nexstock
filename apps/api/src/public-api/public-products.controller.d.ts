import { Request } from 'express';
import { CreateProductDto, ListProductsDto, UpdateProductDto } from '../products/dto';
import { ProductsService } from '../products/products.service';
type ApiRequest = Request & {
    apiOrganizationId: string;
    apiScopes: string[];
};
export declare class PublicProductsController {
    private readonly products;
    constructor(products: ProductsService);
    list(req: ApiRequest, query: ListProductsDto): Promise<{
        items: ({
            variants: {
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
            }[];
        } & {
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
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    get(req: ApiRequest, id: string): Promise<{
        variants: {
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
        }[];
    } & {
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
    }>;
    create(req: ApiRequest, dto: CreateProductDto): Promise<{
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
    }>;
    update(req: ApiRequest, id: string, dto: UpdateProductDto): Promise<{
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
    }>;
    private assertScope;
}
export {};
