import { BadRequestException, Injectable } from '@nestjs/common';
import { CustomField, CustomFieldType, Prisma, ProductStatus } from '@prisma/client';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';

type UploadedSpreadsheetFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
};

type ProductImportRow = Record<string, unknown>;

type ProductImportResult = {
  created: number;
  updated: number;
  skipped: number;
  total: number;
  errors: Array<{ row: number; message: string }>;
};

type CurrencySettings = {
  baseCurrency: string;
  enabledCurrencies: string[];
  exchangeRates: Array<{ code: string; rateToBase: number }>;
};

const XLSX_CELL_TEXT_LIMIT = 32_767;
const XLSX_TRUNCATION_SUFFIX = '\n\n[Truncated for XLSX export. Export CSV for the full value.]';

const CORE_EXPORT_HEADERS = [
  'name',
  'sku',
  'description',
  'price',
  'priceCurrency',
  'cost',
  'costCurrency',
  'exchangeRateToBase',
  'convertedCost',
  'quantity',
  'lowStockLevel',
  'category',
  'status',
  'images',
];

@Injectable()
export class ProductsImportExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportProducts(organizationId: string, format: 'csv' | 'xlsx' = 'csv') {
    const [products, fields] = await Promise.all([
      this.prisma.product.findMany({
        where: { organizationId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: { customFieldValues: { include: { field: true } } },
      }),
      this.prisma.customField.findMany({
        where: { organizationId, isActive: true },
        orderBy: { order: 'asc' },
      }),
    ]);

    const customHeaders = fields.map((field) => this.customHeader(field));
    const headers = [...CORE_EXPORT_HEADERS, ...customHeaders];
    const rows = products.map((product) => {
      const row: Record<string, unknown> = {
        name: product.name,
        sku: product.sku,
        description: product.description ?? '',
        price: product.price.toString(),
        priceCurrency: product.priceCurrency,
        cost: product.cost?.toString() ?? '',
        costCurrency: product.costCurrency ?? '',
        exchangeRateToBase: product.exchangeRateToBase?.toString() ?? '',
        convertedCost: product.convertedCost?.toString() ?? '',
        quantity: product.quantity,
        lowStockLevel: product.lowStockLevel,
        category: product.category ?? '',
        status: product.status,
        images: product.images.join('|'),
      };

      for (const value of product.customFieldValues) {
        row[this.customHeader(value.field)] = this.stringifyCellValue(value.value);
      }

      return row;
    });

    if (format === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet(this.toXlsxSafeRows(headers, rows), { header: headers });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
      return {
        buffer: XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        fileName: `nexstock-products-${new Date().toISOString().slice(0, 10)}.xlsx`,
      };
    }

    return {
      buffer: Buffer.from(this.toCsv(headers, rows), 'utf8'),
      contentType: 'text/csv; charset=utf-8',
      fileName: `nexstock-products-${new Date().toISOString().slice(0, 10)}.csv`,
    };
  }

