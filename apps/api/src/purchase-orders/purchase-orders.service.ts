import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryMovementType, Prisma, PurchaseOrderStatus, SupplierStatus } from '@prisma/client';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseOrderDto, ReceivePurchaseOrderDto, UpdatePurchaseOrderDto } from './dto';

type OrganizationCurrencyRules = {
  baseCurrency: string;
  enabledCurrencies: string[];
  nextPurchaseOrderNumber: number;
};

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly db: PrismaService) {}

  list(user: CurrentUserPayload) {
    return this.db.purchaseOrder.findMany({
      where: { organizationId: user.organizationId },
      include: {
        supplier: { select: { id: true, supplierCode: true, name: true, currency: true, status: true } },
        lines: { include: { product: { select: { id: true, name: true, sku: true, images: true } } } },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async get(user: CurrentUserPayload, id: string) {
    const order = await this.db.purchaseOrder.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        supplier: true,
        lines: {
          include: {
            product: { select: { id: true, name: true, sku: true, images: true, quantity: true } },
            productSupplier: { include: { supplier: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!order) throw new NotFoundException('Purchase order not found');
    return order;
  }

  async create(user: CurrentUserPayload, dto: CreatePurchaseOrderDto) {
    const [organization, supplier] = await Promise.all([
      this.getOrganizationCurrencyRules(user.organizationId),
      this.ensureActiveSupplier(user.organizationId, dto.supplierId),
    ]);

    const currency = this.enabledCurrency(supplier.currency, organization);
    const poNumber = await this.generatePurchaseOrderNumber(user.organizationId, organization.nextPurchaseOrderNumber);
    const lines = await this.buildLines(user.organizationId, dto.supplierId, currency, dto.lines);
    const subtotal = lines.reduce((sum, line) => sum.plus(new Prisma.Decimal(String(line.lineTotal))), new Prisma.Decimal(0));

    return this.db.purchaseOrder.create({
      data: {
        organizationId: user.organizationId,
        supplierId: supplier.id,
        poNumber,
        currency,
        expectedAt: dto.expectedAt ? new Date(dto.expectedAt) : undefined,
        notes: this.optionalText(dto.notes),
        subtotal,
        lines: { create: lines },
      },
      include: { supplier: true, lines: { include: { product: true, productSupplier: true } } },
    });
  }

  async update(user: CurrentUserPayload, id: string, dto: UpdatePurchaseOrderDto) {
    const existing = await this.db.purchaseOrder.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!existing) throw new NotFoundException('Purchase order not found');

    const status = dto.status as PurchaseOrderStatus | undefined;
    return this.db.purchaseOrder.update({
      where: { id },
      data: {
        status,
        expectedAt: dto.expectedAt === undefined ? undefined : dto.expectedAt ? new Date(dto.expectedAt) : null,
        orderedAt: status === PurchaseOrderStatus.ordered && !existing.orderedAt ? new Date() : undefined,
        receivedAt: status === PurchaseOrderStatus.received && !existing.receivedAt ? new Date() : undefined,
        notes: dto.notes === undefined ? undefined : this.optionalText(dto.notes),
      },
      include: { supplier: true, lines: { include: { product: true, productSupplier: true } } },
    });
  }

  async receive(user: CurrentUserPayload, id: string, dto: ReceivePurchaseOrderDto) {
    const existing = await this.db.purchaseOrder.findFirst({
      where: { id, organizationId: user.organizationId },
      include: { lines: { include: { product: true } } },
    });
    if (!existing) throw new NotFoundException('Purchase order not found');
    if (existing.status === PurchaseOrderStatus.cancelled) throw new BadRequestException('Cancelled purchase orders cannot be received');

    const incoming = new Map(dto.lines.map((line) => [line.lineId, line.quantityReceived]));
    if (incoming.size !== dto.lines.length) throw new BadRequestException('Duplicate received lines are not allowed');

    return this.db.$transaction(async (tx) => {
      for (const line of existing.lines) {
        const receiveDelta = incoming.get(line.id);
        if (receiveDelta === undefined) continue;
        if (!Number.isInteger(receiveDelta) || receiveDelta < 0) throw new BadRequestException('Received quantity must be zero or more');

        const alreadyReceived = line.quantityReceived || 0;
        const nextReceived = alreadyReceived + receiveDelta;
        if (nextReceived > line.quantityOrdered) throw new BadRequestException(`Received quantity for ${line.product.name} cannot exceed ordered quantity`);
        if (receiveDelta === 0) continue;

        const productBefore = line.product.quantity;
        const productAfter = productBefore + receiveDelta;

        await tx.product.update({ where: { id: line.productId }, data: { quantity: productAfter } });
        await tx.purchaseOrderLine.update({ where: { id: line.id }, data: { quantityReceived: nextReceived } });
        await tx.inventoryLog.create({
          data: {
            organizationId: user.organizationId,
            productId: line.productId,
            type: InventoryMovementType.purchase,
            quantityBefore: productBefore,
            quantityAfter: productAfter,
            delta: receiveDelta,
            reason: this.optionalText(dto.notes) ?? `Received against ${existing.poNumber}`,
            source: 'purchase_order',
            referenceId: existing.id,
          },
        });
      }

      const lines = await tx.purchaseOrderLine.findMany({ where: { purchaseOrderId: existing.id } });
      const totalOrdered = lines.reduce((sum, line) => sum + line.quantityOrdered, 0);
      const totalReceived = lines.reduce((sum, line) => sum + line.quantityReceived, 0);
      const status = totalReceived <= 0
        ? PurchaseOrderStatus.ordered
        : totalReceived >= totalOrdered
          ? PurchaseOrderStatus.received
          : PurchaseOrderStatus.partially_received;

      return tx.purchaseOrder.update({
        where: { id: existing.id },
        data: {
          status,
          orderedAt: existing.orderedAt ?? new Date(),
          receivedAt: status === PurchaseOrderStatus.received ? new Date() : null,
          notes: dto.notes === undefined ? undefined : this.optionalText(dto.notes),
        },
        include: {
          supplier: true,
          lines: {
            include: {
              product: { select: { id: true, name: true, sku: true, images: true, quantity: true } },
              productSupplier: { include: { supplier: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    });
  }

  async cancel(user: CurrentUserPayload, id: string) {
    await this.get(user, id);
    return this.db.purchaseOrder.update({ where: { id }, data: { status: PurchaseOrderStatus.cancelled }, include: { supplier: true, lines: true } });
  }

  private async buildLines(organizationId: string, supplierId: string, currency: string, lines: CreatePurchaseOrderDto['lines']) {
    const result: Prisma.PurchaseOrderLineUncheckedCreateWithoutPurchaseOrderInput[] = [];

    for (const line of lines) {
      const product = await this.db.product.findFirst({ where: { id: line.productId, organizationId, deletedAt: null } });
      if (!product) throw new BadRequestException('One or more products were not found');

      let productSupplierId = line.productSupplierId;
      let supplierSku = this.optionalText(line.supplierSku);
      let unitCost = new Prisma.Decimal(line.unitCost);

      if (productSupplierId) {
        const productSupplier = await this.db.productSupplier.findFirst({
          where: { id: productSupplierId, organizationId, productId: product.id, supplierId },
        });
        if (!productSupplier) throw new BadRequestException('Product supplier link does not match the selected supplier');
        supplierSku = supplierSku ?? productSupplier.supplierSku;
        if (line.unitCost === undefined || Number.isNaN(Number(line.unitCost))) unitCost = productSupplier.cost ?? unitCost;
      }

      if (line.quantityOrdered < 1) throw new BadRequestException('Purchase order quantity must be at least 1');
      if (unitCost.lessThan(0)) throw new BadRequestException('Purchase order cost cannot be negative');
      const lineTotal = unitCost.mul(line.quantityOrdered);

      result.push({
        organizationId,
        productId: product.id,
        productSupplierId,
        supplierSku,
        description: this.optionalText(line.description) ?? product.name,
        quantityOrdered: line.quantityOrdered,
        quantityReceived: 0,
        unitCost,
        currency,
        lineTotal,
        notes: this.optionalText(line.notes),
      });
    }

    return result;
  }

  private async getOrganizationCurrencyRules(organizationId: string): Promise<OrganizationCurrencyRules> {
    const organization = await this.db.organization.findUnique({
      where: { id: organizationId },
      select: { baseCurrency: true, enabledCurrencies: true, nextPurchaseOrderNumber: true },
    });
    if (!organization) throw new NotFoundException('Organization not found');
    const baseCurrency = this.currency(organization.baseCurrency || 'USD');
    const enabledCurrencies = Array.from(new Set([baseCurrency, ...(organization.enabledCurrencies || [])].map((code) => this.currency(code))));
    return { baseCurrency, enabledCurrencies, nextPurchaseOrderNumber: organization.nextPurchaseOrderNumber };
  }

  private async ensureActiveSupplier(organizationId: string, supplierId: string) {
    const supplier = await this.db.supplier.findFirst({ where: { id: supplierId, organizationId } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    if (supplier.status !== SupplierStatus.active) throw new BadRequestException('Archived suppliers cannot be used on purchase orders');
    return supplier;
  }

  private async generatePurchaseOrderNumber(organizationId: string, nextNumber: number) {
    const poNumber = `PO-${String(nextNumber || 1).padStart(5, '0')}`;
    await this.db.organization.update({ where: { id: organizationId }, data: { nextPurchaseOrderNumber: { increment: 1 } } });
    return poNumber;
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

  private optionalText(value: string | null | undefined) {
    if (value === undefined || value === null) return null;
    const text = value.trim();
    return text || null;
  }
}
