import {
  CheckCircle2,
  Clock3,
  DatabaseZap,
  FileJson,
  FileSpreadsheet,
  Globe2,
  PackageSearch,
  PlugZap,
  ShoppingBag,
  Store,
  Workflow,
} from "lucide-react";

export type IntegrationSource = "zoho" | "csv" | "xlsx" | "json" | "wordpress" | "shopify" | "custom";
export type IntegrationSection = "configuration" | "mapping" | "sync" | "history" | "logs";
export type MappingStatus = "not_started" | "draft" | "confirmed";

export type SourceField = {
  key: string;
  label: string;
  sample?: string;
  type?: string;
  required?: boolean;
};

export type FieldMapping = {
  id: string;
  source: string;
  target: string;
  required?: boolean;
  status?: "valid" | "missing" | "ignored";
};

export type IntegrationConfiguration = {
  source: IntegrationSource;
  status: "not_configured" | "configured" | "connected" | "error";
  detectedFields: SourceField[];
  mappings: FieldMapping[];
  mappingStatus: MappingStatus;
  savedAt?: string;
  lastSyncAt?: string;
  credentials?: Record<string, string>;
  history: Array<{ id: string; action: string; status: string; detail: string; at: string }>;
  logs: Array<{ id: string; level: "info" | "success" | "warning" | "error"; message: string; at: string }>;
};

export type ConnectorDefinition = {
  id: IntegrationSource;
  name: string;
  title: string;
  description: string;
  status: "live" | "planned" | "foundation";
  icon: typeof Store;
  accent: string;
  route: string;
  configurationFields: Array<{ key: string; label: string; type?: "text" | "password" | "url"; placeholder?: string; required?: boolean; help: string }>;
  defaultFields: SourceField[];
  requiredTargets: string[];
};

