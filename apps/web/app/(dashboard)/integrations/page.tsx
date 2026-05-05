"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  Clock3,
  DatabaseZap,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Globe2,
  Loader2,
  PackageSearch,
  PlugZap,
  RefreshCw,
  Save,
  Settings2,
  ShoppingBag,
  Store,
  Workflow,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, PageShell, ReadinessCard } from "@/components/system/page-shell";
import { apiFetch } from "@/lib/api";
import type { ProductField } from "@/lib/types";

type IntegrationProvider = "zoho" | "shopify" | "woocommerce" | "csv" | "custom";
type Integration = {
  id: string;
  provider: IntegrationProvider;
  status: "connected" | "disconnected" | "error" | "expired";
  connected: boolean;
  lastSyncAt?: string | null;
  tokenExpiresAt?: string | null;
  config?: Record<string, unknown> | null;
};

type SyncResult = { created: number; updated: number; total: number };
type FieldMapping = { source: string; target: string };
type ZohoCredentials = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  organizationId: string;
  accountsDomain: string;
  fieldMapping: FieldMapping[];
};

type ConnectorDefinition = {
  id: IntegrationProvider;
  name: string;
  description: string;
  status: "active" | "planned" | "foundation";
  category: "commerce" | "inventory" | "data" | "developer";
  icon: typeof Store;
  accent: string;
  capabilities: string[];
};

const ZOHO_CREDENTIALS_STORAGE_KEY = "inventoryhub_zoho_credentials";

const connectors: ConnectorDefinition[] = [
  {
    id: "zoho",
    name: "Zoho Inventory",
    description: "OAuth connection, product import, stock sync, and flexible field mapping.",
    status: "active",
    category: "inventory",
    icon: Store,
    accent: "bg-emerald-50 text-emerald-700",
    capabilities: ["OAuth", "Product import", "Stock sync", "Field mapping"],
  },
  {
    id: "shopify",
    name: "Shopify",
    description: "Planned commerce connector for products, variants, inventory, and storefront data.",
    status: "planned",
    category: "commerce",
    icon: ShoppingBag,
    accent: "bg-purple-50 text-purple-700",
    capabilities: ["Products", "Variants", "Inventory", "Orders later"],
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    description: "Planned connector for WordPress stores using product and inventory APIs.",
    status: "planned",
    category: "commerce",
    icon: PackageSearch,
    accent: "bg-indigo-50 text-indigo-700",
    capabilities: ["Products", "Categories", "Stock", "Attributes"],
  },
  {
    id: "csv",
    name: "CSV / spreadsheet import",
    description: "Planned importer for files with reusable mapping templates and validation.",
    status: "foundation",
    category: "data",
    icon: FileSpreadsheet,
    accent: "bg-amber-50 text-amber-700",
    capabilities: ["Bulk import", "Mapping", "Validation", "Preview"],
  },
  {
    id: "custom",
    name: "Custom API",
    description: "Foundation for any supplier, ERP, marketplace, or internal system API.",
    status: "foundation",
    category: "developer",
    icon: Globe2,
    accent: "bg-sky-50 text-sky-700",
    capabilities: ["API keys", "Webhooks", "Mapping", "Transform rules"],
  },
];

const zohoFields = [
  { key: "item_id", label: "Item ID" },
  { key: "name", label: "Item name" },
  { key: "sku", label: "SKU" },
  { key: "description", label: "Description" },
  { key: "rate", label: "Sales rate / price" },
  { key: "purchase_rate", label: "Purchase rate / cost" },
  { key: "stock_on_hand", label: "Stock on hand" },
  { key: "category_name", label: "Category" },
  { key: "unit", label: "Unit" },
  { key: "brand", label: "Brand" },
  { key: "manufacturer", label: "Manufacturer" },
  { key: "upc", label: "UPC" },
  { key: "ean", label: "EAN" },
  { key: "isbn", label: "ISBN" },
  { key: "part_number", label: "Part number" },
];

