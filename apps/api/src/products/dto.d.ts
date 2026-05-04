export declare class ListProductsDto {
    search?: string;
    category?: string;
    page?: number;
    limit?: number;
}
export declare class CreateProductDto {
    name: string;
    sku: string;
    description?: string;
    price: number;
    cost?: number;
    quantity?: number;
    lowStockLevel?: number;
    category?: string;
    images?: string[];
}
export declare class UpdateProductDto {
    name?: string;
    sku?: string;
    description?: string;
    price?: number;
    cost?: number;
    quantity?: number;
    lowStockLevel?: number;
    category?: string;
    images?: string[];
}
export declare class AdjustInventoryDto {
    delta: number;
    reason?: string;
    referenceId?: string;
}
