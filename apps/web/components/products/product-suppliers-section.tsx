"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, CheckCircle2, ChevronDown, Loader2, Pencil, Plus, Star, Trash2, Truck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

const DEFAULT_CURRENCY = "USD";

function normalizeCurrencyCode(value?: string | null, fallback = DEFAULT_CURRENCY) {
  const code = String(value || fallback).trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : fallback;
}

function numberValue(value: unknown) {
  const next = Number(value ?? 0);
  return Number.isFinite(next) ? next : 0;
}

function formatMoney(value: unknown, currency = DEFAULT_CURRENCY) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: normalizeCurrencyCode(currency),
    maximumFractionDigits: 2,
  }).format(numberValue(value));
}

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleDateString();
}

type OrganizationSummary = { baseCurrency?: string | null; enabledCurrencies?: string[] | null };
type ProductSummary = { id: string; price: string | number; priceCurrency?: string | null; cost?: string | number | null; costCurrency?: string | null; convertedCost?: string | number | null };

type Supplier = {
  id: string;
  supplierCode: string;
  name: string;
  supplierType?: string | null;
  currency: string;
  country?: string | null;
  city?: string | null;
  leadTimeDays?: number | null;
  minimumOrderQty?: number | null;
  status: "active" | "archived";
};

type ProductSupplierLink = {
  id: string;
  productId: string;
  supplierId: string;
  supplierSku?: string | null;
  cost?: string | number | null;
  currency: string;
  minimumOrderQty?: number | null;
  leadTimeDays?: number | null;
  isPreferred: boolean;
  lastPurchaseAt?: string | null;
  notes?: string | null;
  supplier: Supplier;
};

type ProductSuppliersSectionProps = { productId: string; baseCurrency: string };

const emptyForm = {
  supplierId: "",
  supplierSku: "",
  cost: "",
  currency: "USD",
  minimumOrderQty: "",
  leadTimeDays: "",
  isPreferred: false,
  lastPurchaseAt: "",
  notes: "",
};

