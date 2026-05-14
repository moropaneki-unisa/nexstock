import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import slugify from 'slugify';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductTypeDto, ProductTypeFieldDto, UpdateProductTypeDto, productFieldTypes, productKinds } from './product-types.dto';

type ProductTypeRow = {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  kind: string;
  trackInventory: boolean;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

type ProductTypeFieldRow = {
  id: string;
  organizationId: string;
  productTypeId: string;
  key: string;
  label: string;
  type: string;
  required: boolean;
  options: string[];
  defaultValue: Prisma.JsonValue | null;
  placeholder: string | null;
  helpText: string | null;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ProductTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string) {
    await this.ensureDefaultTypes(organizationId);
    const types = await this.prisma.$queryRaw<ProductTypeRow[]>`
      SELECT * FROM "ProductType"
      WHERE "organizationId" = ${organizationId} AND "isActive" = true
      ORDER BY "isDefault" DESC, "sortOrder" ASC, "name" ASC
    `;
    const fields = await this.prisma.$queryRaw<ProductTypeFieldRow[]>`
      SELECT * FROM "ProductTypeField"
      WHERE "organizationId" = ${organizationId} AND "isActive" = true
      ORDER BY "order" ASC, "label" ASC
    `;
    return types.map((type) => ({ ...type, fields: fields.filter((field) => field.productTypeId === type.id) }));
  }

  async get(organizationId: string, id: string) {
    const rows = await this.prisma.$queryRaw<ProductTypeRow[]>`
      SELECT * FROM "ProductType"
      WHERE id = ${id} AND "organizationId" = ${organizationId} AND "isActive" = true
      LIMIT 1
    `;
    const type = rows[0];
    if (!type) throw new NotFoundException('Product type not found');
    const fields = await this.prisma.$queryRaw<ProductTypeFieldRow[]>`
      SELECT * FROM "ProductTypeField"
      WHERE "productTypeId" = ${id} AND "organizationId" = ${organizationId} AND "isActive" = true
      ORDER BY "order" ASC, "label" ASC
    `;
    return { ...type, fields };
  }

  async create(organizationId: string, dto: CreateProductTypeDto) {
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Product type name is required');
    const kind = this.kind(dto.kind);
    const slug = await this.uniqueSlug(organizationId, name);
    if (dto.isDefault) await this.clearDefault(organizationId);

    const rows = await this.prisma.$queryRaw<ProductTypeRow[]>`
      INSERT INTO "ProductType" ("organizationId", "name", "slug", "description", "kind", "trackInventory", "isDefault", "sortOrder")
      VALUES (${organizationId}, ${name}, ${slug}, ${this.optional(dto.description)}, ${kind}, ${this.trackInventory(kind, dto.trackInventory)}, ${Boolean(dto.isDefault)}, ${dto.sortOrder ?? 0})
      RETURNING *
    `;
    const created = rows[0];
    await this.replaceFields(organizationId, created.id, dto.fields ?? []);
    return this.get(organizationId, created.id);
  }

  async update(organizationId: string, id: string, dto: UpdateProductTypeDto) {
    await this.get(organizationId, id);
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Product type name is required');
    const kind = this.kind(dto.kind);
    if (dto.isDefault) await this.clearDefault(organizationId, id);

    await this.prisma.$executeRaw`
      UPDATE "ProductType"
      SET "name" = ${name},
          "description" = ${this.optional(dto.description)},
          "kind" = ${kind},
          "trackInventory" = ${this.trackInventory(kind, dto.trackInventory)},
          "isDefault" = ${Boolean(dto.isDefault)},
          "sortOrder" = ${dto.sortOrder ?? 0},
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = ${id} AND "organizationId" = ${organizationId}
    `;
    await this.replaceFields(organizationId, id, dto.fields ?? []);
    return this.get(organizationId, id);
  }

  async delete(organizationId: string, id: string) {
    const type = await this.get(organizationId, id);
    if (type.isDefault) throw new BadRequestException('Default product type cannot be deleted');
    await this.prisma.$executeRaw`
      UPDATE "ProductType"
      SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = ${id} AND "organizationId" = ${organizationId}
    `;
    return { ok: true, id };
  }

  async ensureDefaultTypes(organizationId: string) {
    const countRows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint as count FROM "ProductType" WHERE "organizationId" = ${organizationId}
    `;
    if (Number(countRows[0]?.count ?? 0) > 0) return;

    const defaults: CreateProductTypeDto[] = [
      {
        name: 'General product',
        description: 'Default stock-tracked product layout.',
        kind: 'physical',
        trackInventory: true,
        isDefault: true,
        fields: [],
      },
      {
        name: 'Service',
        description: 'Sell labour, consulting, support, repairs, or other non-stock services.',
        kind: 'service',
        trackInventory: false,
        fields: [
          { key: 'billingUnit', label: 'Billing unit', type: 'select', required: true, options: ['hour', 'day', 'job', 'session', 'month'], order: 1 },
          { key: 'duration', label: 'Duration', type: 'text', order: 2 },
        ],
      },
      {
        name: 'Car',
        description: 'Vehicle fields such as VIN, year, make, model, and mileage.',
        kind: 'physical',
        trackInventory: true,
        fields: [
          { key: 'make', label: 'Make', type: 'text', required: true, order: 1 },
          { key: 'model', label: 'Model', type: 'text', required: true, order: 2 },
          { key: 'year', label: 'Year', type: 'number', order: 3 },
          { key: 'vin', label: 'VIN', type: 'text', order: 4 },
          { key: 'mileage', label: 'Mileage', type: 'number', order: 5 },
          { key: 'fuelType', label: 'Fuel type', type: 'select', options: ['petrol', 'diesel', 'electric', 'hybrid'], order: 6 },
        ],
      },
      {
        name: 'Smartphone',
        description: 'Device fields such as brand, model, IMEI, storage, RAM, and colour.',
        kind: 'physical',
        trackInventory: true,
        fields: [
          { key: 'brand', label: 'Brand', type: 'text', required: true, order: 1 },
          { key: 'model', label: 'Model', type: 'text', required: true, order: 2 },
          { key: 'imei', label: 'IMEI', type: 'text', order: 3 },
          { key: 'storage', label: 'Storage', type: 'select', options: ['64GB', '128GB', '256GB', '512GB', '1TB'], order: 4 },
          { key: 'ram', label: 'RAM', type: 'text', order: 5 },
          { key: 'colour', label: 'Colour', type: 'text', order: 6 },
        ],
      },
    ];

    for (const item of defaults) await this.create(organizationId, item);
  }

  private async replaceFields(organizationId: string, productTypeId: string, fields: ProductTypeFieldDto[]) {
    await this.prisma.$executeRaw`
      UPDATE "ProductTypeField"
      SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "organizationId" = ${organizationId} AND "productTypeId" = ${productTypeId}
    `;

    for (const field of fields) {
      const key = this.fieldKey(field.key || field.label);
      if (!key) continue;
      const label = field.label?.trim() || key;
      const type = this.fieldType(field.type);
      await this.prisma.$executeRaw`
        INSERT INTO "ProductTypeField" ("organizationId", "productTypeId", "key", "label", "type", "required", "options", "defaultValue", "placeholder", "helpText", "order", "isActive")
        VALUES (${organizationId}, ${productTypeId}, ${key}, ${label}, ${type}, ${Boolean(field.required)}, ${field.options ?? []}, ${field.defaultValue === undefined ? Prisma.JsonNull : field.defaultValue as Prisma.InputJsonValue}, ${this.optional(field.placeholder)}, ${this.optional(field.helpText)}, ${field.order ?? 0}, ${field.isActive !== false})
        ON CONFLICT ("productTypeId", "key") DO UPDATE SET
          "label" = EXCLUDED."label",
          "type" = EXCLUDED."type",
          "required" = EXCLUDED."required",
          "options" = EXCLUDED."options",
          "defaultValue" = EXCLUDED."defaultValue",
          "placeholder" = EXCLUDED."placeholder",
          "helpText" = EXCLUDED."helpText",
          "order" = EXCLUDED."order",
          "isActive" = EXCLUDED."isActive",
          "updatedAt" = CURRENT_TIMESTAMP
      `;
    }
  }

  private async clearDefault(organizationId: string, exceptId?: string) {
    if (exceptId) {
      await this.prisma.$executeRaw`
        UPDATE "ProductType" SET "isDefault" = false WHERE "organizationId" = ${organizationId} AND id <> ${exceptId}
      `;
      return;
    }
    await this.prisma.$executeRaw`UPDATE "ProductType" SET "isDefault" = false WHERE "organizationId" = ${organizationId}`;
  }

  private async uniqueSlug(organizationId: string, name: string) {
    const base = slugify(name, { lower: true, strict: true }) || 'product-type';
    let slug = base;
    let index = 2;
    while (true) {
      const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "ProductType" WHERE "organizationId" = ${organizationId} AND slug = ${slug} LIMIT 1
      `;
      if (!rows.length) return slug;
      slug = `${base}-${index++}`;
    }
  }

  private fieldKey(value?: string) {
    return slugify(value || '', { lower: false, strict: true }).replace(/^[0-9]+/, '').replace(/-([a-zA-Z])/g, (_, char) => char.toUpperCase());
  }

  private kind(value?: string) {
    const kind = String(value || 'physical').trim().toLowerCase();
    if (!(productKinds as readonly string[]).includes(kind)) throw new BadRequestException('Invalid product kind');
    return kind;
  }

  private fieldType(value?: string) {
    const type = String(value || 'text').trim().toLowerCase();
    if (!(productFieldTypes as readonly string[]).includes(type)) throw new BadRequestException('Invalid field type');
    return type;
  }

  private trackInventory(kind: string, value?: boolean) {
    if (kind === 'service' || kind === 'digital') return false;
    return value ?? true;
  }

  private optional(value?: string | null) {
    const next = value?.trim();
    return next || null;
  }
}
