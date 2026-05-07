import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CustomField, Prisma } from '@prisma/client';
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

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhooks: WebhookEventsService,
  ) {}

  async uploadImage(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'products', resource_type: 'image' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(stream);
    });
  }

  async uploadAndAttachImage(organizationId: string, productId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');

    const uploadResult: any = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'products', resource_type: 'image' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(stream);
    });

    const product = await this.get(organizationId, productId);
    const images = [...this.asStringArray(product.images), uploadResult.secure_url].filter(Boolean);

    return this.prisma.product.update({
      where: { id_organizationId: { id: productId, organizationId } },
      data: { images: images as Prisma.InputJsonValue },
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
              { name: { contains: query.search } },
              { sku: { contains: query.search } },
              { category: { contains: query.search } },
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
          customFieldValues: { include: { field: true }, orderBy: { field: { order: 'asc' } } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async get(organizationId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        variants: true,
        inventoryLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
        customFieldValues: { include: { field: true }, orderBy: { field: { order: 'asc' } } },
      },
    });

    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(organizationId: string, dto: CreateProductDto) {
    const quantity = dto.quantity ?? 0;

    const product = await this.prisma.$transaction(async (tx) => {
      const db = tx as PrismaTransaction;
      const organization = await db.organization.findUnique({ where: { id: organizationId } });
      if (!organization) throw new NotFoundException('Organization not found');

      const skuPrefix = organization.skuPrefix ?? this.generateSkuPrefix(organization.name);
      const sku = this.generateSku(skuPrefix, organization.nextSkuNumber);
      const activeFields = await db.customField.findMany({ where: { organizationId, isActive: true } });

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
          images: (dto.images ?? []) as Prisma.InputJsonValue,
          metadata: dto.metadata === undefined ? undefined : (dto.metadata as Prisma.InputJsonValue),
          customFieldValues: { create: this.buildCustomFieldValueCreates(activeFields, dto.customFieldValues ?? []) },
        },
        include: { customFieldValues: { include: { field: true }, orderBy: { field: { order: 'asc' } } } },
      });

      await db.organization.update({ where: { id: organizationId }, data: { skuPrefix, nextSkuNumber: { increment: 1 } } });

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

    await this.webhooks.emit(organizationId, 'product_created', { productId: product.id, sku: product.sku, name: product.name });
    return product;
  }

  async update(organizationId: string, id: string, dto: UpdateProductDto) {
    await this.get(organizationId, id);
    const data: Prisma.ProductUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim();
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.cost !== undefined) data.cost = dto.cost;
    if (dto.quantity !== undefined) data.quantity = dto.quantity;
    if (dto.lowStockLevel !== undefined) data.lowStockLevel = dto.lowStockLevel;
    if (dto.category !== undefined) data.category = dto.category?.trim();
    if (dto.images !== undefined) data.images = dto.images as Prisma.InputJsonValue;
    if (dto.metadata !== undefined) data.metadata = dto.metadata as Prisma.InputJsonValue;

    const updated = await this.prisma.product.update({ where: { id_organizationId: { id, organizationId } }, data });
    await this.webhooks.emit(organizationId, 'product_updated', { productId: updated.id, sku: updated.sku, name: updated.name });
    return updated;
  }

  async adjustInventory(organizationId: string, id: string, dto: AdjustInventoryDto) {
    const product = await this.get(organizationId, id);
    const delta = Number(dto.delta ?? 0);
    const next = product.quantity + delta;

    if (next < 0) throw new BadRequestException('Inventory quantity cannot be negative');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({ where: { id_organizationId: { id, organizationId } }, data: { quantity: next } });
      await tx.inventoryLog.create({
        data: {
          organizationId,
          productId: id,
          type: 'adjustment',
          quantityBefore: product.quantity,
          quantityAfter: next,
          delta,
          reason: dto.reason,
          source: dto.source ?? 'app',
          referenceId: dto.referenceId,
        },
      });

      await this.webhooks.emit(organizationId, 'inventory_updated', {
        productId: id,
        sku: product.sku,
        quantityBefore: product.quantity,
        quantityAfter: next,
        delta,
      });

      return updated;
    }, PRODUCT_TRANSACTION_OPTIONS);
  }

  async softDelete(organizationId: string, id: string) {
    await this.get(organizationId, id);
    return this.prisma.product.update({ where: { id_organizationId: { id, organizationId } }, data: { deletedAt: new Date() } });
  }

  private generateSkuPrefix(name: string) {
    return (name || 'ORG').slice(0, 3).toUpperCase();
  }

  private generateSku(prefix: string, num: number) {
    return `${prefix}-${String(num ?? 1).padStart(5, '0')}`;
  }

  private validateCustomFieldValues(_fields: CustomField[], _values: ProductCustomFieldValueDto[]) {
    return true;
  }

  private buildCustomFieldValueCreates(_fields: CustomField[], _values: ProductCustomFieldValueDto[]) {
    return [] as any[];
  }

  private asStringArray(value: Prisma.JsonValue | null): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  }
}
