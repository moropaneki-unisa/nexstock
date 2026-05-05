"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Edit, FileText, History, ImageIcon, Loader2, PackageSearch } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { apiFetch } from "@/lib/api";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

type InventoryLog = { id: string; type: string; quantityBefore: number; quantityAfter: number; delta: number; reason?: string | null; source?: string | null; createdAt: string };
type ProductDetail = Product & { inventoryLogs?: InventoryLog[] };
type ProductDataField = { id: string; label: string; value: string; type?: string; mono?: boolean; multiline?: boolean };

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
  const cleanDescription = useMemo(() => cleanText(product?.description), [product?.description]);
  const productFields = useMemo<ProductDataField[]>(() => {
    if (!product) return [];
    const fields: ProductDataField[] = [
      { id: "name", label: "Product name", value: cleanText(product.name) || "-" },
      { id: "sku", label: "SKU", value: product.sku || "-", mono: true },
      { id: "status", label: "Status", value: lowStock ? "Low stock" : product.status || "active" },
      { id: "category", label: "Category", value: cleanText(product.category) || "Uncategorized" },
      { id: "description", label: "Description", value: cleanDescription || "No description", multiline: true },
      { id: "price", label: "Price", value: formatCurrency(product.price) },
      { id: "cost", label: "Cost", value: product.cost == null ? "Not set" : formatCurrency(product.cost) },
      { id: "quantity", label: "Quantity", value: `${product.quantity} units` },
      { id: "lowStockLevel", label: "Low-stock level", value: `${product.lowStockLevel} units` },
      { id: "images", label: "Images", value: `${product.images?.length ?? 0} image${(product.images?.length ?? 0) === 1 ? "" : "s"}` },
      { id: "createdAt", label: "Created", value: formatDate(product.createdAt) },
      { id: "updatedAt", label: "Updated", value: product.updatedAt ? formatDate(product.updatedAt) : "Not updated" },
    ];

    for (const item of product.customFieldValues ?? []) {
      fields.push({
        id: item.fieldId,
        label: item.field?.label ?? item.field?.key ?? item.fieldId,
        value: formatCustomValue(item.value),
        type: item.field?.type,
        multiline: item.field?.type === "json",
      });
    }

    return fields;
  }, [product, lowStock, cleanDescription]);

  if (loading) return <PageShell><div className="rounded-[1.25rem] border bg-card/95 p-8 shadow-sm"><div className="flex items-center gap-3 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading product record...</div></div></PageShell>;
  if (error || !product) return <PageShell className="space-y-4"><Button asChild variant="ghost" className="w-fit rounded-xl px-0"><Link href="/products"><ArrowLeft className="h-4 w-4" />Back to products</Link></Button><div className="rounded-[1.25rem] border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">{error ?? "Product not found."}</div></PageShell>;

  return (
    <PageShell className="space-y-5 pb-10">
      <Button asChild variant="ghost" className="w-fit rounded-xl px-0 text-muted-foreground hover:text-foreground"><Link href="/products"><ArrowLeft className="h-4 w-4" />Back to products</Link></Button>
      <PageHeader eyebrow="Product management" title={cleanText(product.name) || "Product"} description="Internal product data record. Review every field exactly as the business manages it, then edit what needs to change." actions={<div className="flex flex-wrap gap-2"><Button asChild variant="outline" className="rounded-xl bg-background/70"><Link href="/products"><PackageSearch className="h-4 w-4" />Catalog</Link></Button><Button asChild className="rounded-xl shadow-sm"><Link href={`/products/${product.id}/edit`}><Edit className="h-4 w-4" />Edit product</Link></Button></div>} />

      <section className="grid gap-5 xl:grid-cols-[18rem_1fr]">
        <aside className="space-y-5">
          <Card className="overflow-hidden rounded-[1.25rem] border-border/80 bg-card/95 shadow-sm"><CardContent className="p-0"><div className="relative aspect-square overflow-hidden bg-muted">{product.images?.[0] ? <img src={product.images[0]} alt={cleanText(product.name) || "Product image"} className="h-full w-full object-cover" /> : <div className="flex h-full flex-col items-center justify-center text-muted-foreground"><ImageIcon className="h-10 w-10" /><p className="mt-3 text-sm font-medium">No image</p></div>}<div className="absolute left-3 top-3"><ProductStatusBadge product={product} lowStock={lowStock} /></div></div>{product.images?.length ? <div className="grid grid-cols-4 gap-2 border-t p-3">{product.images.slice(0, 4).map((image, index) => <img key={`${image}-${index}`} src={image} alt={`Product image ${index + 1}`} className="h-12 w-full rounded-lg border object-cover" />)}</div> : null}</CardContent></Card>
          <Card className="rounded-[1.25rem] border-border/80 bg-card/95 shadow-sm"><CardContent className="space-y-2 p-4 text-sm"><SideFact label="SKU" value={product.sku} mono /><SideFact label="Stock" value={`${product.quantity} units`} /><SideFact label="Price" value={formatCurrency(product.price)} /><SideFact label="Category" value={cleanText(product.category) || "Uncategorized"} /></CardContent></Card>
        </aside>

        <main className="space-y-5">
          <Card className="rounded-[1.25rem] border-border/80 bg-card/95 shadow-sm">
            <CardHeader className="border-b"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="flex items-center gap-2 text-lg"><FileText className="h-5 w-5" />Product data</CardTitle><p className="mt-1 text-sm text-muted-foreground">All product fields are shown together. System fields and additional fields are part of the same editable product record.</p></div><Badge variant="secondary" className="w-fit rounded-full">{productFields.length} fields</Badge></div></CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {productFields.map((field) => <ProductFieldRow key={field.id} field={field} />)}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.25rem] border-border/80 bg-card/95 shadow-sm"><CardHeader className="flex flex-row items-start justify-between gap-4"><div><CardTitle className="flex items-center gap-2 text-lg"><History className="h-5 w-5" />Inventory movement</CardTitle><p className="mt-1 text-sm text-muted-foreground">Stock changes returned by the API.</p></div><Badge variant="secondary" className="rounded-full">{product.inventoryLogs?.length ?? 0} logs</Badge></CardHeader><CardContent className="space-y-3">{product.inventoryLogs?.length ? product.inventoryLogs.map((log) => <InventoryLogRow key={log.id} log={log} />) : <div className="rounded-[1.25rem] border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">No inventory movement yet.</div>}</CardContent></Card>
        </main>
      </section>
    </PageShell>
  );
}

