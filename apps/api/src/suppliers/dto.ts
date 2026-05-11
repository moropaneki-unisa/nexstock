import { SupplierStatus } from '@prisma/client';
import { IsBoolean, IsDateString, IsEmail, IsInt, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  contactName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  paymentTerms?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  leadTimeDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateSupplierDto extends CreateSupplierDto {
  @IsOptional()
  status?: SupplierStatus;
}

export class LinkProductSupplierDto {
  @IsUUID()
  supplierId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  supplierSku?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  minimumOrderQty?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  leadTimeDays?: number;

  @IsOptional()
  @IsBoolean()
  isPreferred?: boolean;

  @IsOptional()
  @IsDateString()
  lastPurchaseAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateProductSupplierDto extends LinkProductSupplierDto {}
