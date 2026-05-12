"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, PackagePlus, Plus, Trash2, Truck } from "lucide-react";

import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { DEFAULT_CURRENCY, formatMoney, normalizeCurrencyCode } from "@/lib/currencies";

type Supplier = { id: string; supplierCode: string; name: string; currency: string; status: "active" | "archived" };
type Product = { id: string; name: string; sku: string; quantity: number; productSuppliers?: ProductSupplierLink[] };
type ProductSupplierLink = { id: string; supplierId: string; supplierSku?: string | null; cost?: string | number | null; currency: string; isPreferred: boolean };
type OrganizationSummary = { baseCurrency?: string | null };
type LineForm = { rowId: string; productId: string; productSupplierId: string; supplierSku: string; quantityOrdered: string; unitCost: string; description: string; notes: string };

function newLine(): LineForm {
  return { rowId: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `line-${Date.now()}-${Math.random()}`, productId: "", productSupplierId: "", supplierSku: "", quantityOrdered: "1", unitCost: "", description: "", notes: "" };
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
      apiFetch<Product[]>("/api/products").catch(() => []),
      apiFetch<OrganizationSummary>("/api/organization").catch(() => null),
    ]).then(([supplierList, productList, org]) => {
      if (!active) return;
      setSuppliers(supplierList.filter((supplier) => supplier.status !== "archived"));
      setProducts(productList);
      setOrganization(org);
      setLoading(false);
    }).catch((err) => {
      if (!active) return;
      setError(err instanceof Error ? err.message : "Failed to load purchase order data");
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const supplierProducts = useMemo(() => {
    if (!supplierId) return [];
    return products.filter((product) => (product.productSuppliers ?? []).some((link) => link.supplierId === supplierId));
  }, [products, supplierId]);

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
      <PageHeader eyebrow="Purchasing" title="New purchase order" description="Create a draft supplier order. Receiving stock will be added next." actions={<Button asChild variant="outline" className="rounded-xl bg-background/70"><Link href="/purchase-orders"><ArrowLeft className="h-4 w-4" />Back to purchase orders</Link></Button>} />
      {error && <div className="border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}
      {loading ? <Card><CardContent className="flex items-center gap-3 p-8 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading purchasing data...</CardContent></Card> : <div className="grid gap-6 xl:grid-cols-[1fr_22rem]"><main className="space-y-6"><Card className="border bg-card/95 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5" />Supplier</CardTitle><CardDescription>Select the supplier first so product lines inherit supplier cost and currency.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><label className="space-y-2"><Label>Supplier</Label><Select value={supplierId || "none"} onValueChange={(value) => chooseSupplier(value === "none" ? "" : value)}><SelectTrigger><SelectValue placeholder="Choose supplier" /></SelectTrigger><SelectContent><SelectItem value="none">Choose supplier</SelectItem>{suppliers.map((supplier) => <SelectItem key={supplier.id} value={supplier.id}>{supplier.supplierCode} · {supplier.name}</SelectItem>)}</SelectContent></Select></label><label className="space-y-2"><Label>Expected date</Label><Input type="date" value={expectedAt} onChange={(event) => setExpectedAt(event.target.value)} /></label></CardContent></Card><Card className="border bg-card/95 shadow-sm"><CardHeader><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="flex items-center gap-2"><PackagePlus className="h-5 w-5" />Order lines</CardTitle><CardDescription>Add products supplied by the selected supplier.</CardDescription></div><Button type="button" variant="outline" onClick={() => setLines((current) => [...current, newLine()])} className="bg-background"><Plus className="h-4 w-4" />Add line</Button></div></CardHeader><CardContent className="space-y-4">{lines.map((line) => <PurchaseOrderLineCard key={line.rowId} line={line} products={supplierProducts} currency={currency} onProductChange={(productId) => chooseProduct(line.rowId, productId)} onUpdate={(patch) => updateLine(line.rowId, patch)} onRemove={() => setLines((current) => current.length === 1 ? current : current.filter((item) => item.rowId !== line.rowId))} canRemove={lines.length > 1} />)}</CardContent></Card><Card className="border bg-card/95 shadow-sm"><CardHeader><CardTitle>Notes</CardTitle><CardDescription>Optional purchasing notes for this order.</CardDescription></CardHeader><CardContent><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-28" placeholder="Delivery instructions, payment notes, supplier confirmation..." /></CardContent></Card></main><aside className="space-y-6 xl:sticky xl:top-24 xl:self-start"><Card className="border bg-card/95 shadow-sm"><CardHeader><CardTitle>Order summary</CardTitle><CardDescription>Draft purchase order preview.</CardDescription></CardHeader><CardContent className="space-y-3"><Side label="Supplier" value={selectedSupplier?.supplierCode ?? "Not selected"} /><Side label="Currency" value={currency} /><Side label="Lines" value={`${lines.filter((line) => line.productId).length}`} /><Side label="Subtotal" value={formatMoney(subtotal, currency)} /><div className="rounded-xl border bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">This creates a draft PO. Stock receiving will be connected in the next phase.</div><Button type="button" onClick={createPurchaseOrder} disabled={saving} className="w-full rounded-xl"><CheckCircle2 className="h-4 w-4" />{saving ? "Creating..." : "Create draft PO"}</Button></CardContent></Card></aside></div>}
    </PageShell>
  );
}

function PurchaseOrderLineCard({ line, products, currency, onProductChange, onUpdate, onRemove, canRemove }: { line: LineForm; products: Product[]; currency: string; onProductChange: (productId: string) => void; onUpdate: (patch: Partial<LineForm>) => void; onRemove: () => void; canRemove: boolean }) {
  const lineTotal = Number(line.quantityOrdered || 0) * Number(line.unitCost || 0);
  return <Card className="bg-background/70"><CardContent className="grid gap-4 p-4 lg:grid-cols-[1.4fr_0.8fr_0.6fr_0.8fr_auto] lg:items-end"><label className="space-y-2"><Label>Product</Label><Select value={line.productId || "none"} onValueChange={(value) => onProductChange(value === "none" ? "" : value)}><SelectTrigger><SelectValue placeholder="Choose product" /></SelectTrigger><SelectContent><SelectItem value="none">Choose product</SelectItem>{products.map((product) => <SelectItem key={product.id} value={product.id}>{product.sku} · {product.name}</SelectItem>)}</SelectContent></Select>{products.length === 0 && <p className="text-xs text-muted-foreground">No linked products for this supplier yet.</p>}</label><label className="space-y-2"><Label>Supplier SKU</Label><Input value={line.supplierSku} onChange={(event) => onUpdate({ supplierSku: event.target.value })} /></label><label className="space-y-2"><Label>Qty</Label><Input type="number" min="1" value={line.quantityOrdered} onChange={(event) => onUpdate({ quantityOrdered: event.target.value })} /></label><label className="space-y-2"><Label>Unit cost ({currency})</Label><Input type="number" min="0" step="0.01" value={line.unitCost} onChange={(event) => onUpdate({ unitCost: event.target.value })} /></label><div className="flex items-center justify-between gap-3 lg:flex-col lg:items-end"><Badge variant="secondary">{formatMoney(Number.isFinite(lineTotal) ? lineTotal : 0, currency)}</Badge><Button type="button" variant="ghost" size="sm" onClick={onRemove} disabled={!canRemove} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></div></CardContent></Card>;
}

function Side({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div>;
}
