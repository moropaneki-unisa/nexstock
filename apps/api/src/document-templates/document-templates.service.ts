import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentTemplateDto, PreviewDocumentTemplateDto, UpdateDocumentTemplateDto } from './dto';

@Injectable()
export class DocumentTemplatesService {
  constructor(private readonly db: PrismaService) {}

  list(user: CurrentUserPayload) {
    return this.db.documentTemplate.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async get(user: CurrentUserPayload, id: string) {
    const template = await this.db.documentTemplate.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!template) throw new NotFoundException('Document template not found');
    return template;
  }

  async create(user: CurrentUserPayload, dto: CreateDocumentTemplateDto) {
    const type = this.templateType(dto.type);
    if (dto.isDefault) await this.clearDefault(user.organizationId, type);

    try {
      return await this.db.documentTemplate.create({
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
    } catch (error) {
      throw new BadRequestException('A template with this name already exists');
    }
  }

  async update(user: CurrentUserPayload, id: string, dto: UpdateDocumentTemplateDto) {
    const existing = await this.get(user, id);
    const type = this.templateType(dto.type ?? existing.type);
    if (dto.isDefault) await this.clearDefault(user.organizationId, type, id);

    try {
      return await this.db.documentTemplate.update({
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
    } catch (error) {
      throw new BadRequestException('Template could not be updated');
    }
  }

  async delete(user: CurrentUserPayload, id: string) {
    await this.get(user, id);
    return this.db.documentTemplate.update({ where: { id }, data: { isActive: false, isDefault: false } });
  }

  preview(dto: PreviewDocumentTemplateDto) {
    const sample = this.sampleContext(dto.type);
    return {
      to: dto.recipientEmailTemplate ? this.render(dto.recipientEmailTemplate, sample) : sample.supplier?.email ?? sample.customer?.email ?? 'recipient@example.com',
      subject: dto.subjectTemplate ? this.render(dto.subjectTemplate, sample) : 'Document preview',
      html: this.render(dto.htmlTemplate, sample),
      email: dto.emailTemplate ? this.render(dto.emailTemplate, sample) : null,
    };
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

  private async clearDefault(organizationId: string, type: string, exceptId?: string) {
    await this.db.documentTemplate.updateMany({
      where: { organizationId, type, id: exceptId ? { not: exceptId } : undefined },
      data: { isDefault: false },
    });
  }

  private templateType(value?: string) {
    const type = (value || 'purchase_orders').trim();
    if (!type) throw new BadRequestException('Template module is required');
    return type;
  }

  private optionalText(value?: string | null) {
    if (value === undefined || value === null) return null;
    const text = value.trim();
    return text || null;
  }

  private sampleContext(module?: string) {
    const shared = {
      organization: { name: 'NexStock Demo', email: 'orders@nexstock.test', phone: '+27 00 000 0000' },
      supplier: { name: 'ABC Supplies', supplierCode: 'SUP-0001', email: 'supplier@example.com', phone: '+27 00 111 2222' },
      customer: { name: 'Sample Customer', email: 'customer@example.com', phone: '+27 00 333 4444' },
      product: { name: 'Sample Product', sku: 'SKU-001', price: '1,250.00', quantity: 12 },
      lines: [
        { product: { name: 'Sample Product A', sku: 'SKU-001' }, quantityOrdered: 5, quantity: 5, unitCost: '150.00', unitPrice: '150.00', lineTotal: '750.00' },
        { product: { name: 'Sample Product B', sku: 'SKU-002' }, quantityOrdered: 2, quantity: 2, unitCost: '250.00', unitPrice: '250.00', lineTotal: '500.00' },
      ],
    };

    return {
      ...shared,
      purchaseOrder: { poNumber: 'PO-00001', subtotal: '1,250.00', currency: 'ZAR', expectedAt: '2026-05-20', notes: 'Deliver to warehouse.' },
      quote: { quoteNumber: 'QT-00001', total: '1,250.00', currency: 'ZAR', validUntil: '2026-06-20' },
      invoice: { invoiceNumber: 'INV-00001', total: '1,250.00', currency: 'ZAR', dueDate: '2026-06-20' },
      statement: { statementNumber: 'ST-00001', balance: '1,250.00', currency: 'ZAR', period: 'May 2026' },
      module: module || 'purchase_orders',
    };
  }
}
