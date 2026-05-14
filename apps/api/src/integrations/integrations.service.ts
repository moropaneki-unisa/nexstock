import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type IntegrationFieldMapping = {
  source: string;
  target: string;
};

export type ZohoConnectInput = {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  organizationId?: string;
  accountsDomain?: string;
  fieldMapping?: IntegrationFieldMapping[];
};

type ZohoCredentials = Required<Pick<ZohoConnectInput, 'clientId' | 'clientSecret' | 'redirectUri' | 'accountsDomain'>> & {
  organizationId?: string;
  fieldMapping: IntegrationFieldMapping[];
};

type ZohoTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  api_domain?: string;
  error?: string;
};

type ZohoItem = Record<string, unknown> & {
  item_id?: string | number;
  name?: string;
  sku?: string;
  description?: string;
  rate?: string | number;
  purchase_rate?: string | number;
  stock_on_hand?: string | number;
  category_name?: string;
};

const DEFAULT_ZOHO_AUTH_BASE = 'https://accounts.zoho.com/oauth/v2';
const ZOHO_API_BASE = 'https://www.zohoapis.com/inventory/v1';

const DEFAULT_ZOHO_FIELD_MAPPING: IntegrationFieldMapping[] = [
  { source: 'name', target: 'core:name' },
  { source: 'sku', target: 'core:sku' },
  { source: 'description', target: 'core:description' },
  { source: 'rate', target: 'core:price' },
  { source: 'purchase_rate', target: 'core:cost' },
  { source: 'stock_on_hand', target: 'core:quantity' },
  { source: 'category_name', target: 'core:category' },
  { source: 'item_id', target: 'metadata:externalId' },
];

