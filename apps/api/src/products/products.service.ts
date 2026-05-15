import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { PlanLimitsService } from '../plan-limits/plan-limits.service';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookEventsService } from '../webhooks/webhook-events.service';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';
import { Express } from 'express';
import {
  AdjustInventoryDto,
  CreateProductDto,
  ListProductsDto,
  UpdateProductDto,
} from './dto';

const PRODUCT_TRANSACTION_OPTIONS = {
  maxWait: 10_000,
  timeout: 30_000,
};

const LAYOUT_FIELD_TYPES = new Set([
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
]);

const LOOKUP_SOURCES = new Set(['suppliers', 'products', 'customers']);

type PrismaTransaction = Omit<PrismaService, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

type ProductUpdateInput = UpdateProductDto & { status?: ProductStatus };

type CurrencySettings = {
  baseCurrency: string;
  enabledCurrencies: string[];
  exchangeRates: Array<{ code: string; rateToBase: number }>;
};

type ProductTypeRow = {
  id: string;
  name: string;
  kind: string;
  trackInventory: boolean;
  isDefault: boolean;
};

type ProductTypeFieldRow = {
  id: string;
  productTypeId: string;
  key: string;
  label: string;
  type: string;
  required: boolean;
  options: string[];
  defaultValue: Prisma.JsonValue | null;
  order: number;
  isActive: boolean;
};

