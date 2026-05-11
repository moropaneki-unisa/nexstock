import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Supplier, SupplierStatus } from '@prisma/client';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto, LinkProductSupplierDto, UpdateProductSupplierDto, UpdateSupplierDto } from './dto';

type OrganizationCurrencyRules = {
  baseCurrency: string;
  enabledCurrencies: string[];
  supplierPrefix?: string | null;
  nextSupplierNumber: number;
};

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
    const organization = await this.getOrganizationCurrencyRules(user.organizationId);
    const supplierCode = await this.generateSupplierCode(user.organizationId, organization);

    try {
      return await this.db.supplier.create({ data: this.supplierCreateData(user.organizationId, supplierCode, name, dto, organization) });
    } catch (error) {
      if ((error as any)?.code === 'P2002') throw new BadRequestException('A supplier with this name or supplier code already exists');
      throw error;
    }
  }

  async update(user: CurrentUserPayload, id: string, dto: UpdateSupplierDto) {
    await this.ensureSupplier(user, id);
    const organization = await this.getOrganizationCurrencyRules(user.organizationId);
    try {
      return await this.db.supplier.update({ where: { id }, data: this.supplierUpdateData(dto, organization) });
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
    const [_, supplier, organization] = await Promise.all([
      this.ensureProduct(user, productId),
      this.ensureActiveSupplier(user, dto.supplierId),
      this.getOrganizationCurrencyRules(user.organizationId),
    ]);
    const currency = this.enabledCurrency(dto.currency ?? supplier.currency, organization);

    if (dto.isPreferred) await this.db.productSupplier.updateMany({ where: { organizationId: user.organizationId, productId }, data: { isPreferred: false } });
    try {
      return await this.db.productSupplier.create({
        data: {
          organizationId: user.organizationId,
          productId,
          supplierId: supplier.id,
          supplierSku: this.optionalText(dto.supplierSku),
          cost: dto.cost === undefined ? undefined : new Prisma.Decimal(dto.cost),
          currency,
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
    const [_, supplier, organization] = await Promise.all([
      this.ensureProduct(user, productId),
      this.ensureActiveSupplier(user, supplierId),
      this.getOrganizationCurrencyRules(user.organizationId),
    ]);
    if (dto.isPreferred) await this.db.productSupplier.updateMany({ where: { organizationId: user.organizationId, productId, id: { not: linkId } }, data: { isPreferred: false } });
    return this.db.productSupplier.update({
      where: { id: linkId },
      data: {
        supplierId: supplier.id,
        supplierSku: dto.supplierSku === undefined ? undefined : this.optionalText(dto.supplierSku),
        cost: dto.cost === undefined ? undefined : new Prisma.Decimal(dto.cost),
        currency: dto.currency === undefined ? undefined : this.enabledCurrency(dto.currency, organization),
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

  private supplierCreateData(organizationId: string, supplierCode: string, name: string, dto: CreateSupplierDto, organization: OrganizationCurrencyRules): Prisma.SupplierUncheckedCreateInput {
    return {
      organizationId,
      supplierCode,
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
      currency: this.enabledCurrency(dto.currency, organization),
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

  private supplierUpdateData(dto: UpdateSupplierDto, organization: OrganizationCurrencyRules): Prisma.SupplierUncheckedUpdateInput {
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
      currency: dto.currency === undefined ? undefined : this.enabledCurrency(dto.currency, organization),
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

  private async getOrganizationCurrencyRules(organizationId: string): Promise<OrganizationCurrencyRules> {
    const organization = await this.db.organization.findUnique({
      where: { id: organizationId },
      select: { baseCurrency: true, enabledCurrencies: true, supplierPrefix: true, nextSupplierNumber: true },
    });
    if (!organization) throw new NotFoundException('Organization not found');
    const baseCurrency = this.currency(organization.baseCurrency || 'USD');
    const enabledCurrencies = Array.from(new Set([baseCurrency, ...(organization.enabledCurrencies || [])].map((code) => this.currency(code))));
    return { baseCurrency, enabledCurrencies, supplierPrefix: organization.supplierPrefix, nextSupplierNumber: organization.nextSupplierNumber };
  }

  private async generateSupplierCode(organizationId: string, organization: OrganizationCurrencyRules) {
    const prefix = this.safeCodePrefix(organization.supplierPrefix || 'SUP');
    const nextNumber = organization.nextSupplierNumber || 1;
    const supplierCode = `${prefix}-${String(nextNumber).padStart(5, '0')}`;
    await this.db.organization.update({ where: { id: organizationId }, data: { nextSupplierNumber: { increment: 1 } } });
    return supplierCode;
  }

  private async ensureSupplier(user: CurrentUserPayload, id: string) {
    const supplier = await this.db.supplier.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  private async ensureActiveSupplier(user: CurrentUserPayload, id: string): Promise<Supplier> {
    const supplier = await this.ensureSupplier(user, id);
    if (supplier.status !== SupplierStatus.active) throw new BadRequestException('Archived suppliers cannot be linked to products');
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

  private enabledCurrency(value: string | undefined | null, organization: OrganizationCurrencyRules) {
    const code = this.currency(value || organization.baseCurrency);
    if (!organization.enabledCurrencies.includes(code)) {
      throw new BadRequestException(`Currency ${code} is not enabled for this organization`);
    }
    return code;
  }

  private currency(value: string | undefined | null) {
    const code = String(value || 'USD').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) throw new BadRequestException('Currency must be a 3-letter ISO code');
    return code;
  }

  private safeCodePrefix(value: string) {
    const prefix = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    return prefix || 'SUP';
  }
}