  async importProducts(organizationId: string, file: UploadedSpreadsheetFile): Promise<ProductImportResult> {
    if (!file) throw new BadRequestException('CSV or XLSX file is required');
    if (file.size > 10 * 1024 * 1024) throw new BadRequestException('Import file must be 10MB or smaller');

    const rows = this.parseFile(file);
    const result: ProductImportResult = { created: 0, updated: 0, skipped: 0, total: rows.length, errors: [] };

    if (!rows.length) return result;

    const [organization, activeFields] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id: organizationId } }),
      this.prisma.customField.findMany({ where: { organizationId, isActive: true } }),
    ]);

    if (!organization) throw new BadRequestException('Organization not found');
    const currencySettings = this.organizationCurrencySettings(organization);

    for (const [index, row] of rows.entries()) {
      const rowNumber = index + 2;

      try {
        const mapped = this.mapImportRow(row, activeFields, currencySettings);
        if (!mapped.name) {
          result.skipped++;
          result.errors.push({ row: rowNumber, message: 'Missing product name' });
          continue;
        }

        const sku = mapped.sku || this.generateSku(organization.skuPrefix ?? this.generateSkuPrefix(organization.name), organization.nextSkuNumber + result.created);
        const existing = await this.prisma.product.findFirst({ where: { organizationId, sku, deletedAt: null }, select: { id: true, quantity: true } });

        if (existing) {
          await this.prisma.product.update({
            where: { id_organizationId: { id: existing.id, organizationId } },
            data: {
              name: mapped.name,
              description: mapped.description,
              price: mapped.price,
              priceCurrency: mapped.priceCurrency,
              cost: mapped.cost,
              costCurrency: mapped.costCurrency,
              exchangeRateToBase: mapped.exchangeRateToBase,
              convertedCost: mapped.convertedCost,
              quantity: mapped.quantity,
              lowStockLevel: mapped.lowStockLevel,
              category: mapped.category,
              status: mapped.status,
              images: mapped.images,
              metadata: mapped.metadata,
            },
          });

          for (const customValue of mapped.customFieldValues) {
            await this.prisma.productCustomFieldValue.upsert({
              where: { productId_fieldId: { productId: existing.id, fieldId: customValue.fieldId } },
              create: { productId: existing.id, fieldId: customValue.fieldId, value: customValue.value },
              update: { value: customValue.value },
            });
          }

          if (existing.quantity !== mapped.quantity) {
            await this.prisma.inventoryLog.create({
              data: {
                organizationId,
                productId: existing.id,
                type: 'sync',
                quantityBefore: existing.quantity,
                quantityAfter: mapped.quantity,
                delta: mapped.quantity - existing.quantity,
                reason: 'Spreadsheet import',
                source: 'file_import',
              },
            });
          }

          result.updated++;
        } else {
          const created = await this.prisma.product.create({
            data: {
              organizationId,
              sku,
              name: mapped.name,
              description: mapped.description,
              price: mapped.price,
              priceCurrency: mapped.priceCurrency,
              cost: mapped.cost,
              costCurrency: mapped.costCurrency,
              exchangeRateToBase: mapped.exchangeRateToBase,
              convertedCost: mapped.convertedCost,
              quantity: mapped.quantity,
              lowStockLevel: mapped.lowStockLevel,
              category: mapped.category,
              status: mapped.status,
              images: mapped.images,
              metadata: mapped.metadata,
              customFieldValues: { create: mapped.customFieldValues },
            },
          });

          if (mapped.quantity > 0) {
            await this.prisma.inventoryLog.create({
              data: {
                organizationId,
                productId: created.id,
                type: 'sync',
                quantityBefore: 0,
                quantityAfter: mapped.quantity,
                delta: mapped.quantity,
                reason: 'Spreadsheet import',
                source: 'file_import',
              },
            });
          }

          result.created++;
        }
      } catch (error) {
        result.skipped++;
        result.errors.push({ row: rowNumber, message: error instanceof Error ? error.message : 'Import failed for this row' });
      }
    }

    if (result.created > 0) {
      await this.prisma.organization.update({
        where: { id: organizationId },
        data: { nextSkuNumber: { increment: result.created } },
      });
    }

    return result;
  }

  private parseFile(file: UploadedSpreadsheetFile) {
    const name = file.originalname.toLowerCase();

    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) return [];
      return XLSX.utils.sheet_to_json<ProductImportRow>(workbook.Sheets[sheetName], { defval: '' });
    }

    if (name.endsWith('.csv') || file.mimetype.includes('csv')) {
      return this.parseCsv(file.buffer.toString('utf8'));
    }

    throw new BadRequestException('Only CSV, XLS, and XLSX files are supported');
  }

  private mapImportRow(row: ProductImportRow, fields: CustomField[], currencySettings: CurrencySettings) {
    const normalized = new Map<string, unknown>();
    for (const [key, value] of Object.entries(row)) normalized.set(this.normalizeHeader(key), value);

    const get = (...keys: string[]) => {
      for (const key of keys) {
        const value = normalized.get(this.normalizeHeader(key));
        if (value !== undefined && value !== null && String(value).trim() !== '') return value;
      }
      return undefined;
    };

    const customFieldValues = fields
      .map((field) => {
        const value = get(this.customHeader(field), field.label, field.key, `custom:${field.key}`, `custom:${field.label}`);
        if (value === undefined) return null;
        return { fieldId: field.id, value: this.convertCustomValue(field, value) };
      })
      .filter(Boolean) as Array<{ fieldId: string; value: Prisma.InputJsonValue }>;

    const price = new Prisma.Decimal(this.numberValue(get('price', 'rate', 'sales rate')));
    const costInput = get('cost', 'purchase_rate', 'purchase rate', 'vendor cost', 'buying price');
    const cost = costInput === undefined ? undefined : new Prisma.Decimal(this.numberValue(costInput));
    const priceCurrency = this.currencyValue(get('priceCurrency', 'price currency', 'selling currency', 'currency'), currencySettings.baseCurrency);
    const costCurrency = cost === undefined ? undefined : this.currencyValue(get('costCurrency', 'cost currency', 'vendor currency', 'buying currency'), priceCurrency);
    const exchangeRateInput = get('exchangeRateToBase', 'exchange rate to base', 'exchangeRate', 'exchange rate', 'fx rate');
    const exchangeRateToBase = cost === undefined || !costCurrency
      ? undefined
      : new Prisma.Decimal(exchangeRateInput === undefined ? this.rateFor(costCurrency, currencySettings) : this.numberValue(exchangeRateInput));
    const convertedCost = cost === undefined || exchangeRateToBase === undefined
      ? undefined
      : cost.mul(exchangeRateToBase).toDecimalPlaces(2);

    if (priceCurrency !== currencySettings.baseCurrency) {
      throw new BadRequestException(`Selling currency ${priceCurrency} must match base currency ${currencySettings.baseCurrency}`);
    }
    for (const code of [priceCurrency, costCurrency].filter(Boolean) as string[]) {
      if (!currencySettings.enabledCurrencies.includes(code)) {
        throw new BadRequestException(`${code} is not enabled in organization currency settings`);
      }
    }

    return {
      name: this.cleanString(get('name', 'product name', 'title')),
      sku: this.cleanString(get('sku', 'product sku')),
      description: this.cleanString(get('description', 'product description')),
      price,
      priceCurrency,
      cost,
      costCurrency,
      exchangeRateToBase,
      convertedCost,
      quantity: Math.max(0, Math.round(this.numberValue(get('quantity', 'stock', 'stock_on_hand', 'stock on hand')))),
      lowStockLevel: Math.max(0, Math.round(this.numberValue(get('lowStockLevel', 'low stock level', 'low_stock_level')) || 5)),
      category: this.cleanString(get('category', 'category_name', 'category name')),
      status: this.statusValue(get('status')),
      images: this.imagesValue(get('images', 'image', 'image url', 'image_url')),
      metadata: { source: 'file_import' } as Prisma.InputJsonValue,
      customFieldValues,
    };
  }

  private parseCsv(content: string) {
    const rows: string[][] = [];
    let current = '';
    let row: string[] = [];
    let quoted = false;

    for (let index = 0; index < content.length; index++) {
      const char = content[index];
      const next = content[index + 1];

      if (char === '"' && quoted && next === '"') {
        current += '"';
        index++;
        continue;
      }

      if (char === '"') {
        quoted = !quoted;
        continue;
      }

      if (char === ',' && !quoted) {
        row.push(current);
        current = '';
        continue;
      }

      if ((char === '\n' || char === '\r') && !quoted) {
        if (char === '\r' && next === '\n') index++;
        row.push(current);
        if (row.some((cell) => cell.trim() !== '')) rows.push(row);
        row = [];
        current = '';
        continue;
      }

      current += char;
    }

    row.push(current);
    if (row.some((cell) => cell.trim() !== '')) rows.push(row);

    const [headers = [], ...dataRows] = rows;
    return dataRows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ''])));
  }

  private toCsv(headers: string[], rows: Record<string, unknown>[]) {
    const lines = [headers.join(',')];
    for (const row of rows) lines.push(headers.map((header) => this.csvEscape(row[header])).join(','));
    return lines.join('\n');
  }

  private toXlsxSafeRows(headers: string[], rows: Record<string, unknown>[]) {
    return rows.map((row) =>
      Object.fromEntries(headers.map((header) => [header, this.xlsxSafeCellValue(row[header])])),
    );
  }

  private xlsxSafeCellValue(value: unknown) {
    const text = this.stringifyCellValue(value);
    if (text.length <= XLSX_CELL_TEXT_LIMIT) return text;

    const maxValueLength = XLSX_CELL_TEXT_LIMIT - XLSX_TRUNCATION_SUFFIX.length;
    return `${text.slice(0, maxValueLength)}${XLSX_TRUNCATION_SUFFIX}`;
  }

  private csvEscape(value: unknown) {
    const text = this.stringifyCellValue(value);
    if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  }

  private stringifyCellValue(value: unknown) {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.join('|');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  private customHeader(field: CustomField) {
    return `custom:${field.key || field.label}`;
  }

  private normalizeHeader(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  private cleanString(value: unknown) {
    if (value === undefined || value === null) return undefined;
    const text = String(value).trim();
    return text || undefined;
  }

  private numberValue(value: unknown) {
    if (value === undefined || value === null || value === '') return 0;
    const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private currencyValue(value: unknown, fallback: string) {
    const code = String(value || fallback).trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) return fallback;
    return code;
  }

  private organizationCurrencySettings(organization: {
    baseCurrency?: string | null;
    enabledCurrencies?: string[] | null;
    exchangeRates?: Prisma.JsonValue | null;
  }): CurrencySettings {
    const baseCurrency = this.currencyValue(organization.baseCurrency, 'ZAR');
    const enabledCurrencies = Array.from(new Set([baseCurrency, ...(organization.enabledCurrencies ?? []).map((code) => this.currencyValue(code, baseCurrency))]));
    const exchangeRates = this.normalizeExchangeRates(organization.exchangeRates);
    return { baseCurrency, enabledCurrencies, exchangeRates };
  }

  private normalizeExchangeRates(value: Prisma.JsonValue | null | undefined): Array<{ code: string; rateToBase: number }> {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value
        .map((item) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
          const record = item as Record<string, unknown>;
          return { code: this.currencyValue(record.code, ''), rateToBase: Number(record.rateToBase ?? 1) };
        })
        .filter((item): item is { code: string; rateToBase: number } => Boolean(item?.code));
    }
    if (typeof value === 'object') {
      return Object.entries(value).map(([code, rate]) => ({ code: this.currencyValue(code, ''), rateToBase: Number(rate || 1) }));
    }
    return [];
  }

  private rateFor(code: string, settings: CurrencySettings) {
    if (code === settings.baseCurrency) return 1;
    return settings.exchangeRates.find((rate) => rate.code === code)?.rateToBase ?? 1;
  }

  private statusValue(value: unknown) {
    const status = String(value ?? '').toLowerCase();
    if (status === ProductStatus.draft) return ProductStatus.draft;
    if (status === ProductStatus.archived) return ProductStatus.archived;
    return ProductStatus.active;
  }

  private imagesValue(value: unknown) {
    if (value === undefined || value === null || value === '') return [];
    return String(value)
      .split(/[|,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private convertCustomValue(field: CustomField, value: unknown): Prisma.InputJsonValue {
    if (field.type === CustomFieldType.number) return this.numberValue(value);
    if (field.type === CustomFieldType.boolean) return ['true', '1', 'yes', 'y'].includes(String(value).toLowerCase());
    if (field.type === CustomFieldType.json) {
      try {
        return JSON.parse(String(value));
      } catch {
        return String(value);
      }
    }
    return String(value);
  }

  private generateSkuPrefix(companyName: string) {
    const prefix = companyName.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
    return prefix.length >= 3 ? prefix : prefix.padEnd(3, 'X');
  }

  private generateSku(prefix: string, nextSkuNumber: number) {
    return `${prefix}-${String(nextSkuNumber).padStart(5, '0')}`;
  }
}
