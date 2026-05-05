"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Barcode,
  CheckCircle2,
  CircleDollarSign,
  DatabaseZap,
  Edit,
  FileText,
  History,
  ImageIcon,
  Layers3,
  Loader2,
  PackageSearch,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Warehouse,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { apiFetch } from "@/lib/api";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

type InventoryLog = {
  id: string;
  type: string;
  quantityBefore: number;
  quantityAfter: number;
  delta: number;
  reason?: string | null;
  source?: string | null;
  createdAt: string;
};

type ProductDetail = Product & {
  inventoryLogs?: InventoryLog[];
  variants?: Array<{ id: string; name?: string; sku?: string; price?: string | number; quantity?: number }>;
};

type UnifiedField = {
  id: string;
  label: string;
  value: string;
  type?: string;
  important?: boolean;
  mono?: boolean;
};

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;

    let active = true;
    setLoading(true);
    setError(null);

    apiFetch<ProductDetail>(`/api/products/${params.id}`)
      .then((result) => {
        if (active) setProduct(result);
      })
      .catch((err) => {
        if (active) setError(err.message ?? "Failed to load product");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [params.id]);

  const lowStock = product ? product.quantity <= product.lowStockLevel : false;
  const primaryImage = product?.images?.[0];
  const cleanDescription = useMemo(() => cleanText(product?.description), [product?.description]);
  const shortDescription = cleanDescription
    ? truncateText(cleanDescription, 190)
    : "Review product data, images, pricing, stock health, fields, and inventory movement from one unified profile.";

  const unifiedFields = useMemo<UnifiedField[]>(() => {
    if (!product) return [];

    const baseFields: UnifiedField[] = [
      { id: "name", label: "Product name", value: cleanText(product.name) || "—", important: true },
      { id: "sku", label: "SKU", value: product.sku, type: "system", important: true, mono: true },
      { id: "category", label: "Category", value: cleanText(product.category) || "Uncategorized" },
      { id: "status", label: "Status", value: lowStock ? "Low stock" : product.status || "active", type: "system" },
      { id: "price", label: "Price", value: formatCurrency(product.price), important: true },
      { id: "cost", label: "Cost", value: product.cost == null ? "Not set" : formatCurrency(product.cost) },
      { id: "quantity", label: "Quantity", value: `${product.quantity} units`, important: true },
      { id: "low-stock", label: "Low stock alert", value: `${product.lowStockLevel} units` },
      { id: "created", label: "Created", value: formatDate(product.createdAt), type: "system" },
      { id: "updated", label: "Updated", value: product.updatedAt ? formatDate(product.updatedAt) : "Not updated", type: "system" },
    ];

    const customFields = (product.customFieldValues ?? []).map((item) => ({
      id: item.fieldId,
      label: item.field?.label ?? item.field?.key ?? item.fieldId,
      value: formatCustomValue(item.value),
      type: item.field?.type ?? "custom",
    }));

    return [...baseFields, ...customFields];
  }, [product, lowStock]);

  if (loading) {
    return (
      <PageShell className="space-y-6">
        <div className="rounded-[2rem] border bg-card/95 p-8 shadow-xl shadow-slate-950/5">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading product profile...
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        </div>
      </PageShell>
    );
  }

  if (error || !product) {
    return (
      <PageShell>
        <Button asChild variant="ghost" className="w-fit rounded-xl px-0">
          <Link href="/products">
            <ArrowLeft className="h-4 w-4" />
            Back to products
          </Link>
        </Button>
        <div className="rounded-[1.5rem] border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
          {error ?? "Product not found."}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="space-y-6 pb-10">
      <Button asChild variant="ghost" className="w-fit rounded-xl px-0 text-muted-foreground hover:text-foreground">
        <Link href="/products">
          <ArrowLeft className="h-4 w-4" />
          Back to products
        </Link>
      </Button>

      <PageHeader
        eyebrow="Product profile"
        title={cleanText(product.name) || "Product"}
        description={shortDescription}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-xl bg-background/70">
              <Link href="/products">
                <PackageSearch className="h-4 w-4" />
                Catalog
              </Link>
            </Button>
            <Button asChild className="rounded-xl shadow-sm">
              <Link href={`/products/${product.id}/edit`}>
                <Edit className="h-4 w-4" />
                Edit product
              </Link>
            </Button>
          </div>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Barcode} label="SKU" value={product.sku} helper="Generated identifier" mono />
        <MetricCard icon={CircleDollarSign} label="Price" value={formatCurrency(product.price)} helper="Customer-facing value" tone="success" />
        <MetricCard icon={Warehouse} label="Stock" value={product.quantity} helper={`Alert at ${product.lowStockLevel}`} tone={lowStock ? "warning" : "success"} />
        <MetricCard icon={Layers3} label="Fields" value={unifiedFields.length} helper="Default and custom values" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <div className="space-y-6">
          <Card className="overflow-hidden rounded-[2rem] border-border/80 bg-card/95 shadow-xl shadow-slate-950/5">
            <CardContent className="p-0">
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                {primaryImage ? (
                  <img src={primaryImage} alt={cleanText(product.name) || "Product image"} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-muted to-background text-muted-foreground">
                    <ImageIcon className="h-12 w-12" />
                    <p className="mt-3 text-sm font-medium">No primary image</p>
                    <p className="mt-1 text-xs">Add images from the edit page</p>
                  </div>
                )}
                <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                  <ProductStatusBadge product={product} lowStock={lowStock} />
                  {product.category && <Badge className="rounded-full bg-background/90 text-foreground hover:bg-background/90">{cleanText(product.category)}</Badge>}
                </div>
              </div>

              {product.images?.length ? (
                <div className="grid grid-cols-4 gap-2 border-t p-3">
                  {product.images.slice(0, 4).map((image, index) => (
                    <img key={`${image}-${index}`} src={image} alt={`${cleanText(product.name) || "Product"} image ${index + 1}`} className="h-16 w-full rounded-xl border object-cover" />
                  ))}
                </div>
              ) : null}

              <div className="space-y-3 p-5">
                <div className="rounded-2xl border bg-muted/25 p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">Stock health</p>
                    <span className={cn("text-sm font-semibold", lowStock ? "text-amber-700" : "text-emerald-700")}>
                      {lowStock ? "Review" : "Healthy"}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full", lowStock ? "bg-amber-500" : "bg-emerald-600")}
                      style={{ width: `${Math.min(100, Math.max(8, Math.round((product.quantity / Math.max(product.lowStockLevel * 2, 1)) * 100)))}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {product.quantity} units available · alert threshold {product.lowStockLevel}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <SmallStat label="Cost" value={product.cost == null ? "—" : formatCurrency(product.cost)} />
                  <SmallStat label="Margin" value={calculateMargin(product.price, product.cost)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-border/80 bg-card/95 shadow-xl shadow-slate-950/5">
            <CardHeader className="border-b bg-gradient-to-br from-card to-muted/35">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Description
              </CardTitle>
              <p className="text-sm text-muted-foreground">Imported HTML is cleaned and contained here.</p>
            </CardHeader>
            <CardContent className="p-5">
              {cleanDescription ? (
                <p className="max-h-48 overflow-y-auto whitespace-pre-line rounded-2xl border bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
                  {cleanDescription}
                </p>
              ) : (
                <EmptyPanel icon={FileText} title="No description" description="Add a concise customer-facing product description from the edit page." />
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-[2rem] border-border/80 bg-card/95 shadow-xl shadow-slate-950/5">
          <CardHeader className="border-b bg-gradient-to-br from-card to-muted/35">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <DatabaseZap className="h-5 w-5" />
                  Product fields
                </CardTitle>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Default product fields and custom schema values are shown together as one complete product record.
                </p>
              </div>
              <Badge variant="secondary" className="w-fit rounded-full">Unified</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {unifiedFields.map((field) => (
                <FieldTile key={field.id} field={field} />
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.82fr]">
        <Card className="rounded-[2rem] border-border/80 bg-card/95 shadow-xl shadow-slate-950/5">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="h-5 w-5" />
                Inventory movement
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Latest stock changes returned by the product API.</p>
            </div>
            <Badge variant="secondary" className="rounded-full">{product.inventoryLogs?.length ?? 0} logs</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {product.inventoryLogs?.length ? (
              product.inventoryLogs.map((log) => <InventoryLogRow key={log.id} log={log} />)
            ) : (
              <EmptyPanel icon={History} title="No inventory movement yet" description="Stock changes, Zoho sync updates, and manual adjustments will appear here." />
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-[2rem] border-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-xl shadow-slate-950/10">
          <CardContent className="p-6">
            <Sparkles className="h-7 w-7 text-white/80" />
            <h3 className="mt-5 text-2xl font-semibold tracking-[-0.04em]">Product readiness</h3>
            <p className="mt-2 text-sm leading-6 text-white/70">
              This product profile is ready for demos, API consumers, and integration workflows once key data is complete.
            </p>
            <div className="mt-6 space-y-2 text-sm">
              <ReadinessItem icon={CheckCircle2} label="Core fields" value="Ready" />
              <ReadinessItem icon={product.images?.length ? CheckCircle2 : ImageIcon} label="Images" value={product.images?.length ? `${product.images.length} saved` : "Missing"} />
              <ReadinessItem icon={lowStock ? RefreshCw : ShieldCheck} label="Stock state" value={lowStock ? "Needs review" : "Healthy"} />
              <ReadinessItem icon={TrendingUp} label="External sync" value={product.metadata?.source === "zoho" ? "Zoho" : "InventoryHub"} />
            </div>
            <Button asChild className="mt-6 w-full rounded-xl bg-white text-slate-950 hover:bg-white/90">
              <Link href={`/products/${product.id}/edit`}>
                Improve product data
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}

function MetricCard({ icon: Icon, label, value, helper, tone = "default", mono }: { icon: ComponentType<{ className?: string }>; label: string; value: string | number; helper: string; tone?: "default" | "success" | "warning"; mono?: boolean }) {
  return (
    <Card className="rounded-[1.5rem] border-border/80 bg-card/95 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-950/5">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className={cn("mt-2 truncate text-2xl font-semibold tracking-tight", mono && "font-mono text-xl")}>{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
        </div>
        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", tone === "warning" ? "bg-amber-50 text-amber-700" : tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-primary/10 text-primary")}>
          <Icon className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  );
}

function FieldTile({ field }: { field: UnifiedField }) {
  return (
    <div className={cn("rounded-2xl border bg-background/70 p-4 transition hover:bg-muted/30", field.important && "border-primary/20 bg-primary/5")}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{field.label}</p>
        {field.type && <Badge variant="outline" className="rounded-full text-[0.65rem]">{field.type}</Badge>}
      </div>
      <p className={cn("line-clamp-3 break-words text-sm font-semibold leading-6", field.mono && "font-mono")}>{field.value}</p>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-background/70 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function InventoryLogRow({ log }: { log: InventoryLog }) {
  return (
    <div className="rounded-2xl border bg-background/70 p-4 text-sm transition hover:bg-muted/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold capitalize">{log.type.replaceAll("_", " ")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{log.quantityBefore} → {log.quantityAfter} · {log.reason ?? "No reason"}</p>
        </div>
        <Badge variant={log.delta < 0 ? "destructive" : "secondary"} className="rounded-full">
          {log.delta > 0 ? `+${log.delta}` : log.delta}
        </Badge>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{formatDate(log.createdAt)}{log.source ? ` · ${log.source}` : ""}</p>
    </div>
  );
}

function EmptyPanel({ icon: Icon, title, description }: { icon: ComponentType<{ className?: string }>; title: string; description: string }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed bg-muted/20 p-8 text-center">
      <Icon className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function ReadinessItem({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/10 px-3 py-2.5">
      <span className="flex items-center gap-2 text-white/75">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function ProductStatusBadge({ product, lowStock }: { product: Product; lowStock: boolean }) {
  if (product.status === "archived") return <Badge variant="outline" className="rounded-full bg-background/90">Archived</Badge>;
  if (lowStock) return <Badge variant="destructive" className="rounded-full">Low stock</Badge>;
  if (product.status === "draft") return <Badge variant="secondary" className="rounded-full bg-background/90">Draft</Badge>;
  return <Badge className="rounded-full bg-emerald-600 hover:bg-emerald-600">Active</Badge>;
}

function calculateMargin(price: string | number, cost?: string | number | null) {
  const numericPrice = Number(price ?? 0);
  const numericCost = Number(cost ?? 0);
  if (!numericPrice || !numericCost) return "—";
  return `${Math.round(((numericPrice - numericCost) / numericPrice) * 100)}%`;
}

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatCustomValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return truncateText(JSON.stringify(value), 180);
  return truncateText(cleanText(String(value)) || String(value), 180);
}

function cleanText(value?: string | null) {
  if (!value) return "";

  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trim()}...`;
}
