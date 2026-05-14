import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

type PrismaTransaction = Omit<PrismaService, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

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
      const sku = this.generateSku(skuPrefix, organization.nextSkuNumber);
      const metadata = await this.productMetadata(db, organizationId, dto, dto.metadata);

      const created = await db.product.create({
        data: {
          organizationId,
          name: dto.name.trim(),
          sku,
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
          nextSkuNumber: { increment: 1 },
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

  async update(organizationId: string, id: string, dto: UpdateProductDto) {
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
      if (dto.images !== undefined) data.images = dto.images;

      if (dto.metadata !== undefined || dto.customFields !== undefined || dto.productTypeId !== undefined || dto.kind !== undefined || dto.trackInventory !== undefined) {
        data.metadata = await this.productMetadata(tx as PrismaTransaction, organizationId, dto, dto.metadata, this.metadataObject(existing.metadata));
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
  }

  private normalizeLayoutValues(fields: ProductTypeFieldRow[], values: Record<string, unknown>) {
    const output: Record<string, unknown> = {};
    for (const field of fields) {
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
        if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) throw new BadRequestException(`Layout field "${field.label}" must be a currency object`);
        const value = rawValue as Record<string, unknown>;
        const amount = Number(value.amount ?? value.value ?? 0);
        const currency = this.normalizeCurrencyCode(String(value.currency ?? 'ZAR'));
        if (!Number.isFinite(amount)) throw new BadRequestException(`Layout field "${field.label}" must have a valid currency amount`);
        return { amount, currency };
      }
      case 'attachment': {
        if (!Array.isArray(rawValue)) throw new BadRequestException(`Layout field "${field.label}" must be an array`);
        return rawValue.map((item) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) throw new BadRequestException(`Layout field "${field.label}" attachments must be { name, url } objects`);
          const value = item as Record<string, unknown>;
          const name = String(value.name ?? '').trim();
          const url = String(value.url ?? '').trim();
          if (!name || !url) throw new BadRequestException(`Layout field "${field.label}" attachments must include name and url`);
          return { name, url };
        }) as Prisma.InputJsonArray;
      }
      case 'images': {
        if (!Array.isArray(rawValue)) throw new BadRequestException(`Layout field "${field.label}" must be an array`);
        return rawValue.map((item) => String(item).trim()).filter(Boolean) as Prisma.InputJsonArray;
      }
      case 'lookup': {
        if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) throw new BadRequestException(`Layout field "${field.label}" must be a lookup object`);
        const value = rawValue as Record<string, unknown>;
        const id = String(value.id ?? '').trim();
        const name = String(value.name ?? '').trim();
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
        if (field.options.length > 0 && !field.options.includes(value)) throw new BadRequestException(`Layout field "${field.label}" must match one of its options`);
        return value;
      }
      case 'date': {
        const value = String(rawValue).trim();
        if (Number.isNaN(Date.parse(value))) throw new BadRequestException(`Layout field "${field.label}" must be a valid date`);
        return value;
      }
      case 'richtext':
      case 'text':
      default:
        return String(rawValue).trim();
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
    return value === undefined || value === null || (typeof value === 'string' && value.trim() === '') || (Array.isArray(value) && value.length === 0);
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
