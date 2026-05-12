"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, CheckCircle2, ChevronsUpDown, Loader2, PackagePlus, Plus, Trash2, Truck } from "lucide-react";

import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { DEFAULT_CURRENCY, formatMoney, normalizeCurrencyCode } from "@/lib/currencies";
import { cn } from "@/lib/utils";

type Supplier = { id: string; supplierCode: string; name: string; currency: string; status: "active" | "archived" };
type Product = { id: string; name: string; sku: string; quantity: number; productSuppliers?: ProductSupplierLink[] };
type ProductSupplierLink = { id: string; supplierId: string; supplierSku?: string | null; cost?: string | number | null; currency: string; isPreferred: boolean };
type ProductListResponse = { items?: Product[]; pagination?: unknown } | Product[];
type OrganizationSummary = { baseCurrency?: string | null };
type LineForm = { rowId: string; productId: string; productSupplierId: string; supplierSku: string; quantityOrdered: string; unitCost: string; description: string; notes: string };

const controlClass = "h-10 w-full rounded-none border-border bg-background text-sm shadow-none focus-visible:ring-1 focus-visible:ring-ring";
const labelClass = "text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground";

function newLine(): LineForm {
  return { rowId: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `line-${Date.now()}-${Math.random()}`, productId: "", productSupplierId: "", supplierSku: "", quantityOrdered: "1", unitCost: "", description: "", notes: "" };
}

function normalizeProducts(result: ProductListResponse): Product[] {
  return Array.isArray(result) ? result : result.items ?? [];
}