const coreTargets = [
  { key: "ignore", label: "Do not import" },
  { key: "core:name", label: "Product name" },
  { key: "core:sku", label: "SKU" },
  { key: "core:description", label: "Description" },
  { key: "core:price", label: "Price" },
  { key: "core:cost", label: "Cost" },
  { key: "core:quantity", label: "Quantity" },
  { key: "core:lowStockLevel", label: "Low-stock level" },
  { key: "core:category", label: "Category" },
  { key: "metadata:externalId", label: "External ID metadata" },
  { key: "metadata:brand", label: "Brand metadata" },
  { key: "metadata:manufacturer", label: "Manufacturer metadata" },
  { key: "metadata:barcode", label: "Barcode metadata" },
];

const defaultMapping: FieldMapping[] = [
  { source: "name", target: "core:name" },
  { source: "sku", target: "core:sku" },
  { source: "description", target: "core:description" },
  { source: "rate", target: "core:price" },
  { source: "purchase_rate", target: "core:cost" },
  { source: "stock_on_hand", target: "core:quantity" },
  { source: "category_name", target: "core:category" },
  { source: "item_id", target: "metadata:externalId" },
  { source: "brand", target: "metadata:brand" },
  { source: "manufacturer", target: "metadata:manufacturer" },
  { source: "upc", target: "metadata:barcode" },
];

const defaultCredentials: ZohoCredentials = {
  clientId: "",
  clientSecret: "",
  redirectUri: "http://localhost:4000/api/integrations/zoho/callback",
  organizationId: "",
  accountsDomain: "https://accounts.zoho.com",
  fieldMapping: defaultMapping,
};

