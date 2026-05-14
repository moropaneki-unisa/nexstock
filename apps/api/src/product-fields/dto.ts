import {
  Allow,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export const legacyProductFieldTypes = [
  'text',
  'richtext',
  'number',
  'decimal',
  'currency',
  'attachment',
  'images',
  'lookup',
  'boolean',
  'select',
  'date',
] as const;

export class CreateProductFieldDto {
  @IsString()
  label!: string;

  @IsIn(legacyProductFieldTypes)
  type!: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @Allow()
  defaultValue?: unknown;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateProductFieldDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsIn(legacyProductFieldTypes)
  type?: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @Allow()
  defaultValue?: unknown;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
