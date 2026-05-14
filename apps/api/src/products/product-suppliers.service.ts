import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SupplierStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductSupplierDto, UpdateProductSupplierDto } from './product-suppliers.dto';

@Injectable()
export class ProductSuppliersService {
  constructor(private readonly db: PrismaService) {}

  async list(organizationId: string, productId: string) {
    await this.ensureProduct(organizationId, productId);
    return this.db.productSupplier.findMany({
      where: { organizationId, productId },
      include: { supplier: true },
      orderBy: [{ isPreferred: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async create(organizationId: string, productId: string, dto: CreateProductSupplierDto) {
    await this.ensureProduct(organizationId, productId);
    const supplier = await this.ensureSupplier(organizationId, dto.supplierId);
    const currency = this.currency(dto.currency || supplier.currency || 'USD');

    if (dto.isPreferred) await this.clearPreferred(organizationId, productId);

    return this.db.productSupplier.upsert({
      where: { productId_supplierId: { productId, supplierId: supplier.id } },
      create: {
        organizationId,
        productId,
        supplierId: supplier.id,
        supplierSku: this.optionalText(dto.supplierSku),
        cost: dto.cost === undefined ? undefined : new Prisma.Decimal(dto.cost),
        currency,
        minimumOrderQty: dto.minimumOrderQty,
        leadTimeDays: dto.leadTimeDays,
        isPreferred: Boolean(dto.isPreferred),
        notes: this.optionalText(dto.notes),
        metadata: this.jsonObject(dto.metadata),
      },
      update: {
        supplierSku: this.optionalText(dto.supplierSku),
        cost: dto.cost === undefined ? undefined : new Prisma.Decimal(dto.cost),
        currency,
        minimumOrderQty: dto.minimumOrderQty,
        leadTimeDays: dto.leadTimeDays,
        isPreferred: Boolean(dto.isPreferred),
        notes: this.optionalText(dto.notes),
        metadata: this.jsonObject(dto.metadata),
      },
      include: { supplier: true },
    });
  }

  async update(organizationId: string, productId: string, linkId: string, dto: UpdateProductSupplierDto) {
    const existing = await this.ensureProductSupplier(organizationId, productId, linkId);
    if (dto.isPreferred) await this.clearPreferred(organizationId, productId);

    return this.db.productSupplier.update({
      where: { id: existing.id },
      data: {
        supplierSku: dto.supplierSku === undefined ? undefined : this.optionalText(dto.supplierSku),
        cost: dto.cost === undefined ? undefined : new Prisma.Decimal(dto.cost),
        currency: dto.currency === undefined ? undefined : this.currency(dto.currency),
        minimumOrderQty: dto.minimumOrderQty,
        leadTimeDays: dto.leadTimeDays,
        isPreferred: dto.isPreferred,
        notes: dto.notes === undefined ? undefined : this.optionalText(dto.notes),
        metadata: dto.metadata === undefined ? undefined : this.jsonObject(dto.metadata),
      },
      include: { supplier: true },
    });
  }

  async remove(organizationId: string, productId: string, linkId: string) {
    const existing = await this.ensureProductSupplier(organizationId, productId, linkId);
    await this.db.productSupplier.delete({ where: { id: existing.id } });
    if (existing.isPreferred) {
      const next = await this.db.productSupplier.findFirst({ where: { organizationId, productId }, orderBy: { createdAt: 'asc' } });
      if (next) await this.db.productSupplier.update({ where: { id: next.id }, data: { isPreferred: true } });
    }
    return { ok: true, id: linkId };
  }

  private async ensureProduct(organizationId: string, productId: string) {
    const product = await this.db.product.findFirst({ where: { id: productId, organizationId, deletedAt: null }, select: { id: true } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  private async ensureSupplier(organizationId: string, supplierId: string) {
    const supplier = await this.db.supplier.findFirst({ where: { id: supplierId, organizationId } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    if (supplier.status !== SupplierStatus.active) throw new BadRequestException('Archived suppliers cannot be linked to products');
    return supplier;
  }

  private async ensureProductSupplier(organizationId: string, productId: string, linkId: string) {
    const link = await this.db.productSupplier.findFirst({ where: { id: linkId, organizationId, productId } });
    if (!link) throw new NotFoundException('Product supplier link not found');
    return link;
  }

  private clearPreferred(organizationId: string, productId: string) {
    return this.db.productSupplier.updateMany({ where: { organizationId, productId, isPreferred: true }, data: { isPreferred: false } });
  }

  private currency(value: string) {
    const code = String(value || 'USD').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) throw new BadRequestException('Currency must be a 3-letter ISO code');
    return code;
  }

  private optionalText(value: string | null | undefined) {
    if (value === undefined || value === null) return null;
    const text = value.trim();
    return text || null;
  }

  private jsonObject(value: unknown) {
    if (value === undefined) return undefined;
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as Prisma.InputJsonObject;
    return undefined;
  }
}
