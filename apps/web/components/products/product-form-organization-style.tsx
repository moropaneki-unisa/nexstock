"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, CircleDollarSign, DatabaseZap, ImageIcon, Loader2, PackagePlus, Plus, Save, Star, Trash2, Truck, UploadCloud, Warehouse } from "lucide-react";

import { normalizeExchangeRates, type Organization } from "@/components/organization/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { DEFAULT_CURRENCY, formatMoney, normalizeCurrencyCode } from "@/lib/currencies";
import type { Product, ProductField } from "@/lib/types";

type Props = { product?: Product; mode?: "create" | "edit" };
type Supplier = { id: string; supplierCode: string; name: string; currency: string; leadTimeDays?: number | null; minimumOrderQty?: number | null; status: "active" | "archived" };
type ProductSupplierLink = { id: string; supplierId: string; supplierSku?: string | null; cost?: string | number | null; currency: string; minimumOrderQty?: number | null; leadTimeDays?: number | null; isPreferred: boolean; notes?: string | null; supplier: Supplier };
type CurrencyState = { baseCurrency: string; exchangeRates: Array<{ code: string; rateToBase: number }> };
type SupplierRow = { rowId: string; linkId?: string; supplierId: string; supplierSku: string; cost: string; currency: string; minimumOrderQty: string; leadTimeDays: string; isPreferred: boolean; notes: string };

const rowId = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `row-${Date.now()}-${Math.random()}`;
const emptySupplier = (currency: string): SupplierRow => ({ rowId: rowId(), supplierId: "", supplierSku: "", cost: "", currency, minimumOrderQty: "", leadTimeDays: "", isPreferred: false, notes: "" });

