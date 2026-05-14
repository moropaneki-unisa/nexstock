import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentTemplateDto, PreviewDocumentTemplateDto, UpdateDocumentTemplateDto } from './dto';

type TemplateField = { group: string; label: string; path: string; description?: string };
type TestRecord = { id: string; label: string; description?: string | null };

type DocumentTemplateRow = {
  id: string;
  organizationId: string;
  name: string;
  type: string;
  kind: string;
  description: string | null;
  recipientEmailTemplate: string | null;
  subjectTemplate: string | null;
  htmlTemplate: string;
  emailTemplate: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type LayoutFieldRow = {
  key: string;
  label: string;
  type: string;
  layoutName: string;
};

const commonFields: TemplateField[] = [
  { group: 'Organization', label: 'Organization name', path: 'organization.name' },
  { group: 'Organization', label: 'Organization email', path: 'organization.email' },
  { group: 'Organization', label: 'Organization phone', path: 'organization.phone' },
];

const moduleFields: Record<string, TemplateField[]> = {
  purchase_orders: [
    { group: 'Supplier', label: 'Supplier name', path: 'supplier.name' },
    { group: 'Supplier', label: 'Supplier email', path: 'supplier.email' },
    { group: 'Supplier', label: 'Supplier code', path: 'supplier.supplierCode' },
    { group: 'Purchase order', label: 'PO number', path: 'purchaseOrder.poNumber' },
    { group: 'Purchase order', label: 'Currency', path: 'purchaseOrder.currency' },
    { group: 'Purchase order', label: 'Subtotal', path: 'purchaseOrder.subtotal' },
    { group: 'Purchase order', label: 'Expected date', path: 'purchaseOrder.expectedAt' },
    { group: 'Purchase order', label: 'Notes', path: 'purchaseOrder.notes' },
    { group: 'Line item', label: 'Line product name', path: 'product.name', description: 'Use inside a lines block' },
    { group: 'Line item', label: 'Line product SKU', path: 'product.sku', description: 'Use inside a lines block' },
    { group: 'Line item', label: 'Quantity ordered', path: 'quantityOrdered', description: 'Use inside a lines block' },
    { group: 'Line item', label: 'Unit cost', path: 'unitCost', description: 'Use inside a lines block' },
    { group: 'Line item', label: 'Line total', path: 'lineTotal', description: 'Use inside a lines block' },
  ],
  quotes: [
    { group: 'Customer', label: 'Customer name', path: 'customer.name' },
    { group: 'Customer', label: 'Customer email', path: 'customer.email' },
    { group: 'Quote', label: 'Quote number', path: 'quote.quoteNumber' },
    { group: 'Quote', label: 'Currency', path: 'quote.currency' },
    { group: 'Quote', label: 'Total', path: 'quote.total' },
    { group: 'Quote', label: 'Valid until', path: 'quote.validUntil' },
    { group: 'Line item', label: 'Product name', path: 'product.name', description: 'Use inside a lines block' },
    { group: 'Line item', label: 'Quantity', path: 'quantity', description: 'Use inside a lines block' },
    { group: 'Line item', label: 'Unit price', path: 'unitPrice', description: 'Use inside a lines block' },
    { group: 'Line item', label: 'Line total', path: 'lineTotal', description: 'Use inside a lines block' },
  ],
  invoices: [
    { group: 'Customer', label: 'Customer name', path: 'customer.name' },
    { group: 'Customer', label: 'Customer email', path: 'customer.email' },
    { group: 'Invoice', label: 'Invoice number', path: 'invoice.invoiceNumber' },
    { group: 'Invoice', label: 'Currency', path: 'invoice.currency' },
    { group: 'Invoice', label: 'Total', path: 'invoice.total' },
    { group: 'Invoice', label: 'Due date', path: 'invoice.dueDate' },
    { group: 'Line item', label: 'Product name', path: 'product.name', description: 'Use inside a lines block' },
    { group: 'Line item', label: 'Quantity', path: 'quantity', description: 'Use inside a lines block' },
    { group: 'Line item', label: 'Unit price', path: 'unitPrice', description: 'Use inside a lines block' },
    { group: 'Line item', label: 'Line total', path: 'lineTotal', description: 'Use inside a lines block' },
  ],
  statements: [
    { group: 'Customer', label: 'Customer name', path: 'customer.name' },
    { group: 'Customer', label: 'Customer email', path: 'customer.email' },
    { group: 'Statement', label: 'Statement number', path: 'statement.statementNumber' },
    { group: 'Statement', label: 'Period', path: 'statement.period' },
    { group: 'Statement', label: 'Currency', path: 'statement.currency' },
    { group: 'Statement', label: 'Balance', path: 'statement.balance' },
  ],
  products: [
    { group: 'Product', label: 'Product name', path: 'product.name' },
    { group: 'Product', label: 'SKU', path: 'product.sku' },
    { group: 'Product', label: 'Price', path: 'product.price' },
    { group: 'Product', label: 'Quantity', path: 'product.quantity' },
    { group: 'Product', label: 'Layout name', path: 'product.metadata.productTypeName' },
    { group: 'Product', label: 'Layout kind', path: 'product.metadata.kind' },
  ],
  suppliers: [
    { group: 'Supplier', label: 'Supplier name', path: 'supplier.name' },
    { group: 'Supplier', label: 'Supplier code', path: 'supplier.supplierCode' },
    { group: 'Supplier', label: 'Supplier email', path: 'supplier.email' },
    { group: 'Supplier', label: 'Supplier phone', path: 'supplier.phone' },
  ],
  customers: [
    { group: 'Customer', label: 'Customer name', path: 'customer.name' },
    { group: 'Customer', label: 'Customer email', path: 'customer.email' },
    { group: 'Customer', label: 'Customer phone', path: 'customer.phone' },
  ],
};

@Injectable()
export class DocumentTemplatesService {
  constructor(private readonly db: PrismaService) {}

  async list(user: CurrentUserPayload) {
    return this.db.$queryRaw<DocumentTemplateRow[]>`
      SELECT * FROM "DocumentTemplate"
      WHERE "organizationId" = ${user.organizationId}
      ORDER BY "isDefault" DESC, "createdAt" DESC
    `;
  }

  async fields(user: CurrentUserPayload, module = 'purchase_orders') {
    const layoutFields = await this.layoutFields(user.organizationId);
    const layoutTokens = layoutFields.map((field) => ({
      group: `Layout: ${field.layoutName}`,
      label: field.label,
      path: `product.metadata.customFields.${field.key}`,
      description: `${field.type} layout field`,
    }));

    return [...commonFields, ...(moduleFields[module] || []), ...layoutTokens];
  }

  async testRecords(user: CurrentUserPayload, module = 'purchase_orders'): Promise<TestRecord[]> {
    if (module === 'purchase_orders') {
      const rows = await this.db.purchaseOrder.findMany({
        where: { organizationId: user.organizationId },
        include: { supplier: { select: { name: true, supplierCode: true } } },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });
      return rows.map((row) => ({
        id: row.id,
        label: row.poNumber,
        description: `${row.supplier?.supplierCode || 'No supplier'} · ${row.supplier?.name || 'No supplier'} · ${row.currency} ${row.subtotal}`,
      }));
    }

    if (module === 'products') {
      const rows = await this.db.product.findMany({
        where: { organizationId: user.organizationId, deletedAt: null },
        orderBy: { updatedAt: 'desc' },
        take: 30,
      });
      return rows.map((row) => ({ id: row.id, label: row.name, description: `${row.sku || 'No SKU'} · ${row.category || 'Uncategorized'}` }));
    }

    if (module === 'suppliers') {
      const rows = await this.db.supplier.findMany({
        where: { organizationId: user.organizationId },
        orderBy: { updatedAt: 'desc' },
        take: 30,
      });
      return rows.map((row) => ({ id: row.id, label: row.name, description: `${row.supplierCode} · ${row.email || 'No email'}` }));
    }

    return [];
  }

  async get(user: CurrentUserPayload, id: string) {
    const rows = await this.db.$queryRaw<DocumentTemplateRow[]>`
      SELECT * FROM "DocumentTemplate"
      WHERE id = ${id} AND "organizationId" = ${user.organizationId}
      LIMIT 1
    `;
    const template = rows[0];
    if (!template) throw new NotFoundException('Document template not found');
    return template;
  }

  async create(user: CurrentUserPayload, dto: CreateDocumentTemplateDto) {
    const type = this.templateType(dto.type);
    const kind = this.templateKind(dto.kind);
    if (dto.isDefault) await this.clearDefault(user.organizationId, type, kind);

    try {
      const created = await this.db.documentTemplate.create({
        data: {
          organizationId: user.organizationId,
          name: dto.name.trim(),
          type,
          description: this.optionalText(dto.description),
          recipientEmailTemplate: this.optionalText(dto.recipientEmailTemplate),
          subjectTemplate: this.optionalText(dto.subjectTemplate),
          htmlTemplate: dto.htmlTemplate,
          emailTemplate: this.optionalText(dto.emailTemplate),
          isDefault: Boolean(dto.isDefault),
          isActive: dto.isActive ?? true,
        },
      });
      await this.db.$executeRaw`UPDATE "DocumentTemplate" SET kind = ${kind} WHERE id = ${created.id}`;
      return this.get(user, created.id);
    } catch (error) {
      this.rethrowTemplateSaveError(error, 'Template could not be created');
    }
  }

  async update(user: CurrentUserPayload, id: string, dto: UpdateDocumentTemplateDto) {
    const existing = await this.get(user, id);
    const type = this.templateType(dto.type ?? existing.type);
    const kind = this.templateKind(dto.kind ?? existing.kind);
    if (dto.isDefault) await this.clearDefault(user.organizationId, type, kind, id);

    try {
      await this.db.documentTemplate.update({
        where: { id },
        data: {
          name: dto.name === undefined ? undefined : dto.name.trim(),
          type,
          description: dto.description === undefined ? undefined : this.optionalText(dto.description),
          recipientEmailTemplate: dto.recipientEmailTemplate === undefined ? undefined : this.optionalText(dto.recipientEmailTemplate),
          subjectTemplate: dto.subjectTemplate === undefined ? undefined : this.optionalText(dto.subjectTemplate),
          htmlTemplate: dto.htmlTemplate,
          emailTemplate: dto.emailTemplate === undefined ? undefined : this.optionalText(dto.emailTemplate),
          isDefault: dto.isDefault,
          isActive: dto.isActive,
        },
      });
      await this.db.$executeRaw`UPDATE "DocumentTemplate" SET kind = ${kind} WHERE id = ${id}`;
      return this.get(user, id);
    } catch (error) {
      this.rethrowTemplateSaveError(error, 'Template could not be updated');
    }
  }

  async delete(user: CurrentUserPayload, id: string) {
    await this.get(user, id);
    await this.db.documentTemplate.update({ where: { id }, data: { isActive: false, isDefault: false } });
    return this.get(user, id);
  }

  async preview(user: CurrentUserPayload, dto: PreviewDocumentTemplateDto) {
    const context = dto.recordId ? await this.realContext(user, dto.type, dto.recordId) : await this.sampleContext(user, dto.type);
    return {
      to: dto.recipientEmailTemplate ? this.render(dto.recipientEmailTemplate, context) : context.supplier?.email ?? context.customer?.email ?? 'recipient@example.com',
      subject: dto.subjectTemplate ? this.render(dto.subjectTemplate, context) : 'Document preview',
      html: this.render(dto.htmlTemplate, context),
      email: dto.emailTemplate ? this.render(dto.emailTemplate, context) : null,
    };
  }

  async previewPdf(user: CurrentUserPayload, dto: PreviewDocumentTemplateDto) {
    const rendered = await this.preview(user, dto);
    const { default: puppeteer } = await import('puppeteer');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(this.pdfDocument(rendered.html), { waitUntil: 'load' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  render(template: string, context: Record<string, any>) {
    let output = template || '';
    output = output.replace(/{{#lines}}([\s\S]*?){{\/lines}}/g, (_, block) => {
      const lines = context.lines || [];
      return lines.map((line: Record<string, any>) => this.renderBlock(block, { ...context, ...line })).join('');
    });
    return this.renderBlock(output, context);
  }

  private renderBlock(template: string, context: Record<string, any>) {
    return template.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
      const value = key.split('.').reduce((current: any, part: string) => current?.[part], context);
      return value === undefined || value === null ? '' : String(value);
    });
  }

  private pdfDocument(html: string) {
    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #fff; color: #111827; font-family: Arial, Helvetica, sans-serif; }
    .page { width: 210mm; min-height: 297mm; padding: 16.9mm 18mm; background: #fff; }
    table { border-collapse: collapse; table-layout: fixed; width: 100%; }
    th, td { word-break: break-word; overflow-wrap: anywhere; white-space: normal; vertical-align: top; }
    img { max-width: 100%; }
  </style>
</head>
<body>
  <main class="page">${html}</main>
</body>
</html>`;
  }

  private async realContext(user: CurrentUserPayload, module = 'purchase_orders', recordId: string) {
    if (module === 'purchase_orders') {
      const order = await this.db.purchaseOrder.findFirst({
        where: { id: recordId, organizationId: user.organizationId },
        include: {
          supplier: true,
          organization: true,
          lines: { include: { product: true }, orderBy: { createdAt: 'asc' } },
        },
      });
      if (!order) throw new NotFoundException('Purchase order test record not found');
      return this.purchaseOrderContext(order);
    }

    if (module === 'products') {
      const product = await this.db.product.findFirst({ where: { id: recordId, organizationId: user.organizationId, deletedAt: null } });
      if (!product) throw new NotFoundException('Product test record not found');
      const organization = await this.db.organization.findUnique({ where: { id: user.organizationId } });
      return {
        organization: this.organizationContext(organization),
        product,
        module,
        lines: [],
      };
    }

    if (module === 'suppliers') {
      const supplier = await this.db.supplier.findFirst({ where: { id: recordId, organizationId: user.organizationId } });
      if (!supplier) throw new NotFoundException('Supplier test record not found');
      const organization = await this.db.organization.findUnique({ where: { id: user.organizationId } });
      return {
        organization: this.organizationContext(organization),
        supplier,
        module,
        lines: [],
      };
    }

    return this.sampleContext(user, module);
  }

  private purchaseOrderContext(order: any) {
    const formatMoney = (value: unknown) => Number(value || 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return {
      organization: this.organizationContext(order.organization),
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
        product: { name: line.product?.name || line.description || '', sku: line.product?.sku || '', metadata: line.product?.metadata || {} },
        quantityOrdered: line.quantityOrdered,
        quantityReceived: line.quantityReceived,
        unitCost: formatMoney(line.unitCost),
        lineTotal: formatMoney(line.lineTotal),
      })),
      module: 'purchase_orders',
    };
  }

  private organizationContext(organization: any) {
    return {
      name: organization?.name || 'NexStock',
      email: organization?.billingEmail || organization?.email || '',
      phone: organization?.phone || '',
      address: [organization?.address, organization?.city, organization?.country].filter(Boolean).join(', '),
    };
  }

  private async clearDefault(organizationId: string, type: string, kind: string, exceptId?: string) {
    if (exceptId) {
      await this.db.$executeRaw`
        UPDATE "DocumentTemplate"
        SET "isDefault" = false
        WHERE "organizationId" = ${organizationId} AND type = ${type} AND kind = ${kind} AND id <> ${exceptId}
      `;
      return;
    }

    await this.db.$executeRaw`
      UPDATE "DocumentTemplate"
      SET "isDefault" = false
      WHERE "organizationId" = ${organizationId} AND type = ${type} AND kind = ${kind}
    `;
  }

  private templateType(value?: string) {
    const type = (value || 'purchase_orders').trim();
    if (!type) throw new BadRequestException('Template module is required');
    return type;
  }

  private templateKind(value?: string) {
    const kind = (value || 'pdf').trim().toLowerCase();
    if (!['pdf', 'email'].includes(kind)) throw new BadRequestException('Template kind must be pdf or email');
    return kind;
  }

  private optionalText(value?: string | null) {
    if (value === undefined || value === null) return null;
    const text = value.trim();
    return text || null;
  }

  private rethrowTemplateSaveError(error: unknown, fallback: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new BadRequestException('A template with this name already exists');
    }

    if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
    if (error instanceof Error) throw new BadRequestException(`${fallback}: ${error.message}`);
    throw new BadRequestException(fallback);
  }

  private async layoutFields(organizationId: string) {
    return this.db.$queryRaw<LayoutFieldRow[]>`
      SELECT f.key, f.label, f.type, t.name AS "layoutName"
      FROM "ProductTypeField" f
      JOIN "ProductType" t ON t.id = f."productTypeId"
      WHERE f."organizationId" = ${organizationId} AND f."isActive" = true AND t."isActive" = true
      ORDER BY t.name ASC, f."order" ASC, f.label ASC
    `;
  }

  private async sampleContext(user: CurrentUserPayload, module?: string) {
    const layoutFields = await this.layoutFields(user.organizationId);
    const customValues = Object.fromEntries(layoutFields.map((field) => [field.key, `Sample ${field.label}`]));

    const shared = {
      organization: { name: 'NexStock Demo', email: 'orders@nexstock.test', phone: '+27 00 000 0000', address: 'Demo address' },
      supplier: { name: 'ABC Supplies', supplierCode: 'SUP-0001', email: 'supplier@example.com', phone: '+27 00 111 2222' },
      customer: { name: 'Sample Customer', email: 'customer@example.com', phone: '+27 00 333 4444' },
      product: { name: 'Sample Product', sku: 'SKU-001', price: '1,250.00', quantity: 12, metadata: { productTypeName: 'General product', kind: 'physical', customFields: customValues } },
      customFields: customValues,
      lines: [
        { product: { name: 'Sample Product A', sku: 'SKU-001', metadata: { customFields: customValues } }, quantityOrdered: 5, quantity: 5, unitCost: '150.00', unitPrice: '150.00', lineTotal: '750.00', customFields: customValues },
        { product: { name: 'Sample Product B', sku: 'SKU-002', metadata: { customFields: customValues } }, quantityOrdered: 2, quantity: 2, unitCost: '250.00', unitPrice: '250.00', lineTotal: '500.00', customFields: customValues },
      ],
    };

    return {
      ...shared,
      purchaseOrder: { poNumber: 'PO-00001', subtotal: '1,250.00', currency: 'ZAR', expectedAt: '2026-05-20', notes: 'Deliver to warehouse.', customFields: customValues },
      quote: { quoteNumber: 'QT-00001', total: '1,250.00', currency: 'ZAR', validUntil: '2026-06-20', customFields: customValues },
      invoice: { invoiceNumber: 'INV-00001', total: '1,250.00', currency: 'ZAR', dueDate: '2026-06-20', customFields: customValues },
      statement: { statementNumber: 'ST-00001', balance: '1,250.00', currency: 'ZAR', period: 'May 2026', customFields: customValues },
      module: module || 'purchase_orders',
    };
  }
}