@Injectable()
export class IntegrationsService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma as PrismaService & { integration: any; syncLog: any };
  }

  async list(organizationId: string) {
    const integrations = await this.db.integration.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, provider: true, status: true, lastSyncAt: true, tokenExpiresAt: true, config: true, createdAt: true, updatedAt: true },
    });
    return integrations.map((integration: any) => ({ ...integration, connected: integration.status === 'connected', config: this.safeIntegrationConfig(integration.config) }));
  }

  buildZohoConnectUrl(organizationId: string, input?: ZohoConnectInput) {
    const credentials = this.resolveZohoCredentials(input);
    const state = this.signState({ organizationId, timestamp: Date.now(), zoho: this.encodeCredentialState(credentials) });
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: credentials.clientId,
      scope: 'ZohoInventory.items.ALL,ZohoInventory.settings.READ',
      redirect_uri: credentials.redirectUri,
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    return { url: `${credentials.accountsDomain}/auth?${params.toString()}` };
  }

  async handleZohoCallback(input: { code?: string; state?: string; error?: string }) {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    if (input.error) return `${frontendUrl}/integrations?zoho=error&message=${encodeURIComponent(input.error)}`;
    if (!input.code || !input.state) return `${frontendUrl}/integrations?zoho=error&message=${encodeURIComponent('Missing Zoho callback code or state')}`;

    try {
      const { organizationId, zoho } = this.verifyState(input.state);
      const credentials = this.decodeCredentialState(zoho);
      const token = await this.exchangeZohoCode(input.code, credentials);
      if (!token.access_token) throw new BadRequestException(token.error ?? 'Zoho did not return an access token');

      const config = {
        apiBase: this.inventoryApiBase(token.api_domain),
        apiDomain: token.api_domain ?? undefined,
        zohoOrganizationId: credentials.organizationId,
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        redirectUri: credentials.redirectUri,
        accountsDomain: credentials.accountsDomain,
        fieldMapping: credentials.fieldMapping,
      };

      await this.db.integration.upsert({
        where: { organizationId_provider: { organizationId, provider: 'zoho' } },
        create: { organizationId, provider: 'zoho', status: 'connected', accessToken: token.access_token, refreshToken: token.refresh_token, tokenExpiresAt: this.expiresAt(token.expires_in), config },
        update: { status: 'connected', accessToken: token.access_token, ...(token.refresh_token ? { refreshToken: token.refresh_token } : {}), tokenExpiresAt: this.expiresAt(token.expires_in), config },
      });

      return `${frontendUrl}/integrations?zoho=connected`;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Zoho connection failed';
      return `${frontendUrl}/integrations?zoho=error&message=${encodeURIComponent(message)}`;
    }
  }

  async syncZohoProducts(organizationId: string) {
    const integration = await this.db.integration.findUnique({ where: { organizationId_provider: { organizationId, provider: 'zoho' } } });
    if (!integration || integration.status !== 'connected') throw new NotFoundException('Zoho is not connected for this organization');

    const log = await this.db.syncLog.create({ data: { organizationId, integrationId: integration.id, provider: 'zoho', status: 'running', direction: 'pull', startedAt: new Date() } });
    let created = 0;
    let updated = 0;

    try {
      const freshIntegration = await this.ensureFreshZohoToken(integration.id);
      const config = freshIntegration.config as Prisma.JsonObject | null;
      const mapping = this.fieldMappingFromConfig(config);
      const items = await this.pullZohoProducts(freshIntegration.accessToken, config);

      for (const item of items) {
        const mapped = this.mapZohoItem(item, mapping);
        const sku = mapped.sku || (mapped.externalId ? `ZOHO-${mapped.externalId}` : undefined);
        if (!mapped.name || !sku) continue;

        const existing = await this.prisma.product.findFirst({ where: { organizationId, sku, deletedAt: null }, select: { id: true, quantity: true } });
        const data = {
          name: mapped.name,
          description: mapped.description,
          price: mapped.price ?? new Prisma.Decimal(0),
          cost: mapped.cost,
          quantity: mapped.quantity,
          lowStockLevel: mapped.lowStockLevel ?? 5,
          category: mapped.category,
          metadata: mapped.metadata as Prisma.InputJsonValue,
        };

        if (existing) {
          await this.prisma.product.update({ where: { id_organizationId: { id: existing.id, organizationId } }, data });
          updated++;
        } else {
          await this.prisma.product.create({ data: { organizationId, sku, ...data } });
          created++;
        }
      }

      await this.db.integration.update({ where: { id: freshIntegration.id }, data: { lastSyncAt: new Date(), status: 'connected' } });
      await this.db.syncLog.update({ where: { id: log.id }, data: { status: 'success', finishedAt: new Date(), summary: { created, updated, total: items.length, mappedFields: mapping.length } } });
      return { created, updated, total: items.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Zoho sync failed';
      await this.db.integration.update({ where: { id: integration.id }, data: { status: 'error' } });
      await this.db.syncLog.update({ where: { id: log.id }, data: { status: 'failed', finishedAt: new Date(), error: message } });
      throw error;
    }
  }

  private mapZohoItem(item: ZohoItem, mapping: IntegrationFieldMapping[]) {
    const metadata: Record<string, unknown> = { source: 'zoho' };
    const customFields: Record<string, unknown> = {};
    const result: any = { quantity: 0, metadata };

    for (const map of mapping) {
      const value = item[map.source];
      if (value === undefined || value === null || value === '') continue;
      if (map.target.startsWith('core:')) {
        const target = map.target.replace('core:', '');
        if (target === 'name') result.name = String(value).trim();
        if (target === 'sku') result.sku = String(value).trim();
        if (target === 'description') result.description = String(value).trim();
        if (target === 'price') result.price = new Prisma.Decimal(Number(value) || 0);
        if (target === 'cost') result.cost = new Prisma.Decimal(Number(value) || 0);
        if (target === 'quantity') result.quantity = Number(value) || 0;
        if (target === 'lowStockLevel') result.lowStockLevel = Number(value) || 5;
        if (target === 'category') result.category = String(value).trim();
        continue;
      }
      if (map.target === 'metadata:externalId') {
        result.externalId = String(value);
        metadata.externalId = result.externalId;
      } else if (map.target.startsWith('metadata:')) {
        metadata[map.target.replace('metadata:', '')] = value;
      } else if (map.target.startsWith('custom:')) {
        customFields[map.target.replace('custom:', '')] = value;
      }
    }

    if (Object.keys(customFields).length) metadata.customFields = customFields;
    result.externalId = result.externalId ?? (item.item_id ? String(item.item_id) : undefined);
    result.sku = result.sku ?? item.sku?.trim();
    result.name = result.name ?? item.name?.trim();
    result.quantity = result.quantity || Number(item.stock_on_hand ?? 0) || 0;
    result.description = result.description ?? item.description?.trim();
    result.price = result.price ?? new Prisma.Decimal(Number(item.rate ?? 0) || 0);
    result.cost = result.cost ?? (item.purchase_rate === undefined ? undefined : new Prisma.Decimal(Number(item.purchase_rate) || 0));
    result.category = result.category ?? item.category_name?.trim();
    return result;
  }

  private resolveZohoCredentials(input?: ZohoConnectInput): ZohoCredentials {
    const clientId = input?.clientId?.trim() || process.env.ZOHO_CLIENT_ID;
    const clientSecret = input?.clientSecret?.trim() || process.env.ZOHO_CLIENT_SECRET;
    const redirectUri = input?.redirectUri?.trim() || process.env.ZOHO_REDIRECT_URI;
    const accountsDomain = this.normalizeZohoAccountsDomain(input?.accountsDomain);
    if (!clientId || !clientSecret || !redirectUri) throw new BadRequestException('Zoho credentials are required');
    return { clientId, clientSecret, redirectUri, organizationId: input?.organizationId?.trim() || process.env.ZOHO_ORGANIZATION_ID, accountsDomain, fieldMapping: this.normalizeFieldMapping(input?.fieldMapping) };
  }

  private normalizeFieldMapping(mapping?: IntegrationFieldMapping[]) {
    return (mapping?.length ? mapping : DEFAULT_ZOHO_FIELD_MAPPING).filter((item) => item.source?.trim() && item.target?.trim() && item.target !== 'ignore').map((item) => ({ source: item.source.trim(), target: item.target.trim() }));
  }

  private fieldMappingFromConfig(config: Prisma.JsonObject | null) {
    return Array.isArray(config?.fieldMapping) ? this.normalizeFieldMapping(config.fieldMapping as IntegrationFieldMapping[]) : DEFAULT_ZOHO_FIELD_MAPPING;
  }

  private async exchangeZohoCode(code: string, credentials: ZohoCredentials) {
    const params = new URLSearchParams({ code, client_id: credentials.clientId, client_secret: credentials.clientSecret, redirect_uri: credentials.redirectUri, grant_type: 'authorization_code' });
    const response = await fetch(`${credentials.accountsDomain}/token`, { method: 'POST', body: params });
    return this.readJson<ZohoTokenResponse>(response, 'Zoho token exchange');
  }

  private async ensureFreshZohoToken(integrationId: string) {
    const integration = await this.db.integration.findUniqueOrThrow({ where: { id: integrationId } });
    if (!integration.tokenExpiresAt || integration.tokenExpiresAt.getTime() > Date.now() + 60_000) return integration;
    if (!integration.refreshToken) throw new BadRequestException('Zoho refresh token is missing. Reconnect Zoho.');
    const credentials = this.credentialsFromConfig(integration.config as Prisma.JsonObject | null);
    const params = new URLSearchParams({ refresh_token: integration.refreshToken, client_id: credentials.clientId, client_secret: credentials.clientSecret, grant_type: 'refresh_token' });
    const response = await fetch(`${credentials.accountsDomain}/token`, { method: 'POST', body: params });
    const token = await this.readJson<ZohoTokenResponse>(response, 'Zoho token refresh');
    if (!token.access_token) throw new BadRequestException(token.error ?? 'Could not refresh Zoho access token');
    return this.db.integration.update({ where: { id: integration.id }, data: { accessToken: token.access_token, tokenExpiresAt: this.expiresAt(token.expires_in) } });
  }

  private async pullZohoProducts(accessToken: string, config: Prisma.JsonObject | null) {
    const organizationId = typeof config?.zohoOrganizationId === 'string' ? config.zohoOrganizationId : process.env.ZOHO_ORGANIZATION_ID;
    if (!organizationId) throw new BadRequestException('Zoho organization ID is missing. Reconnect Zoho from the integrations page.');
    const apiBase = this.configApiBase(config);
    const products: ZohoItem[] = [];
    let page = 1;
    let hasMore = true;
    while (hasMore && page <= 20) {
      const params = new URLSearchParams({ page: String(page), per_page: '200', organization_id: organizationId });
      const response = await fetch(`${apiBase}/items?${params.toString()}`, { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } });
      if (!response.ok) throw new Error(`Zoho products request failed with ${response.status}`);
      const data = await this.readJson<{ items?: ZohoItem[]; page_context?: { has_more_page?: boolean } }>(response, 'Zoho products');
      products.push(...(data.items ?? []));
      hasMore = Boolean(data.page_context?.has_more_page);
      page++;
    }
    return products;
  }

  private credentialsFromConfig(config: Prisma.JsonObject | null): ZohoCredentials {
    return this.resolveZohoCredentials({ clientId: typeof config?.clientId === 'string' ? config.clientId : undefined, clientSecret: typeof config?.clientSecret === 'string' ? config.clientSecret : undefined, redirectUri: typeof config?.redirectUri === 'string' ? config.redirectUri : undefined, organizationId: typeof config?.zohoOrganizationId === 'string' ? config.zohoOrganizationId : undefined, accountsDomain: typeof config?.accountsDomain === 'string' ? config.accountsDomain : undefined, fieldMapping: Array.isArray(config?.fieldMapping) ? (config.fieldMapping as IntegrationFieldMapping[]) : undefined });
  }

  private inventoryApiBase(apiDomain?: string) {
    const domain = (apiDomain || ZOHO_API_BASE).replace(/\/$/, '');
    return domain.endsWith('/inventory/v1') ? domain : `${domain}/inventory/v1`;
  }

  private configApiBase(config: Prisma.JsonObject | null) {
    if (typeof config?.apiBase === 'string') return this.inventoryApiBase(config.apiBase);
    if (typeof config?.apiDomain === 'string') return this.inventoryApiBase(config.apiDomain);
    return ZOHO_API_BASE;
  }

  private async readJson<T>(response: Response, label: string) {
    const text = await response.text();
    try { return JSON.parse(text) as T; } catch { throw new BadRequestException(`${label} returned invalid JSON`); }
  }

  private signState(payload: { organizationId: string; timestamp: number; zoho: string }) {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', this.stateSecret()).update(body).digest('base64url');
    return `${body}.${signature}`;
  }

  private verifyState(state: string) {
    const [body] = state.split('.');
    if (!body) throw new BadRequestException('Invalid Zoho state');
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as { organizationId: string; timestamp: number; zoho: string };
  }

  private encodeCredentialState(credentials: ZohoCredentials) { return Buffer.from(JSON.stringify(credentials)).toString('base64url'); }
  private decodeCredentialState(value: string) { return this.resolveZohoCredentials(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as ZohoCredentials); }
  private safeIntegrationConfig(config: Prisma.JsonObject | null) { if (!config) return null; const safe = { ...config } as Record<string, unknown>; if (typeof safe.clientSecret === 'string') safe.clientSecretConfigured = true; delete safe.clientSecret; return safe; }
  private normalizeZohoAccountsDomain(value?: string) { const base = (value?.trim() || DEFAULT_ZOHO_AUTH_BASE).replace(/\/$/, ''); return base.endsWith('/oauth/v2') ? base : `${base}/oauth/v2`; }
  private expiresAt(seconds?: number) { return seconds ? new Date(Date.now() + seconds * 1000) : undefined; }
  private stateSecret() { return process.env.ZOHO_STATE_SECRET ?? process.env.JWT_ACCESS_SECRET ?? 'dev-zoho-state-secret-change-me'; }
}
