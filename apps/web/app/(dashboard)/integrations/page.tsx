"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  CheckCircle2,
  Clock3,
  DatabaseZap,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Globe2,
  Layers3,
  Loader2,
  PackageSearch,
  PlugZap,
  RefreshCw,
  Save,
  ShoppingBag,
  Store,
  Workflow,
  Zap,
} from "lucide-react";

import { FileImportExportCard } from "@/components/integrations/file-import-export-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, PageShell, ReadinessCard } from "@/components/system/page-shell";
import { apiFetch } from "@/lib/api";
import type { ProductField } from "@/lib/types";

type IntegrationProvider = "zoho" | "shopify" | "woocommerce" | "csv" | "custom";
type IntegrationTab = "overview" | "apps" | "mapping" | "files" | "activity";

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
};

type ConnectorDefinition = {
  id: IntegrationProvider;
  name: string;
  shortName: string;
  description: string;
  status: "live" | "planned" | "foundation";
  category: "commerce" | "inventory" | "data" | "developer";
  icon: typeof Store;
  accent: string;
  capabilities: string[];
  fields: Array<{ key: string; label: string }>;
  defaultMapping: FieldMapping[];
};

const ZOHO_CREDENTIALS_STORAGE_KEY = "inventoryhub_zoho_credentials";
const MAPPING_STORAGE_KEY = "inventoryhub_integration_field_mappings";

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
  { key: "core:status", label: "Status" },
  { key: "core:images", label: "Images" },
  { key: "metadata:externalId", label: "External ID metadata" },
  { key: "metadata:brand", label: "Brand metadata" },
  { key: "metadata:manufacturer", label: "Manufacturer metadata" },
  { key: "metadata:barcode", label: "Barcode metadata" },
  { key: "metadata:sourceUrl", label: "Source URL metadata" },
];

