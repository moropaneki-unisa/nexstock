import { Type } from 'class-transformer';
import { Allow, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

export const productKinds = ['physical', 'service', 'digital', 'bundle'] as const;
export const productFieldTypes = ['text', 'number', 'boolean', 'select', 'date', 'json'] as const;

export class ProductTypeFieldDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  key!: string;

  @IsString()
  label!: string;

  @IsOptional()
  @IsIn(productFieldTypes)
  type?: string = 'text';

  @IsOptional()
  @IsBoolean()
  required?: boolean = false;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[] = [];

  @IsOptional()
  @Allow()
  defaultValue?: unknown;

  @IsOptional()
  @IsString()
  placeholder?: string;

  @IsOptional()
  @IsString()
  helpText?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  order?: number = 0;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class CreateProductTypeDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(productKinds)
  kind?: string = 'physical';

  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean = true;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean = false;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number = 0;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductTypeFieldDto)
  fields?: ProductTypeFieldDto[] = [];
}

export class UpdateProductTypeDto extends CreateProductTypeDto {}
