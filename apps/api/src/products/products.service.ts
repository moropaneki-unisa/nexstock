import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CustomField, CustomFieldType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookEventsService } from '../webhooks/webhook-events.service';
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

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhooks: WebhookEventsService,
  ) {}

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

      const skuPrefix = organization.skuPrefix ?? this.generateSkuPrefix(organization.name);
      const sku = this.generateSku(skuPrefix, organization.nextSkuNumber);

      const activeFields = await db.customField.findMany({
        where: { organizationId, isActive: true },
      });

      this.validateCustomFieldValues(activeFields, dto.customFieldValues ?? []);

      const created = await db.product.create({
        data: {
          organizationId,
          name: dto.name.trim(),
          sku,
          description: dto.description?.trim(),
          price: dto.price,
          cost: dto.cost,
          quantity,
          lowStockLevel: dto.lowStockLevel ?? 5,
          category: dto.category?.trim(),
          images: dto.images ?? [],
          metadata: dto.metadata === undefined ? undefined : (dto.metadata as Prisma.InputJsonValue),
          customFieldValues: {
            create: this.buildCustomFieldValueCreates(activeFields, dto.customFieldValues ?? []),
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

    const data: Prisma.ProductUpdateInput = {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.description !== undefined ? { description: dto.description?.trim() } : {}),
      ...(dto.price !== undefined ? { price: dto.price } : {}),
      ...(dto.cost !== undefined ? { cost: dto.cost } : {}),
      ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}),
      ...(dto.lowStockLevel !== undefined ? { lowStockLevel: dto.lowStockLevel } : {}),
      ...(dto.category !== undefined ? { category: dto.category?.trim() } : {}),
      ...(dto.images !== undefined ? { images: dto.images } : {}),
      ...(dto.metadata !== undefined ? { metadata: dto.metadata as Prisma.InputJsonValue } : {}),
    };

    const updated = await this.prisma.$transaction(async (tx) => {
      const db = tx as PrismaTransaction;
      const activeFields = await db.customField.findMany({
        where: { organizationId, isActive: true },
      });

      if (dto.customFieldValues) {
        this.validateCustomFieldValues(activeFields, dto.customFieldValues);
      }

      await db.product.update({
        where: { id_organizationId: { id, organizationId } },
        data,
      });

      if (dto.customFieldValues) {
        for (const item of dto.customFieldValues) {
          await db.productCustomFieldValue.upsert({
            where: {
              productId_fieldId: {
                productId: id,
                fieldId: item.fieldId,
              },
            },
            create: {
              productId: id,
              fieldId: item.fieldId,
              value: item.value as Prisma.InputJsonValue,
            },
            update: {
              value: item.value as Prisma.InputJsonValue,
            },
          });
        }
      }

      if (dto.quantity !== undefined && dto.quantity !== existing.quantity) {
        await db.inventoryLog.create({
          data: {
            organizationId,
            productId: id,
            type: 'adjustment',
            quantityBefore: existing.quantity,
            quantityAfter: dto.quantity,
            delta: dto.quantity - existing.quantity,
            reason: 'Quantity updated',
            source: 'app',
          },
        });
      }

      return db.product.findFirstOrThrow({
        where: { id, organizationId },
        include: {
          customFieldValues: {
            include: { field: true },
            orderBy: { field: { order: 'asc' } },
          },
        },
      });
    }, PRODUCT_TRANSACTION_OPTIONS);

    if (dto.quantity !== undefined && dto.quantity !== existing.quantity) {
      await this.webhooks.emit(organizationId, 'inventory_updated', {
        productId: id,
        previousQuantity: existing.quantity,
        newQuantity: dto.quantity,
      });
    }

    await this.webhooks.emit(organizationId, 'product_updated', {
      productId: id,
      sku: updated.sku,
      name: updated.name,
    });

    return updated;
  }

  async adjustInventory(organizationId: string, id: string, dto: AdjustInventoryDto) {
    const existing = await this.get(organizationId, id);
    const nextQuantity = existing.quantity + dto.delta;

    if (nextQuantity < 0) {
      throw new ConflictException('Inventory quantity cannot go below zero');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const db = tx as PrismaTransaction;
      const product = await db.product.update({
        where: { id_organizationId: { id, organizationId } },
        data: { quantity: nextQuantity },
      });

      await db.inventoryLog.create({
        data: {
          organizationId,
          productId: id,
          type: 'adjustment',
          quantityBefore: existing.quantity,
          quantityAfter: nextQuantity,
          delta: dto.delta,
          reason: dto.reason ?? 'Inventory adjustment',
          source: dto.source ?? 'app',
          referenceId: dto.referenceId,
        },
      });

      return product;
    }, PRODUCT_TRANSACTION_OPTIONS);

    await this.webhooks.emit(organizationId, 'inventory_updated', {
      productId: id,
      previousQuantity: existing.quantity,
      newQuantity: nextQuantity,
    });

    return updated;
  }

  async softDelete(organizationId: string, id: string) {
    await this.get(organizationId, id);

    return this.prisma.product.update({
      where: { id_organizationId: { id, organizationId } },
      data: { deletedAt: new Date(), status: 'archived' },
    });
  }

  private generateSkuPrefix(companyName: string) {
    const prefix = companyName.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();

    if (prefix.length >= 3) return prefix;
    return prefix.padEnd(3, 'X');
  }

  private generateSku(prefix: string, nextSkuNumber: number) {
    return `${prefix}-${String(nextSkuNumber).padStart(5, '0')}`;
  }

  private validateCustomFieldValues(fields: CustomField[], values: ProductCustomFieldValueDto[]) {
    const valuesByFieldId = new Map(values.map((item) => [item.fieldId, item]));
    const fieldIds = new Set(fields.map((field) => field.id));

    for (const value of values) {
      if (!fieldIds.has(value.fieldId)) {
        throw new BadRequestException(
          `Custom field "${value.fieldId}" does not exist for this organization`,
        );
      }
    }

    for (const field of fields) {
      const provided = valuesByFieldId.get(field.id);

      if (
        field.required &&
        (provided === undefined ||
          provided.value === undefined ||
          provided.value === null ||
          provided.value === '')
      ) {
        throw new BadRequestException(`Custom field "${field.label}" is required`);
      }

      if (provided !== undefined) {
        this.validateValueType(field, provided.value);
      }
    }
  }

  private validateValueType(field: CustomField, value: unknown) {
    if (value === undefined || value === null || value === '') return;

    switch (field.type) {
      case CustomFieldType.text:
        if (typeof value !== 'string') {
          throw new BadRequestException(`"${field.label}" must be text`);
        }
        return;

      case CustomFieldType.number:
        if (typeof value !== 'number' || Number.isNaN(value)) {
          throw new BadRequestException(`"${field.label}" must be a number`);
        }
        return;

      case CustomFieldType.boolean:
        if (typeof value !== 'boolean') {
          throw new BadRequestException(`"${field.label}" must be true or false`);
        }
        return;

      case CustomFieldType.select:
        if (typeof value !== 'string') {
          throw new BadRequestException(`"${field.label}" must be a selected option`);
        }

        if (!field.options.includes(value)) {
          throw new BadRequestException(
            `"${field.label}" must be one of: ${field.options.join(', ')}`,
          );
        }
        return;

      case CustomFieldType.date:
        if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
          throw new BadRequestException(`"${field.label}" must be a valid date`);
        }
        return;

      case CustomFieldType.json:
        return;

      default:
        throw new BadRequestException('Unsupported custom field type');
    }
  }

  private buildCustomFieldValueCreates(fields: CustomField[], values: ProductCustomFieldValueDto[]) {
    const valuesByFieldId = new Map(values.map((item) => [item.fieldId, item.value]));

    return fields
      .map((field) => {
        const providedValue = valuesByFieldId.get(field.id);
        const value = providedValue === undefined ? field.defaultValue : providedValue;

        if (value === undefined || value === null || value === '') return null;

        return {
          fieldId: field.id,
          value: value as Prisma.InputJsonValue,
        };
      })
      .filter(Boolean) as Array<{
      fieldId: string;
      value: Prisma.InputJsonValue;
    }>;
  }
}