const connectors: ConnectorDefinition[] = [
  {
    id: "zoho",
    name: "Zoho Inventory",
    shortName: "Zoho",
    description: "Live OAuth connector for product import, stock sync, and field mapping.",
    status: "live",
    category: "inventory",
    icon: Store,
    accent: "bg-emerald-50 text-emerald-700",
    capabilities: ["OAuth", "Product import", "Stock sync", "Field mapping"],
    fields: [
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
    ],
    defaultMapping: [
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
    ],
  },
  {
    id: "csv",
    name: "CSV / XLSX files",
    shortName: "Files",
    description: "Live spreadsheet workflow for importing and exporting products using CSV, XLS, or XLSX files.",
    status: "live",
    category: "data",
    icon: FileSpreadsheet,
    accent: "bg-amber-50 text-amber-700",
    capabilities: ["CSV import", "XLSX import", "CSV export", "XLSX export"],
    fields: [
      { key: "name", label: "Name column" },
      { key: "sku", label: "SKU column" },
      { key: "description", label: "Description column" },
      { key: "price", label: "Price column" },
      { key: "cost", label: "Cost column" },
      { key: "quantity", label: "Quantity column" },
      { key: "lowStockLevel", label: "Low-stock column" },
      { key: "category", label: "Category column" },
      { key: "status", label: "Status column" },
      { key: "images", label: "Images column" },
      { key: "custom:*", label: "Custom field columns" },
    ],
    defaultMapping: [
      { source: "name", target: "core:name" },
      { source: "sku", target: "core:sku" },
      { source: "description", target: "core:description" },
      { source: "price", target: "core:price" },
      { source: "cost", target: "core:cost" },
      { source: "quantity", target: "core:quantity" },
      { source: "lowStockLevel", target: "core:lowStockLevel" },
      { source: "category", target: "core:category" },
      { source: "status", target: "core:status" },
      { source: "images", target: "core:images" },
    ],
  },
  {
    id: "shopify",
    name: "Shopify",
    shortName: "Shopify",
    description: "Planned commerce connector for products, variants, inventory, and storefront data.",
    status: "planned",
    category: "commerce",
    icon: ShoppingBag,
    accent: "bg-purple-50 text-purple-700",
    capabilities: ["Products", "Variants", "Inventory", "Metafields"],
    fields: [
      { key: "id", label: "Product ID" },
      { key: "title", label: "Title" },
      { key: "body_html", label: "Description HTML" },
      { key: "vendor", label: "Vendor" },
      { key: "product_type", label: "Product type" },
      { key: "handle", label: "Handle" },
      { key: "variants.sku", label: "Variant SKU" },
      { key: "variants.price", label: "Variant price" },
      { key: "variants.inventory_quantity", label: "Inventory quantity" },
      { key: "images.src", label: "Image URL" },
    ],
    defaultMapping: [
      { source: "id", target: "metadata:externalId" },
      { source: "title", target: "core:name" },
      { source: "body_html", target: "core:description" },
      { source: "vendor", target: "metadata:brand" },
      { source: "product_type", target: "core:category" },
      { source: "variants.sku", target: "core:sku" },
      { source: "variants.price", target: "core:price" },
      { source: "variants.inventory_quantity", target: "core:quantity" },
      { source: "images.src", target: "core:images" },
    ],
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    shortName: "WooCommerce",
    description: "Planned connector for WordPress stores using product and inventory APIs.",
    status: "planned",
    category: "commerce",
    icon: PackageSearch,
    accent: "bg-indigo-50 text-indigo-700",
    capabilities: ["Products", "Categories", "Stock", "Attributes"],
    fields: [
      { key: "id", label: "Product ID" },
      { key: "name", label: "Product name" },
      { key: "sku", label: "SKU" },
      { key: "description", label: "Description" },
      { key: "regular_price", label: "Regular price" },
      { key: "stock_quantity", label: "Stock quantity" },
      { key: "categories.name", label: "Category" },
      { key: "images.src", label: "Image URL" },
      { key: "attributes", label: "Attributes" },
    ],
    defaultMapping: [
      { source: "id", target: "metadata:externalId" },
      { source: "name", target: "core:name" },
      { source: "sku", target: "core:sku" },
      { source: "description", target: "core:description" },
      { source: "regular_price", target: "core:price" },
      { source: "stock_quantity", target: "core:quantity" },
      { source: "categories.name", target: "core:category" },
      { source: "images.src", target: "core:images" },
    ],
  },
  {
    id: "custom",
    name: "Custom API",
    shortName: "Custom API",
    description: "Foundation for any supplier, ERP, marketplace, or internal system API.",
    status: "foundation",
    category: "developer",
    icon: Globe2,
    accent: "bg-sky-50 text-sky-700",
    capabilities: ["API keys", "Webhooks", "Mapping", "Transform rules"],
    fields: [
      { key: "id", label: "External ID" },
      { key: "name", label: "Name" },
      { key: "code", label: "Code / SKU" },
      { key: "description", label: "Description" },
      { key: "price", label: "Price" },
      { key: "cost", label: "Cost" },
      { key: "stock", label: "Stock" },
      { key: "category", label: "Category" },
      { key: "image_url", label: "Image URL" },
    ],
    defaultMapping: [
      { source: "id", target: "metadata:externalId" },
      { source: "name", target: "core:name" },
      { source: "code", target: "core:sku" },
      { source: "description", target: "core:description" },
      { source: "price", target: "core:price" },
      { source: "cost", target: "core:cost" },
      { source: "stock", target: "core:quantity" },
      { source: "category", target: "core:category" },
      { source: "image_url", target: "core:images" },
    ],
  },
];

const defaultCredentials: ZohoCredentials = {
  clientId: "",
  clientSecret: "",
  redirectUri: "http://localhost:4000/api/integrations/zoho/callback",
  organizationId: "",
  accountsDomain: "https://accounts.zoho.com",
};

