import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CustomField, CustomFieldType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookEventsService } from '../webhooks/webhook-events.service';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';
import { Express } from 'express';
import {
  AdjustInventoryDto,
  CreateProductDto,
  ListProductsDto,
  ProductCustomFieldValueDto,
  UpdateProductDto,
} from './dto';

const PRODUCT_TRANSACTION_OPTIONS = {
  maxWait: 10_000,
  timeout: 30_000,
};

type PrismaTransaction = Omit<PrismaService, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

type NormalizedCustomFieldValue = {
  fieldId: string;
  value: Prisma.InputJsonValue;
};

type CurrencySettings = {
  baseCurrency: string;
  enabledCurrencies: string[];
  exchangeRates: Array<{ code: string; rateToBase: number }>;
};

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhooks: WebhookEventsService,
  ) {}

  async uploadImage(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'products',
          resource_type: 'image',
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(stream);
    });
  }

  async uploadAndAttachImage(
    organizationId: string,
    productId: string,
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const uploadResult: any = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'products',
          resource_type: 'image',
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(stream);
    });

    const imageUrl = uploadResult.secure_url;
    const product = await this.get(organizationId, productId);

    return this.prisma.product.update({
      where: { id: productId },
      data: {
        images: [...(product.images || []), imageUrl],
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
        include: {
          variants: true,
          customFieldValues: {
            include: { field: true },
            orderBy: { field: { order: 'asc' } },
          },
        },
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
        customFieldValues: {
          include: { field: true },
          orderBy: { field: { order: 'asc' } },
        },
      },
    });

    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(organizationId: string, dto: CreateProductDto) {
    const quantity = dto.quantity ?? 0;

    const product = await this.prisma.$transaction(async (tx) => {
      const db = tx as PrismaTransaction;
      const organization = await db.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        throw new NotFoundException('Organization not found');
      }

      const currencySettings = this.organizationCurrencySettings(organization);
      const currencyData = this.productCurrencyData(dto, currencySettings);
      const skuPrefix = organization.skuPrefix ?? this.generateSkuPrefix(organization.name);
      const sku = this.generateSku(skuPrefix, organization.nextSkuNumber);

      const activeFields = await db.customField.findMany({
        where: { organizationId, isActive: true },
        orderBy: { order: 'asc' },
      });

      const customFieldValues = this.normalizeCustomFieldValues(activeFields, dto.customFieldValues ?? []);

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
          metadata: dto.metadata === undefined ? undefined : (dto.metadata as Prisma.InputJsonValue),
          customFieldValues: {
            create: customFieldValues.map((item) => ({
              fieldId: item.fieldId,
              value: item.value,
            })),
          },
        },
        include: {
          customFieldValues: {
            include: { field: true },
            orderBy: { field: { order: 'asc' } },
          },
        },
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
      if (dto.metadata !== undefined) {
        data.metadata = dto.metadata as Prisma.InputJsonValue;
      }

      if (dto.customFieldValues !== undefined) {
        const activeFields = await tx.customField.findMany({
          where: { organizationId, isActive: true },
          orderBy: { order: 'asc' },
        });
        const customFieldValues = this.normalizeCustomFieldValues(activeFields, dto.customFieldValues);
        const activeFieldIds = activeFields.map((field) => field.id);

        await tx.productCustomFieldValue.deleteMany({
          where: {
            productId: id,
            fieldId: { in: activeFieldIds },
          },
        });

        if (customFieldValues.length > 0) {
          await tx.productCustomFieldValue.createMany({
            data: customFieldValues.map((item) => ({
              productId: id,
              fieldId: item.fieldId,
              value: item.value,
            })),
          });
        }
      }

      return tx.product.update({
        where: { id },
        data,
        include: {
          variants: true,
          customFieldValues: {
            include: { field: true },
            orderBy: { field: { order: 'asc' } },
          },
        },
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
    if (!Number.isFinite(delta) || delta === 0) {
      throw new BadRequestException('Inventory delta must be a non-zero integer');
    }
    const before = product.quantity;
    const after = before + delta;
    if (after < 0) {
      throw new BadRequestException('Inventory cannot go below zero');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.product.update({
        where: { id },
        data: { quantity: after },
      });
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
    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { ok: true, id };
  }

  private organizationCurrencySettings(organization: {
    baseCurrency?: string | null;
    enabledCurrencies?: string[] | null;
    exchangeRates?: Prisma.JsonValue | null;
  }): CurrencySettings {
    const baseCurrency = this.normalizeCurrencyCode(organization.baseCurrency || 'ZAR');
    const enabledCurrencies = Array.from(new Set([baseCurrency, ...(organization.enabledCurrencies ?? []).map((code) => this.normalizeCurrencyCode(code))]));
    const exchangeRates = this.normalizeExchangeRates(organization.exchangeRates);
    return { baseCurrency, enabledCurrencies, exchangeRates };
  }

  private productCurrencyData(
    dto: {
      price: number;
      priceCurrency?: string | null;
      cost?: number | null;
      costCurrency?: string | null;
      exchangeRateToBase?: number | null;
      convertedCost?: number | null;
    },
    settings: CurrencySettings,
  ) {
    const priceCurrency = this.normalizeCurrencyCode(dto.priceCurrency || settings.baseCurrency);
    if (priceCurrency !== settings.baseCurrency) {
      throw new BadRequestException('Selling price currency must match organization base currency for now');
    }
    if (!settings.enabledCurrencies.includes(priceCurrency)) {
      throw new BadRequestException(`${priceCurrency} is not enabled for this organization`);
    }

    if (dto.cost === undefined || dto.cost === null) {
      return {
        priceCurrency,
        costCurrency: undefined,
        exchangeRateToBase: undefined,
        convertedCost: undefined,
      };
    }

    const costCurrency = this.normalizeCurrencyCode(dto.costCurrency || priceCurrency);
    if (!settings.enabledCurrencies.includes(costCurrency)) {
      throw new BadRequestException(`${costCurrency} is not enabled for this organization`);
    }

    const exchangeRateToBase = Number(dto.exchangeRateToBase ?? this.rateFor(costCurrency, settings));
    if (!Number.isFinite(exchangeRateToBase) || exchangeRateToBase <= 0) {
      throw new BadRequestException('Exchange rate must be greater than zero');
    }

    const convertedCost = Number(dto.convertedCost ?? Number((Number(dto.cost) * exchangeRateToBase).toFixed(2)));

    return {
      priceCurrency,
      costCurrency,
      exchangeRateToBase,
      convertedCost,
    };
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
    if (typeof value === 'object') {
      return Object.entries(value).map(([code, rate]) => ({ code: this.normalizeCurrencyCode(code), rateToBase: Number(rate || 1) }));
    }
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

  private normalizeCustomFieldValues(fields: CustomField[], values: ProductCustomFieldValueDto[]): NormalizedCustomFieldValue[] {
    const fieldsById = new Map(fields.map((field) => [field.id, field]));
    const inputByFieldId = new Map<string, ProductCustomFieldValueDto>();

    for (const item of values ?? []) {
      if (!item?.fieldId) continue;
      if (!fieldsById.has(item.fieldId)) {
        throw new BadRequestException('One or more product attributes are invalid or inactive');
      }
      if (inputByFieldId.has(item.fieldId)) {
        throw new BadRequestException('Duplicate product attribute values are not allowed');
      }
      inputByFieldId.set(item.fieldId, item);
    }

    const normalized: NormalizedCustomFieldValue[] = [];

    for (const field of fields) {
      const input = inputByFieldId.get(field.id);
      const rawValue = input?.value ?? field.defaultValue;
      const hasValue = !this.isEmptyCustomValue(rawValue);

      if (field.required && !hasValue) {
        throw new BadRequestException(`Product attribute "${field.label}" is required`);
      }

      if (!hasValue) continue;

      normalized.push({
        fieldId: field.id,
        value: this.normalizeCustomFieldValue(field, rawValue),
      });
    }

    return normalized;
  }

  private normalizeCustomFieldValue(field: CustomField, rawValue: unknown): Prisma.InputJsonValue {
    switch (field.type) {
      case CustomFieldType.number: {
        const value = Number(rawValue);
        if (!Number.isFinite(value)) {
          throw new BadRequestException(`Product attribute "${field.label}" must be a valid number`);
        }
        return value;
      }
      case CustomFieldType.boolean: {
        if (typeof rawValue === 'boolean') return rawValue;
        if (rawValue === 'true') return true;
        if (rawValue === 'false') return false;
        throw new BadRequestException(`Product attribute "${field.label}" must be true or false`);
      }
      case CustomFieldType.select: {
        const value = String(rawValue).trim();
        if (!field.options.includes(value)) {
          throw new BadRequestException(`Product attribute "${field.label}" must match one of its configured options`);
        }
        return value;
      }
      case CustomFieldType.date: {
        const value = String(rawValue).trim();
        if (Number.isNaN(Date.parse(value))) {
          throw new BadRequestException(`Product attribute "${field.label}" must be a valid date`);
        }
        return value;
      }
      case CustomFieldType.json: {
        if (typeof rawValue === 'string') {
          try {
            return JSON.parse(rawValue) as Prisma.InputJsonValue;
          } catch {
            throw new BadRequestException(`Product attribute "${field.label}" must be valid JSON`);
          }
        }
        return rawValue as Prisma.InputJsonValue;
      }
      case CustomFieldType.text:
      default:
        return String(rawValue).trim();
    }
  }

  private isEmptyCustomValue(value: unknown) {
    return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
  }
}
