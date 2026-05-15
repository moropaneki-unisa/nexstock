import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import * as XLSX from 'xlsx';
import { PlanLimitsService } from '../plan-limits/plan-limits.service';
import { PrismaService } from '../prisma/prisma.service';

type UploadedSpreadsheetFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
};

type ProductImportRow = Record<string, unknown>;
type ProductImportMapping = Record<string, string>;

type ProductImportResult = {
  logId?: string;
  status?: 'completed' | 'completed_with_errors' | 'failed';
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

type LayoutField = {
  key: string;
  label: string;
  type: string;
  layoutName: string;
};

type ProductImportLogRow = {
  id: string;
  fileName: string;
  status: string;
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  mapping: Prisma.JsonValue | null;
  errors: Prisma.JsonValue | null;
  metadata: Prisma.JsonValue | null;
  startedAt: Date;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
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
  'layout',
  'kind',
  'trackInventory',
];

@Injectable()
export class ProductsImportExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planLimits: PlanLimitsService,
  ) {}

  async listImportLogs(organizationId: string) {
    return this.prisma.$queryRaw<ProductImportLogRow[]>`
      SELECT id, "fileName", status, "totalRows", "createdCount", "updatedCount", "skippedCount", "errorCount", mapping, errors, metadata, "startedAt", "finishedAt", "createdAt", "updatedAt"
      FROM "ProductImportLog"
      WHERE "organizationId" = ${organizationId}
      ORDER BY "createdAt" DESC
      LIMIT 50
    `;
  }

  async getImportLog(organizationId: string, id: string) {
    const rows = await this.prisma.$queryRaw<ProductImportLogRow[]>`
      SELECT id, "fileName", status, "totalRows", "createdCount", "updatedCount", "skippedCount", "errorCount", mapping, errors, metadata, "startedAt", "finishedAt", "createdAt", "updatedAt"
      FROM "ProductImportLog"
      WHERE id = ${id} AND "organizationId" = ${organizationId}
      LIMIT 1
    `;
    const log = rows[0];
    if (!log) throw new NotFoundException('Import log not found');
    return log;
  }

  async exportProducts(organizationId: string, format: 'csv' | 'xlsx' = 'csv') {
    const [products, fields] = await Promise.all([
      this.prisma.product.findMany({
        where: { organizationId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      }),
      this.layoutFields(organizationId),
    ]);

    const customHeaders = fields.map((field) => this.customHeader(field));
    const headers = [...CORE_EXPORT_HEADERS, ...customHeaders];
    const rows = products.map((product) => {
      const metadata = this.recordObject(product.metadata);
      const customFields = this.recordObject(metadata.customFields);
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
        images: this.jsonValue(product.images),
        layout: metadata.productTypeName ?? '',
        kind: metadata.kind ?? '',
        trackInventory: metadata.trackInventory ?? '',
      };

      for (const field of fields) {
        const value = customFields[field.key];
        if (value !== undefined) row[this.customHeader(field)] = this.stringifyLayoutExportValue(field, value);
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

  async importProducts(organizationId: string, file: UploadedSpreadsheetFile, mapping: ProductImportMapping = {}): Promise<ProductImportResult> {
    if (!file) throw new BadRequestException('CSV or XLSX file is required');
    if (file.size > 10 * 1024 * 1024) throw new BadRequestException('Import file must be 10MB or smaller');

    const logId = await this.createImportLog(organizationId, file, mapping);
    const result: ProductImportResult = { logId, status: 'completed', created: 0, updated: 0, skipped: 0, total: 0, errors: [] };

    try {
      const rows = this.parseFile(file);
      result.total = rows.length;
      await this.updateImportLog(organizationId, logId, { totalRows: rows.length });
      await this.planLimits.assertCanImportRows(organizationId, rows.length);

      if (!rows.length) {
        await this.finishImportLog(organizationId, logId, result);
        return result;
      }

      const [organization, activeFields, existingProductCount] = await Promise.all([
        this.prisma.organization.findUnique({ where: { id: organizationId } }),
        this.layoutFields(organizationId),
        this.prisma.product.count({ where: { organizationId, deletedAt: null } }),
      ]);

      await this.planLimits.assertWithinLimit(organizationId, 'products', existingProductCount + rows.length);

      if (!organization) throw new BadRequestException('Organization not found');
      const currencySettings = this.organizationCurrencySettings(organization);

      for (const [index, row] of rows.entries()) {
        const rowNumber = index + 2;

        try {
          const mapped = this.mapImportRow(row, activeFields, currencySettings, mapping);
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
                  referenceId: logId,
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
                  referenceId: logId,
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
        await this.prisma.organization.update({ where: { id: organizationId }, data: { nextSkuNumber: { increment: result.created } } });
      }

      result.status = result.errors.length ? 'completed_with_errors' : 'completed';
      await this.finishImportLog(organizationId, logId, result);
      return result;
    } catch (error) {
      result.status = 'failed';
      result.errors.push({ row: 0, message: error instanceof Error ? error.message : 'Import failed' });
      await this.finishImportLog(organizationId, logId, result);
      throw error;
    }
  }

  private async createImportLog(organizationId: string, file: UploadedSpreadsheetFile, mapping: ProductImportMapping) {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "ProductImportLog" ("organizationId", "fileName", status, mapping, metadata)
      VALUES (${organizationId}, ${file.originalname}, 'processing', ${JSON.stringify(mapping)}::jsonb, ${JSON.stringify({ size: file.size, mimetype: file.mimetype })}::jsonb)
      RETURNING id
    `;
    return rows[0]?.id;
  }

  private updateImportLog(organizationId: string, id: string, data: { totalRows?: number }) {
    return this.prisma.$executeRaw`
      UPDATE "ProductImportLog"
      SET "totalRows" = COALESCE(${data.totalRows ?? null}, "totalRows"), "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = ${id} AND "organizationId" = ${organizationId}
    `;
  }

  private finishImportLog(organizationId: string, id: string, result: ProductImportResult) {
    return this.prisma.$executeRaw`
      UPDATE "ProductImportLog"
      SET status = ${result.status ?? 'completed'},
          "createdCount" = ${result.created},
          "updatedCount" = ${result.updated},
          "skippedCount" = ${result.skipped},
          "errorCount" = ${result.errors.length},
          "totalRows" = ${result.total},
          errors = ${JSON.stringify(result.errors)}::jsonb,
          "finishedAt" = CURRENT_TIMESTAMP,
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = ${id} AND "organizationId" = ${organizationId}
    `;
  }

  private parseFile(file: UploadedSpreadsheetFile) {
    const name = file.originalname.toLowerCase();

    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) return [];
      return XLSX.utils.sheet_to_json<ProductImportRow>(workbook.Sheets[sheetName], { defval: '' });
    }

    if (name.endsWith('.csv') || file.mimetype.includes('csv')) return this.parseCsv(file.buffer.toString('utf8'));
    throw new BadRequestException('Only CSV, XLS, and XLSX files are supported');
  }

  private mapImportRow(row: ProductImportRow, fields: LayoutField[], currencySettings: CurrencySettings, mapping: ProductImportMapping = {}) {
    const normalized = new Map<string, unknown>();
    for (const [key, value] of Object.entries(row)) normalized.set(this.normalizeHeader(key), value);

    const get = (...keys: string[]) => {
      for (const key of keys) {
        const mappedColumn = mapping[key] || mapping[this.normalizeHeader(key)];
        const candidates = mappedColumn ? [mappedColumn, key] : [key];
        for (const candidate of candidates) {
          const value = normalized.get(this.normalizeHeader(candidate));
          if (value !== undefined && value !== null && String(value).trim() !== '') return value;
        }
      }
      return undefined;
    };

    const customFields: Record<string, unknown> = {};
    for (const field of fields) {
      const value = get(`custom:${field.key}`, this.customHeader(field), field.label, field.key, `custom:${field.label}`);
      if (value !== undefined) customFields[field.key] = this.convertLayoutValue(field, value, currencySettings.baseCurrency);
    }

    const price = new Prisma.Decimal(this.numberValue(get('price', 'rate', 'sales rate')));
    const costInput = get('cost', 'purchase_rate', 'purchase rate', 'vendor cost', 'buying price');
    const cost = costInput === undefined ? undefined : new Prisma.Decimal(this.numberValue(costInput));
    const priceCurrency = this.currencyValue(get('priceCurrency', 'price currency', 'selling currency', 'currency'), currencySettings.baseCurrency);
    const costCurrency = cost === undefined ? undefined : this.currencyValue(get('costCurrency', 'cost currency', 'vendor currency', 'buying currency'), priceCurrency);
    const exchangeRateInput = get('exchangeRateToBase', 'exchange rate to base', 'exchangeRate', 'exchange rate', 'fx rate');
    const exchangeRateToBase = cost === undefined || !costCurrency ? undefined : new Prisma.Decimal(exchangeRateInput === undefined ? this.rateFor(costCurrency, currencySettings) : this.numberValue(exchangeRateInput));
    const convertedCost = cost === undefined || exchangeRateToBase === undefined ? undefined : cost.mul(exchangeRateToBase).toDecimalPlaces(2);

    if (priceCurrency !== currencySettings.baseCurrency) throw new BadRequestException(`Selling currency ${priceCurrency} must match base currency ${currencySettings.baseCurrency}`);
    for (const code of [priceCurrency, costCurrency].filter(Boolean) as string[]) {
      if (!currencySettings.enabledCurrencies.includes(code)) throw new BadRequestException(`${code} is not enabled in organization currency settings`);
    }

    const metadata: Record<string, unknown> = { source: 'file_import' };
    if (Object.keys(customFields).length) metadata.customFields = customFields;

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
      metadata: metadata as Prisma.InputJsonValue,
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
      if (char === '"' && quoted && next === '"') { current += '"'; index++; continue; }
      if (char === '"') { quoted = !quoted; continue; }
      if (char === ',' && !quoted) { row.push(current); current = ''; continue; }
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
    return rows.map((row) => Object.fromEntries(headers.map((header) => [header, this.xlsxSafeCellValue(row[header])])));
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
    if (Array.isArray(value) || typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  private stringifyLayoutExportValue(field: LayoutField, value: unknown) {
    const type = String(field.type || 'text').toLowerCase();
    if (value === null || value === undefined) return '';

    if (type === 'text' || type === 'richtext' || type === 'number' || type === 'decimal' || type === 'select' || type === 'date') {
      return typeof value === 'object' ? JSON.stringify(value) : String(value);
    }

    if (type === 'currency') {
      const object = this.recordObject(value);
      return this.jsonValue({ amount: this.numberValue(object.amount ?? object.value), currency: this.currencyValue(object.currency, 'ZAR') });
    }

    if (type === 'images') {
      return this.jsonValue(Array.isArray(value) ? value.map(String).filter(Boolean) : this.imagesValue(value));
    }

    if (type === 'attachment') {
      if (!Array.isArray(value)) return this.jsonValue([]);
      return this.jsonValue(value.map((item) => {
        const object = this.recordObject(item);
        return { name: String(object.name ?? this.fileNameFromUrl(String(object.url ?? ''))), url: String(object.url ?? '') };
      }).filter((item) => item.url));
    }

    if (type === 'lookup') {
      const object = this.recordObject(value);
      return String(object.name ?? object.id ?? '');
    }

    if (type === 'boolean') {
      return this.booleanValue(value) ? 'Yes' : 'No';
    }

    return this.stringifyCellValue(value);
  }

  private jsonValue(value: unknown) {
    return JSON.stringify(value);
  }

  private customHeader(field: LayoutField) {
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
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private currencyValue(value: unknown, fallback: string) {
    const code = String(value || fallback).trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) return fallback;
    return code;
  }

  private organizationCurrencySettings(organization: { baseCurrency?: string | null; enabledCurrencies?: string[] | null; exchangeRates?: Prisma.JsonValue | null }): CurrencySettings {
    const baseCurrency = this.currencyValue(organization.baseCurrency, 'ZAR');
    const enabledCurrencies = Array.from(new Set([baseCurrency, ...(organization.enabledCurrencies ?? []).map((code) => this.currencyValue(code, baseCurrency))]));
    const exchangeRates = this.normalizeExchangeRates(organization.exchangeRates);
    return { baseCurrency, enabledCurrencies, exchangeRates };
  }

  private normalizeExchangeRates(value: Prisma.JsonValue | null | undefined): Array<{ code: string; rateToBase: number }> {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.map((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
        const record = item as Record<string, unknown>;
        return { code: this.currencyValue(record.code, ''), rateToBase: Number(record.rateToBase ?? 1) };
      }).filter((item): item is { code: string; rateToBase: number } => Boolean(item?.code));
    }
    if (typeof value === 'object') return Object.entries(value).map(([code, rate]) => ({ code: this.currencyValue(code, ''), rateToBase: Number(rate || 1) }));
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
    const parsed = this.parseJson(value);
    if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean);
    return String(value).split(/[|,]/).map((item) => item.trim()).filter(Boolean);
  }

  private convertLayoutValue(field: LayoutField, value: unknown, fallbackCurrency: string): Prisma.InputJsonValue {
    const type = String(field.type || 'text').toLowerCase();
    if (type === 'number') return Math.trunc(this.numberValue(value));
    if (type === 'decimal') return this.numberValue(value);
    if (type === 'currency') return this.currencyObjectValue(value, fallbackCurrency) as Prisma.InputJsonObject;
    if (type === 'boolean') return this.booleanValue(value);
    if (type === 'images') return this.imagesValue(value) as Prisma.InputJsonArray;
    if (type === 'attachment') return this.attachmentValue(value) as Prisma.InputJsonArray;
    if (type === 'lookup') {
      const parsed = this.parseJson(value);
      if (this.isRecord(parsed)) {
        const id = String(parsed.id ?? parsed.name ?? '').trim();
        const name = String(parsed.name ?? parsed.id ?? '').trim();
        return { id, name };
      }
      const text = String(value).trim();
      return { id: text, name: text };
    }
    if (type === 'date') return String(value).trim().slice(0, 10);
    return String(value).trim();
  }

  private currencyObjectValue(value: unknown, fallbackCurrency: string) {
    const parsed = this.parseJson(value);
    if (this.isRecord(parsed)) {
      return {
        amount: this.numberValue(parsed.amount ?? parsed.value),
        currency: this.currencyValue(parsed.currency, fallbackCurrency),
      };
    }

    const text = String(value ?? '').trim();
    const currencyMatch = text.match(/\b[A-Za-z]{3}\b/);
    return {
      amount: this.numberValue(text),
      currency: this.currencyValue(currencyMatch?.[0], fallbackCurrency),
    };
  }

  private attachmentValue(value: unknown) {
    const parsed = this.parseJson(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => {
        const object = this.recordObject(item);
        const url = String(object.url ?? '').trim();
        return { name: String(object.name ?? this.fileNameFromUrl(url)).trim(), url };
      }).filter((item) => item.url);
    }

    return String(value)
      .split('|')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const separatorIndex = item.indexOf('=');
        const namePart = separatorIndex >= 0 ? item.slice(0, separatorIndex) : '';
        const urlPart = separatorIndex >= 0 ? item.slice(separatorIndex + 1) : item;
        const url = String(urlPart || item).trim();
        return { name: String(namePart || this.fileNameFromUrl(url)).trim(), url };
      })
      .filter((item) => item.url);
  }

  private booleanValue(value: unknown) {
    if (typeof value === 'boolean') return value;
    return ['true', '1', 'yes', 'y'].includes(String(value).trim().toLowerCase());
  }

  private parseJson(value: unknown) {
    if (typeof value !== 'string') return value;
    const text = value.trim();
    if (!text || !['[', '{'].includes(text[0])) return value;
    try { return JSON.parse(text); } catch { return value; }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  private fileNameFromUrl(value: string) {
    const clean = value.split('/').pop() || value;
    return clean.replace(/\.[^/.]+$/, '') || 'attachment';
  }

  private recordObject(value: unknown): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
  }

  private async layoutFields(organizationId: string) {
    return this.prisma.$queryRaw<LayoutField[]>`
      SELECT f.key, f.label, f.type, t.name AS "layoutName"
      FROM "ProductTypeField" f
      JOIN "ProductType" t ON t.id = f."productTypeId"
      WHERE f."organizationId" = ${organizationId} AND f."isActive" = true AND t."isActive" = true
      ORDER BY t.name ASC, f."order" ASC, f.label ASC
    `;
  }

  private generateSkuPrefix(companyName: string) {
    const prefix = companyName.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
    return prefix.length >= 3 ? prefix : prefix.padEnd(3, 'X');
  }

  private generateSku(prefix: string, nextSkuNumber: number) {
    return `${prefix}-${String(nextSkuNumber).padStart(5, '0')}`;
  }
}
