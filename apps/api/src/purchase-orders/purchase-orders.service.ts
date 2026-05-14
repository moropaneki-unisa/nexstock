import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryMovementType, Prisma, PurchaseOrderStatus, SupplierStatus } from '@prisma/client';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { DocumentTemplatesService } from '../document-templates/document-templates.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseOrderDto, ReceivePurchaseOrderDto, SendPurchaseOrderDocumentDto, UpdatePurchaseOrderDto } from './dto';

type OrganizationCurrencyRules = {
  baseCurrency: string;
  enabledCurrencies: string[];
  nextPurchaseOrderNumber: number;
};

const PURCHASE_ORDER_TEMPLATE_TYPE = 'purchase_orders';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly db: PrismaService,
    private readonly templates: DocumentTemplatesService,
    private readonly email: EmailService,
  ) {}

  list(user: CurrentUserPayload) {
    return this.db.purchaseOrder.findMany({
      where: { organizationId: user.organizationId },
      include: {
        supplier: { select: { id: true, supplierCode: true, name: true, currency: true, status: true, email: true } },
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
        organization: true,
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
    const incoming = new Map(dto.lines.map((line) => [line.lineId, line.quantityReceived]));
    if (incoming.size !== dto.lines.length) throw new BadRequestException('Duplicate received lines are not allowed');

    const updated = await this.db.$transaction(async (tx) => {
      const existing = await tx.purchaseOrder.findFirst({
        where: { id, organizationId: user.organizationId },
        include: { lines: { include: { product: true, productSupplier: true }, orderBy: { createdAt: 'asc' } } },
      });
      if (!existing) throw new NotFoundException('Purchase order not found');
      if (existing.status === PurchaseOrderStatus.cancelled) throw new BadRequestException('Cancelled purchase orders cannot be received');

      let totalOrdered = 0;
      let totalReceived = 0;
      const receivedAt = new Date();

      for (const line of existing.lines) {
        totalOrdered += line.quantityOrdered;
        const receiveDelta = incoming.get(line.id) ?? 0;
        if (!Number.isInteger(receiveDelta) || receiveDelta < 0) throw new BadRequestException('Received quantity must be zero or more');

        const alreadyReceived = line.quantityReceived || 0;
        const nextReceived = alreadyReceived + receiveDelta;
        if (nextReceived > line.quantityOrdered) throw new BadRequestException(`Received quantity for ${line.product.name} cannot exceed ordered quantity`);

        totalReceived += nextReceived;
        if (receiveDelta === 0) continue;

        const productAfter = line.product.quantity + receiveDelta;

        await tx.product.update({
          where: { id: line.productId },
          data: { quantity: { increment: receiveDelta } },
        });
        await tx.purchaseOrderLine.update({
          where: { id: line.id },
          data: { quantityReceived: nextReceived },
        });
        await tx.inventoryLog.create({
          data: {
            organizationId: user.organizationId,
            productId: line.productId,
            type: InventoryMovementType.purchase,
            quantityBefore: line.product.quantity,
            quantityAfter: productAfter,
            delta: receiveDelta,
            reason: this.optionalText(dto.notes) ?? `Received against ${existing.poNumber}`,
            source: 'purchase_order',
            referenceId: existing.id,
          },
        });

        if (line.productSupplierId) {
          await tx.productSupplier.update({
            where: { id: line.productSupplierId },
            data: {
              cost: line.unitCost,
              currency: line.currency,
              supplierSku: line.supplierSku ?? undefined,
              lastPurchaseAt: receivedAt,
            },
          });

          if (line.productSupplier?.isPreferred) {
            await tx.product.update({
              where: { id: line.productId },
              data: {
                cost: line.unitCost,
                costCurrency: line.currency,
                convertedCost: line.unitCost,
                exchangeRateToBase: new Prisma.Decimal(1),
              },
            });
          }
        }
      }

      const status = totalReceived <= 0
        ? PurchaseOrderStatus.ordered
        : totalReceived >= totalOrdered
          ? PurchaseOrderStatus.received
          : PurchaseOrderStatus.partially_received;

      return tx.purchaseOrder.update({
        where: { id: existing.id },
        data: {
          status,
          orderedAt: existing.orderedAt ?? receivedAt,
          receivedAt: status === PurchaseOrderStatus.received ? receivedAt : null,
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
    }, { maxWait: 10_000, timeout: 20_000 });

    return updated;
  }

  async sendDocument(user: CurrentUserPayload, id: string, dto: SendPurchaseOrderDocumentDto) {
    const order = await this.get(user, id);
    const template = await this.resolvePurchaseOrderTemplate(user.organizationId, dto.templateId);
    if (!template) throw new BadRequestException('No active purchase order template found. Create one in Settings > Templates.');

    const context = this.templateContext(order);
    const to = this.optionalText(dto.to) ?? this.templates.render(template.recipientEmailTemplate || '{{supplier.email}}', context);
    if (!to) throw new BadRequestException('Recipient email is required because the supplier record has no email');

    const subject = this.optionalText(dto.subject) ?? this.templates.render(template.subjectTemplate || 'Purchase Order {{purchaseOrder.poNumber}}', context);
    const emailText = this.optionalText(dto.message) ?? this.templates.render(template.emailTemplate || 'Please find purchase order {{purchaseOrder.poNumber}} below.', context);
    const documentHtml = this.templates.render(template.htmlTemplate, context);
    const bodyHtml = `<div style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">${this.escapeHtml(emailText).replace(/\n/g, '<br>')}<hr style="margin:24px 0;border:0;border-top:1px solid #ddd;" />${documentHtml}</div>`;
    const bodyText = `${emailText}\n\n${this.stripHtml(documentHtml)}`.trim();

    const generatedDocument = await this.db.generatedDocument.create({
      data: {
        organizationId: user.organizationId,
        templateId: template.id,
        purchaseOrderId: order.id,
        documentType: template.type,
        title: `${order.poNumber} ${template.name}`,
        htmlSnapshot: documentHtml,
        metadata: { to, subject },
      },
    });

    const log = await this.db.emailLog.create({
      data: {
        organizationId: user.organizationId,
        purchaseOrderId: order.id,
        generatedDocumentId: generatedDocument.id,
        to,
        subject,
        provider: 'resend',
        status: 'pending',
      },
    });

    const response = await this.email.sendCustomEmail({
      to,
      subject,
      html: bodyHtml,
      text: bodyText,
    });

    if (!response?.id) {
      const message = 'Email provider did not confirm delivery. Check RESEND_API_KEY, EMAIL_FROM, and Resend logs.';
      await this.db.emailLog.update({ where: { id: log.id }, data: { status: 'failed', error: message } });
      throw new BadRequestException(message);
    }

    await this.db.emailLog.update({
      where: { id: log.id },
      data: { status: 'sent', sentAt: new Date(), providerMessageId: response.id, metadata: response as any },
    });

    return { ok: true, message: `Email sent to ${to}`, to, subject, providerMessageId: response.id, generatedDocumentId: generatedDocument.id };
  }

  async cancel(user: CurrentUserPayload, id: string) {
    await this.get(user, id);
    return this.db.purchaseOrder.update({ where: { id }, data: { status: PurchaseOrderStatus.cancelled }, include: { supplier: true, lines: true } });
  }

  private resolvePurchaseOrderTemplate(organizationId: string, templateId?: string) {
    if (templateId) {
      return this.db.documentTemplate.findFirst({
        where: { id: templateId, organizationId, type: PURCHASE_ORDER_TEMPLATE_TYPE, isActive: true },
      });
    }

    return this.db.documentTemplate.findFirst({
      where: { organizationId, type: PURCHASE_ORDER_TEMPLATE_TYPE, isDefault: true, isActive: true },
    }).then((template) => template ?? this.db.documentTemplate.findFirst({
      where: { organizationId, type: PURCHASE_ORDER_TEMPLATE_TYPE, isActive: true },
      orderBy: { createdAt: 'desc' },
    }));
  }

  private templateContext(order: any) {
    const formatMoney = (value: unknown) => Number(value || 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return {
      organization: {
        name: order.organization?.name || 'NexStock',
        email: order.organization?.billingEmail || '',
        phone: order.organization?.phone || '',
      },
      supplier: {
        name: order.supplier?.name || '',
        supplierCode: order.supplier?.supplierCode || '',
        email: order.supplier?.email || '',
        phone: order.supplier?.phone || '',
      },
      purchaseOrder: {
        poNumber: order.poNumber,
        subtotal: formatMoney(order.subtotal),
        currency: order.currency,
        expectedAt: order.expectedAt ? new Date(order.expectedAt).toLocaleDateString() : '',
        notes: order.notes || '',
      },
      lines: (order.lines || []).map((line: any) => ({
        product: { name: line.product?.name || line.description || '', sku: line.product?.sku || '' },
        quantityOrdered: line.quantityOrdered,
        quantityReceived: line.quantityReceived,
        unitCost: formatMoney(line.unitCost),
        lineTotal: formatMoney(line.lineTotal),
      })),
    };
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

  private stripHtml(value: string) {
    return value.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private escapeHtml(value: string) {
    return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] || char));
  }
}