const tabs: Array<{ id: IntegrationTab; label: string; description: string; icon: typeof Store }> = [
  { id: "overview", label: "Overview", description: "Status and flow", icon: Layers3 },
  { id: "apps", label: "Apps", description: "Choose connector", icon: PlugZap },
  { id: "mapping", label: "Mapping", description: "Map any app", icon: DatabaseZap },
  { id: "files", label: "Import / Export", description: "CSV and XLSX", icon: FileSpreadsheet },
  { id: "activity", label: "Activity", description: "Sync results", icon: Clock3 },
];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [customFields, setCustomFields] = useState<ProductField[]>([]);
  const [activeProvider, setActiveProvider] = useState<IntegrationProvider>("zoho");
  const [activeTab, setActiveTab] = useState<IntegrationTab>("overview");
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [savingMapping, setSavingMapping] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [credentialsSaved, setCredentialsSaved] = useState(false);
  const [mappingSaved, setMappingSaved] = useState(true);
  const [credentials, setCredentials] = useState<ZohoCredentials>(defaultCredentials);
  const [fieldMappings, setFieldMappings] = useState<Record<IntegrationProvider, FieldMapping[]>>(() => buildDefaultMappings());
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const zoho = useMemo(() => integrations.find((item) => item.provider === "zoho"), [integrations]);
  const selectedConnector = connectors.find((connector) => connector.id === activeProvider) ?? connectors[0];
  const SelectedIcon = selectedConnector.icon;
  const activeMapping = fieldMappings[activeProvider] ?? selectedConnector.defaultMapping;
  const mappedCount = activeMapping.filter((item) => item.target !== "ignore").length;
  const canConnectZoho = Boolean(credentials.clientId.trim() && credentials.clientSecret.trim() && credentials.redirectUri.trim());
  const targetOptions = useMemo(
    () => [...coreTargets, ...customFields.map((field) => ({ key: `custom:${field.id}`, label: `Custom: ${field.label}` }))],
    [customFields],
  );

  useEffect(() => {
    const storedCredentials = window.localStorage.getItem(ZOHO_CREDENTIALS_STORAGE_KEY);
    if (storedCredentials) {
      try {
        setCredentials({ ...defaultCredentials, ...JSON.parse(storedCredentials) });
        setCredentialsSaved(true);
      } catch {
        window.localStorage.removeItem(ZOHO_CREDENTIALS_STORAGE_KEY);
      }
    }

    const storedMappings = window.localStorage.getItem(MAPPING_STORAGE_KEY);
    if (storedMappings) {
      try {
        setFieldMappings({ ...buildDefaultMappings(), ...JSON.parse(storedMappings) });
      } catch {
        window.localStorage.removeItem(MAPPING_STORAGE_KEY);
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

  function selectProvider(provider: IntegrationProvider) {
    setActiveProvider(provider);
    if (provider === "csv") setActiveTab("files");
    else setActiveTab("mapping");
  }

  function updateCredential<K extends keyof ZohoCredentials>(key: K, value: ZohoCredentials[K]) {
    setCredentials((current) => ({ ...current, [key]: value }));
    setCredentialsSaved(false);
  }

  function updateMapping(source: string, target: string) {
    setFieldMappings((current) => {
      const existing = new Map((current[activeProvider] ?? []).map((item) => [item.source, item.target]));
      existing.set(source, target);
      return {
        ...current,
        [activeProvider]: Array.from(existing.entries()).map(([source, target]) => ({ source, target })),
      };
    });
    setMappingSaved(false);
  }

  function resetMapping() {
    setFieldMappings((current) => ({ ...current, [activeProvider]: selectedConnector.defaultMapping }));
    setMappingSaved(false);
  }

  async function saveMapping() {
    setSavingMapping(true);
    await new Promise((resolve) => setTimeout(resolve, 250));
    window.localStorage.setItem(MAPPING_STORAGE_KEY, JSON.stringify(fieldMappings));
    setMappingSaved(true);
    setSavingMapping(false);
    setMessage(`${selectedConnector.name} mapping saved. ${activeProvider === "zoho" ? "Reconnect Zoho to store the mapping with the backend integration." : "This mapping is ready for the connector implementation."}`);
  }

  async function saveCredentials() {
    setSavingCredentials(true);
    await new Promise((resolve) => setTimeout(resolve, 250));
    window.localStorage.setItem(ZOHO_CREDENTIALS_STORAGE_KEY, JSON.stringify(credentials));
    window.localStorage.setItem(MAPPING_STORAGE_KEY, JSON.stringify(fieldMappings));
    setCredentialsSaved(true);
    setMappingSaved(true);
    setSavingCredentials(false);
    setMessage("Zoho credentials and universal field mapping saved in this browser. Reconnect Zoho to store the mapping with this integration.");
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
          fieldMapping: (fieldMappings.zoho ?? []).filter((item) => item.target !== "ignore"),
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
      setActiveTab("activity");
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
        title="Integration command center"
        description="Connect apps, map fields, import and export files, then review sync activity from separate focused tabs instead of one crowded page."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={loadIntegrations} disabled={loading} className="rounded-xl">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
            <Button type="button" onClick={connectZoho} disabled={connecting || !canConnectZoho} className="rounded-xl">
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {zoho?.connected ? "Reconnect Zoho" : "Connect Zoho"}
            </Button>
          </div>
        }
      />

      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}
      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div>}

      <section className="grid gap-4 md:grid-cols-4">
        <StatusCard icon={PlugZap} label="Connectors" value={`${connectors.length}`} helper="Apps and data sources" />
        <StatusCard icon={CheckCircle2} label="Live sources" value="2" helper="Zoho and CSV/XLSX" tone="success" />
        <StatusCard icon={DatabaseZap} label="Current mapping" value={mappedCount} helper={`${selectedConnector.shortName} mapped fields`} />
        <StatusCard icon={Clock3} label="Last sync" value={zoho?.lastSyncAt ? "Done" : "Never"} helper={zoho?.lastSyncAt ? new Date(zoho.lastSyncAt).toLocaleString() : "No sync yet"} />
      </section>

      <div className="rounded-[1.5rem] border bg-card/95 p-2 shadow-sm">
        <div className="grid gap-2 md:grid-cols-5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-2xl p-3 text-left transition ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"}`}
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </div>
                <p className={`mt-1 text-xs ${active ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{tab.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "overview" && (
        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-[2rem] border-border/80 bg-card/95 shadow-xl shadow-slate-950/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Workflow className="h-5 w-5" /> How the integration system works</CardTitle>
              <CardDescription>Every connector follows the same clean workflow, whether it is Zoho, Shopify, CSV/XLSX, WooCommerce, or a custom API.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {[
                [PlugZap, "1. Choose app", "Select the source system you want to connect or import from."],
                [DatabaseZap, "2. Map fields", "Translate external fields into InventoryHub core fields, metadata, or custom product fields."],
                [ArrowRightLeft, "3. Import or sync", "Authorize an app, upload files, or connect an API endpoint."],
                [CheckCircle2, "4. Review activity", "Review created, updated, skipped, and failed records before expanding the workflow."],
              ].map(([Icon, title, detail]) => {
                const StepIcon = Icon as typeof Store;
                return (
                  <div key={String(title)} className="rounded-2xl border bg-background/70 p-4">
                    <StepIcon className="h-5 w-5 text-muted-foreground" />
                    <h3 className="mt-4 font-semibold">{String(title)}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{String(detail)}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <ReadinessCard
            title="Setup checklist"
            description="Use tabs to keep each activity focused and simple."
            items={[
              { label: "Select connector", status: "ready", detail: selectedConnector.name },
              { label: "Configure credentials or file", status: activeProvider === "csv" || (activeProvider === "zoho" && canConnectZoho) ? "ready" : "next", detail: "OAuth keys, API token, spreadsheet, or custom endpoint." },
              { label: "Save field mapping", status: mappingSaved ? "ready" : "next", detail: "Mapping applies per connector, not only Zoho." },
              { label: "Run import or sync", status: syncResult || zoho?.lastSyncAt ? "ready" : "next", detail: "Review results in Activity." },
            ]}
          />
        </section>
      )}

      {activeTab === "apps" && (
        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {connectors.map((connector) => {
              const Icon = connector.icon;
              const connected = integrations.some((item) => item.provider === connector.id && item.connected);
              const selected = activeProvider === connector.id;
              return (
                <button key={connector.id} type="button" onClick={() => selectProvider(connector.id)} className={`rounded-[1.5rem] border bg-card/95 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-950/5 ${selected ? "border-primary/40 ring-2 ring-primary/10" : "border-border/80"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${connector.accent}`}><Icon className="h-5 w-5" /></span>
                    <Badge variant={connected ? "default" : connector.status === "live" ? "secondary" : "outline"} className="rounded-full">{connected ? "Connected" : connector.status === "live" ? "Live" : connector.status === "foundation" ? "Foundation" : "Planned"}</Badge>
                  </div>
                  <h3 className="mt-4 font-semibold tracking-tight">{connector.name}</h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{connector.description}</p>
                </button>
              );
            })}
          </div>

          <Card className="rounded-[2rem] border-border/80 bg-card/95 shadow-xl shadow-slate-950/5">
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${selectedConnector.accent}`}><SelectedIcon className="h-5 w-5" /></span>
                  <div>
                    <CardTitle>{selectedConnector.name}</CardTitle>
                    <CardDescription className="mt-1">{selectedConnector.description}</CardDescription>
                  </div>
                </div>
                <Badge variant={activeProvider === "zoho" && zoho?.connected ? "default" : activeProvider === "csv" ? "default" : "outline"}>{activeProvider === "zoho" ? (zoho?.connected ? "Connected" : "Ready to connect") : activeProvider === "csv" ? "Ready" : "Coming soon"}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {activeProvider === "zoho" ? (
                <ZohoCredentialsForm credentials={credentials} showSecret={showSecret} saving={savingCredentials} canConnect={canConnectZoho} connected={Boolean(zoho?.connected)} connecting={connecting} syncing={syncing} onToggleSecret={() => setShowSecret((value) => !value)} onChange={updateCredential} onSave={saveCredentials} onConnect={connectZoho} onSync={syncZoho} onClear={clearCredentials} />
              ) : activeProvider === "csv" ? (
                <div className="rounded-[1.5rem] border bg-muted/20 p-6">
                  <h3 className="font-semibold">CSV / XLSX is ready</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Open the Import / Export tab to upload spreadsheet products or download your catalog.</p>
                  <Button type="button" className="mt-4 rounded-xl" onClick={() => setActiveTab("files")}>Open Import / Export</Button>
                </div>
              ) : (
                <FutureConnector connector={selectedConnector} />
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {activeTab === "mapping" && (
        <UniversalMappingPanel connector={selectedConnector} mapping={activeMapping} targetOptions={targetOptions} mappedCount={mappedCount} saving={savingMapping} saved={mappingSaved} onUpdate={updateMapping} onReset={resetMapping} onSave={saveMapping} />
      )}

      {activeTab === "files" && (
        <section className="space-y-6">
          <FileImportExportCard />
          <Card className="rounded-[2rem] border-border/80 bg-card/95 shadow-xl shadow-slate-950/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><DatabaseZap className="h-5 w-5" /> Spreadsheet mapping rules</CardTitle>
              <CardDescription>Files follow the same mapping model as app integrations, using column names as source fields.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <InfoTile title="Core columns" detail="Use name, sku, description, price, cost, quantity, lowStockLevel, category, status, and images." />
              <InfoTile title="Custom fields" detail="Use custom:field_key columns to import values into active custom product fields." />
              <InfoTile title="Safe updates" detail="Rows with existing SKUs update products. New SKUs create products. Missing SKUs are generated." />
            </CardContent>
          </Card>
        </section>
      )}

      {activeTab === "activity" && (
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="rounded-[2rem] border-border/80 bg-card/95 shadow-xl shadow-slate-950/5">
            <CardHeader>
              <CardTitle>Connection and sync activity</CardTitle>
              <CardDescription>Review connector state and latest sync/import results.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Selected source", selectedConnector.name],
                  ["Zoho status", zoho?.status ?? "disconnected"],
                  ["Last Zoho sync", zoho?.lastSyncAt ? new Date(zoho.lastSyncAt).toLocaleString() : "Never"],
                  ["Mapped fields", `${mappedCount}`],
                ].map(([label, value]) => <ActivityStat key={label} label={label} value={value} />)}
              </div>
              {syncResult ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                  <p className="text-sm font-medium">Latest sync result</p>
                  <p className="mt-1 text-sm">{syncResult.total} Zoho items processed · {syncResult.created} created · {syncResult.updated} updated</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">No sync result in this session yet. Connect Zoho, run a sync, or import a file to see activity.</div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-border/80 bg-card/95 shadow-xl shadow-slate-950/5">
            <CardHeader>
              <CardTitle>Connector roadmap</CardTitle>
              <CardDescription>Live and upcoming data sources.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {connectors.map((connector) => {
                const Icon = connector.icon;
                return (
                  <div key={connector.id} className="flex items-center justify-between rounded-2xl border bg-background/70 p-3">
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{connector.name}</span>
                    </div>
                    <Badge variant="secondary" className="rounded-full">{connector.status === "live" ? "Live" : connector.status === "foundation" ? "Foundation" : "Planned"}</Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>
      )}
    </PageShell>
  );
}

function ZohoCredentialsForm({ credentials, showSecret, saving, canConnect, connected, connecting, syncing, onToggleSecret, onChange, onSave, onConnect, onSync, onClear }: { credentials: ZohoCredentials; showSecret: boolean; saving: boolean; canConnect: boolean; connected: boolean; connecting: boolean; syncing: boolean; onToggleSecret: () => void; onChange: <K extends keyof ZohoCredentials>(key: K, value: ZohoCredentials[K]) => void; onSave: () => void; onConnect: () => void; onSync: () => void; onClear: () => void }) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <CredentialField label="Zoho client ID" description="OAuth client ID from Zoho API Console."><Input value={credentials.clientId} onChange={(event) => onChange("clientId", event.target.value)} placeholder="1000.xxxxx" className="rounded-xl font-mono" /></CredentialField>
        <CredentialField label="Zoho client secret" description="OAuth client secret for this Zoho app."><div className="relative"><Input type={showSecret ? "text" : "password"} value={credentials.clientSecret} onChange={(event) => onChange("clientSecret", event.target.value)} placeholder="Client secret" className="rounded-xl pr-10 font-mono" /><button type="button" onClick={onToggleSecret} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label={showSecret ? "Hide secret" : "Show secret"}>{showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></CredentialField>
        <CredentialField label="Redirect URI" description="Must exactly match the redirect URI configured in Zoho."><Input value={credentials.redirectUri} onChange={(event) => onChange("redirectUri", event.target.value)} className="rounded-xl font-mono" /></CredentialField>
        <CredentialField label="Zoho organization ID" description="Recommended for inventory item requests and sync stability."><Input value={credentials.organizationId} onChange={(event) => onChange("organizationId", event.target.value)} placeholder="913563938" className="rounded-xl font-mono" /></CredentialField>
        <CredentialField label="Zoho accounts domain" description="Use .com, .eu, .in, etc. depending on the customer data center."><select value={credentials.accountsDomain} onChange={(event) => onChange("accountsDomain", event.target.value)} className="h-10 w-full rounded-xl border bg-background px-3 text-sm shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25"><option value="https://accounts.zoho.com">accounts.zoho.com</option><option value="https://accounts.zoho.eu">accounts.zoho.eu</option><option value="https://accounts.zoho.in">accounts.zoho.in</option><option value="https://accounts.zoho.com.au">accounts.zoho.com.au</option><option value="https://accounts.zoho.jp">accounts.zoho.jp</option></select></CredentialField>
      </div>
      <div className="rounded-2xl border bg-amber-50 p-4 text-sm text-amber-800">For production, store credentials encrypted in the backend. Field mappings are sent to the API during reconnect and stored with the Zoho integration config.</div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onSave} disabled={saving || !canConnect} className="rounded-xl">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save credentials + mapping</Button>
        <Button type="button" onClick={onConnect} disabled={connecting || !canConnect} className="rounded-xl">{connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}{connected ? "Reconnect Zoho" : "Connect Zoho"}</Button>
        <Button type="button" variant="outline" onClick={onSync} disabled={!connected || syncing} className="rounded-xl">{syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Sync products</Button>
        <Button type="button" variant="ghost" onClick={onClear} className="rounded-xl">Clear</Button>
      </div>
    </>
  );
}

function UniversalMappingPanel({ connector, mapping, targetOptions, mappedCount, saving, saved, onUpdate, onReset, onSave }: { connector: ConnectorDefinition; mapping: FieldMapping[]; targetOptions: Array<{ key: string; label: string }>; mappedCount: number; saving: boolean; saved: boolean; onUpdate: (source: string, target: string) => void; onReset: () => void; onSave: () => void }) {
  return (
    <Card className="rounded-[2rem] border-border/80 bg-card/95 shadow-xl shadow-slate-950/5">
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${connector.accent}`}><connector.icon className="h-5 w-5" /></span>
            <div>
              <CardTitle>{connector.name} field mapping</CardTitle>
              <CardDescription className="mt-1">Map every external field into InventoryHub core fields, metadata, custom fields, or ignore it. This is the same system every integration will use.</CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={saved ? "secondary" : "destructive"} className="rounded-full">{saved ? "Saved" : "Unsaved changes"}</Badge>
            <Badge variant="outline" className="rounded-full">{mappedCount} mapped</Badge>
            <Button type="button" variant="outline" onClick={onReset} className="rounded-xl">Reset defaults</Button>
            <Button type="button" onClick={onSave} disabled={saving} className="rounded-xl">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save mapping</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="hidden grid-cols-[1fr_1fr] gap-3 px-1 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground md:grid"><span>{connector.shortName} source field</span><span>InventoryHub target field</span></div>
        {connector.fields.map((field) => {
          const currentTarget = mapping.find((item) => item.source === field.key)?.target ?? "ignore";
          return (
            <div key={field.key} className="grid gap-3 rounded-2xl border bg-background/70 p-3 md:grid-cols-[1fr_1fr] md:items-center">
              <div><p className="text-sm font-medium">{field.label}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{field.key}</p></div>
              <select value={currentTarget} onChange={(event) => onUpdate(field.key, event.target.value)} className="h-10 w-full rounded-xl border bg-background px-3 text-sm shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25">
                {targetOptions.map((target) => <option key={target.key} value={target.key}>{target.label}</option>)}
              </select>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function StatusCard({ icon: Icon, label, value, helper, tone = "default" }: { icon: typeof Store; label: string; value: string | number; helper: string; tone?: "default" | "success" }) {
  return <Card className="rounded-[1.5rem] border-border/80 bg-card/95 shadow-sm"><CardContent className="flex items-start justify-between gap-4 p-5"><div className="min-w-0"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 truncate text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 truncate text-xs text-muted-foreground">{helper}</p></div><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-primary/10 text-primary"}`}><Icon className="h-5 w-5" /></span></CardContent></Card>;
}

function ActivityStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border bg-muted/30 p-4"><p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</p><p className="mt-2 break-words text-sm font-medium">{value}</p></div>;
}

function InfoTile({ title, detail }: { title: string; detail: string }) {
  return <div className="rounded-2xl border bg-muted/20 p-4"><p className="font-medium">{title}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p></div>;
}

function FutureConnector({ connector }: { connector: ConnectorDefinition }) {
  const Icon = connector.icon;
  return <div className="rounded-[1.5rem] border border-dashed bg-muted/20 p-8 text-center"><Icon className="mx-auto h-10 w-10 text-muted-foreground" /><h3 className="mt-4 font-semibold">{connector.name} is prepared for universal mapping</h3><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">This connector will use the same tabs and workflow as Zoho: app credentials, source-field discovery, field mapping, import/sync, and activity review.</p><div className="mt-5 flex flex-wrap justify-center gap-2">{connector.capabilities.map((item) => <Badge key={item} variant="secondary" className="rounded-full">{item}</Badge>)}</div></div>;
}

function CredentialField({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return <div className="space-y-2"><div><Label className="text-sm font-medium">{label}</Label><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div>{children}</div>;
}

function buildDefaultMappings() {
  return connectors.reduce((acc, connector) => {
    acc[connector.id] = connector.defaultMapping;
    return acc;
  }, {} as Record<IntegrationProvider, FieldMapping[]>);
}