export default function NewPurchaseOrderPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [organization, setOrganization] = useState<OrganizationSummary | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [expectedAt, setExpectedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineForm[]>([newLine()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSupplier = suppliers.find((supplier) => supplier.id === supplierId);
  const currency = normalizeCurrencyCode(selectedSupplier?.currency || organization?.baseCurrency || DEFAULT_CURRENCY);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiFetch<Supplier[]>("/api/suppliers").catch(() => []),
      apiFetch<ProductListResponse>("/api/products?limit=100").catch(() => ({ items: [] })),
      apiFetch<OrganizationSummary>("/api/organization").catch(() => null),
    ]).then(([supplierList, productResult, org]) => {
      if (!active) return;
      setSuppliers(supplierList.filter((supplier) => supplier.status !== "archived"));
      setProducts(normalizeProducts(productResult));
      setOrganization(org);
      setLoading(false);
    }).catch((err) => {
      if (!active) return;
      setError(err instanceof Error ? err.message : "Failed to load purchase order data");
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const selectableProducts = useMemo(() => products, [products]);

  const subtotal = lines.reduce((sum, line) => {
    const qty = Number(line.quantityOrdered || 0);
    const cost = Number(line.unitCost || 0);
    return sum + (Number.isFinite(qty) && Number.isFinite(cost) ? qty * cost : 0);
  }, 0);

  function chooseSupplier(value: string) {
    setSupplierId(value);
    setLines([newLine()]);
  }

  function updateLine(rowId: string, patch: Partial<LineForm>) {
    setLines((current) => current.map((line) => line.rowId === rowId ? { ...line, ...patch } : line));
  }

  function chooseProduct(rowId: string, productId: string) {
    const product = products.find((item) => item.id === productId);
    const link = product?.productSuppliers?.find((item) => item.supplierId === supplierId);
    updateLine(rowId, {
      productId,
      productSupplierId: link?.id ?? "",
      supplierSku: link?.supplierSku ?? "",
      unitCost: link?.cost == null ? "" : String(link.cost),
      description: product?.name ?? "",
    });
  }

  async function createPurchaseOrder() {
    setError(null);
    if (!supplierId) return setError("Choose a supplier first.");
    const validLines = lines.filter((line) => line.productId && Number(line.quantityOrdered) > 0 && Number(line.unitCost) >= 0);
    if (validLines.length === 0) return setError("Add at least one valid purchase order line.");

    setSaving(true);
    try {
      await apiFetch<{ id: string }>("/api/purchase-orders", {
        method: "POST",
        body: JSON.stringify({
          supplierId,
          expectedAt: expectedAt ? new Date(expectedAt).toISOString() : undefined,
          notes: notes.trim() || undefined,
          lines: validLines.map((line) => ({
            productId: line.productId,
            productSupplierId: line.productSupplierId || undefined,
            supplierSku: line.supplierSku.trim() || undefined,
            description: line.description.trim() || undefined,
            quantityOrdered: Number(line.quantityOrdered),
            unitCost: Number(line.unitCost),
            notes: line.notes.trim() || undefined,
          })),
        }),
      });
      window.location.href = "/purchase-orders";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create purchase order");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell className="space-y-6 pb-10">
      <PageHeader eyebrow="Purchasing" title="New purchase order" description="Create a draft supplier order. Receiving stock will be added next." actions={<Button asChild variant="outline" className="rounded-none bg-background/70"><Link href="/purchase-orders"><ArrowLeft className="h-4 w-4" />Back to purchase orders</Link></Button>} />
      {error && <div className="border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}
      {loading ? <Card className="rounded-none"><CardContent className="flex items-center gap-3 p-8 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading purchasing data...</CardContent></Card> : <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]"><main className="min-w-0 space-y-6"><Card className="rounded-none border bg-card/95 shadow-none"><CardHeader><CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5" />Supplier</CardTitle><CardDescription>Select the supplier first. Supplier currency controls this draft PO currency.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><label className="min-w-0 space-y-1.5"><Label className={labelClass}>Supplier</Label><Select value={supplierId || "none"} onValueChange={(value) => chooseSupplier(value === "none" ? "" : value)}><SelectTrigger className="w-full rounded-none"><SelectValue placeholder="Choose supplier" /></SelectTrigger><SelectContent><SelectItem value="none">Choose supplier</SelectItem>{suppliers.map((supplier) => <SelectItem key={supplier.id} value={supplier.id}>{supplier.supplierCode} · {supplier.name}</SelectItem>)}</SelectContent></Select></label><label className="space-y-1.5"><Label className={labelClass}>Expected date</Label><Input className={controlClass} type="date" value={expectedAt} onChange={(event) => setExpectedAt(event.target.value)} /></label></CardContent></Card><Card className="rounded-none border bg-card/95 shadow-none"><CardHeader><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="flex items-center gap-2"><PackagePlus className="h-5 w-5" />Order lines</CardTitle><CardDescription>Add products and confirm supplier cost manually where needed.</CardDescription></div><Button type="button" variant="outline" onClick={() => setLines((current) => [...current, newLine()])} className="rounded-none bg-background"><Plus className="h-4 w-4" />Add line</Button></div></CardHeader><CardContent className="p-0"><div className="hidden border-y bg-muted/15 px-4 py-3 text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(8rem,0.8fr)_6rem_8rem_7rem_3rem] lg:gap-4"><span>Product</span><span>Supplier SKU</span><span>Qty</span><span>Unit cost</span><span>Total</span><span></span></div><div className="divide-y">{lines.map((line) => <PurchaseOrderLineCard key={line.rowId} line={line} products={selectableProducts} currency={currency} onProductChange={(productId) => chooseProduct(line.rowId, productId)} onUpdate={(patch) => updateLine(line.rowId, patch)} onRemove={() => setLines((current) => current.length === 1 ? current : current.filter((item) => item.rowId !== line.rowId))} canRemove={lines.length > 1} />)}</div></CardContent></Card><Card className="rounded-none border bg-card/95 shadow-none"><CardHeader><CardTitle>Notes</CardTitle><CardDescription>Optional purchasing notes for this order.</CardDescription></CardHeader><CardContent><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-28 rounded-none border-border bg-background text-sm shadow-none focus-visible:ring-1 focus-visible:ring-ring" placeholder="Delivery instructions, payment notes, supplier confirmation..." /></CardContent></Card></main><aside className="space-y-6 xl:sticky xl:top-24 xl:self-start"><Card className="rounded-none border bg-card/95 shadow-none"><CardHeader><CardTitle>Order summary</CardTitle><CardDescription>Draft purchase order preview.</CardDescription></CardHeader><CardContent className="space-y-3"><Side label="Supplier" value={selectedSupplier?.supplierCode ?? "Not selected"} /><Side label="Currency" value={currency} /><Side label="Lines" value={`${lines.filter((line) => line.productId).length}`} /><Side label="Subtotal" value={formatMoney(subtotal, currency)} /><div className="border bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">This creates a draft PO. Stock receiving will be connected in the next phase.</div><Button type="button" onClick={createPurchaseOrder} disabled={saving} className="w-full rounded-none"><CheckCircle2 className="h-4 w-4" />{saving ? "Creating..." : "Create draft PO"}</Button></CardContent></Card></aside></div>}
    </PageShell>
  );
}

function PurchaseOrderLineCard({ line, products, currency, onProductChange, onUpdate, onRemove, canRemove }: { line: LineForm; products: Product[]; currency: string; onProductChange: (productId: string) => void; onUpdate: (patch: Partial<LineForm>) => void; onRemove: () => void; canRemove: boolean }) {
  const lineTotal = Number(line.quantityOrdered || 0) * Number(line.unitCost || 0);
  const selectedProduct = products.find((product) => product.id === line.productId);
  return <div className="grid min-w-0 gap-3 p-4 lg:grid-cols-[minmax(0,2fr)_minmax(8rem,0.8fr)_6rem_8rem_7rem_3rem] lg:items-start lg:gap-4"><label className="min-w-0 space-y-1.5"><Label className={labelClass}>Product</Label><ProductPicker products={products} value={line.productId} onChange={onProductChange} />{selectedProduct ? <p className="truncate font-mono text-[0.7rem] text-muted-foreground">{selectedProduct.sku}</p> : products.length === 0 ? <p className="text-xs text-muted-foreground">No products found yet.</p> : null}</label><label className="min-w-0 space-y-1.5"><Label className={labelClass}>Supplier SKU</Label><Input className={controlClass} value={line.supplierSku} onChange={(event) => onUpdate({ supplierSku: event.target.value })} /></label><label className="space-y-1.5"><Label className={labelClass}>Qty</Label><Input className={controlClass} type="number" min="1" value={line.quantityOrdered} onChange={(event) => onUpdate({ quantityOrdered: event.target.value })} /></label><label className="space-y-1.5"><Label className={labelClass}>Unit cost</Label><Input className={controlClass} type="number" min="0" step="0.01" value={line.unitCost} onChange={(event) => onUpdate({ unitCost: event.target.value })} /></label><div className="space-y-1.5"><p className={labelClass}>Total</p><div className="flex h-10 items-center border bg-muted/15 px-3 text-sm font-medium">{formatMoney(Number.isFinite(lineTotal) ? lineTotal : 0, currency)}</div></div><div className="flex items-end pt-5 lg:pt-6"><Button type="button" variant="ghost" size="sm" onClick={onRemove} disabled={!canRemove} className="h-10 w-10 rounded-none p-0 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></div></div>;
}

function ProductPicker({ products, value, onChange }: { products: Product[]; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = products.find((product) => product.id === value);

  return (
    <div className="relative min-w-0" onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
      <Button type="button" variant="outline" role="combobox" aria-expanded={open} onClick={() => setOpen((current) => !current)} className="h-10 w-full justify-between rounded-none bg-background px-3 font-normal shadow-none">
        <span className={cn("min-w-0 flex-1 truncate text-left", !selected && "text-muted-foreground")}>{selected ? `${selected.sku} · ${selected.name}` : "Search or choose product"}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
      {open && (
        <div className="absolute left-0 right-0 top-11 z-50 border bg-background shadow-lg">
          <Command className="rounded-none">
            <CommandInput placeholder="Search SKU or product name..." className="rounded-none" />
            <CommandList className="max-h-72 overflow-y-auto">
              <CommandEmpty>No product found.</CommandEmpty>
              <CommandGroup heading="Products">
                {products.map((product) => (
                  <CommandItem
                    key={product.id}
                    value={`${product.sku} ${product.name}`}
                    onSelect={() => {
                      onChange(product.id);
                      setOpen(false);
                    }}
                    className="rounded-none"
                  >
                    <Check className={cn("h-4 w-4 shrink-0", value === product.id ? "opacity-100" : "opacity-0")} />
                    <span className="min-w-0 flex-1 truncate">{product.sku} · {product.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{product.quantity} in stock</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}

function Side({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div>;
}
