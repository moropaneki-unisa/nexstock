"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { ArrowLeft, Barcode, CircleDollarSign, DatabaseZap, Edit, FileText, History, ImageIcon, Loader2, PackageSearch, Warehouse } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { apiFetch } from "@/lib/api";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

type InventoryLog = { id: string; type: string; quantityBefore: number; quantityAfter: number; delta: number; reason?: string | null; source?: string | null; createdAt: string };
type ProductDetail = Product & { inventoryLogs?: InventoryLog[]; variants?: Array<{ id: string; name?: string; sku?: string; price?: string | number; quantity?: number }> };
type UnifiedField = { id: string; label: string; value: string; type?: string; important?: boolean; mono?: boolean };

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
      .then((result) => { if (active) setProduct(result); })
      .catch((err) => { if (active) setError(err.message ?? "Failed to load product"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [params.id]);

  const lowStock = product ? product.quantity <= product.lowStockLevel : false;
  const primaryImage = product?.images?.[0];
  const cleanDescription = useMemo(() => cleanText(product?.description), [product?.description]);
  const unifiedFields = useMemo<UnifiedField[]>(() => {
    if (!product) return [];
    const baseFields: UnifiedField[] = [
      { id: "name", label: "Product name", value: cleanText(product.name) || "-", important: true },
      { id: "sku", label: "SKU", value: product.sku, type: "default", important: true, mono: true },
      { id: "category", label: "Category", value: cleanText(product.category) || "Uncategorized" },
      { id: "status", label: "Status", value: lowStock ? "Low stock" : product.status || "active", type: "default" },
      { id: "price", label: "Price", value: formatCurrency(product.price), important: true },
      { id: "cost", label: "Cost", value: product.cost == null ? "Not set" : formatCurrency(product.cost) },
      { id: "quantity", label: "Quantity", value: `${product.quantity} units`, important: true },
      { id: "low-stock", label: "Low-stock level", value: `${product.lowStockLevel} units` },
      { id: "created", label: "Created", value: formatDate(product.createdAt), type: "system" },
      { id: "updated", label: "Updated", value: product.updatedAt ? formatDate(product.updatedAt) : "Not updated", type: "system" },
    ];
    const additionalFields = (product.customFieldValues ?? []).map((item) => ({ id: item.fieldId, label: item.field?.label ?? item.field?.key ?? item.fieldId, value: formatCustomValue(item.value), type: item.field?.type ?? "additional" }));
    return [...baseFields, ...additionalFields];
  }, [product, lowStock]);

  if (loading) return <PageShell><div className="rounded-[1.25rem] border bg-card/95 p-8 shadow-sm"><div className="flex items-center gap-3 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading product record...</div></div></PageShell>;

  if (error || !product) return <PageShell className="space-y-4"><Button asChild variant="ghost" className="w-fit rounded-xl px-0"><Link href="/products"><ArrowLeft className="h-4 w-4" />Back to products</Link></Button><div className="rounded-[1.25rem] border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">{error ?? "Product not found."}</div></PageShell>;

  return (
    <PageShell className="space-y-5 pb-10">
      <Button asChild variant="ghost" className="w-fit rounded-xl px-0 text-muted-foreground hover:text-foreground"><Link href="/products"><ArrowLeft className="h-4 w-4" />Back to products</Link></Button>
      <PageHeader eyebrow="Product record" title={cleanText(product.name) || "Product"} description="A focused CRM-style product profile for reviewing fields, images, pricing, stock, and movement history." actions={<div className="flex flex-wrap gap-2"><Button asChild variant="outline" className="rounded-xl bg-background/70"><Link href="/products"><PackageSearch className="h-4 w-4" />Catalog</Link></Button><Button asChild className="rounded-xl shadow-sm"><Link href={`/products/${product.id}/edit`}><Edit className="h-4 w-4" />Edit</Link></Button></div>} />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><MetricCard icon={Barcode} label="SKU" value={product.sku} helper="Identifier" mono /><MetricCard icon={CircleDollarSign} label="Price" value={formatCurrency(product.price)} helper="Selling price" tone="success" /><MetricCard icon={Warehouse} label="Stock" value={product.quantity} helper={`Alert at ${product.lowStockLevel}`} tone={lowStock ? "warning" : "success"} /><MetricCard icon={DatabaseZap} label="Fields" value={unifiedFields.length} helper="Default + additional" /></section>

      <section className="grid gap-5 xl:grid-cols-[22rem_1fr]">
        <div className="space-y-5">
          <Card className="overflow-hidden rounded-[1.25rem] border-border/80 bg-card/95 shadow-sm"><CardContent className="p-0"><div className="relative aspect-square overflow-hidden bg-muted">{primaryImage ? <img src={primaryImage} alt={cleanText(product.name) || "Product image"} className="h-full w-full object-cover" /> : <div className="flex h-full flex-col items-center justify-center text-muted-foreground"><ImageIcon className="h-10 w-10" /><p className="mt-3 text-sm font-medium">No image</p></div>}<div className="absolute left-3 top-3 flex flex-wrap gap-2"><ProductStatusBadge product={product} lowStock={lowStock} />{product.category && <Badge className="rounded-full bg-background/90 text-foreground hover:bg-background/90">{cleanText(product.category)}</Badge>}</div></div>{product.images?.length ? <div className="grid grid-cols-4 gap-2 border-t p-3">{product.images.slice(0, 4).map((image, index) => <img key={`${image}-${index}`} src={image} alt={`Image ${index + 1}`} className="h-14 w-full rounded-lg border object-cover" />)}</div> : null}</CardContent></Card>
          <Card className="rounded-[1.25rem] border-border/80 bg-card/95 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4" />Description</CardTitle></CardHeader><CardContent>{cleanDescription ? <p className="max-h-48 overflow-y-auto whitespace-pre-line text-sm leading-6 text-muted-foreground">{cleanDescription}</p> : <p className="text-sm text-muted-foreground">No description added.</p>}</CardContent></Card>
        </div>

        <div className="space-y-5">
          <Card className="rounded-[1.25rem] border-border/80 bg-card/95 shadow-sm"><CardHeader className="border-b"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="flex items-center gap-2 text-lg"><DatabaseZap className="h-5 w-5" />Product fields</CardTitle><p className="mt-1 text-sm text-muted-foreground">Default and additional fields shown together as one record.</p></div><Badge variant="secondary" className="w-fit rounded-full">Unified record</Badge></div></CardHeader><CardContent className="p-4"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{unifiedFields.map((field) => <FieldTile key={field.id} field={field} />)}</div></CardContent></Card>
          <Card className="rounded-[1.25rem] border-border/80 bg-card/95 shadow-sm"><CardHeader className="flex flex-row items-start justify-between gap-4"><div><CardTitle className="flex items-center gap-2 text-lg"><History className="h-5 w-5" />Inventory movement</CardTitle><p className="mt-1 text-sm text-muted-foreground">Stock changes returned by the API.</p></div><Badge variant="secondary" className="rounded-full">{product.inventoryLogs?.length ?? 0} logs</Badge></CardHeader><CardContent className="space-y-3">{product.inventoryLogs?.length ? product.inventoryLogs.map((log) => <InventoryLogRow key={log.id} log={log} />) : <div className="rounded-[1.25rem] border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">No inventory movement yet.</div>}</CardContent></Card>
        </div>
      </section>
    </PageShell>
  );
}

function MetricCard({ icon: Icon, label, value, helper, tone = "default", mono }: { icon: ComponentType<{ className?: string }>; label: string; value: string | number; helper: string; tone?: "default" | "success" | "warning"; mono?: boolean }) { return <Card className="rounded-[1.25rem] border-border/80 bg-card/95 shadow-sm"><CardContent className="flex items-start justify-between gap-4 p-4"><div className="min-w-0"><p className="text-sm text-muted-foreground">{label}</p><p className={cn("mt-1 truncate text-xl font-semibold tracking-tight", mono && "font-mono text-base")}>{value}</p><p className="mt-1 text-xs text-muted-foreground">{helper}</p></div><span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tone === "warning" ? "bg-amber-50 text-amber-700" : tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-primary/10 text-primary")}><Icon className="h-4 w-4" /></span></CardContent></Card>; }
function FieldTile({ field }: { field: UnifiedField }) { return <div className={cn("rounded-xl border bg-background/70 p-3 transition hover:bg-muted/30", field.important && "border-primary/20 bg-primary/5")}><div className="mb-1 flex items-center justify-between gap-3"><p className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">{field.label}</p>{field.type && <Badge variant="outline" className="rounded-full text-[0.65rem]">{field.type}</Badge>}</div><p className={cn("line-clamp-3 break-words text-sm font-semibold leading-6", field.mono && "font-mono")}>{field.value}</p></div>; }
function InventoryLogRow({ log }: { log: InventoryLog }) { return <div className="rounded-xl border bg-background/70 p-3 text-sm"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold capitalize">{log.type.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-muted-foreground">{log.quantityBefore} to {log.quantityAfter} · {log.reason ?? "No reason"}</p></div><Badge variant={log.delta < 0 ? "destructive" : "secondary"} className="rounded-full">{log.delta > 0 ? `+${log.delta}` : log.delta}</Badge></div><p className="mt-2 text-xs text-muted-foreground">{formatDate(log.createdAt)}{log.source ? ` · ${log.source}` : ""}</p></div>; }
function ProductStatusBadge({ product, lowStock }: { product: Product; lowStock: boolean }) { if (product.status === "archived") return <Badge variant="outline" className="rounded-full bg-background/90">Archived</Badge>; if (lowStock) return <Badge variant="destructive" className="rounded-full">Low stock</Badge>; if (product.status === "draft") return <Badge variant="secondary" className="rounded-full bg-background/90">Draft</Badge>; return <Badge className="rounded-full bg-emerald-600 hover:bg-emerald-600">Active</Badge>; }
function formatCurrency(value: string | number) { return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(value ?? 0)); }
function formatDate(value: string) { return new Date(value).toLocaleString(); }
function formatCustomValue(value: unknown) { if (value === null || value === undefined || value === "") return "-"; if (typeof value === "object") return truncateText(JSON.stringify(value), 180); return truncateText(cleanText(String(value)) || String(value), 180); }
function cleanText(value?: string | null) { if (!value) return ""; return value.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/[ \t]+/g, " ").replace(/\n\s+/g, "\n").replace(/\n{3,}/g, "\n\n").trim(); }
function truncateText(value: string, maxLength: number) { if (value.length <= maxLength) return value; return `${value.slice(0, maxLength).trim()}...`; }
