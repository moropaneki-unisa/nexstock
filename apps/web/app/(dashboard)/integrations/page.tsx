"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  Clock3,
  DatabaseZap,
  Eye,
  EyeOff,
  Loader2,
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

type Integration = {
  id: string;
  provider: "zoho" | "shopify" | "custom";
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

const ZOHO_CREDENTIALS_STORAGE_KEY = "inventoryhub_zoho_credentials";

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
  { title: "Map", detail: "Choose how external fields become InventoryHub product fields.", icon: DatabaseZap },
  { title: "Authorize", detail: "Authorize InventoryHub from the Zoho account you want to connect.", icon: PlugZap },
  { title: "Import", detail: "Pull Zoho items using your field mapping.", icon: ArrowRightLeft },
  { title: "Review", detail: "Review synced products and custom field values.", icon: Workflow },
];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [customFields, setCustomFields] = useState<ProductField[]>([]);
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
  const canConnect = Boolean(credentials.clientId.trim() && credentials.clientSecret.trim() && credentials.redirectUri.trim());
  const targetOptions = useMemo(
    () => [
      ...coreTargets,
      ...customFields.map((field) => ({ key: `custom:${field.id}`, label: `Custom: ${field.label}` })),
    ],
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
    <PageShell>
      <PageHeader
        eyebrow="Integrations"
        title="Connect and map external product data"
        description="Map Zoho fields into InventoryHub core fields, metadata, or your custom product fields so every integration can adapt to different app schemas."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={loadIntegrations} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Refresh</Button>
            <Button type="button" onClick={connectZoho} disabled={connecting || !canConnect}>{connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}{zoho?.connected ? "Reconnect Zoho" : "Connect Zoho"}</Button>
          </div>
        }
      />

      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}
      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div>}

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Store className="h-5 w-5" /></span>
                <div><CardTitle>Zoho Inventory credentials</CardTitle><CardDescription className="mt-1">Add the Zoho OAuth client details for this workspace, then map fields and authorize.</CardDescription></div>
              </div>
              <Badge variant={zoho?.connected ? "default" : zoho?.status === "error" ? "destructive" : credentialsSaved ? "secondary" : "outline"}>{zoho?.connected ? "Connected" : credentialsSaved ? "Saved locally" : "Not configured"}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <CredentialField label="Zoho client ID" description="OAuth client ID from Zoho API Console."><Input value={credentials.clientId} onChange={(event) => updateCredential("clientId", event.target.value)} placeholder="1000.xxxxx" className="rounded-xl font-mono" /></CredentialField>
              <CredentialField label="Zoho client secret" description="OAuth client secret for this Zoho app."><div className="relative"><Input type={showSecret ? "text" : "password"} value={credentials.clientSecret} onChange={(event) => updateCredential("clientSecret", event.target.value)} placeholder="Client secret" className="rounded-xl pr-10 font-mono" /><button type="button" onClick={() => setShowSecret((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label={showSecret ? "Hide secret" : "Show secret"}>{showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></CredentialField>
              <CredentialField label="Redirect URI" description="Must exactly match the redirect URI configured in Zoho."><Input value={credentials.redirectUri} onChange={(event) => updateCredential("redirectUri", event.target.value)} className="rounded-xl font-mono" /></CredentialField>
              <CredentialField label="Zoho organization ID" description="Recommended for inventory item requests and sync stability."><Input value={credentials.organizationId} onChange={(event) => updateCredential("organizationId", event.target.value)} placeholder="913563938" className="rounded-xl font-mono" /></CredentialField>
              <CredentialField label="Zoho accounts domain" description="Use .com, .eu, .in, etc. depending on the customer's Zoho data center."><select value={credentials.accountsDomain} onChange={(event) => updateCredential("accountsDomain", event.target.value)} className="h-10 w-full rounded-xl border bg-background px-3 text-sm shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25"><option value="https://accounts.zoho.com">accounts.zoho.com</option><option value="https://accounts.zoho.eu">accounts.zoho.eu</option><option value="https://accounts.zoho.in">accounts.zoho.in</option><option value="https://accounts.zoho.com.au">accounts.zoho.com.au</option><option value="https://accounts.zoho.jp">accounts.zoho.jp</option></select></CredentialField>
            </div>

            <div className="rounded-2xl border bg-amber-50 p-4 text-sm text-amber-800">For production, store credentials encrypted in the backend. Field mappings are sent to the API during reconnect and stored with the Zoho integration config.</div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={saveCredentials} disabled={savingCredentials || !canConnect}>{savingCredentials ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save credentials + mapping</Button>
              <Button type="button" onClick={connectZoho} disabled={connecting || !canConnect}>{connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}{zoho?.connected ? "Reconnect Zoho" : "Connect Zoho"}</Button>
              <Button type="button" variant="outline" onClick={syncZoho} disabled={!zoho?.connected || syncing}>{syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Sync products</Button>
              <Button type="button" variant="ghost" onClick={clearCredentials}>Clear</Button>
            </div>
          </CardContent>
        </Card>

        <ReadinessCard title="Zoho setup checklist" description="Map external data before syncing to avoid bad imports." items={[{ label: "Client ID", status: credentials.clientId ? "ready" : "next", detail: "OAuth client ID from Zoho API Console." },{ label: "Client secret", status: credentials.clientSecret ? "ready" : "next", detail: "Secret from the same Zoho OAuth client." },{ label: "Redirect URI", status: credentials.redirectUri ? "ready" : "next", detail: "Must match the backend callback URL exactly." },{ label: "Field mapping", status: credentials.fieldMapping.length ? "ready" : "next", detail: "Controls how Zoho item fields become InventoryHub fields." }]} />
      </section>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div><CardTitle className="flex items-center gap-2"><DatabaseZap className="h-5 w-5" /> Field mapping</CardTitle><CardDescription>Choose where each Zoho item field should go. Targets can be InventoryHub core fields, metadata, or your custom product fields.</CardDescription></div>
            <Button type="button" variant="outline" onClick={resetMapping}>Reset default mapping</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
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
        </CardContent>
      </Card>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card><CardHeader><CardTitle>Connection status</CardTitle><CardDescription>Current Zoho OAuth and sync state for this workspace.</CardDescription></CardHeader><CardContent className="space-y-5"><div className="grid gap-3 sm:grid-cols-2">{[["Status", zoho?.status ?? "disconnected"],["Last sync", zoho?.lastSyncAt ? new Date(zoho.lastSyncAt).toLocaleString() : "Never"],["Token expires", zoho?.tokenExpiresAt ? new Date(zoho.tokenExpiresAt).toLocaleString() : "Not connected"],["Mapped fields", `${credentials.fieldMapping.filter((item) => item.target !== "ignore").length}`]].map(([label, value]) => <div key={label} className="rounded-2xl border bg-muted/30 p-4"><p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</p><p className="mt-2 break-words text-sm font-medium">{value}</p></div>)}</div>{syncResult && <div className="rounded-2xl border bg-background p-4"><p className="text-sm font-medium">Latest sync result</p><p className="mt-1 text-sm text-muted-foreground">{syncResult.total} Zoho items processed · {syncResult.created} created · {syncResult.updated} updated</p></div>}</CardContent></Card>
        <Card><CardHeader><CardTitle>Sync flow</CardTitle><CardDescription>How InventoryHub imports products from Zoho.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">{syncSteps.map((step, index) => { const Icon = step.icon; return <div key={step.title} className="rounded-2xl border bg-background p-4"><div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted"><Icon className="h-5 w-5" /></span><span className="text-xs text-muted-foreground">0{index + 1}</span></div><h3 className="mt-4 font-medium">{step.title}</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">{step.detail}</p></div>; })}</CardContent></Card>
      </section>

      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5" /> More integrations coming next</CardTitle><CardDescription>Use the same mapping model for Shopify, custom APIs, CSV imports, and sync conflict review.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-3">{[{ name: "Shopify", icon: ShoppingBag, status: "Planned" },{ name: "Custom API", icon: PlugZap, status: "Ready foundation" },{ name: "Sync conflict review", icon: Workflow, status: "Next" }].map((item) => { const Icon = item.icon; return <div key={item.name} className="flex items-center justify-between rounded-2xl border p-4"><div className="flex items-center gap-3"><Icon className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">{item.name}</span></div><Badge variant="secondary">{item.status}</Badge></div>; })}</CardContent></Card>
    </PageShell>
  );
}

function CredentialField({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return <div className="space-y-2"><div><Label className="text-sm font-medium">{label}</Label><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div>{children}</div>;
}
