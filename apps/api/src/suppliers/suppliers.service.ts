import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SupplierStatus } from '@prisma/client';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto, LinkProductSupplierDto, UpdateProductSupplierDto, UpdateSupplierDto } from './dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly db: PrismaService) {}

  list(user: CurrentUserPayload) {
    return this.db.supplier.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
  }

  async get(user: CurrentUserPayload, id: string) {
    const supplier = await this.db.supplier.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        products: {
          include: {
            product: { select: { id: true, name: true, sku: true, price: true, priceCurrency: true, quantity: true, category: true, images: true } },
          },
          orderBy: [{ isPreferred: 'desc' }, { createdAt: 'desc' }],
        },
      },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async create(user: CurrentUserPayload, dto: CreateSupplierDto) {
    const name = this.requiredText(dto.name, 'Supplier name is required');
    try {
      return await this.db.supplier.create({ data: this.supplierCreateData(user.organizationId, name, dto) });
    } catch (error) {
      if ((error as any)?.code === 'P2002') throw new BadRequestException('A supplier with this name already exists');
      throw error;
    }
  }

  async update(user: CurrentUserPayload, id: string, dto: UpdateSupplierDto) {
    await this.ensureSupplier(user, id);
    try {
      return await this.db.supplier.update({ where: { id }, data: this.supplierUpdateData(dto) });
    } catch (error) {
      if ((error as any)?.code === 'P2002') throw new BadRequestException('A supplier with this name already exists');
      throw error;
    }
  }

  async archive(user: CurrentUserPayload, id: string) {
    await this.ensureSupplier(user, id);
    return this.db.supplier.update({ where: { id }, data: { status: SupplierStatus.archived } });
  }

  async listProductSuppliers(user: CurrentUserPayload, productId: string) {
    await this.ensureProduct(user, productId);
    return this.db.productSupplier.findMany({ where: { organizationId: user.organizationId, productId }, include: { supplier: true }, orderBy: [{ isPreferred: 'desc' }, { createdAt: 'desc' }] });
  }

  async linkProductSupplier(user: CurrentUserPayload, productId: string, dto: LinkProductSupplierDto) {
    await Promise.all([this.ensureProduct(user, productId), this.ensureSupplier(user, dto.supplierId)]);
    if (dto.isPreferred) await this.db.productSupplier.updateMany({ where: { organizationId: user.organizationId, productId }, data: { isPreferred: false } });
    try {
      return await this.db.productSupplier.create({
        data: {
          organizationId: user.organizationId,
          productId,
          supplierId: dto.supplierId,
          supplierSku: this.optionalText(dto.supplierSku),
          cost: dto.cost === undefined ? undefined : new Prisma.Decimal(dto.cost),
          currency: this.currency(dto.currency),
          minimumOrderQty: dto.minimumOrderQty,
          leadTimeDays: dto.leadTimeDays,
          isPreferred: dto.isPreferred ?? false,
          lastPurchaseAt: dto.lastPurchaseAt ? new Date(dto.lastPurchaseAt) : undefined,
          notes: this.optionalText(dto.notes),
        },
        include: { supplier: true },
      });
    } catch (error) {
      if ((error as any)?.code === 'P2002') throw new BadRequestException('This supplier is already linked to the product');
      throw error;
    }
  }

  async updateProductSupplier(user: CurrentUserPayload, productId: string, linkId: string, dto: UpdateProductSupplierDto) {
    const existing = await this.ensureProductSupplier(user, productId, linkId);
    const supplierId = dto.supplierId ?? existing.supplierId;
    await Promise.all([this.ensureProduct(user, productId), this.ensureSupplier(user, supplierId)]);
    if (dto.isPreferred) await this.db.productSupplier.updateMany({ where: { organizationId: user.organizationId, productId, id: { not: linkId } }, data: { isPreferred: false } });
    return this.db.productSupplier.update({
      where: { id: linkId },
      data: {
        supplierId,
        supplierSku: dto.supplierSku === undefined ? undefined : this.optionalText(dto.supplierSku),
        cost: dto.cost === undefined ? undefined : new Prisma.Decimal(dto.cost),
        currency: dto.currency === undefined ? undefined : this.currency(dto.currency),
        minimumOrderQty: dto.minimumOrderQty,
        leadTimeDays: dto.leadTimeDays,
        isPreferred: dto.isPreferred,
        lastPurchaseAt: dto.lastPurchaseAt === undefined ? undefined : new Date(dto.lastPurchaseAt),
        notes: dto.notes === undefined ? undefined : this.optionalText(dto.notes),
      },
      include: { supplier: true },
    });
  }

  async unlinkProductSupplier(user: CurrentUserPayload, productId: string, linkId: string) {
    await this.ensureProductSupplier(user, productId, linkId);
    await this.db.productSupplier.delete({ where: { id: linkId } });
    return { ok: true };
  }

  private supplierCreateData(organizationId: string, name: string, dto: CreateSupplierDto): Prisma.SupplierUncheckedCreateInput {
    return {
      organizationId,
      name,
      supplierType: this.option(dto.supplierType, 'vendor'),
      category: this.optionalText(dto.category),
      rating: this.option(dto.rating, 'unrated'),
      contactName: this.optionalText(dto.contactName),
      email: this.optionalText(dto.email),
      phone: this.optionalText(dto.phone),
      website: this.optionalText(dto.website),
      addressLine1: this.optionalText(dto.addressLine1),
      addressLine2: this.optionalText(dto.addressLine2),
      country: this.optionalText(dto.country),
      province: this.optionalText(dto.province),
      city: this.optionalText(dto.city),
      postalCode: this.optionalText(dto.postalCode),
      currency: this.currency(dto.currency),
      paymentTerms: this.optionalText(dto.paymentTerms),
      paymentMethod: this.optionalText(dto.paymentMethod),
      taxStatus: this.option(dto.taxStatus, 'unknown'),
      taxNumber: this.optionalText(dto.taxNumber),
      shippingTerms: this.optionalText(dto.shippingTerms),
      incoterm: this.optionalText(dto.incoterm),
      accountNumber: this.optionalText(dto.accountNumber),
      leadTimeDays: dto.leadTimeDays,
      minimumOrderQty: dto.minimumOrderQty,
      lastOrderAt: dto.lastOrderAt ? new Date(dto.lastOrderAt) : undefined,
      customFields: this.jsonObject(dto.customFields),
      notes: this.optionalText(dto.notes),
    };
  }

  private supplierUpdateData(dto: UpdateSupplierDto): Prisma.SupplierUncheckedUpdateInput {
    return {
      name: dto.name === undefined ? undefined : this.requiredText(dto.name, 'Supplier name is required'),
      supplierType: dto.supplierType === undefined ? undefined : this.option(dto.supplierType, 'vendor'),
      category: dto.category === undefined ? undefined : this.optionalText(dto.category),
      rating: dto.rating === undefined ? undefined : this.option(dto.rating, 'unrated'),
      contactName: dto.contactName === undefined ? undefined : this.optionalText(dto.contactName),
      email: dto.email === undefined ? undefined : this.optionalText(dto.email),
      phone: dto.phone === undefined ? undefined : this.optionalText(dto.phone),
      website: dto.website === undefined ? undefined : this.optionalText(dto.website),
      addressLine1: dto.addressLine1 === undefined ? undefined : this.optionalText(dto.addressLine1),
      addressLine2: dto.addressLine2 === undefined ? undefined : this.optionalText(dto.addressLine2),
      country: dto.country === undefined ? undefined : this.optionalText(dto.country),
      province: dto.province === undefined ? undefined : this.optionalText(dto.province),
      city: dto.city === undefined ? undefined : this.optionalText(dto.city),
      postalCode: dto.postalCode === undefined ? undefined : this.optionalText(dto.postalCode),
      currency: dto.currency === undefined ? undefined : this.currency(dto.currency),
      paymentTerms: dto.paymentTerms === undefined ? undefined : this.optionalText(dto.paymentTerms),
      paymentMethod: dto.paymentMethod === undefined ? undefined : this.optionalText(dto.paymentMethod),
      taxStatus: dto.taxStatus === undefined ? undefined : this.option(dto.taxStatus, 'unknown'),
      taxNumber: dto.taxNumber === undefined ? undefined : this.optionalText(dto.taxNumber),
      shippingTerms: dto.shippingTerms === undefined ? undefined : this.optionalText(dto.shippingTerms),
      incoterm: dto.incoterm === undefined ? undefined : this.optionalText(dto.incoterm),
      accountNumber: dto.accountNumber === undefined ? undefined : this.optionalText(dto.accountNumber),
      leadTimeDays: dto.leadTimeDays,
      minimumOrderQty: dto.minimumOrderQty,
      lastOrderAt: dto.lastOrderAt === undefined ? undefined : dto.lastOrderAt ? new Date(dto.lastOrderAt) : null,
      customFields: dto.customFields === undefined ? undefined : this.jsonObject(dto.customFields),
      notes: dto.notes === undefined ? undefined : this.optionalText(dto.notes),
      status: dto.status,
    };
  }

  private async ensureSupplier(user: CurrentUserPayload, id: string) {
    const supplier = await this.db.supplier.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  private async ensureProduct(user: CurrentUserPayload, id: string) {
    const product = await this.db.product.findFirst({ where: { id, organizationId: user.organizationId, deletedAt: null } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  private async ensureProductSupplier(user: CurrentUserPayload, productId: string, linkId: string) {
    const link = await this.db.productSupplier.findFirst({ where: { id: linkId, productId, organizationId: user.organizationId } });
    if (!link) throw new NotFoundException('Product supplier link not found');
    return link;
  }

  private requiredText(value: string | undefined, message: string) {
    const text = value?.trim();
    if (!text) throw new BadRequestException(message);
    return text;
  }

  private optionalText(value: string | null | undefined) {
    if (value === undefined || value === null) return null;
    const text = value.trim();
    return text || null;
  }

  private option(value: string | null | undefined, fallback: string) {
    return this.optionalText(value) ?? fallback;
  }

  private jsonObject(value: Record<string, unknown> | undefined): Prisma.InputJsonObject | undefined {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
  }

  private currency(value: string | undefined | null) {
    const code = String(value || 'USD').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) throw new BadRequestException('Currency must be a 3-letter ISO code');
    return code;
  }
}
