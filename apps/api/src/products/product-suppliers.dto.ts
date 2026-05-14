import { Type } from 'class-transformer';
import { Allow, IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductSupplierDto {
  @IsString()
  supplierId!: string;

  @IsOptional()
  @IsString()
  supplierSku?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minimumOrderQty?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  leadTimeDays?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPreferred?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Allow()
  metadata?: unknown;
}

export class UpdateProductSupplierDto {
  @IsOptional()
  @IsString()
  supplierSku?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minimumOrderQty?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  leadTimeDays?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPreferred?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Allow()
  metadata?: unknown;
}