export const integrationTargets = [
  { key: "ignore", label: "Do not import" },
  { key: "core:name", label: "Product name", required: true },
  { key: "core:sku", label: "SKU", required: true },
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

export const integrationSections: Array<{ id: IntegrationSection; label: string; description: string; icon: typeof Store }> = [
  { id: "configuration", label: "Configuration", description: "Connect or upload source", icon: PlugZap },
  { id: "mapping", label: "Mapping", description: "Confirm field mapping", icon: DatabaseZap },
  { id: "sync", label: "Sync", description: "Preview and start sync", icon: Workflow },
  { id: "history", label: "History", description: "Sync history", icon: Clock3 },
  { id: "logs", label: "Logs / Errors", description: "Operational messages", icon: CheckCircle2 },
];

export const connectors: ConnectorDefinition[] = [
  {
    id: "zoho",
    name: "Zoho",
    title: "Zoho Inventory",
    description: "Connect Zoho Inventory using OAuth, detect product fields, map them, then sync safely.",
    status: "live",
    icon: Store,
    accent: "bg-emerald-50 text-emerald-700",
    route: "/integration/zoho",
    requiredTargets: ["core:name", "core:sku"],
    configurationFields: [
      { key: "clientId", label: "Client ID", placeholder: "1000.xxxxx", required: true, help: "OAuth client ID from Zoho API Console." },
      { key: "clientSecret", label: "Client secret", type: "password", required: true, help: "OAuth secret from the same Zoho app." },
      { key: "redirectUri", label: "Redirect URI", type: "url", placeholder: "http://localhost:4000/api/integrations/zoho/callback", required: true, help: "Must exactly match Zoho API Console." },
      { key: "organizationId", label: "Organization ID", placeholder: "913563938", help: "Recommended for stable inventory requests." },
    ],
    defaultFields: [
      { key: "item_id", label: "Item ID", sample: "482000000001" },
      { key: "name", label: "Item name", sample: "Classic T-Shirt", required: true },
      { key: "sku", label: "SKU", sample: "TSHIRT-001", required: true },
      { key: "description", label: "Description", sample: "Cotton shirt" },
      { key: "rate", label: "Sales rate / price", sample: "29.99" },
      { key: "purchase_rate", label: "Purchase rate / cost", sample: "12.50" },
      { key: "stock_on_hand", label: "Stock on hand", sample: "42" },
      { key: "category_name", label: "Category", sample: "Apparel" },
      { key: "brand", label: "Brand", sample: "NexStock" },
      { key: "upc", label: "UPC", sample: "012345678905" },
    ],
  },
  {
    id: "csv",
    name: "CSV",
    title: "CSV Import",
    description: "Upload a CSV file, detect headers, map columns, and import products.",
    status: "live",
    icon: FileSpreadsheet,
    accent: "bg-amber-50 text-amber-700",
    route: "/integration/csv",
    requiredTargets: ["core:name", "core:sku"],
    configurationFields: [],
    defaultFields: [],
  },
  {
    id: "xlsx",
    name: "XLSX",
    title: "XLSX Import",
    description: "Upload an Excel file, detect sheet headers, map columns, and import products.",
    status: "live",
    icon: FileSpreadsheet,
    accent: "bg-orange-50 text-orange-700",
    route: "/integration/xlsx",
    requiredTargets: ["core:name", "core:sku"],
    configurationFields: [],
    defaultFields: [],
  },
  {
    id: "json",
    name: "JSON",
    title: "JSON Import",
    description: "Paste or upload JSON, detect keys, map fields, and prepare product imports.",
    status: "foundation",
    icon: FileJson,
    accent: "bg-sky-50 text-sky-700",
    route: "/integration/json",
    requiredTargets: ["core:name", "core:sku"],
    configurationFields: [],
    defaultFields: [],
  },
  {
    id: "wordpress",
    name: "WordPress",
    title: "WordPress / WooCommerce",
    description: "Prepare WordPress or WooCommerce products with API configuration and reusable mapping.",
    status: "planned",
    icon: PackageSearch,
    accent: "bg-indigo-50 text-indigo-700",
    route: "/integration/wordpress",
    requiredTargets: ["core:name", "core:sku"],
    configurationFields: [
      { key: "siteUrl", label: "Site URL", type: "url", placeholder: "https://store.example.com", required: true, help: "WordPress or WooCommerce site URL." },
      { key: "consumerKey", label: "Consumer key", required: true, help: "WooCommerce REST API consumer key." },
      { key: "consumerSecret", label: "Consumer secret", type: "password", required: true, help: "WooCommerce REST API consumer secret." },
    ],
    defaultFields: [
      { key: "id", label: "Product ID", sample: "123" },
      { key: "name", label: "Product name", sample: "Classic T-Shirt", required: true },
      { key: "sku", label: "SKU", sample: "TSHIRT-001", required: true },
      { key: "description", label: "Description", sample: "Cotton shirt" },
      { key: "regular_price", label: "Regular price", sample: "29.99" },
      { key: "stock_quantity", label: "Stock quantity", sample: "42" },
      { key: "categories.name", label: "Category", sample: "Apparel" },
      { key: "images.src", label: "Image URL", sample: "https://example.com/image.jpg" },
    ],
  },
  {
    id: "shopify",
    name: "Shopify",
    title: "Shopify",
    description: "Prepare Shopify product, variant, metafield, and inventory mapping.",
    status: "planned",
    icon: ShoppingBag,
    accent: "bg-purple-50 text-purple-700",
    route: "/integration/shopify",
    requiredTargets: ["core:name", "core:sku"],
    configurationFields: [
      { key: "storeDomain", label: "Store domain", placeholder: "my-store.myshopify.com", required: true, help: "Your Shopify store domain." },
      { key: "accessToken", label: "Admin access token", type: "password", required: true, help: "Shopify Admin API access token." },
    ],
    defaultFields: [
      { key: "id", label: "Product ID", sample: "gid://shopify/Product/1" },
      { key: "title", label: "Title", sample: "Classic T-Shirt", required: true },
      { key: "body_html", label: "Description HTML", sample: "<p>Cotton shirt</p>" },
      { key: "vendor", label: "Vendor", sample: "NexStock" },
      { key: "product_type", label: "Product type", sample: "Apparel" },
      { key: "variants.sku", label: "Variant SKU", sample: "TSHIRT-001", required: true },
      { key: "variants.price", label: "Variant price", sample: "29.99" },
      { key: "variants.inventory_quantity", label: "Inventory quantity", sample: "42" },
    ],
  },
  {
    id: "custom",
    name: "Custom API",
    title: "Custom API",
    description: "Connect supplier, ERP, marketplace, or internal APIs with custom field mapping.",
    status: "foundation",
    icon: Globe2,
    accent: "bg-slate-100 text-slate-700",
    route: "/integration/custom",
    requiredTargets: ["core:name", "core:sku"],
    configurationFields: [
      { key: "endpoint", label: "Endpoint URL", type: "url", required: true, help: "The API endpoint that returns product records." },
      { key: "apiKey", label: "API key", type: "password", help: "Optional API key for the source system." },
    ],
    defaultFields: [],
  },
];

export function getConnector(source: string) {
  return connectors.find((connector) => connector.id === source) ?? null;
}

export function createDefaultConfiguration(source: IntegrationSource): IntegrationConfiguration {
  const connector = getConnector(source)!;
  return {
    source,
    status: "not_configured",
    detectedFields: [],
    mappings: [],
    mappingStatus: "not_started",
    history: [],
    logs: [createLog("info", `${connector.title} setup started. Detect fields before mapping.`)],
  };
}

export function autoMapFields(fields: SourceField[]): FieldMapping[] {
  return fields.map((field) => {
    const key = field.key.toLowerCase();
    const target =
      key === "name" || key === "title" ? "core:name" :
      key === "sku" || key === "code" || key.endsWith(".sku") ? "core:sku" :
      key.includes("description") || key === "body_html" ? "core:description" :
      key === "price" || key === "rate" || key.includes("regular_price") || key.endsWith(".price") ? "core:price" :
      key === "cost" || key === "purchase_rate" ? "core:cost" :
      key.includes("quantity") || key.includes("stock") || key === "inventory" ? "core:quantity" :
      key.includes("category") || key === "product_type" ? "core:category" :
      key.includes("image") ? "core:images" :
      key === "id" || key === "item_id" ? "metadata:externalId" :
      key.includes("brand") || key === "vendor" ? "metadata:brand" :
      key.includes("manufacturer") ? "metadata:manufacturer" :
      key.includes("upc") || key.includes("ean") || key.includes("barcode") ? "metadata:barcode" :
      "ignore";

    return { id: field.key, source: field.key, target, required: field.required, status: target === "ignore" ? "ignored" : "valid" };
  });
}

export function validateMappings(mappings: FieldMapping[], requiredTargets = ["core:name", "core:sku"]) {
  const mappedTargets = new Set(mappings.filter((mapping) => mapping.target !== "ignore").map((mapping) => mapping.target));
  const missing = requiredTargets.filter((target) => !mappedTargets.has(target));
  return { valid: missing.length === 0, missing };
}

export function createLog(level: IntegrationConfiguration["logs"][number]["level"], message: string) {
  return { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, level, message, at: new Date().toISOString() };
}

export function createHistory(action: string, status: string, detail: string) {
  return { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, action, status, detail, at: new Date().toISOString() };
}

export function storageKey(source: IntegrationSource) {
  return `nexstock_integration_${source}`;
}

export function normalizeSource(value: string): IntegrationSource | null {
  return connectors.some((connector) => connector.id === value) ? (value as IntegrationSource) : null;
}