type ProductMetadata = {
  productTypeId?: string;
  productTypeName?: string;
  kind?: string;
  trackInventory?: boolean;
  customFields?: Record<string, unknown>;
  [key: string]: unknown;
};

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhooks: WebhookEventsService,
    private readonly planLimits: PlanLimitsService,
  ) {}

  async uploadAsset(file: Express.Multer.File, resourceType: 'auto' | 'image' = 'auto') {
    if (!file) throw new BadRequestException('No file uploaded');

    const uploadResult: any = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: resourceType === 'image' ? 'products/images' : 'products/attachments',
          resource_type: resourceType,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(stream);
    });

    return {
      url: uploadResult.secure_url,
      name: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      publicId: uploadResult.public_id,
      resourceType: uploadResult.resource_type,
    };
  }

  async uploadImage(file: Express.Multer.File) {
    return this.uploadAsset(file, 'image');
  }

  async uploadAttachment(file: Express.Multer.File) {
    return this.uploadAsset(file, 'auto');
  }

  async uploadAndAttachImage(
    organizationId: string,
    productId: string,
    file: Express.Multer.File,
  ) {
    const uploaded = await this.uploadImage(file);
    const product = await this.get(organizationId, productId);

    return this.prisma.product.update({
      where: { id: productId },
      data: {
        images: [...(product.images || []), uploaded.url],
      },
    });
  }

  async list(organizationId: string, query: ListProductsDto) {
    const page = Math.max(Number(query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(query.limit ?? 25), 1), 100);

    const where: Prisma.ProductWhereInput = {
      organizationId,
      deletedAt: null,
      ...(query.category ? { category: query.category } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.productTypeId ? { metadata: { path: ['productTypeId'], equals: query.productTypeId } } : {}),
      ...(query.kind ? { metadata: { path: ['kind'], equals: query.kind } } : {}),
      ...(query.trackInventory !== undefined ? { metadata: { path: ['trackInventory'], equals: query.trackInventory } } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { sku: { contains: query.search, mode: 'insensitive' } },
              { category: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { variants: true },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async get(organizationId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        variants: true,
        inventoryLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(organizationId: string, dto: CreateProductDto) {
    await this.planLimits.assertCanCreateProduct(organizationId);
    const quantity = dto.quantity ?? 0;

    const product = await this.prisma.$transaction(async (tx) => {
      const db = tx as PrismaTransaction;
      const organization = await db.organization.findUnique({ where: { id: organizationId } });

      if (!organization) throw new NotFoundException('Organization not found');

      const currencySettings = this.organizationCurrencySettings(organization);
      const currencyData = this.productCurrencyData(dto, currencySettings);
      const skuPrefix = organization.skuPrefix ?? this.generateSkuPrefix(organization.name);
      const skuData = await this.nextAvailableSku(db, organizationId, skuPrefix, organization.nextSkuNumber);
      const metadata = await this.productMetadata(db, organizationId, dto, dto.metadata);

      const created = await db.product.create({
        data: {
          organizationId,
          name: dto.name.trim(),
          sku: skuData.sku,
          description: dto.description?.trim(),
          price: dto.price,
          priceCurrency: currencyData.priceCurrency,
          cost: dto.cost,
          costCurrency: currencyData.costCurrency,
          exchangeRateToBase: currencyData.exchangeRateToBase,
          convertedCost: currencyData.convertedCost,
          quantity,
          lowStockLevel: dto.lowStockLevel ?? 5,
          category: dto.category?.trim(),
          images: dto.images ?? [],
          metadata: metadata as Prisma.InputJsonValue,
        },
        include: { variants: true },
      });

      await db.organization.update({
        where: { id: organizationId },
        data: {
          skuPrefix,
          nextSkuNumber: skuData.nextNumber,
        },
      });

      if (quantity > 0) {
        await db.inventoryLog.create({
          data: {
            organizationId,
            productId: created.id,
            type: 'manual',
            quantityBefore: 0,
            quantityAfter: quantity,
            delta: quantity,
            reason: 'Initial product creation',
            source: 'app',
          },
        });
      }

      return created;
    }, PRODUCT_TRANSACTION_OPTIONS);

    await this.webhooks.emit(organizationId, 'product_created', {
      productId: product.id,
      sku: product.sku,
      name: product.name,
    });

    return product;
  }

  async update(organizationId: string, id: string, dto: ProductUpdateInput) {
    const existing = await this.get(organizationId, id);

    const updated = await this.prisma.$transaction(async (tx) => {
      const data: Prisma.ProductUpdateInput = {};
      const organization = await tx.organization.findUnique({ where: { id: organizationId } });
      if (!organization) throw new NotFoundException('Organization not found');

      const currencySettings = this.organizationCurrencySettings(organization);
      const currencyData = this.productCurrencyData(
        {
          price: dto.price ?? Number(existing.price),
          priceCurrency: dto.priceCurrency ?? existing.priceCurrency,
          cost: dto.cost ?? (existing.cost === null ? undefined : Number(existing.cost)),
          costCurrency: dto.costCurrency ?? existing.costCurrency ?? undefined,
          exchangeRateToBase: dto.exchangeRateToBase ?? (existing.exchangeRateToBase === null ? undefined : Number(existing.exchangeRateToBase)),
          convertedCost: dto.convertedCost ?? (existing.convertedCost === null ? undefined : Number(existing.convertedCost)),
        },
        currencySettings,
      );

      if (dto.name !== undefined) data.name = dto.name.trim();
      if (dto.description !== undefined) data.description = dto.description?.trim();
      if (dto.price !== undefined) data.price = dto.price;
      if (dto.priceCurrency !== undefined) data.priceCurrency = currencyData.priceCurrency;
      if (dto.cost !== undefined) data.cost = dto.cost;
      if (dto.costCurrency !== undefined || dto.cost !== undefined) data.costCurrency = currencyData.costCurrency;
      if (dto.exchangeRateToBase !== undefined || dto.costCurrency !== undefined || dto.cost !== undefined) data.exchangeRateToBase = currencyData.exchangeRateToBase;
      if (dto.convertedCost !== undefined || dto.exchangeRateToBase !== undefined || dto.costCurrency !== undefined || dto.cost !== undefined) data.convertedCost = currencyData.convertedCost;
      if (dto.quantity !== undefined) data.quantity = dto.quantity;
      if (dto.lowStockLevel !== undefined) data.lowStockLevel = dto.lowStockLevel;
      if (dto.category !== undefined) data.category = dto.category?.trim();
      if (dto.status !== undefined) data.status = dto.status;
      if (dto.images !== undefined) data.images = dto.images;

      if (dto.metadata !== undefined || dto.customFields !== undefined || dto.productTypeId !== undefined || dto.kind !== undefined || dto.trackInventory !== undefined) {
        const metadata = await this.productMetadata(tx as PrismaTransaction, organizationId, dto, dto.metadata, this.metadataObject(existing.metadata));
        data.metadata = metadata as Prisma.InputJsonValue;
      }

      return tx.product.update({
        where: { id },
        data,
        include: { variants: true },
      });
    }, PRODUCT_TRANSACTION_OPTIONS);

    await this.webhooks.emit(organizationId, 'product_updated', {
      productId: updated.id,
      sku: updated.sku,
      name: updated.name,
    });

    return updated;
  }

  async adjustInventory(
    organizationId: string,
    id: string,
    dto: AdjustInventoryDto,
  ) {
    const product = await this.get(organizationId, id);
    const delta = Number(dto.delta ?? 0);
    if (!Number.isFinite(delta) || delta === 0) throw new BadRequestException('Inventory delta must be a non-zero integer');
    const before = product.quantity;
    const after = before + delta;
    if (after < 0) throw new BadRequestException('Inventory cannot go below zero');

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.product.update({ where: { id }, data: { quantity: after } });
      await tx.inventoryLog.create({
        data: {
          organizationId,
          productId: id,
          type: 'manual',
          quantityBefore: before,
          quantityAfter: after,
          delta,
          reason: dto.reason?.trim(),
          source: dto.source?.trim() ?? 'app',
          referenceId: dto.referenceId?.trim(),
        },
      });
      return next;
    });

    await this.webhooks.emit(organizationId, 'inventory_updated', {
      productId: updated.id,
      sku: updated.sku,
      delta,
      quantity: after,
    });

    return updated;
  }

  async softDelete(organizationId: string, id: string) {
    await this.get(organizationId, id);
    await this.prisma.product.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ok: true, id };
  }

  private async productMetadata(
    db: PrismaTransaction,
    organizationId: string,
    dto: { productTypeId?: string; kind?: string; trackInventory?: boolean; customFields?: unknown },
    incomingMetadata?: unknown,
    existing: ProductMetadata = {},
  ): Promise<ProductMetadata> {
    const incoming = this.metadataObject(incomingMetadata);
    const productTypeId = dto.productTypeId || incoming.productTypeId || existing.productTypeId;
    const layout = productTypeId ? await this.layoutWithFields(db, organizationId, productTypeId) : null;
    const customFieldsInput = this.recordObject(dto.customFields) ?? this.recordObject(incoming.customFields) ?? this.recordObject(existing.customFields) ?? {};
    const normalizedCustomFields = layout ? this.normalizeLayoutValues(layout.fields, customFieldsInput) : customFieldsInput;

    return {
      ...existing,
      ...incoming,
      productTypeId: layout?.type.id ?? productTypeId,
      productTypeName: layout?.type.name ?? incoming.productTypeName ?? existing.productTypeName,
      kind: dto.kind || layout?.type.kind || incoming.kind || existing.kind || 'physical',
      trackInventory: dto.trackInventory ?? layout?.type.trackInventory ?? incoming.trackInventory ?? existing.trackInventory ?? true,
      customFields: normalizedCustomFields,
    };
  }

  private async layoutWithFields(db: PrismaTransaction, organizationId: string, productTypeId: string) {
    try {
      const types = await db.$queryRaw<ProductTypeRow[]>`
        SELECT id, name, kind, "trackInventory", "isDefault"
        FROM "ProductType"
        WHERE id = ${productTypeId} AND "organizationId" = ${organizationId} AND "isActive" = true
        LIMIT 1
      `;
      const type = types[0];
      if (!type) throw new BadRequestException('Selected layout does not exist');

      const fields = await db.$queryRaw<ProductTypeFieldRow[]>`
        SELECT id, "productTypeId", key, label, type, required, options, "defaultValue", "order", "isActive"
        FROM "ProductTypeField"
        WHERE "productTypeId" = ${productTypeId} AND "organizationId" = ${organizationId} AND "isActive" = true
        ORDER BY "order" ASC, label ASC
      `;
      return { type, fields };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      if (this.isMissingLayoutMigrationError(error)) {
        throw new InternalServerErrorException('Product layout database tables are missing. Run the latest Prisma migrations for main-v2 before creating products.');
      }
      throw error;
    }
  }

  private normalizeLayoutValues(fields: ProductTypeFieldRow[], values: Record<string, unknown>) {
    const output: Record<string, unknown> = {};
    const fieldKeys = new Set(fields.map((field) => field.key));
    const unknownKeys = Object.keys(values).filter((key) => !fieldKeys.has(key));
    if (unknownKeys.length) {
      throw new BadRequestException(`Unknown layout field${unknownKeys.length === 1 ? '' : 's'}: ${unknownKeys.join(', ')}`);
    }

    for (const field of fields) {
      this.assertKnownLayoutType(field);
      const rawValue = values[field.key] ?? field.defaultValue;
      const hasValue = !this.isEmptyLayoutValue(rawValue);
      if (field.required && !hasValue) throw new BadRequestException(`Layout field "${field.label}" is required`);
      if (!hasValue) continue;
      output[field.key] = this.normalizeLayoutValue(field, rawValue);
    }
    return output;
  }

  private normalizeLayoutValue(field: ProductTypeFieldRow, rawValue: unknown): Prisma.InputJsonValue {
    switch (field.type) {
      case 'number': {
        const value = Number(rawValue);
        if (!Number.isInteger(value)) throw new BadRequestException(`Layout field "${field.label}" must be a whole number`);
        return value;
      }
      case 'decimal': {
        const value = Number(rawValue);
        if (!Number.isFinite(value)) throw new BadRequestException(`Layout field "${field.label}" must be a valid decimal`);
        return value;
      }
      case 'currency': {
        if (!this.isPlainObject(rawValue)) throw new BadRequestException(`Layout field "${field.label}" must be a currency object`);
        const amount = Number(rawValue.amount ?? rawValue.value);
        const currency = this.normalizeCurrencyCode(String(rawValue.currency ?? ''));
        if (!Number.isFinite(amount)) throw new BadRequestException(`Layout field "${field.label}" must have a valid currency amount`);
        if (!/^[A-Z]{3}$/.test(currency)) throw new BadRequestException(`Layout field "${field.label}" must include a valid 3-letter currency code`);
        return { amount, currency };
      }
      case 'attachment': {
        if (!Array.isArray(rawValue)) throw new BadRequestException(`Layout field "${field.label}" must be an attachment array`);
        return rawValue.map((item) => {
          if (!this.isPlainObject(item)) throw new BadRequestException(`Layout field "${field.label}" attachments must be { name, url } objects`);
          const name = String(item.name ?? '').trim().replace(/\.[^./\\]+$/, '');
          const url = String(item.url ?? '').trim();
          if (!name || !this.isLikelyUrl(url)) throw new BadRequestException(`Layout field "${field.label}" attachments must include name and valid url`);
          return { name, url };
        }) as Prisma.InputJsonArray;
      }
      case 'images': {
        if (!Array.isArray(rawValue)) throw new BadRequestException(`Layout field "${field.label}" must be an image URL array`);
        const urls = rawValue.map((item) => String(item).trim()).filter(Boolean);
        if (urls.some((url) => !this.isLikelyUrl(url))) throw new BadRequestException(`Layout field "${field.label}" images must be valid URLs`);
        return urls as Prisma.InputJsonArray;
      }
      case 'lookup': {
        if (!this.isPlainObject(rawValue)) throw new BadRequestException(`Layout field "${field.label}" must be a lookup object`);
        this.assertLookupSource(field);
        const id = String(rawValue.id ?? '').trim();
        const name = String(rawValue.name ?? '').trim();
        if (!id || !name) throw new BadRequestException(`Layout field "${field.label}" lookup must include id and name`);
        return { id, name };
      }
      case 'boolean': {
        if (typeof rawValue === 'boolean') return rawValue;
        if (rawValue === 'true') return true;
        if (rawValue === 'false') return false;
        throw new BadRequestException(`Layout field "${field.label}" must be true or false`);
      }
      case 'select': {
        const value = String(rawValue).trim();
        const options = field.options.map((option) => String(option).trim()).filter(Boolean);
        if (!options.length) throw new BadRequestException(`Layout field "${field.label}" has no select options configured`);
        const matched = options.find((option) => option.toLowerCase() === value.toLowerCase());
        if (!matched) throw new BadRequestException(`Layout field "${field.label}" must match one of its options`);
        return matched;
      }
      case 'date': {
        const value = String(rawValue).trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))) {
          throw new BadRequestException(`Layout field "${field.label}" must be a valid date in YYYY-MM-DD format`);
        }
        return value;
      }
      case 'richtext':
      case 'text': {
        if (typeof rawValue === 'object') throw new BadRequestException(`Layout field "${field.label}" must be text`);
        return String(rawValue).trim();
      }
      default:
        throw new BadRequestException(`Layout field "${field.label}" has unsupported type "${field.type}"`);
    }
  }

  private assertKnownLayoutType(field: ProductTypeFieldRow) {
    if (!LAYOUT_FIELD_TYPES.has(String(field.type))) {
      throw new BadRequestException(`Layout field "${field.label}" has unsupported type "${field.type}"`);
    }
  }

  private assertLookupSource(field: ProductTypeFieldRow) {
    const source = String(field.options?.[0] || '').trim().toLowerCase();
    if (!LOOKUP_SOURCES.has(source)) {
      throw new BadRequestException(`Layout field "${field.label}" lookup source must be suppliers, products, or customers`);
    }
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
  }

  private isLikelyUrl(value: string) {
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  }

  private metadataObject(value: unknown): ProductMetadata {
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as ProductMetadata;
    return {};
  }

  private recordObject(value: unknown): Record<string, unknown> | null {
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
    return null;
  }

  private isEmptyLayoutValue(value: unknown) {
    return value === undefined || value === null || value === 'none' || (typeof value === 'string' && value.trim() === '') || (Array.isArray(value) && value.length === 0);
  }

  private isMissingLayoutMigrationError(error: unknown) {
    const message = String((error as { message?: unknown })?.message || error || '').toLowerCase();
    return message.includes('producttype') && (message.includes('does not exist') || message.includes('not exist') || message.includes('p2021') || message.includes('p2022'));
  }

  private async nextAvailableSku(db: PrismaTransaction, organizationId: string, prefix: string, currentNumber: number | null | undefined) {
    let nextNumber = Math.max(Number(currentNumber ?? 1), 1);

    for (let attempts = 0; attempts < 1000; attempts += 1) {
      const sku = this.generateSku(prefix, nextNumber);
      const existing = await db.product.findFirst({
        where: { organizationId, sku },
        select: { id: true },
      });
      if (!existing) return { sku, nextNumber: nextNumber + 1 };
      nextNumber += 1;
    }

    throw new BadRequestException('Could not generate a unique SKU. Please update the organization SKU prefix or try again.');
  }

  private organizationCurrencySettings(organization: { baseCurrency?: string | null; enabledCurrencies?: string[] | null; exchangeRates?: Prisma.JsonValue | null }): CurrencySettings {
    const baseCurrency = this.normalizeCurrencyCode(organization.baseCurrency || 'ZAR');
    const enabledCurrencies = Array.from(new Set([baseCurrency, ...(organization.enabledCurrencies ?? []).map((code) => this.normalizeCurrencyCode(code))]));
    const exchangeRates = this.normalizeExchangeRates(organization.exchangeRates);
    return { baseCurrency, enabledCurrencies, exchangeRates };
  }

  private productCurrencyData(dto: { price: number; priceCurrency?: string | null; cost?: number | null; costCurrency?: string | null; exchangeRateToBase?: number | null; convertedCost?: number | null }, settings: CurrencySettings) {
    const priceCurrency = this.normalizeCurrencyCode(dto.priceCurrency || settings.baseCurrency);
    if (priceCurrency !== settings.baseCurrency) throw new BadRequestException('Selling price currency must match organization base currency for now');
    if (!settings.enabledCurrencies.includes(priceCurrency)) throw new BadRequestException(`${priceCurrency} is not enabled for this organization`);

    if (dto.cost === undefined || dto.cost === null) return { priceCurrency, costCurrency: undefined, exchangeRateToBase: undefined, convertedCost: undefined };

    const costCurrency = this.normalizeCurrencyCode(dto.costCurrency || priceCurrency);
    if (!settings.enabledCurrencies.includes(costCurrency)) throw new BadRequestException(`${costCurrency} is not enabled for this organization`);

    const exchangeRateToBase = Number(dto.exchangeRateToBase ?? this.rateFor(costCurrency, settings));
    if (!Number.isFinite(exchangeRateToBase) || exchangeRateToBase <= 0) throw new BadRequestException('Exchange rate must be greater than zero');

    const convertedCost = Number(dto.convertedCost ?? Number((Number(dto.cost) * exchangeRateToBase).toFixed(2)));
    return { priceCurrency, costCurrency, exchangeRateToBase, convertedCost };
  }

  private normalizeCurrencyCode(value: string) {
    return String(value || 'ZAR').trim().toUpperCase();
  }

  private normalizeExchangeRates(value: Prisma.JsonValue | null | undefined): Array<{ code: string; rateToBase: number }> {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value
        .map((item) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
          const record = item as Record<string, unknown>;
          return { code: this.normalizeCurrencyCode(String(record.code ?? '')), rateToBase: Number(record.rateToBase ?? 1) };
        })
        .filter((item): item is { code: string; rateToBase: number } => Boolean(item?.code));
    }
    if (typeof value === 'object') return Object.entries(value).map(([code, rate]) => ({ code: this.normalizeCurrencyCode(code), rateToBase: Number(rate || 1) }));
    return [];
  }

  private rateFor(code: string, settings: CurrencySettings) {
    if (code === settings.baseCurrency) return 1;
    return settings.exchangeRates.find((rate) => rate.code === code)?.rateToBase ?? 1;
  }

  private generateSkuPrefix(name: string) {
    return (name || 'ORG').slice(0, 3).toUpperCase();
  }

  private generateSku(prefix: string, num: number) {
    return `${prefix}-${String(num ?? 1).padStart(5, '0')}`;
  }
}