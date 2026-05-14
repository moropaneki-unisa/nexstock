import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CustomFieldType, Prisma } from '@prisma/client';
import slugify from 'slugify';
import { PrismaService } from '../prisma/prisma.service';

const fieldTypes = [
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
  'json',
] as const;

type ProductFieldInput = {
  key?: string;
  name?: string;
  label?: string;
  type?: string;
  required?: boolean;
  visible?: boolean;
  options?: string[];
  defaultValue?: unknown;
  order?: number;
  isActive?: boolean;
};

@Injectable()
export class ProductFieldsService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string) {
    return this.prisma.customField.findMany({
      where: { organizationId, isActive: true },
      orderBy: [{ order: 'asc' }, { label: 'asc' }],
    });
  }

  async get(organizationId: string, id: string) {
    const field = await this.prisma.customField.findFirst({ where: { id, organizationId } });
    if (!field) throw new NotFoundException('Product attribute not found');
    return field;
  }

  async create(organizationId: string, input: ProductFieldInput) {
    const label = (input.label || input.name)?.trim();
    if (!label) throw new BadRequestException('Attribute label is required');

    const key = await this.uniqueKey(organizationId, input.key || label);
    return this.prisma.customField.create({
      data: {
        organizationId,
        key,
        label,
        type: this.fieldType(input.type),
        required: Boolean(input.required),
        options: this.options(input.options),
        defaultValue: input.defaultValue === undefined ? undefined : (input.defaultValue as Prisma.InputJsonValue),
        order: Number(input.order ?? 0),
        isActive: input.visible === false ? false : input.isActive !== false,
      },
    });
  }

  async update(organizationId: string, id: string, input: ProductFieldInput) {
    await this.get(organizationId, id);
    const label = (input.label || input.name)?.trim();
    if (!label) throw new BadRequestException('Attribute label is required');

    return this.prisma.customField.update({
      where: { id },
      data: {
        label,
        type: this.fieldType(input.type),
        required: Boolean(input.required),
        options: this.options(input.options),
        defaultValue: input.defaultValue === undefined ? undefined : (input.defaultValue as Prisma.InputJsonValue),
        order: Number(input.order ?? 0),
        isActive: input.visible === false ? false : input.isActive !== false,
      },
    });
  }

  async delete(organizationId: string, id: string) {
    await this.get(organizationId, id);
    await this.prisma.customField.update({ where: { id }, data: { isActive: false } });
    return { ok: true, id };
  }

  private fieldType(value?: string) {
    const type = String(value || 'text').toLowerCase();
    if (!(fieldTypes as readonly string[]).includes(type)) throw new BadRequestException('Invalid attribute type');
    return type as CustomFieldType;
  }

  private options(value?: string[]) {
    return Array.from(new Set((value || []).map((option) => option.trim()).filter(Boolean)));
  }

  private async uniqueKey(organizationId: string, label: string) {
    const base = slugify(label, { lower: false, strict: true })
      .replace(/^[0-9]+/, '')
      .replace(/-([a-zA-Z])/g, (_, char) => char.toUpperCase())
      .replace(/^./, (char) => char.toLowerCase()) || 'attribute';
    let key = base;
    let index = 2;

    while (true) {
      const existing = await this.prisma.customField.findFirst({ where: { organizationId, key } });
      if (!existing) return key;
      key = `${base}${index++}`;
    }
  }
}