export function ProductForm({ product, mode = "create" }: Props) {
  const router = useRouter();
  const isEdit = mode === "edit" && Boolean(product);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<CurrencyState>({ baseCurrency: DEFAULT_CURRENCY, exchangeRates: [] });
  const [fields, setFields] = useState<ProductField[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierRows, setSupplierRows] = useState<SupplierRow[]>([]);
  const [removedLinkIds, setRemovedLinkIds] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [imageUrl, setImageUrl] = useState("");
  const [customValues, setCustomValues] = useState<Record<string, string>>(() => {
    const values: Record<string, string> = {};
    for (const item of product?.customFieldValues ?? []) values[item.fieldId] = typeof item.value === "object" ? JSON.stringify(item.value) : String(item.value ?? "");
    return values;
  });
  const [form, setForm] = useState({
    name: product?.name ?? "",
    category: product?.category ?? "",
    description: product?.description ?? "",
    price: String(product?.price ?? 0),
    quantity: String(product?.quantity ?? 0),
    lowStockLevel: String(product?.lowStockLevel ?? 5),
  });

  useEffect(() => {
    let active = true;
    Promise.all([
      apiFetch<Organization>("/api/organization").catch(() => null),
      apiFetch<ProductField[]>("/api/product-fields").catch(() => []),
      apiFetch<Supplier[]>("/api/suppliers").catch(() => []),
      product?.id ? apiFetch<ProductSupplierLink[]>(`/api/products/${product.id}/suppliers`).catch(() => []) : Promise.resolve([]),
    ]).then(([org, productFields, supplierList, links]) => {
      if (!active) return;
      const baseCurrency = normalizeCurrencyCode(org?.baseCurrency || DEFAULT_CURRENCY);
      setCurrency({ baseCurrency, exchangeRates: normalizeExchangeRates(org?.exchangeRates) });
      setFields(productFields.filter((field) => field.isActive).sort((a, b) => a.order - b.order));
      setSuppliers(supplierList.filter((supplier) => supplier.status !== "archived"));
      setSupplierRows(links.map((link) => ({
        rowId: link.id,
        linkId: link.id,
        supplierId: link.supplierId,
        supplierSku: link.supplierSku ?? "",
        cost: link.cost == null ? "" : String(link.cost),
        currency: normalizeCurrencyCode(link.supplier?.currency || link.currency || baseCurrency),
        minimumOrderQty: link.minimumOrderQty == null ? "" : String(link.minimumOrderQty),
        leadTimeDays: link.leadTimeDays == null ? "" : String(link.leadTimeDays),
        isPreferred: link.isPreferred,
        notes: link.notes ?? "",
      })));
    });
    return () => { active = false; };
  }, [product?.id]);

  const preferredRow = useMemo(() => supplierRows.find((row) => row.isPreferred) ?? supplierRows.find((row) => row.supplierId), [supplierRows]);
  const preferredSupplier = preferredRow ? suppliers.find((supplier) => supplier.id === preferredRow.supplierId) : undefined;
  const price = Number(form.price || 0);
  const preferredCost = preferredRow?.cost === "" || !preferredRow ? undefined : Number(preferredRow.cost);
  const costCurrency = preferredRow?.supplierId ? preferredRow.currency : undefined;
  const rate = costCurrency ? rateFor(costCurrency, currency) : undefined;
  const convertedCost = preferredCost === undefined || Number.isNaN(preferredCost) || rate === undefined ? undefined : Number((preferredCost * rate).toFixed(2));
  const margin = convertedCost === undefined ? "-" : calculateMargin(price, convertedCost);
  const linkedRows = supplierRows.filter((row) => row.supplierId);

  function addSupplierRow() { setSupplierRows((current) => [...current, { ...emptySupplier(currency.baseCurrency), isPreferred: current.length === 0 }]); }
  function updateSupplierRow(rowId: string, patch: Partial<SupplierRow>) { setSupplierRows((current) => current.map((row) => row.rowId === rowId ? { ...row, ...patch } : row)); }
  function makePreferred(rowId: string) { setSupplierRows((current) => current.map((row) => ({ ...row, isPreferred: row.rowId === rowId }))); }
  function selectSupplier(rowId: string, supplierId: string) {
    const supplier = suppliers.find((item) => item.id === supplierId);
    setSupplierRows((current) => current.map((row) => row.rowId === rowId ? {
      ...row,
      supplierId,
      currency: normalizeCurrencyCode(supplier?.currency || currency.baseCurrency),
      minimumOrderQty: row.minimumOrderQty || (supplier?.minimumOrderQty == null ? "" : String(supplier.minimumOrderQty)),
      leadTimeDays: row.leadTimeDays || (supplier?.leadTimeDays == null ? "" : String(supplier.leadTimeDays)),
    } : row));
  }
  function removeSupplierRow(rowId: string) {
    setSupplierRows((current) => {
      const row = current.find((item) => item.rowId === rowId);
      if (row?.linkId) setRemovedLinkIds((ids) => [...ids, row.linkId!]);
      const remaining = current.filter((item) => item.rowId !== rowId);
      if (row?.isPreferred && remaining.length > 0) remaining[0] = { ...remaining[0], isPreferred: true };
      return remaining;
    });
  }

  async function uploadImage(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        const result = await apiFetch<{ url: string }>("/api/products/images", { method: "POST", body });
        uploaded.push(result.url);
      }
      setImages((current) => [...current, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally { setUploading(false); }
  }

  function addImageUrl() {
    const url = imageUrl.trim();
    if (!url) return;
    try { new URL(url); } catch { setError("Enter a valid image URL"); return; }
    setImages((current) => [...current, url]);
    setImageUrl("");
  }

  async function saveProduct() {
    setError(null);
    if (!form.name.trim()) return setError("Product name is required.");
    if (hasDuplicateSupplier(supplierRows)) return setError("Each supplier can only be linked to this product once.");
    if (!Number.isFinite(price) || price < 0) return setError("Selling price must be zero or more.");
    if (!isEdit && Number(form.quantity) < 0) return setError("Initial quantity cannot be below zero.");
    const missingField = fields.find((field) => field.required && !String(customValues[field.id] ?? "").trim());
    if (missingField) return setError(`Product attribute "${missingField.label}" is required.`);

    const customFieldValues = fields.map((field) => {
      const value = parseFieldValue(field, customValues[field.id]);
      return value === undefined ? null : { fieldId: field.id, value };
    }).filter(Boolean);

    const payload = {
      name: form.name.trim(),
      category: form.category.trim() || undefined,
      description: form.description.trim() || undefined,
      price,
      priceCurrency: currency.baseCurrency,
      cost: preferredCost,
      costCurrency,
      exchangeRateToBase: rate,
      convertedCost,
      lowStockLevel: Number(form.lowStockLevel || 0),
      images,
      customFieldValues,
      ...(isEdit ? {} : { quantity: Number(form.quantity || 0) }),
    };

    setSaving(true);
    try {
      const saved = isEdit && product ? await apiFetch<Product>(`/api/products/${product.id}`, { method: "PATCH", body: JSON.stringify(payload) }) : await apiFetch<Product>("/api/products", { method: "POST", body: JSON.stringify(payload) });
      await saveProductSuppliers(saved.id);
      router.push(`/products/${saved.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isEdit ? "update" : "create"} product`);
    } finally { setSaving(false); }
  }

  async function saveProductSuppliers(productId: string) {
    for (const linkId of removedLinkIds) await apiFetch(`/api/products/${productId}/suppliers/${linkId}`, { method: "DELETE" });
    const validRows = supplierRows.filter((row) => row.supplierId);
    const preferredId = validRows.find((row) => row.isPreferred)?.rowId ?? validRows[0]?.rowId;
    for (const row of validRows) {
      const payload = {
        supplierId: row.supplierId,
        supplierSku: row.supplierSku.trim() || undefined,
        cost: row.cost === "" ? undefined : Number(row.cost),
        currency: row.currency,
        minimumOrderQty: row.minimumOrderQty === "" ? undefined : Number(row.minimumOrderQty),
        leadTimeDays: row.leadTimeDays === "" ? undefined : Number(row.leadTimeDays),
        isPreferred: row.rowId === preferredId,
        notes: row.notes.trim() || undefined,
      };
      if (row.linkId) await apiFetch(`/api/products/${productId}/suppliers/${row.linkId}`, { method: "PATCH", body: JSON.stringify(payload) });
      else await apiFetch(`/api/products/${productId}/suppliers`, { method: "POST", body: JSON.stringify(payload) });
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
      <main className="space-y-6">
        {error && <div className="border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"><AlertCircle className="mr-2 inline h-4 w-4" />{error}</div>}

        <section className="border bg-card/95">
          <SectionHeader icon={PackagePlus} title="Basic product details" description="Core identity used in catalog, imports, integrations, and search." />
          <div className="grid divide-y border-t lg:grid-cols-[0.95fr_1.05fr] lg:divide-x lg:divide-y-0">
            <div className="space-y-4 p-5">
              {isEdit && product?.sku && <ReadOnly label="Generated SKU" value={product.sku} />}
              <Field label="Product name" required><Input value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} placeholder="Example: Office chair" /></Field>
              <Field label="Category"><Input value={form.category} onChange={(e) => setForm((c) => ({ ...c, category: e.target.value }))} placeholder="Furniture, Parts, Raw materials..." /></Field>
            </div>
            <div className="p-5"><Field label="Description"><Textarea value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} className="min-h-40 resize-none" placeholder="Short useful description for team members, imports, and integrations." /></Field></div>
          </div>
        </section>

        <section className="border bg-card/95">
          <SectionHeader icon={Truck} title="Supplier cost source" description="Capture supplier cost before selling price. One preferred supplier becomes the official product cost source." action={<Button type="button" variant="outline" size="sm" onClick={addSupplierRow}><Plus className="h-4 w-4" />Add supplier</Button>} />
          <div className="grid divide-y border-t md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4">
            <Metric label="Preferred supplier" value={preferredSupplier?.supplierCode ?? "Not set"} />
            <Metric label="Supplier cost" value={preferredCost === undefined ? "Not set" : formatMoney(preferredCost, costCurrency ?? currency.baseCurrency)} />
            <Metric label="Converted cost" value={convertedCost === undefined ? "Not set" : formatMoney(convertedCost, currency.baseCurrency)} />
            <Metric label="Margin preview" value={margin} />
          </div>
          <div className="border-t">
            {supplierRows.length === 0 ? <EmptyState title="No suppliers linked" description="Add a supplier to capture cost price before setting the selling price." /> : <SupplierRows rows={supplierRows} suppliers={suppliers} currency={currency} price={price} onSelectSupplier={selectSupplier} onUpdate={updateSupplierRow} onPreferred={makePreferred} onRemove={removeSupplierRow} />}
          </div>
        </section>

        <section className="border bg-card/95">
          <SectionHeader icon={CircleDollarSign} title="Selling price and stock" description="Selling price inherits organization base currency. Cost is inherited from preferred supplier." />
          <div className="grid divide-y border-t md:grid-cols-2 md:divide-x md:divide-y-0">
            <div className="space-y-4 p-5">
              <ReadOnly label="Preferred converted cost" value={convertedCost === undefined ? "Set supplier cost first" : formatMoney(convertedCost, currency.baseCurrency)} />
              <Field label="Selling price" required><Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm((c) => ({ ...c, price: e.target.value }))} /></Field>
              <ReadOnly label="Selling currency" value={`${currency.baseCurrency} (base currency)`} />
            </div>
            <div className="space-y-4 p-5">
              {isEdit ? <ReadOnly label="Current stock" value={`${product?.quantity ?? 0} units`} /> : <Field label="Initial quantity" required><Input type="number" min="0" value={form.quantity} onChange={(e) => setForm((c) => ({ ...c, quantity: e.target.value }))} /></Field>}
              <Field label="Low-stock alert" required><Input type="number" min="0" value={form.lowStockLevel} onChange={(e) => setForm((c) => ({ ...c, lowStockLevel: e.target.value }))} /></Field>
              <ReadOnly label="Margin" value={margin} />
            </div>
          </div>
        </section>

        <section className="border bg-card/95">
          <SectionHeader icon={ImageIcon} title="Images" description="First image is used as the primary display image." />
          <div className="space-y-5 border-t p-5">
            <label className="flex cursor-pointer flex-col items-center justify-center border border-dashed bg-muted/20 p-8 text-center transition hover:bg-muted/45">
              {uploading ? <Loader2 className="mb-3 h-8 w-8 animate-spin" /> : <UploadCloud className="mb-3 h-8 w-8" />}
              <span className="text-sm font-medium">Upload product images</span>
              <span className="mt-1 text-xs text-muted-foreground">Use clear square images when possible.</span>
              <Input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={(event) => uploadImage(event.target.files)} />
            </label>
            <div className="grid gap-2 md:grid-cols-[1fr_auto]"><Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://example.com/product.jpg" /><Button type="button" variant="outline" onClick={addImageUrl}>Add image URL</Button></div>
            {images.length > 0 ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{images.map((image, index) => <div key={`${image}-${index}`} className="group relative overflow-hidden border bg-background"><img src={image} alt={`Product image ${index + 1}`} className="h-44 w-full object-cover" /><Badge className="absolute left-2 top-2 bg-background/90 text-foreground hover:bg-background/90">{index === 0 ? "Primary" : `Image ${index + 1}`}</Badge><button type="button" onClick={() => setImages((current) => current.filter((_, i) => i !== index))} className="absolute right-2 top-2 border bg-background/90 p-1.5"><Trash2 className="h-4 w-4" /></button></div>)}</div> : <EmptyState title="No images added" description="Upload files or paste an image URL." />}
          </div>
        </section>

        <section className="border bg-card/95">
          <SectionHeader icon={DatabaseZap} title="Product attributes" description="Custom fields keep the system flexible without cluttering the core product fields." />
          <div className="border-t p-5">{fields.length === 0 ? <EmptyState title="No custom attributes" description="Create product fields from the Product fields page when needed." /> : <div className="grid gap-4 md:grid-cols-2">{fields.map((field) => <Field key={field.id} label={field.label} required={field.required}><AttributeInput field={field} value={customValues[field.id] ?? ""} onChange={(value) => setCustomValues((current) => ({ ...current, [field.id]: value }))} /></Field>)}</div>}</div>
        </section>

        <section className="border bg-card/95">
          <SectionHeader icon={CheckCircle2} title="Review and save" description="Confirm supplier cost, converted cost, selling price, and stock before saving." />
          <div className="grid divide-y border-t md:grid-cols-2 md:divide-x md:divide-y-0">
            <div className="divide-y"><Review label="Product name" value={form.name || "Missing"} /><Review label="Category" value={form.category || "Uncategorized"} /><Review label="Suppliers" value={`${linkedRows.length}`} /><Review label="Images" value={`${images.length}`} /></div>
            <div className="divide-y"><Review label="Preferred supplier" value={preferredSupplier ? `${preferredSupplier.supplierCode} · ${preferredSupplier.name}` : "Not set"} /><Review label="Converted cost" value={convertedCost === undefined ? "Not set" : formatMoney(convertedCost, currency.baseCurrency)} /><Review label="Selling price" value={formatMoney(price, currency.baseCurrency)} /><Review label="Margin" value={margin} /></div>
          </div>
        </section>

        <section className="border bg-card/95"><div className="flex flex-col-reverse gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><Button type="button" variant="outline" onClick={() => router.push(isEdit && product ? `/products/${product.id}` : "/products")} disabled={saving}>Cancel</Button><Button type="button" onClick={saveProduct} disabled={saving || uploading}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? <Save className="h-4 w-4" /> : <PackagePlus className="h-4 w-4" />}{saving ? "Saving..." : isEdit ? "Update product" : "Create product"}</Button></div></section>
      </main>

      <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
        <section className="border bg-card/95"><SectionHeader icon={Warehouse} title="Cost summary" /><div className="divide-y border-t"><Side label="Preferred supplier" value={preferredSupplier?.supplierCode ?? "Not set"} /><Side label="Cost currency" value={costCurrency ?? "Not set"} /><Side label={`Converted cost (${currency.baseCurrency})`} value={convertedCost === undefined ? "-" : formatMoney(convertedCost, currency.baseCurrency)} /><Side label="Selling currency" value={currency.baseCurrency} /><Side label="Margin" value={margin} /></div></section>
        <section className="border bg-card/95"><SectionHeader icon={CheckCircle2} title="Readiness" /><div className="divide-y border-t"><Ready label="Basic details" ready={Boolean(form.name.trim())} /><Ready label="Supplier cost source" ready={!linkedRows.length || Boolean(preferredSupplier)} /><Ready label="Selling price" ready={price >= 0} /><Ready label="Inventory" ready={isEdit ? Number(form.lowStockLevel) >= 0 : Number(form.quantity) >= 0 && Number(form.lowStockLevel) >= 0} /></div></section>
      </aside>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, description, action }: { icon: any; title: string; description?: string; action?: React.ReactNode }) { return <div className="flex flex-row items-start justify-between gap-4 p-5"><div><h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><Icon className="h-5 w-5" />{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>{action}</div>; }
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) { return <label className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}{required && <span className="ml-1 text-destructive">*</span>}</Label>{children}</label>; }
function ReadOnly({ label, value }: { label: string; value: string }) { return <div className="border bg-muted/15 p-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p><p className="mt-2 text-sm font-medium text-foreground">{value}</p></div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="p-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p><p className="mt-2 truncate text-sm font-semibold text-foreground">{value}</p></div>; }
function Review({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4 p-4 text-sm"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div>; }
function Side({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div>; }
function Ready({ label, ready }: { label: string; ready: boolean }) { return <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm"><span className="flex items-center gap-2">{ready ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-amber-600" />}{label}</span><Badge variant={ready ? "default" : "secondary"}>{ready ? "Ready" : "Needed"}</Badge></div>; }
function EmptyState({ title, description }: { title: string; description: string }) { return <div className="border-dashed bg-muted/10 p-8 text-center"><p className="font-medium">{title}</p><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>; }

function SupplierRows({ rows, suppliers, currency, price, onSelectSupplier, onUpdate, onPreferred, onRemove }: { rows: SupplierRow[]; suppliers: Supplier[]; currency: CurrencyState; price: number; onSelectSupplier: (rowId: string, supplierId: string) => void; onUpdate: (rowId: string, patch: Partial<SupplierRow>) => void; onPreferred: (rowId: string) => void; onRemove: (rowId: string) => void }) {
  return <div className="divide-y">{rows.map((row) => <SupplierRowEditor key={row.rowId} row={row} suppliers={suppliers} currency={currency} price={price} onSelectSupplier={onSelectSupplier} onUpdate={onUpdate} onPreferred={onPreferred} onRemove={onRemove} />)}</div>;
}
function SupplierRowEditor({ row, suppliers, currency, price, onSelectSupplier, onUpdate, onPreferred, onRemove }: { row: SupplierRow; suppliers: Supplier[]; currency: CurrencyState; price: number; onSelectSupplier: (rowId: string, supplierId: string) => void; onUpdate: (rowId: string, patch: Partial<SupplierRow>) => void; onPreferred: (rowId: string) => void; onRemove: (rowId: string) => void }) {
  const selected = suppliers.find((supplier) => supplier.id === row.supplierId);
  const converted = convertedSupplierCost(row, currency);
  return <div className="grid gap-4 p-4 lg:grid-cols-[1.1fr_0.8fr_0.7fr_0.6fr_0.6fr_0.9fr_auto] lg:items-end"><Field label="Supplier"><select value={row.supplierId || ""} onChange={(event) => onSelectSupplier(row.rowId, event.target.value)} className="h-10 w-full border bg-background px-3 text-sm"><option value="">Choose supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.supplierCode} · {supplier.name}</option>)}</select>{selected && <p className="mt-1 font-mono text-xs text-muted-foreground">{selected.supplierCode}</p>}</Field><Field label="Supplier SKU"><Input value={row.supplierSku} onChange={(event) => onUpdate(row.rowId, { supplierSku: event.target.value })} /></Field><Field label="Cost"><Input type="number" min="0" step="0.01" value={row.cost} onChange={(event) => onUpdate(row.rowId, { cost: event.target.value })} /></Field><Field label="Currency"><div className="flex h-10 items-center border bg-muted/15 px-3 text-sm font-medium">{row.supplierId ? row.currency : "-"}</div></Field><Field label="MOQ"><Input type="number" min="0" value={row.minimumOrderQty} onChange={(event) => onUpdate(row.rowId, { minimumOrderQty: event.target.value })} /></Field><div className="space-y-1"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Converted</p><p className="text-sm font-medium">{converted === undefined ? "-" : formatMoney(converted, currency.baseCurrency)}</p><p className="text-xs text-muted-foreground">Margin {converted === undefined ? "-" : calculateMargin(price, converted)}</p></div><div className="flex gap-1"><Button type="button" size="sm" variant={row.isPreferred ? "default" : "outline"} onClick={() => onPreferred(row.rowId)}><Star className="h-4 w-4" /></Button><Button type="button" size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => onRemove(row.rowId)}><Trash2 className="h-4 w-4" /></Button></div></div>;
}

