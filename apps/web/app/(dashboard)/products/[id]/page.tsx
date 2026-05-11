"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, DatabaseZap, Edit, FileText, History, ImageIcon, Loader2, Warehouse } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { apiFetch } from "@/lib/api";
import { DEFAULT_CURRENCY, formatMoney, normalizeCurrencyCode } from "@/lib/currencies";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

type InventoryLog = { id: string; type: string; quantityBefore: number; quantityAfter: number; delta: number; reason?: string | null; source?: string | null; createdAt: string };
type ProductDetail = Product & { inventoryLogs?: InventoryLog[] };
type ProductDataField = { id: string; label: string; value: string; type?: string; mono?: boolean; multiline?: boolean };
type OrganizationSummary = { baseCurrency?: string | null };

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [organization, setOrganization] = useState<OrganizationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [attributesOpen, setAttributesOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const baseCurrency = normalizeCurrencyCode(organization?.baseCurrency || DEFAULT_CURRENCY);

  async function loadProduct() {
    if (!params.id) return;
    setLoading(true);
    setError(null);
    try {
      const [result, org] = await Promise.all([
        apiFetch<ProductDetail>(`/api/products/${params.id}`),
        apiFetch<OrganizationSummary>("/api/organization").catch(() => null),
      ]);
      setProduct(result);
      setOrganization(org);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load product");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    const images = product?.images ?? [];
    if (images.length === 0) {
      setSelectedImage(null);
      return;
    }
    setSelectedImage((current) => (current && images.includes(current) ? current : images[0]));
  }, [product?.images]);

  async function submitStockAdjustment() {
    if (!product) return;
    const numericDelta = Number(delta);
    setAdjustError(null);

    if (!Number.isInteger(numericDelta) || numericDelta === 0) {
      setAdjustError("Enter a whole number above or below zero. Example: 10 or -3.");
      return;
    }

    if (product.quantity + numericDelta < 0) {
      setAdjustError("Stock cannot go below zero.");
      return;
    }

    setAdjusting(true);
    try {
      await apiFetch(`/api/products/${product.id}/adjust`, {
        method: "POST",
        body: JSON.stringify({ delta: numericDelta, reason: reason.trim() || "Manual stock adjustment", source: "app" }),
      });
      setDelta("");
      setReason("");
      setAdjustOpen(false);
      await loadProduct();
    } catch (err) {
      setAdjustError(err instanceof Error ? err.message : "Failed to adjust stock");
    } finally {
      setAdjusting(false);
    }
  }

  const lowStock = product ? product.quantity <= product.lowStockLevel : false;
  const cleanDescription = useMemo(() => cleanText(product?.description), [product?.description]);
  const priceCurrency = normalizeCurrencyCode(product?.priceCurrency || baseCurrency);
  const costCurrency = normalizeCurrencyCode(product?.costCurrency || priceCurrency);

  const defaultFields = useMemo<ProductDataField[]>(() => {
    if (!product) return [];
    const convertedCost = product.convertedCost == null ? "Not set" : formatMoney(product.convertedCost, baseCurrency);
    return [
      { id: "name", label: "Product name", value: cleanText(product.name) || "-" },
      { id: "sku", label: "SKU", value: product.sku || "-", mono: true },
      { id: "status", label: "Status", value: lowStock ? "Low stock" : product.status || "active" },
      { id: "category", label: "Category", value: cleanText(product.category) || "Uncategorized" },
      { id: "description", label: "Description", value: cleanDescription || "No description", multiline: true },
      { id: "price", label: `Price (${priceCurrency})`, value: formatMoney(product.price, priceCurrency) },
      { id: "cost", label: `Cost (${costCurrency})`, value: product.cost == null ? "Not set" : formatMoney(product.cost, costCurrency) },
      { id: "convertedCost", label: `Converted cost (${baseCurrency})`, value: convertedCost },
      { id: "quantity", label: "Current stock", value: `${product.quantity} units` },
      { id: "lowStockLevel", label: "Low-stock level", value: `${product.lowStockLevel} units` },
      { id: "images", label: "Images", value: `${product.images?.length ?? 0} image${(product.images?.length ?? 0) === 1 ? "" : "s"}` },
      { id: "createdAt", label: "Created", value: formatDate(product.createdAt) },
      { id: "updatedAt", label: "Updated", value: product.updatedAt ? formatDate(product.updatedAt) : "Not updated" },
    ];
  }, [product, lowStock, cleanDescription, baseCurrency, costCurrency, priceCurrency]);

  const customAttributes = useMemo<ProductDataField[]>(() => {
    if (!product) return [];
    return (product.customFieldValues ?? []).map((item) => ({
      id: item.fieldId,
      label: item.field?.label ?? item.field?.key ?? item.fieldId,
      value: formatCustomValue(item.value),
      type: item.field?.type,
      multiline: item.field?.type === "json",
    }));
  }, [product]);

  if (loading) {
    return <PageShell><div className="border bg-card/95 p-8"><div className="flex items-center gap-3 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading product profile...</div></div></PageShell>;
  }

  if (error || !product) {
    return <PageShell className="space-y-4"><Button asChild variant="outline" className="w-fit rounded-xl bg-background/70"><Link href="/products"><ArrowLeft className="h-4 w-4" />Back to products</Link></Button><div className="border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">{error ?? "Product not found."}</div></PageShell>;
  }

  const productImages = product.images ?? [];
  const primaryImage = selectedImage || productImages[0];
  const imageCount = productImages.length;

  return (
    <PageShell className="space-y-6 pb-10">
      <PageHeader eyebrow="Product profile" title={cleanText(product.name) || "Product"} description={`Review product identity, pricing in ${baseCurrency}, inventory, images, attributes, and stock movement from one profile.`} actions={<div className="flex flex-wrap gap-2"><Button asChild variant="outline" className="rounded-xl bg-background/70"><Link href="/products"><ArrowLeft className="h-4 w-4" />Back to products</Link></Button><Button type="button" variant="outline" onClick={() => setAdjustOpen(true)} className="rounded-xl bg-background/70"><Warehouse className="h-4 w-4" />Adjust stock</Button><Button asChild className="rounded-xl shadow-sm"><Link href={`/products/${product.id}/edit`}><Edit className="h-4 w-4" />Edit product</Link></Button></div>} />
      <section className="border bg-card/95"><div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4"><Metric label="SKU" value={product.sku} /><Metric label="Stock" value={`${product.quantity} units`} /><Metric label={`Price (${priceCurrency})`} value={formatMoney(product.price, priceCurrency)} /><Metric label="Status" value={lowStock ? "Low stock" : product.status || "active"} status /></div></section>
      <section className="grid gap-6 xl:grid-cols-[18rem_1fr]">
        <aside className="space-y-6">
          <section className="border bg-card/95">
            <div className="relative aspect-square overflow-hidden bg-muted">
              {primaryImage ? <img src={primaryImage} alt={cleanText(product.name) || "Product image"} className="h-full w-full object-cover" /> : <div className="flex h-full flex-col items-center justify-center text-muted-foreground"><ImageIcon className="h-10 w-10" /><p className="mt-3 text-sm font-medium">No image</p></div>}
              <div className="absolute left-3 top-3"><ProductStatusBadge product={product} lowStock={lowStock} /></div>
              {imageCount > 1 && <Badge variant="secondary" className="absolute bottom-3 right-3 bg-background/90">{productImages.findIndex((image) => image === primaryImage) + 1} / {imageCount}</Badge>}
            </div>
            {imageCount > 0 && (
              <div className="border-t p-3">
                <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>Click an image to preview it</span>
                  <span>{imageCount} total</span>
                </div>
                <div className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto pr-1">
                  {productImages.map((image, index) => {
                    const active = image === primaryImage;
                    return (
                      <button
                        key={`${image}-${index}`}
                        type="button"
                        onClick={() => setSelectedImage(image)}
                        className={cn("group relative h-14 overflow-hidden border bg-muted transition hover:border-primary", active ? "border-primary ring-2 ring-primary/30" : "border-border")}
                        aria-label={`View product image ${index + 1}`}
                        aria-pressed={active}
                      >
                        <img src={image} alt={`Product image ${index + 1}`} className="h-full w-full object-cover transition group-hover:scale-105" />
                        {active && <span className="absolute inset-x-0 bottom-0 bg-primary px-1 py-0.5 text-[0.6rem] font-semibold text-primary-foreground">Viewing</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
          <section className="border bg-card/95"><SectionHeader icon={FileText} title="Quick facts" /><div className="divide-y border-t"><SideFact label="SKU" value={product.sku} mono /><SideFact label="Category" value={cleanText(product.category) || "Uncategorized"} /><SideFact label="Images" value={`${imageCount}`} /><SideFact label="Base currency" value={baseCurrency} /><SideFact label="Updated" value={product.updatedAt ? formatDate(product.updatedAt) : "Not updated"} /></div></section>
        </aside>
        <main className="space-y-6"><section className="border bg-card/95"><SectionHeader icon={FileText} title="Product details" description="Core product details stored on every product record." badge={`${defaultFields.length} fields`} /><FieldGrid fields={defaultFields} /></section><section className="border bg-card/95"><button type="button" onClick={() => setAttributesOpen((open) => !open)} className="flex w-full items-start justify-between gap-4 p-5 text-left transition hover:bg-muted/25" aria-expanded={attributesOpen}><div><h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><DatabaseZap className="h-5 w-5" />Attributes</h2><p className="mt-1 text-sm text-muted-foreground">Show or hide custom business attributes for this product.</p></div><div className="flex shrink-0 items-center gap-2"><Badge variant="secondary">{customAttributes.length} custom</Badge><ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", attributesOpen && "rotate-180")} /></div></button>{attributesOpen && <div className="border-t">{customAttributes.length > 0 ? <FieldGrid fields={customAttributes} /> : <div className="border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">No custom attributes have been saved for this product yet.</div>}</div>}</section><section className="border bg-card/95"><SectionHeader icon={History} title="Inventory movement" description="Every stock adjustment is recorded with before/after quantity and reason." badge={`${product.inventoryLogs?.length ?? 0} logs`} /><div className="border-t">{product.inventoryLogs?.length ? <div className="divide-y">{product.inventoryLogs.map((log) => <InventoryLogRow key={log.id} log={log} />)}</div> : <div className="border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">No inventory movement yet.</div>}</div></section></main>
      </section>
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}><DialogContent><DialogHeader><DialogTitle>Adjust stock</DialogTitle><DialogDescription>Current stock is {product.quantity} units. Add stock with a positive number or reduce stock with a negative number.</DialogDescription></DialogHeader><div className="space-y-4">{adjustError && <div className="border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{adjustError}</div>}<label className="space-y-2"><Label>Adjustment quantity</Label><Input value={delta} onChange={(event) => setDelta(event.target.value)} type="number" step="1" placeholder="Example: 10 or -3" /></label><label className="space-y-2"><Label>Reason</Label><Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Stock count correction, supplier delivery, damaged goods..." className="min-h-24" /></label></div><DialogFooter><Button type="button" variant="outline" onClick={() => setAdjustOpen(false)} disabled={adjusting}>Cancel</Button><Button type="button" onClick={submitStockAdjustment} disabled={adjusting}>{adjusting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Warehouse className="h-4 w-4" />}Save adjustment</Button></DialogFooter></DialogContent></Dialog>
    </PageShell>
  );
}

function SectionHeader({ icon: Icon, title, description, badge }: { icon: any; title: string; description?: string; badge?: string }) { return <div className="flex flex-row items-start justify-between gap-4 p-5"><div><h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><Icon className="h-5 w-5" />{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>{badge && <Badge variant="secondary">{badge}</Badge>}</div>; }
function Metric({ label, value, status = false }: { label: string; value: string; status?: boolean }) { return <div className="flex items-center justify-between p-4"><div className="min-w-0"><p className="text-sm text-muted-foreground">{label}</p><p className={cn("mt-1 truncate text-xl font-semibold capitalize", label === "SKU" && "font-mono text-base normal-case")}>{value}</p></div>{status && <Badge variant={value.toLowerCase().includes("low") ? "destructive" : "default"}>{value}</Badge>}</div>; }
function FieldGrid({ fields }: { fields: ProductDataField[] }) { return <div className="grid divide-y border-t md:grid-cols-2 md:divide-x md:divide-y-0"><div className="divide-y">{fields.filter((_, index) => index % 2 === 0).map((field) => <ProductFieldRow key={field.id} field={field} />)}</div><div className="divide-y">{fields.filter((_, index) => index % 2 === 1).map((field) => <ProductFieldRow key={field.id} field={field} />)}</div></div>; }
function ProductFieldRow({ field }: { field: ProductDataField }) { return <div className="p-4 text-sm transition hover:bg-muted/25"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{field.label}</p>{field.type && <Badge variant="outline" className="text-[0.65rem]">{field.type}</Badge>}</div><p className={cn("mt-2 break-words font-medium text-foreground", field.mono && "font-mono", field.multiline && "whitespace-pre-wrap leading-6")}>{field.value}</p></div>; }
function SideFact({ label, value, mono }: { label: string; value: string; mono?: boolean }) { return <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm"><span className="text-muted-foreground">{label}</span><span className={cn("truncate font-medium", mono && "font-mono text-xs")}>{value}</span></div>; }
function InventoryLogRow({ log }: { log: InventoryLog }) { return <div className="p-4 text-sm"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold capitalize">{log.type.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-muted-foreground">{log.quantityBefore} to {log.quantityAfter} · {log.reason ?? "No reason"}</p></div><Badge variant={log.delta < 0 ? "destructive" : "secondary"}>{log.delta > 0 ? `+${log.delta}` : log.delta}</Badge></div><p className="mt-2 text-xs text-muted-foreground">{formatDate(log.createdAt)}{log.source ? ` · ${log.source}` : ""}</p></div>; }
function ProductStatusBadge({ product, lowStock }: { product: Product; lowStock: boolean }) { if (product.status === "archived") return <Badge variant="outline" className="bg-background/90">Archived</Badge>; if (product.quantity <= 0) return <Badge variant="destructive">Out of stock</Badge>; if (lowStock) return <Badge variant="destructive">Low stock</Badge>; if (product.status === "draft") return <Badge variant="secondary" className="bg-background/90">Draft</Badge>; return <Badge className="bg-emerald-600 hover:bg-emerald-600">Active</Badge>; }
function formatDate(value: string) { return new Date(value).toLocaleString(); }
function formatCustomValue(value: unknown) { if (value === null || value === undefined || value === "") return "-"; if (typeof value === "object") return truncateText(JSON.stringify(value, null, 2), 400); return truncateText(cleanText(String(value)) || String(value), 400); }
function cleanText(value?: string | null) { if (!value) return ""; return value.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/[ \t]+/g, " ").replace(/\n\s+/g, "\n").replace(/\n{3,}/g, "\n\n").trim(); }
function truncateText(value: string, maxLength: number) { if (value.length <= maxLength) return value; return `${value.slice(0, maxLength).trim()}...`; }
