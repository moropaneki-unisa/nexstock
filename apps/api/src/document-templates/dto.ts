import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateDocumentTemplateDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsIn(['purchase_order', 'supplier_invoice', 'email'])
  type?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  subjectTemplate?: string;

  @IsString()
  htmlTemplate!: string;

  @IsOptional()
  @IsString()
  emailTemplate?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateDocumentTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['purchase_order', 'supplier_invoice', 'email'])
  type?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  subjectTemplate?: string;

  @IsOptional()
  @IsString()
  htmlTemplate?: string;

  @IsOptional()
  @IsString()
  emailTemplate?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PreviewDocumentTemplateDto {
  @IsString()
  htmlTemplate!: string;

  @IsOptional()
  @IsString()
  subjectTemplate?: string;

  @IsOptional()
  @IsString()
  emailTemplate?: string;
}