function AttributeInput({ field, value, onChange }: { field: ProductField; value: string; onChange: (value: string) => void }) {
  if (field.type === "select") return <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full border bg-background px-3 text-sm"><option value="">Select {field.label.toLowerCase()}</option>{(field.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}</select>;
  if (field.type === "boolean") return <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full border bg-background px-3 text-sm"><option value="">Select true or false</option><option value="true">True</option><option value="false">False</option></select>;
  if (field.type === "json") return <Textarea value={value} onChange={(event) => onChange(event.target.value)} className="min-h-24 font-mono text-sm" />;
  return <Input type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"} value={value} onChange={(event) => onChange(event.target.value)} />;
}

function convertedSupplierCost(row: SupplierRow, currency: CurrencyState) { const cost = row.cost === "" ? undefined : Number(row.cost); if (cost === undefined || Number.isNaN(cost)) return undefined; return Number((cost * rateFor(row.currency, currency)).toFixed(2)); }
function rateFor(code: string, state: CurrencyState) { const normalized = normalizeCurrencyCode(code || state.baseCurrency); if (normalized === state.baseCurrency) return 1; return state.exchangeRates.find((item) => item.code === normalized)?.rateToBase ?? 1; }
function calculateMargin(price: number, cost?: number) { if (!price || !cost) return "-"; return `${Math.round(((price - cost) / price) * 100)}%`; }
function parseFieldValue(field: ProductField, raw?: string) { if (raw === undefined || raw === null || String(raw).trim() === "") return undefined; if (field.type === "number") { const value = Number(raw); return Number.isNaN(value) ? undefined : value; } if (field.type === "boolean") return raw === "true"; if (field.type === "json") { try { return JSON.parse(raw); } catch { return raw; } } return raw; }
function hasDuplicateSupplier(rows: SupplierRow[]) { const seen = new Set<string>(); for (const row of rows) { if (!row.supplierId) continue; if (seen.has(row.supplierId)) return true; seen.add(row.supplierId); } return false; }