function ProductFieldRow({ field }: { field: ProductDataField }) { return <div className="grid gap-2 px-4 py-3 text-sm transition hover:bg-muted/25 md:grid-cols-[14rem_1fr]"><div className="flex items-center gap-2 text-muted-foreground"><span className="font-medium">{field.label}</span>{field.type && <Badge variant="outline" className="rounded-full text-[0.65rem]">{field.type}</Badge>}</div><div className={cn("break-words font-medium text-foreground", field.mono && "font-mono", field.multiline && "whitespace-pre-wrap leading-6")}>{field.value}</div></div>; }
function SideFact({ label, value, mono }: { label: string; value: string; mono?: boolean }) { return <div className="flex items-center justify-between gap-3 rounded-xl border bg-background/70 px-3 py-2"><span className="text-muted-foreground">{label}</span><span className={cn("truncate font-medium", mono && "font-mono text-xs")}>{value}</span></div>; }
function InventoryLogRow({ log }: { log: InventoryLog }) { return <div className="rounded-xl border bg-background/70 p-3 text-sm"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold capitalize">{log.type.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-muted-foreground">{log.quantityBefore} to {log.quantityAfter} · {log.reason ?? "No reason"}</p></div><Badge variant={log.delta < 0 ? "destructive" : "secondary"} className="rounded-full">{log.delta > 0 ? `+${log.delta}` : log.delta}</Badge></div><p className="mt-2 text-xs text-muted-foreground">{formatDate(log.createdAt)}{log.source ? ` · ${log.source}` : ""}</p></div>; }
function ProductStatusBadge({ product, lowStock }: { product: Product; lowStock: boolean }) { if (product.status === "archived") return <Badge variant="outline" className="rounded-full bg-background/90">Archived</Badge>; if (lowStock) return <Badge variant="destructive" className="rounded-full">Low stock</Badge>; if (product.status === "draft") return <Badge variant="secondary" className="rounded-full bg-background/90">Draft</Badge>; return <Badge className="rounded-full bg-emerald-600 hover:bg-emerald-600">Active</Badge>; }
function formatCurrency(value: string | number) { return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(value ?? 0)); }
function formatDate(value: string) { return new Date(value).toLocaleString(); }
function formatCustomValue(value: unknown) { if (value === null || value === undefined || value === "") return "-"; if (typeof value === "object") return truncateText(JSON.stringify(value, null, 2), 400); return truncateText(cleanText(String(value)) || String(value), 400); }
function cleanText(value?: string | null) { if (!value) return ""; return value.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/[ \t]+/g, " ").replace(/\n\s+/g, "\n").replace(/\n{3,}/g, "\n\n").trim(); }
function truncateText(value: string, maxLength: number) { if (value.length <= maxLength) return value; return `${value.slice(0, maxLength).trim()}...`; }
