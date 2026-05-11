"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, Loader2, Pencil, Plus, Star, Trash2, Truck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { formatMoney, normalizeCurrencyCode } from "@/lib/currencies";
import { cn } from "@/lib/utils";

type Supplier = {
  id: string;
  name: string;
  supplierType?: string | null;
  category?: string | null;
  rating?: string | null;
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

type ProductSuppliersSectionProps = {
  productId: string;
  baseCurrency: string;
};

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
  const [expanded, setExpanded] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [links, setLinks] = useState<ProductSupplierLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductSupplierLink | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [supplierList, productLinks] = await Promise.all([
        apiFetch<Supplier[]>("/api/suppliers"),
        apiFetch<ProductSupplierLink[]>(`/api/products/${productId}/suppliers`),
      ]);
      setSuppliers(supplierList.filter((supplier) => supplier.status !== "archived"));
      setLinks(productLinks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load product suppliers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const availableSuppliers = useMemo(() => {
    if (editing) return suppliers;
    const linked = new Set(links.map((link) => link.supplierId));
    return suppliers.filter((supplier) => !linked.has(supplier.id));
  }, [editing, links, suppliers]);

  const preferred = links.find((link) => link.isPreferred);

  function openCreate() {
    const firstSupplier = availableSuppliers[0];
    setEditing(null);
    setForm({ ...emptyForm, supplierId: firstSupplier?.id ?? "", currency: normalizeCurrencyCode(firstSupplier?.currency || baseCurrency) });
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
      currency: normalizeCurrencyCode(link.currency || link.supplier?.currency || baseCurrency),
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
      currency: normalizeCurrencyCode(supplier?.currency || current.currency || baseCurrency),
      leadTimeDays: current.leadTimeDays || (supplier?.leadTimeDays == null ? "" : String(supplier.leadTimeDays)),
      minimumOrderQty: current.minimumOrderQty || (supplier?.minimumOrderQty == null ? "" : String(supplier.minimumOrderQty)),
    }));
  }

  async function saveLink() {
    if (!form.supplierId) {
      setError("Choose a supplier first.");
      return;
    }
    if (form.currency && !/^[A-Za-z]{3}$/.test(form.currency.trim())) {
      setError("Currency must be a 3-letter code like USD, ZAR, EUR, or CNY.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    const payload = {
      supplierId: form.supplierId,
      supplierSku: clean(form.supplierSku),
      cost: form.cost === "" ? undefined : Number(form.cost),
      currency: normalizeCurrencyCode(form.currency || baseCurrency),
      minimumOrderQty: form.minimumOrderQty === "" ? undefined : Number(form.minimumOrderQty),
      leadTimeDays: form.leadTimeDays === "" ? undefined : Number(form.leadTimeDays),
      isPreferred: form.isPreferred,
      lastPurchaseAt: form.lastPurchaseAt ? new Date(form.lastPurchaseAt).toISOString() : undefined,
      notes: clean(form.notes),
    };

    try {
      if (editing) {
        await apiFetch(`/api/products/${productId}/suppliers/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        setSuccess("Supplier link updated.");
      } else {
        await apiFetch(`/api/products/${productId}/suppliers`, { method: "POST", body: JSON.stringify(payload) });
        setSuccess("Supplier linked to product.");
      }
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
    <section className="border bg-card/95">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-start justify-between gap-4 p-5 text-left transition hover:bg-muted/25"
        aria-expanded={expanded}
      >
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><Truck className="h-5 w-5" />Suppliers</h2>
          <p className="mt-1 text-sm text-muted-foreground">Show or hide suppliers linked to this product, including supplier SKU, cost, MOQ, lead time, and preferred supplier.</p>
          {preferred && <p className="mt-2 text-xs text-muted-foreground">Preferred supplier: <span className="font-semibold text-foreground">{preferred.supplier.name}</span></p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="secondary">{links.length} linked</Badge>
          <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", expanded && "rotate-180")} />
        </div>
      </button>

      {expanded && (
        <div className="border-t">
          <div className="flex justify-end border-b p-4">
            <Button type="button" variant="outline" onClick={openCreate} disabled={loading || availableSuppliers.length === 0} className="rounded-xl bg-background/70">
              <Plus className="h-4 w-4" />Link supplier
            </Button>
          </div>

          {error && <div className="border-b border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}
          {success && <div className="border-b border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</div>}

          {loading ? (
            <div className="flex items-center gap-3 p-8 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading product suppliers...</div>
          ) : links.length ? (
            <div className="grid gap-4 p-4 xl:grid-cols-2">
              {links.map((link) => <SupplierLinkCard key={link.id} link={link} baseCurrency={baseCurrency} onEdit={() => openEdit(link)} onRemove={() => void removeLink(link)} />)}
            </div>
          ) : (
            <div className="border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
              No suppliers linked yet. Link this product to a supplier so future purchase orders, receiving, and cost comparisons have the right foundation.
            </div>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Update product supplier" : "Link supplier to product"}</DialogTitle>
            <DialogDescription>Capture supplier-specific details for this product. These values will later feed purchase orders and receiving workflows.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <Label>Supplier</Label>
                <select value={form.supplierId} onChange={(event) => selectSupplier(event.target.value)} disabled={Boolean(editing)} className="h-10 w-full border bg-background px-3 text-sm">
                  <option value="">Choose supplier</option>
                  {availableSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name} · {titleCase(supplier.supplierType || "vendor")}</option>)}
                </select>
              </label>
              <label className="space-y-2">
                <Label>Supplier SKU</Label>
                <Input value={form.supplierSku} onChange={(event) => setForm((current) => ({ ...current, supplierSku: event.target.value }))} placeholder="Supplier product code" />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <label className="space-y-2"><Label>Cost</Label><Input value={form.cost} onChange={(event) => setForm((current) => ({ ...current, cost: event.target.value }))} type="number" min="0" step="0.01" placeholder="0.00" /></label>
              <label className="space-y-2"><Label>Currency</Label><Input value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} maxLength={3} placeholder="USD" /></label>
              <label className="space-y-2"><Label>MOQ</Label><Input value={form.minimumOrderQty} onChange={(event) => setForm((current) => ({ ...current, minimumOrderQty: event.target.value }))} type="number" min="0" placeholder="10" /></label>
              <label className="space-y-2"><Label>Lead time days</Label><Input value={form.leadTimeDays} onChange={(event) => setForm((current) => ({ ...current, leadTimeDays: event.target.value }))} type="number" min="0" placeholder="7" /></label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2"><Label>Last purchase date</Label><Input value={form.lastPurchaseAt} onChange={(event) => setForm((current) => ({ ...current, lastPurchaseAt: event.target.value }))} type="date" /></label>
              <label className="flex items-center gap-3 border bg-muted/15 p-4 text-sm">
                <input type="checkbox" checked={form.isPreferred} onChange={(event) => setForm((current) => ({ ...current, isPreferred: event.target.checked }))} />
                <span><span className="font-semibold">Preferred supplier</span><span className="block text-muted-foreground">Only one supplier should be preferred per product.</span></span>
              </label>
            </div>

            <label className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="min-h-24" placeholder="Packaging rules, import notes, MOQ exceptions, supplier risks..." /></label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="button" onClick={saveLink} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{editing ? "Save changes" : "Link supplier"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function SupplierLinkCard({ link, baseCurrency, onEdit, onRemove }: { link: ProductSupplierLink; baseCurrency: string; onEdit: () => void; onRemove: () => void }) {
  const currency = normalizeCurrencyCode(link.currency || link.supplier.currency || baseCurrency);
  const costNumber = link.cost == null ? null : Number(link.cost);
  return (
    <article className={cn("border bg-background p-4 transition hover:shadow-sm", link.isPreferred && "border-primary/50 bg-primary/5")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold tracking-tight">{link.supplier.name}</h3>
            {link.isPreferred && <Badge className="gap-1"><Star className="h-3 w-3" />Preferred</Badge>}
            <Badge variant="outline">{currency}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{[link.supplier.city, link.supplier.country].filter(Boolean).join(", ") || titleCase(link.supplier.supplierType || "vendor")}</p>
        </div>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={onEdit} className="rounded-xl"><Pencil className="h-4 w-4" /></Button>
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="rounded-xl text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <Fact label="Supplier SKU" value={link.supplierSku || "Not set"} mono />
        <Fact label="Cost" value={costNumber == null || Number.isNaN(costNumber) ? "Not set" : formatMoney(costNumber, currency)} />
        <Fact label="MOQ" value={link.minimumOrderQty == null ? "Not set" : String(link.minimumOrderQty)} />
        <Fact label="Lead time" value={link.leadTimeDays == null ? "Not set" : `${link.leadTimeDays} days`} />
        <Fact label="Last purchase" value={link.lastPurchaseAt ? new Date(link.lastPurchaseAt).toLocaleDateString() : "Not set"} />
        <Fact label="Base currency" value={baseCurrency} />
      </div>

      {link.notes && <p className="mt-4 line-clamp-3 border-t pt-3 text-sm leading-6 text-muted-foreground">{link.notes}</p>}
    </article>
  );
}

function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className={cn("mt-1 font-medium text-foreground", mono && "font-mono text-xs")}>{value}</p></div>;
}

function clean(value: string) {
  const text = value.trim();
  return text || null;
}

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function toDateInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}
