import { ArrayMinSize, IsArray, IsDateString, IsEmail, IsIn, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PurchaseOrderLineDto {
  @IsString()
  productId!: string;

  @IsOptional()
  @IsString()
  productSupplierId?: string;

  @IsOptional()
  @IsString()
  supplierSku?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  quantityOrdered!: number;

  @IsNumber()
  @Min(0)
  unitCost!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePurchaseOrderDto {
  @IsString()
  supplierId!: string;

  @IsOptional()
  @IsDateString()
  expectedAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderLineDto)
  lines!: PurchaseOrderLineDto[];
}

export class UpdatePurchaseOrderDto {
  @IsOptional()
  @IsIn(['draft', 'ordered', 'partially_received', 'received', 'cancelled'])
  status?: 'draft' | 'ordered' | 'partially_received' | 'received' | 'cancelled';

  @IsOptional()
  @IsDateString()
  expectedAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReceivePurchaseOrderLineDto {
  @IsString()
  lineId!: string;

  @IsInt()
  @Min(0)
  quantityReceived!: number;
}

export class ReceivePurchaseOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceivePurchaseOrderLineDto)
  lines!: ReceivePurchaseOrderLineDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class SendPurchaseOrderDocumentDto {
  @IsOptional()
  @IsString()
  templateId?: string;

  @IsEmail()
  to!: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  message?: string;
}
