import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type ZohoTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  api_domain?: string;
  error?: string;
};

type ZohoItemsResponse = {
  items?: Array<{
    item_id?: string | number;
    name?: string;
    sku?: string;
    description?: string;
    rate?: string | number;
    purchase_rate?: string | number;
    stock_on_hand?: string | number;
    category_name?: string;
  }>;
  page_context?: { has_more_page?: boolean };
};

const ZOHO_AUTH_BASE = 'https://accounts.zoho.com/oauth/v2';
const ZOHO_API_BASE = 'https://www.zohoapis.com/inventory/v1';

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
      select: {
        id: true,
        provider: true,
        status: true,
        lastSyncAt: true,
        tokenExpiresAt: true,
        config: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return integrations.map((integration: any) => ({
      ...integration,
      connected: integration.status === 'connected',
    }));
  }

  buildZohoConnectUrl(organizationId: string) {
    const clientId = this.requiredEnv('ZOHO_CLIENT_ID');
    const redirectUri = this.requiredEnv('ZOHO_REDIRECT_URI');
    const state = this.signState({ organizationId, timestamp: Date.now() });
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope: 'ZohoInventory.items.ALL,ZohoInventory.settings.READ',
      redirect_uri: redirectUri,
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    return { url: `${ZOHO_AUTH_BASE}/auth?${params.toString()}` };
  }

  async handleZohoCallback(input: { code?: string; state?: string; error?: string }) {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

    if (input.error) {
      return `${frontendUrl}/integrations?zoho=error&message=${encodeURIComponent(input.error)}`;
    }

    if (!input.code || !input.state) {
      return `${frontendUrl}/integrations?zoho=error&message=${encodeURIComponent('Missing Zoho callback code or state')}`;
    }

    try {
      const { organizationId } = this.verifyState(input.state);
      const token = await this.exchangeZohoCode(input.code);

      if (!token.access_token) {
        throw new BadRequestException(token.error ?? 'Zoho did not return an access token');
      }

      await this.db.integration.upsert({
        where: { organizationId_provider: { organizationId, provider: 'zoho' } },
        create: {
          organizationId,
          provider: 'zoho',
          status: 'connected',
          accessToken: token.access_token,
          refreshToken: token.refresh_token,
          tokenExpiresAt: this.expiresAt(token.expires_in),
          config: { apiDomain: token.api_domain ?? ZOHO_API_BASE },
        },
        update: {
          status: 'connected',
          accessToken: token.access_token,
          ...(token.refresh_token ? { refreshToken: token.refresh_token } : {}),
          tokenExpiresAt: this.expiresAt(token.expires_in),
          config: { apiDomain: token.api_domain ?? ZOHO_API_BASE },
        },
      });

      return `${frontendUrl}/integrations?zoho=connected`;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Zoho connection failed';
      return `${frontendUrl}/integrations?zoho=error&message=${encodeURIComponent(message)}`;
    }
  }

  async syncZohoProducts(organizationId: string) {
    const integration = await this.db.integration.findUnique({
      where: { organizationId_provider: { organizationId, provider: 'zoho' } },
    });

    if (!integration || integration.status !== 'connected') {
      throw new NotFoundException('Zoho is not connected for this organization');
    }

    const log = await this.db.syncLog.create({
      data: {
        organizationId,
        integrationId: integration.id,
        provider: 'zoho',
        status: 'running',
        direction: 'pull',
        startedAt: new Date(),
      },
    });

    try {
      const freshIntegration = await this.ensureFreshZohoToken(integration.id);
      const products = await this.pullZohoProducts(freshIntegration.accessToken, freshIntegration.config as Prisma.JsonObject | null);
      let created = 0;
      let updated = 0;

      for (const item of products) {
        const name = item.name?.trim();
        const externalId = item.item_id ? String(item.item_id) : undefined;
        const sku = item.sku?.trim() || (externalId ? `ZOHO-${externalId}` : undefined);

        if (!name || !sku) continue;

        const existing = await this.prisma.product.findFirst({
          where: { organizationId, sku, deletedAt: null },
          select: { id: true, quantity: true },
        });

        const quantity = Number(item.stock_on_hand ?? 0) || 0;
        const data = {
          name,
          description: item.description?.trim(),
          price: new Prisma.Decimal(Number(item.rate ?? 0) || 0),
          cost: item.purchase_rate === undefined ? undefined : new Prisma.Decimal(Number(item.purchase_rate) || 0),
          quantity,
          category: item.category_name?.trim(),
          metadata: { source: 'zoho', externalId } as Prisma.InputJsonValue,
        };

        if (existing) {
          await this.prisma.product.update({
            where: { id_organizationId: { id: existing.id, organizationId } },
            data,
          });
          updated++;

          if (existing.quantity !== quantity) {
            await this.prisma.inventoryLog.create({
              data: {
                organizationId,
                productId: existing.id,
                type: 'sync',
                quantityBefore: existing.quantity,
                quantityAfter: quantity,
                delta: quantity - existing.quantity,
                reason: 'Zoho inventory sync',
                source: 'zoho',
                referenceId: externalId,
              },
            });
          }
        } else {
          await this.prisma.product.create({
            data: { organizationId, sku, lowStockLevel: 5, ...data },
          });
          created++;
        }
      }

      await this.db.integration.update({
        where: { id: freshIntegration.id },
        data: { lastSyncAt: new Date(), status: 'connected' },
      });

      await this.db.syncLog.update({
        where: { id: log.id },
        data: {
          status: 'success',
          finishedAt: new Date(),
          summary: { created, updated, total: products.length },
        },
      });

      return { created, updated, total: products.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Zoho sync failed';
      await this.db.integration.update({ where: { id: integration.id }, data: { status: 'error' } });
      await this.db.syncLog.update({ where: { id: log.id }, data: { status: 'failed', finishedAt: new Date(), error: message } });
      throw new InternalServerErrorException(message);
    }
  }

  private async exchangeZohoCode(code: string) {
    const params = new URLSearchParams({
      code,
      client_id: this.requiredEnv('ZOHO_CLIENT_ID'),
      client_secret: this.requiredEnv('ZOHO_CLIENT_SECRET'),
      redirect_uri: this.requiredEnv('ZOHO_REDIRECT_URI'),
      grant_type: 'authorization_code',
    });

    const response = await fetch(`${ZOHO_AUTH_BASE}/token`, { method: 'POST', body: params });
    return response.json() as Promise<ZohoTokenResponse>;
  }

  private async ensureFreshZohoToken(integrationId: string) {
    const integration = await this.db.integration.findUniqueOrThrow({ where: { id: integrationId } });

    if (!integration.tokenExpiresAt || integration.tokenExpiresAt.getTime() > Date.now() + 60_000) {
      return integration;
    }

    if (!integration.refreshToken) {
      throw new BadRequestException('Zoho refresh token is missing. Reconnect Zoho.');
    }

    const params = new URLSearchParams({
      refresh_token: integration.refreshToken,
      client_id: this.requiredEnv('ZOHO_CLIENT_ID'),
      client_secret: this.requiredEnv('ZOHO_CLIENT_SECRET'),
      grant_type: 'refresh_token',
    });

    const response = await fetch(`${ZOHO_AUTH_BASE}/token`, { method: 'POST', body: params });
    const token = (await response.json()) as ZohoTokenResponse;

    if (!token.access_token) {
      throw new BadRequestException(token.error ?? 'Could not refresh Zoho access token');
    }

    return this.db.integration.update({
      where: { id: integration.id },
      data: { accessToken: token.access_token, tokenExpiresAt: this.expiresAt(token.expires_in) },
    });
  }

  private async pullZohoProducts(accessToken: string, config: Prisma.JsonObject | null) {
    const apiDomain = typeof config?.apiDomain === 'string' ? config.apiDomain : ZOHO_API_BASE;
    const organizationId = typeof config?.zohoOrganizationId === 'string' ? config.zohoOrganizationId : process.env.ZOHO_ORGANIZATION_ID;
    const products: NonNullable<ZohoItemsResponse['items']> = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 20) {
      const params = new URLSearchParams({ page: String(page), per_page: '200' });
      if (organizationId) params.set('organization_id', organizationId);

      const response = await fetch(`${apiDomain}/items?${params.toString()}`, {
        headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
      });

      if (!response.ok) throw new Error(`Zoho products request failed with ${response.status}`);

      const data = (await response.json()) as ZohoItemsResponse;
      products.push(...(data.items ?? []));
      hasMore = Boolean(data.page_context?.has_more_page);
      page++;
    }

    return products;
  }

  private signState(payload: { organizationId: string; timestamp: number }) {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', this.stateSecret()).update(body).digest('base64url');
    return `${body}.${signature}`;
  }

  private verifyState(state: string) {
    const [body, signature] = state.split('.');
    if (!body || !signature) throw new BadRequestException('Invalid Zoho state');

    const expected = createHmac('sha256', this.stateSecret()).update(body).digest('base64url');
    const valid = timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    if (!valid) throw new BadRequestException('Invalid Zoho state signature');

    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as { organizationId: string; timestamp: number };
    if (!parsed.organizationId || Date.now() - parsed.timestamp > 10 * 60 * 1000) {
      throw new BadRequestException('Expired Zoho state');
    }

    return parsed;
  }

  private expiresAt(seconds?: number) {
    if (!seconds) return undefined;
    return new Date(Date.now() + seconds * 1000);
  }

  private stateSecret() {
    return process.env.ZOHO_STATE_SECRET ?? process.env.JWT_ACCESS_SECRET ?? 'dev-zoho-state-secret-change-me';
  }

  private requiredEnv(name: string) {
    const value = process.env[name];
    if (!value) throw new BadRequestException(`${name} is not configured`);
    return value;
  }
}