const syncSteps = [
  { title: "Choose app", detail: "Select Zoho today, then reuse the same hub for Shopify, WooCommerce, CSV, or custom APIs.", icon: PlugZap },
  { title: "Map fields", detail: "Translate each app schema into InventoryHub core fields, metadata, or custom fields.", icon: DatabaseZap },
  { title: "Authorize", detail: "Connect the external account using credentials or OAuth.", icon: ArrowRightLeft },
  { title: "Sync", detail: "Import products and review results before expanding to more apps.", icon: Workflow },
];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [customFields, setCustomFields] = useState<ProductField[]>([]);
  const [activeProvider, setActiveProvider] = useState<IntegrationProvider>("zoho");
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [credentialsSaved, setCredentialsSaved] = useState(false);
  const [credentials, setCredentials] = useState<ZohoCredentials>(defaultCredentials);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const zoho = useMemo(() => integrations.find((item) => item.provider === "zoho"), [integrations]);
  const selectedConnector = connectors.find((connector) => connector.id === activeProvider) ?? connectors[0];
  const canConnect = Boolean(credentials.clientId.trim() && credentials.clientSecret.trim() && credentials.redirectUri.trim());
  const targetOptions = useMemo(
    () => [...coreTargets, ...customFields.map((field) => ({ key: `custom:${field.id}`, label: `Custom: ${field.label}` }))],
    [customFields],
  );

  useEffect(() => {
    const stored = window.localStorage.getItem(ZOHO_CREDENTIALS_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<ZohoCredentials>;
        setCredentials({ ...defaultCredentials, ...parsed, fieldMapping: parsed.fieldMapping?.length ? parsed.fieldMapping : defaultMapping });
        setCredentialsSaved(true);
      } catch {
        window.localStorage.removeItem(ZOHO_CREDENTIALS_STORAGE_KEY);
      }
    }

    const params = new URLSearchParams(window.location.search);
    const zohoStatus = params.get("zoho");
    const callbackMessage = params.get("message");
    if (zohoStatus === "connected") setMessage("Zoho connected successfully. You can now sync products with your field mapping.");
    if (zohoStatus === "error") setError(callbackMessage ?? "Zoho connection failed.");

    void loadIntegrations();
    void loadCustomFields();
  }, []);

  async function loadIntegrations() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Integration[]>("/api/integrations");
      setIntegrations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load integrations");
    } finally {
      setLoading(false);
    }
  }

  async function loadCustomFields() {
    try {
      const fields = await apiFetch<ProductField[]>("/api/product-fields");
      setCustomFields(fields.filter((field) => field.isActive));
    } catch {
      setCustomFields([]);
    }
  }

  function updateCredential<K extends keyof ZohoCredentials>(key: K, value: ZohoCredentials[K]) {
    setCredentials((current) => ({ ...current, [key]: value }));
    setCredentialsSaved(false);
  }

  function updateMapping(source: string, target: string) {
    setCredentials((current) => {
      const existing = new Map(current.fieldMapping.map((item) => [item.source, item.target]));
      existing.set(source, target);
      return { ...current, fieldMapping: Array.from(existing.entries()).map(([source, target]) => ({ source, target })) };
    });
    setCredentialsSaved(false);
  }

  function resetMapping() {
    setCredentials((current) => ({ ...current, fieldMapping: defaultMapping }));
    setCredentialsSaved(false);
  }

  async function saveCredentials() {
    setSavingCredentials(true);
    await new Promise((resolve) => setTimeout(resolve, 250));
    window.localStorage.setItem(ZOHO_CREDENTIALS_STORAGE_KEY, JSON.stringify(credentials));
    setCredentialsSaved(true);
    setSavingCredentials(false);
    setMessage("Zoho credentials and field mapping saved in this browser. Reconnect Zoho to store the mapping with this integration.");
  }

  function clearCredentials() {
    setCredentials(defaultCredentials);
    setCredentialsSaved(false);
    window.localStorage.removeItem(ZOHO_CREDENTIALS_STORAGE_KEY);
  }

  async function connectZoho() {
    setConnecting(true);
    setError(null);
    setMessage(null);
    try {
      const result = await apiFetch<{ url: string }>("/api/integrations/zoho/connect", {
        method: "POST",
        body: JSON.stringify({
          clientId: credentials.clientId.trim(),
          clientSecret: credentials.clientSecret.trim(),
          redirectUri: credentials.redirectUri.trim(),
          organizationId: credentials.organizationId.trim() || undefined,
          accountsDomain: credentials.accountsDomain.trim() || undefined,
          fieldMapping: credentials.fieldMapping.filter((item) => item.target !== "ignore"),
        }),
      });
      window.location.href = result.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start Zoho connection");
      setConnecting(false);
    }
  }

  async function syncZoho() {
    setSyncing(true);
    setError(null);
    setMessage(null);
    setSyncResult(null);
    try {
      const result = await apiFetch<SyncResult>("/api/integrations/zoho/sync", { method: "POST" });
      setSyncResult(result);
      setMessage(`Zoho sync complete: ${result.created} created, ${result.updated} updated.`);
      await loadIntegrations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Zoho sync failed");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <PageShell className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Universal integrations"
        title="Connect any product data source"
        description="A central integration hub for Zoho today and future commerce, spreadsheet, ERP, supplier, and custom API connections. Every connector uses the same flexible field-mapping model."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={loadIntegrations} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Refresh</Button>
            <Button type="button" onClick={connectZoho} disabled={connecting || !canConnect}>{connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}{zoho?.connected ? "Reconnect Zoho" : "Connect Zoho"}</Button>
          </div>
        }
      />

      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}
      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div>}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {connectors.map((connector) => {
          const Icon = connector.icon;
          const connected = integrations.some((item) => item.provider === connector.id && item.connected);
          const selected = activeProvider === connector.id;
          return (
            <button
              key={connector.id}
              type="button"
              onClick={() => setActiveProvider(connector.id)}
              className={`rounded-[1.5rem] border bg-card/95 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-950/5 ${selected ? "border-primary/40 ring-2 ring-primary/10" : "border-border/80"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${connector.accent}`}><Icon className="h-5 w-5" /></span>
                <Badge variant={connected ? "default" : connector.status === "active" ? "secondary" : "outline"} className="rounded-full">
                  {connected ? "Connected" : connector.status === "active" ? "Active" : connector.status === "foundation" ? "Foundation" : "Planned"}
                </Badge>
              </div>
              <h3 className="mt-4 font-semibold tracking-tight">{connector.name}</h3>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{connector.description}</p>
            </button>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${selectedConnector.accent}`}><selectedConnector.icon className="h-5 w-5" /></span>
                <div>
                  <CardTitle>{selectedConnector.name}</CardTitle>
                  <CardDescription className="mt-1">{selectedConnector.description}</CardDescription>
                </div>
              </div>
              <Badge variant={activeProvider === "zoho" && zoho?.connected ? "default" : activeProvider === "zoho" && credentialsSaved ? "secondary" : "outline"}>
                {activeProvider === "zoho" ? (zoho?.connected ? "Connected" : credentialsSaved ? "Saved locally" : "Not configured") : "Coming soon"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {activeProvider === "zoho" ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <CredentialField label="Zoho client ID" description="OAuth client ID from Zoho API Console."><Input value={credentials.clientId} onChange={(event) => updateCredential("clientId", event.target.value)} placeholder="1000.xxxxx" className="rounded-xl font-mono" /></CredentialField>
                  <CredentialField label="Zoho client secret" description="OAuth client secret for this Zoho app."><div className="relative"><Input type={showSecret ? "text" : "password"} value={credentials.clientSecret} onChange={(event) => updateCredential("clientSecret", event.target.value)} placeholder="Client secret" className="rounded-xl pr-10 font-mono" /><button type="button" onClick={() => setShowSecret((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label={showSecret ? "Hide secret" : "Show secret"}>{showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></CredentialField>
                  <CredentialField label="Redirect URI" description="Must exactly match the redirect URI configured in Zoho."><Input value={credentials.redirectUri} onChange={(event) => updateCredential("redirectUri", event.target.value)} className="rounded-xl font-mono" /></CredentialField>
                  <CredentialField label="Zoho organization ID" description="Recommended for inventory item requests and sync stability."><Input value={credentials.organizationId} onChange={(event) => updateCredential("organizationId", event.target.value)} placeholder="913563938" className="rounded-xl font-mono" /></CredentialField>
                  <CredentialField label="Zoho accounts domain" description="Use .com, .eu, .in, etc. depending on the customer data center."><select value={credentials.accountsDomain} onChange={(event) => updateCredential("accountsDomain", event.target.value)} className="h-10 w-full rounded-xl border bg-background px-3 text-sm shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25"><option value="https://accounts.zoho.com">accounts.zoho.com</option><option value="https://accounts.zoho.eu">accounts.zoho.eu</option><option value="https://accounts.zoho.in">accounts.zoho.in</option><option value="https://accounts.zoho.com.au">accounts.zoho.com.au</option><option value="https://accounts.zoho.jp">accounts.zoho.jp</option></select></CredentialField>
                </div>
                <div className="rounded-2xl border bg-amber-50 p-4 text-sm text-amber-800">For production, store credentials encrypted in the backend. Field mappings are sent to the API during reconnect and stored with the Zoho integration config.</div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={saveCredentials} disabled={savingCredentials || !canConnect}>{savingCredentials ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save credentials + mapping</Button>
                  <Button type="button" onClick={connectZoho} disabled={connecting || !canConnect}>{connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}{zoho?.connected ? "Reconnect Zoho" : "Connect Zoho"}</Button>
                  <Button type="button" variant="outline" onClick={syncZoho} disabled={!zoho?.connected || syncing}>{syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Sync products</Button>
                  <Button type="button" variant="ghost" onClick={clearCredentials}>Clear</Button>
                </div>
              </>
            ) : (
              <div className="rounded-[1.5rem] border border-dashed bg-muted/20 p-8 text-center">
                <selectedConnector.icon className="mx-auto h-10 w-10 text-muted-foreground" />
                <h3 className="mt-4 font-semibold">{selectedConnector.name} is prepared for the universal integration model</h3>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">This connector will use the same pattern as Zoho: credentials, source-field discovery, mapping to core/custom fields, sync preview, and conflict review.</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">{selectedConnector.capabilities.map((item) => <Badge key={item} variant="secondary" className="rounded-full">{item}</Badge>)}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <ReadinessCard title="Integration setup checklist" description="Universal steps that every connector follows." items={[{ label: "Select connector", status: "ready", detail: selectedConnector.name },{ label: "Credentials", status: activeProvider === "zoho" && credentials.clientId && credentials.clientSecret ? "ready" : "next", detail: "OAuth keys, API token, file source, or custom endpoint." },{ label: "Field mapping", status: activeProvider === "zoho" && credentials.fieldMapping.length ? "ready" : "next", detail: "Map external schema into InventoryHub fields." },{ label: "Sync review", status: zoho?.connected ? "ready" : "next", detail: "Import, validate, and review synced records." }]} />
      </section>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div><CardTitle className="flex items-center gap-2"><DatabaseZap className="h-5 w-5" /> Universal field mapping</CardTitle><CardDescription>{activeProvider === "zoho" ? "Choose where each Zoho item field should go. Targets can be InventoryHub core fields, metadata, or your custom product fields." : "This shared mapping system will power every future connector so different app schemas can still create clean InventoryHub product data."}</CardDescription></div>
            {activeProvider === "zoho" && <Button type="button" variant="outline" onClick={resetMapping}>Reset default mapping</Button>}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeProvider === "zoho" ? (
            <>
              <div className="hidden grid-cols-[1fr_1fr] gap-3 px-1 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground md:grid"><span>Zoho source field</span><span>InventoryHub target field</span></div>
              {zohoFields.map((field) => {
                const currentTarget = credentials.fieldMapping.find((item) => item.source === field.key)?.target ?? "ignore";
                return (
                  <div key={field.key} className="grid gap-3 rounded-2xl border bg-background/70 p-3 md:grid-cols-[1fr_1fr] md:items-center">
                    <div><p className="text-sm font-medium">{field.label}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{field.key}</p></div>
                    <select value={currentTarget} onChange={(event) => updateMapping(field.key, event.target.value)} className="h-10 w-full rounded-xl border bg-background px-3 text-sm shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25">
                      {targetOptions.map((target) => <option key={target.key} value={target.key}>{target.label}</option>)}
                    </select>
                  </div>
                );
              })}
            </>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {[
                ["Source fields", "Discover fields from the selected app, CSV headers, or API response."],
                ["Transform rules", "Normalize names, numbers, dates, booleans, metadata, and custom fields."],
                ["Preview imports", "Validate mapped data before creating or updating products."],
              ].map(([title, detail]) => <div key={title} className="rounded-2xl border bg-muted/20 p-4"><p className="font-medium">{title}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p></div>)}
            </div>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card><CardHeader><CardTitle>Connection status</CardTitle><CardDescription>Current connector state for this workspace.</CardDescription></CardHeader><CardContent className="space-y-5"><div className="grid gap-3 sm:grid-cols-2">{[["Selected app", selectedConnector.name],["Zoho status", zoho?.status ?? "disconnected"],["Last sync", zoho?.lastSyncAt ? new Date(zoho.lastSyncAt).toLocaleString() : "Never"],["Mapped fields", `${credentials.fieldMapping.filter((item) => item.target !== "ignore").length}`]].map(([label, value]) => <div key={label} className="rounded-2xl border bg-muted/30 p-4"><p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</p><p className="mt-2 break-words text-sm font-medium">{value}</p></div>)}</div>{syncResult && <div className="rounded-2xl border bg-background p-4"><p className="text-sm font-medium">Latest sync result</p><p className="mt-1 text-sm text-muted-foreground">{syncResult.total} Zoho items processed · {syncResult.created} created · {syncResult.updated} updated</p></div>}</CardContent></Card>
        <Card><CardHeader><CardTitle>Universal sync flow</CardTitle><CardDescription>How InventoryHub will handle every current and future integration.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">{syncSteps.map((step, index) => { const Icon = step.icon; return <div key={step.title} className="rounded-2xl border bg-background p-4"><div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted"><Icon className="h-5 w-5" /></span><span className="text-xs text-muted-foreground">0{index + 1}</span></div><h3 className="mt-4 font-medium">{step.title}</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">{step.detail}</p></div>; })}</CardContent></Card>
      </section>

      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5" /> Connector roadmap</CardTitle><CardDescription>Zoho is live first. Other apps will reuse the same credentials, mapping, sync, and review framework.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-5">{connectors.map((connector) => { const Icon = connector.icon; return <div key={connector.id} className="rounded-2xl border p-4"><Icon className="h-4 w-4 text-muted-foreground" /><p className="mt-3 text-sm font-medium">{connector.name}</p><Badge variant="secondary" className="mt-3 rounded-full">{connector.status === "active" ? "Live" : connector.status === "foundation" ? "Foundation" : "Planned"}</Badge></div>; })}</CardContent></Card>
    </PageShell>
  );
}

function CredentialField({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return <div className="space-y-2"><div><Label className="text-sm font-medium">{label}</Label><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div>{children}</div>;
}