export function ProductSuppliersSection({ productId, baseCurrency }: ProductSuppliersSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [links, setLinks] = useState<ProductSupplierLink[]>([]);
  const [product, setProduct] = useState<ProductSummary | null>(null);
  const [organization, setOrganization] = useState<OrganizationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductSupplierLink | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedSupplier = suppliers.find((supplier) => supplier.id === form.supplierId) || editing?.supplier || null;

  const enabledCurrencies = useMemo(() => {
    const base = normalizeCurrencyCode(organization?.baseCurrency || baseCurrency || DEFAULT_CURRENCY);
    return Array.from(new Set([base, ...(organization?.enabledCurrencies || []), selectedSupplier?.currency, form.currency].filter(Boolean).map((code) => normalizeCurrencyCode(String(code)))));
  }, [baseCurrency, form.currency, organization, selectedSupplier?.currency]);

  const preferred = links.find((link) => link.isPreferred) ?? links[0];
  const latestPurchase = links
    .map((link) => link.lastPurchaseAt)
    .filter(Boolean)
    .sort((a, b) => new Date(String(b)).getTime() - new Date(String(a)).getTime())[0];

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [supplierList, productLinks, productResult, org] = await Promise.all([
        apiFetch<Supplier[]>("/api/suppliers"),
        apiFetch<ProductSupplierLink[]>(`/api/products/${productId}/suppliers`),
        apiFetch<ProductSummary>(`/api/products/${productId}`).catch(() => null),
        apiFetch<OrganizationSummary>("/api/organization").catch(() => null),
      ]);
      setSuppliers(supplierList.filter((supplier) => supplier.status !== "archived"));
      setLinks(productLinks);
      setProduct(productResult);
      setOrganization(org);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load product suppliers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, [productId]);

  const availableSuppliers = useMemo(() => {
    if (editing) return suppliers;
    const linked = new Set(links.map((link) => link.supplierId));
    return suppliers.filter((supplier) => !linked.has(supplier.id));
  }, [editing, links, suppliers]);

  function openCreate() {
    const firstSupplier = availableSuppliers[0];
    setEditing(null);
    setForm({ ...emptyForm, supplierId: firstSupplier?.id ?? "", currency: normalizeCurrencyCode(firstSupplier?.currency || enabledCurrencies[0] || baseCurrency), isPreferred: links.length === 0 });
    setOpen(true);
    setError(null);
    setSuccess(null);
  }

  function openEdit(link: ProductSupplierLink) {
    setEditing(link);
    setForm({
      supplierId: link.supplierId,
      supplierSku: link.supplierSku ?? "",
      cost: link.cost == null ? "" : String(link.cost),
      currency: normalizeCurrencyCode(link.currency || link.supplier?.currency || enabledCurrencies[0] || baseCurrency),
      minimumOrderQty: link.minimumOrderQty == null ? "" : String(link.minimumOrderQty),
      leadTimeDays: link.leadTimeDays == null ? "" : String(link.leadTimeDays),
      isPreferred: link.isPreferred,
      lastPurchaseAt: toDateInput(link.lastPurchaseAt),
      notes: link.notes ?? "",
    });
    setOpen(true);
    setError(null);
    setSuccess(null);
  }

  function selectSupplier(supplierId: string) {
    const supplier = suppliers.find((item) => item.id === supplierId);
    setForm((current) => ({
      ...current,
      supplierId,
      currency: normalizeCurrencyCode(supplier?.currency || current.currency || enabledCurrencies[0] || baseCurrency),
      leadTimeDays: current.leadTimeDays || (supplier?.leadTimeDays == null ? "" : String(supplier.leadTimeDays)),
      minimumOrderQty: current.minimumOrderQty || (supplier?.minimumOrderQty == null ? "" : String(supplier.minimumOrderQty)),
    }));
  }

  async function saveLink() {
    if (!form.supplierId) return setError("Choose a supplier first.");
    const currency = normalizeCurrencyCode(form.currency || selectedSupplier?.currency || baseCurrency);
    if (!enabledCurrencies.includes(currency)) return setError("Choose a currency enabled for this organization or used by this supplier.");

    setSaving(true);
    setError(null);
    setSuccess(null);
    const payload = {
      supplierId: form.supplierId,
      supplierSku: clean(form.supplierSku),
      cost: form.cost === "" ? undefined : Number(form.cost),
      currency,
      minimumOrderQty: form.minimumOrderQty === "" ? undefined : Number(form.minimumOrderQty),
      leadTimeDays: form.leadTimeDays === "" ? undefined : Number(form.leadTimeDays),
      isPreferred: form.isPreferred,
      lastPurchaseAt: form.lastPurchaseAt ? new Date(form.lastPurchaseAt).toISOString() : undefined,
      notes: clean(form.notes),
    };

    try {
      if (editing) await apiFetch(`/api/products/${productId}/suppliers/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      else await apiFetch(`/api/products/${productId}/suppliers`, { method: "POST", body: JSON.stringify(payload) });
      setSuccess(editing ? "Supplier link updated." : "Supplier linked to product.");
      setOpen(false);
      setEditing(null);
      setExpanded(true);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save product supplier");
    } finally {
      setSaving(false);
    }
  }

  async function removeLink(link: ProductSupplierLink) {
    if (!window.confirm(`Remove ${link.supplier.name} from this product?`)) return;
    setError(null);
    setSuccess(null);
    try {
      await apiFetch(`/api/products/${productId}/suppliers/${link.id}`, { method: "DELETE" });
      setSuccess("Supplier removed from product.");
      setExpanded(true);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove product supplier");
    }
  }

  return (
    <Card className="overflow-hidden">
      <button type="button" onClick={() => setExpanded((current) => !current)} className="flex w-full items-start justify-between gap-4 p-4 text-left transition hover:bg-muted/40" aria-expanded={expanded}>
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Truck className="size-4" />
            Suppliers & costing
          </CardTitle>
          <CardDescription className="mt-1">Preferred supplier drives product cost. Purchase Orders update latest supplier cost and last purchase date when stock is received.</CardDescription>
          {preferred ? <p className="mt-2 text-xs text-muted-foreground">Preferred source: <span className="font-medium text-foreground">{preferred.supplier.name}</span> <span className="font-mono">({preferred.supplier.supplierCode})</span>{latestPurchase ? <span> · Last purchase {formatDate(String(latestPurchase))}</span> : null}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="secondary">{links.length} linked</Badge>
          {preferred ? <Badge variant="outline">{preferred.currency}</Badge> : null}
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
        </div>
      </button>

      {expanded ? (
        <CardContent className="grid gap-4 border-t p-4">
          <ProductCostingPanel product={product} preferred={preferred} links={links} baseCurrency={baseCurrency} />

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Linked suppliers</p>
              <p className="text-xs text-muted-foreground">These links power Purchase Orders, supplier SKUs, received-cost updates, and preferred cost.</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={openCreate} disabled={loading || availableSuppliers.length === 0}>
              <Plus className="size-4" />
              Link supplier
            </Button>
          </div>

          {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}
          {success ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{success}</div> : null}

          {loading ? (
            <div className="flex items-center gap-3 rounded-xl border border-dashed bg-muted/20 p-8 text-sm text-muted-foreground"><Loader2 className="size-5 animate-spin" />Loading product suppliers...</div>
          ) : links.length ? (
            <SupplierLinksTable links={links} baseCurrency={baseCurrency} onEdit={openEdit} onRemove={(link) => void removeLink(link)} />
          ) : (
            <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">No suppliers linked yet. Link this product to a supplier so future purchase orders, receiving, and cost comparisons have the right foundation.</div>
          )}
        </CardContent>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader><DialogTitle>{editing ? "Update product supplier" : "Link supplier to product"}</DialogTitle><DialogDescription>Supplier code is automatically linked from the selected supplier and cannot be edited here.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-4 md:grid-cols-2"><label className="space-y-2"><Label>Supplier</Label><Select value={form.supplierId} onValueChange={selectSupplier} disabled={Boolean(editing)}><SelectTrigger className="h-10 w-full"><SelectValue placeholder="Choose supplier" /></SelectTrigger><SelectContent>{availableSuppliers.map((supplier) => <SelectItem key={supplier.id} value={supplier.id}>{supplier.supplierCode} · {supplier.name}</SelectItem>)}</SelectContent></Select></label><label className="space-y-2"><Label>Supplier code</Label><Input value={selectedSupplier?.supplierCode || ""} readOnly className="bg-muted font-mono" placeholder="Auto-linked" /></label></div>
            <div className="grid gap-4 md:grid-cols-2"><label className="space-y-2"><Label>Supplier product SKU</Label><Input value={form.supplierSku} onChange={(event) => setForm((current) => ({ ...current, supplierSku: event.target.value }))} placeholder="Supplier product code" /></label><label className="space-y-2"><Label>Currency</Label><Select value={form.currency} onValueChange={(value) => setForm((current) => ({ ...current, currency: value }))}><SelectTrigger className="h-10 w-full"><SelectValue placeholder="Choose currency" /></SelectTrigger><SelectContent>{enabledCurrencies.map((currency) => <SelectItem key={currency} value={currency}>{currency}</SelectItem>)}</SelectContent></Select></label></div>
            <div className="grid gap-4 md:grid-cols-3"><label className="space-y-2"><Label>Cost</Label><Input value={form.cost} onChange={(event) => setForm((current) => ({ ...current, cost: event.target.value }))} type="number" min="0" step="0.01" placeholder="0.00" /></label><label className="space-y-2"><Label>MOQ</Label><Input value={form.minimumOrderQty} onChange={(event) => setForm((current) => ({ ...current, minimumOrderQty: event.target.value }))} type="number" min="0" placeholder="10" /></label><label className="space-y-2"><Label>Lead time days</Label><Input value={form.leadTimeDays} onChange={(event) => setForm((current) => ({ ...current, leadTimeDays: event.target.value }))} type="number" min="0" placeholder="7" /></label></div>
            <div className="grid gap-4 md:grid-cols-2"><label className="space-y-2"><Label>Last purchase date</Label><Input value={form.lastPurchaseAt} onChange={(event) => setForm((current) => ({ ...current, lastPurchaseAt: event.target.value }))} type="date" /></label><label className="flex items-center gap-3 rounded-lg border bg-muted/15 p-4 text-sm"><input type="checkbox" checked={form.isPreferred} onChange={(event) => setForm((current) => ({ ...current, isPreferred: event.target.checked }))} /><span><span className="font-semibold">Preferred supplier</span><span className="block text-muted-foreground">Only one supplier should be preferred per product.</span></span></label></div>
            <label className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="min-h-24" placeholder="Packaging rules, import notes, MOQ exceptions, supplier risks..." /></label>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button><Button type="button" onClick={saveLink} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}{editing ? "Save changes" : "Link supplier"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ProductCostingPanel({ product, preferred, links, baseCurrency }: { product: ProductSummary | null; preferred?: ProductSupplierLink; links: ProductSupplierLink[]; baseCurrency: string }) {
  const sellingPrice = Number(product?.price ?? 0);
  const sellingCurrency = normalizeCurrencyCode(product?.priceCurrency || baseCurrency);
  const supplierCurrency = normalizeCurrencyCode(preferred?.currency || product?.costCurrency || baseCurrency);
  const supplierCost = preferred?.cost == null ? (product?.cost == null ? undefined : Number(product.cost)) : Number(preferred.cost);
  const convertedCost = product?.convertedCost == null ? undefined : Number(product.convertedCost);
  const margin = convertedCost == null || !sellingPrice ? undefined : Math.round(((sellingPrice - convertedCost) / sellingPrice) * 100);

  return (
    <div className="rounded-xl border bg-muted/10 p-4">
      <div className="mb-4">
        <h3 className="flex items-center gap-2 text-sm font-medium"><Calculator className="size-4" />Costing summary</h3>
        <p className="mt-1 text-sm text-muted-foreground">Preferred supplier cost is the source for product cost and purchase-order planning.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CostMetric label="Selling price" value={formatMoney(sellingPrice, sellingCurrency)} detail={`${sellingCurrency} base selling currency`} />
        <CostMetric label="Preferred supplier" value={preferred?.supplier?.supplierCode ?? "Not set"} detail={preferred?.supplier?.name ?? `${links.length} supplier alternative${links.length === 1 ? "" : "s"}`} />
        <CostMetric label="Supplier cost" value={supplierCost == null || Number.isNaN(supplierCost) ? "Not set" : formatMoney(supplierCost, supplierCurrency)} detail={`${supplierCurrency} supplier currency`} />
        <CostMetric label={`Converted cost (${baseCurrency})`} value={convertedCost == null || Number.isNaN(convertedCost) ? "Not set" : formatMoney(convertedCost, baseCurrency)} detail={margin == null || Number.isNaN(margin) ? "Margin unavailable" : `${margin}% margin`} />
      </div>
    </div>
  );
}

function CostMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-lg border bg-background p-3"><p className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 truncate text-base font-semibold">{value}</p><p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p></div>;
}

function SupplierLinksTable({ links, baseCurrency, onEdit, onRemove }: { links: ProductSupplierLink[]; baseCurrency: string; onEdit: (link: ProductSupplierLink) => void; onRemove: (link: ProductSupplierLink) => void }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="pl-4">Supplier</TableHead>
            <TableHead>Supplier SKU</TableHead>
            <TableHead>Cost</TableHead>
            <TableHead>Purchase rules</TableHead>
            <TableHead>Last purchase</TableHead>
            <TableHead className="pr-4 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {links.map((link) => {
            const currency = normalizeCurrencyCode(link.currency || link.supplier.currency || baseCurrency);
            const costNumber = link.cost == null ? null : Number(link.cost);
            const purchaseRules = [
              link.minimumOrderQty == null ? null : `MOQ ${link.minimumOrderQty}`,
              link.leadTimeDays == null ? null : `${link.leadTimeDays} day lead`,
            ].filter(Boolean).join(" · ") || "No rules";
            return (
              <TableRow key={link.id} className={cn("h-16", link.isPreferred && "bg-primary/5 hover:bg-primary/10")}>
                <TableCell className="min-w-56 pl-4 align-middle">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium leading-none">{link.supplier.name}</span>
                      <Badge variant="outline" className="font-mono">{link.supplier.supplierCode}</Badge>
                      {link.isPreferred ? <Badge className="gap-1"><Star className="size-3" />Preferred</Badge> : <Badge variant="secondary">Alternative</Badge>}
                    </div>
                    <span className="text-xs leading-none text-muted-foreground">{[link.supplier.city, link.supplier.country].filter(Boolean).join(", ") || titleCase(link.supplier.supplierType || "vendor")}</span>
                  </div>
                </TableCell>
                <TableCell className="align-middle font-mono text-xs">{link.supplierSku || "-"}</TableCell>
                <TableCell className="align-middle"><div className="grid gap-1"><span className="font-medium">{costNumber == null || Number.isNaN(costNumber) ? "Not set" : formatMoney(costNumber, currency)}</span><span className="text-xs text-muted-foreground">{currency}</span></div></TableCell>
                <TableCell className="align-middle text-sm text-muted-foreground">{purchaseRules}</TableCell>
                <TableCell className="align-middle">{formatDate(link.lastPurchaseAt)}</TableCell>
                <TableCell className="pr-4 text-right align-middle">
                  <div className="flex justify-end gap-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => onEdit(link)} className="size-8"><Pencil className="size-4" /></Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => onRemove(link)} className="size-8 text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function clean(value: string) { const text = value.trim(); return text || null; }
function titleCase(value: string) { return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()); }
function toDateInput(value?: string | null) { if (!value) return ""; const date = new Date(value); if (Number.isNaN(date.getTime())) return ""; return date.toISOString().slice(0, 10); }
