"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, CircleDollarSign, DatabaseZap, ImageIcon, Loader2, PackagePlus, Plus, Save, ShieldCheck, Star, Trash2, Truck, UploadCloud, Warehouse, X } from "lucide-react";

import { normalizeExchangeRates, type Organization } from "@/components/organization/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { DEFAULT_CURRENCY, formatMoney, normalizeCurrencyCode } from "@/lib/currencies";
import type { Product, ProductField } from "@/lib/types";

type Supplier = { id: string; supplierCode: string; name: string; currency: string; leadTimeDays?: number | null; minimumOrderQty?: number | null; status: "active" | "archived" };
type ProductSupplierLink = { id: string; supplierId: string; supplierSku?: string | null; cost?: string | number | null; currency: string; minimumOrderQty?: number | null; leadTimeDays?: number | null; isPreferred: boolean; notes?: string | null; supplier: Supplier };
type CurrencyState = { baseCurrency: string; exchangeRates: Array<{ code: string; rateToBase: number }> };
type StepId = "basics" | "pricing" | "suppliers" | "images" | "attributes" | "review";
type SupplierRow = { rowId: string; linkId?: string; supplierId: string; supplierSku: string; cost: string; currency: string; minimumOrderQty: string; leadTimeDays: string; isPreferred: boolean; notes: string };
type Props = { product?: Product; mode?: "create" | "edit" };

const steps: Array<{ id: StepId; title: string; description: string }> = [
  { id: "basics", title: "Basics", description: "Identity" },
  { id: "pricing", title: "Pricing", description: "Sell price + stock" },
  { id: "suppliers", title: "Suppliers", description: "Costs + vendors" },
  { id: "images", title: "Images", description: "Media" },
  { id: "attributes", title: "Attributes", description: "Custom data" },
  { id: "review", title: "Review", description: "Confirm" },
];

function rowId() { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `row-${Date.now()}-${Math.random()}`; }
function emptySupplierRow(baseCurrency: string): SupplierRow { return { rowId: rowId(), supplierId: "", supplierSku: "", cost: "", currency: baseCurrency, minimumOrderQty: "", leadTimeDays: "", isPreferred: false, notes: "" }; }

export function ProductForm({ product, mode = "create" }: Props) {
  const router = useRouter();
  const isEdit = mode === "edit" && Boolean(product);
  const [step, setStep] = useState<StepId>("basics");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<CurrencyState>({ baseCurrency: DEFAULT_CURRENCY, exchangeRates: [] });
  const [fields, setFields] = useState<ProductField[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierRows, setSupplierRows] = useState<SupplierRow[]>([]);
  const [removedLinkIds, setRemovedLinkIds] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [customValues, setCustomValues] = useState<Record<string, string>>(() => {
    const values: Record<string, string> = {};
    for (const item of product?.customFieldValues ?? []) values[item.fieldId] = typeof item.value === "object" ? JSON.stringify(item.value) : String(item.value ?? "");
    return values;
  });
  const [form, setForm] = useState({ name: product?.name ?? "", category: product?.category ?? "", description: product?.description ?? "", price: String(product?.price ?? 0), quantity: String(product?.quantity ?? 0), lowStockLevel: String(product?.lowStockLevel ?? 5) });

  const preferredRow = useMemo(() => supplierRows.find((row) => row.isPreferred) ?? supplierRows.find((row) => row.supplierId), [supplierRows]);
  const preferredSupplier = preferredRow ? suppliers.find((supplier) => supplier.id === preferredRow.supplierId) : undefined;
  const linkedRows = supplierRows.filter((row) => row.supplierId);
  const price = Number(form.price || 0);
  const preferredCost = preferredRow?.cost === "" || !preferredRow ? undefined : Number(preferredRow.cost);
  const costCurrency = preferredRow?.supplierId ? preferredRow.currency : undefined;
  const rate = costCurrency ? rateFor(costCurrency, currency) : undefined;
  const convertedCost = preferredCost === undefined || Number.isNaN(preferredCost) || rate === undefined ? undefined : Number((preferredCost * rate).toFixed(2));
  const margin = convertedCost === undefined ? "-" : calculateMargin(price, convertedCost);

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
      setSupplierRows(links.map((link) => ({ rowId: link.id, linkId: link.id, supplierId: link.supplierId, supplierSku: link.supplierSku ?? "", cost: link.cost == null ? "" : String(link.cost), currency: normalizeCurrencyCode(link.supplier?.currency || link.currency || baseCurrency), minimumOrderQty: link.minimumOrderQty == null ? "" : String(link.minimumOrderQty), leadTimeDays: link.leadTimeDays == null ? "" : String(link.leadTimeDays), isPreferred: link.isPreferred, notes: link.notes ?? "" })));
    });
    return () => { active = false; };
  }, [product?.id]);

  function addSupplierRow() { setSupplierRows((current) => [...current, { ...emptySupplierRow(currency.baseCurrency), isPreferred: current.length === 0 }]); }
  function updateSupplierRow(rowId: string, patch: Partial<SupplierRow>) { setSupplierRows((current) => current.map((row) => row.rowId === rowId ? { ...row, ...patch } : row)); }
  function selectSupplier(rowId: string, supplierId: string) {
    const supplier = suppliers.find((item) => item.id === supplierId);
    setSupplierRows((current) => current.map((row) => row.rowId === rowId ? { ...row, supplierId, currency: normalizeCurrencyCode(supplier?.currency || currency.baseCurrency), minimumOrderQty: row.minimumOrderQty || (supplier?.minimumOrderQty == null ? "" : String(supplier.minimumOrderQty)), leadTimeDays: row.leadTimeDays || (supplier?.leadTimeDays == null ? "" : String(supplier.leadTimeDays)) } : row));
  }
  function makePreferred(rowId: string) { setSupplierRows((current) => current.map((row) => ({ ...row, isPreferred: row.rowId === rowId }))); }
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
    if (!Number.isFinite(price) || price < 0) return setError("Selling price must be zero or more.");
    if (!isEdit && Number(form.quantity) < 0) return setError("Initial quantity cannot be below zero.");
    if (hasDuplicateSupplier(supplierRows)) return setError("Each supplier can only be linked to this product once.");
    const missingField = fields.find((field) => field.required && !String(customValues[field.id] ?? "").trim());
    if (missingField) { setStep("attributes"); return setError(`Product attribute "${missingField.label}" is required.`); }

    const customFieldValues = fields.map((field) => { const value = parseFieldValue(field, customValues[field.id]); return value === undefined ? null : { fieldId: field.id, value }; }).filter(Boolean);
    const payload = { name: form.name.trim(), category: form.category.trim() || undefined, description: form.description.trim() || undefined, price, priceCurrency: currency.baseCurrency, cost: preferredCost, costCurrency, exchangeRateToBase: rate, convertedCost, lowStockLevel: Number(form.lowStockLevel || 0), images, customFieldValues, ...(isEdit ? {} : { quantity: Number(form.quantity || 0) }) };

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
      const payload = { supplierId: row.supplierId, supplierSku: row.supplierSku.trim() || undefined, cost: row.cost === "" ? undefined : Number(row.cost), currency: row.currency, minimumOrderQty: row.minimumOrderQty === "" ? undefined : Number(row.minimumOrderQty), leadTimeDays: row.leadTimeDays === "" ? undefined : Number(row.leadTimeDays), isPreferred: row.rowId === preferredId, notes: row.notes.trim() || undefined };
      if (row.linkId) await apiFetch(`/api/products/${productId}/suppliers/${row.linkId}`, { method: "PATCH", body: JSON.stringify(payload) });
      else await apiFetch(`/api/products/${productId}/suppliers`, { method: "POST", body: JSON.stringify(payload) });
    }
  }

  const stepIndex = steps.findIndex((item) => item.id === step);

  return <div className="grid gap-6 xl:grid-cols-[1fr_22rem]"><div className="space-y-6">{error && <Card className="border-destructive/30 bg-destructive/10"><CardContent className="p-4 text-sm text-destructive"><AlertCircle className="mr-2 inline h-4 w-4" />{error}</CardContent></Card>}<Card><CardContent className="p-0"><div className="grid divide-y md:grid-cols-6 md:divide-x md:divide-y-0">{steps.map((item, index) => <button key={item.id} type="button" onClick={() => setStep(item.id)} className={`p-4 text-left transition hover:bg-muted/40 ${step === item.id ? "bg-primary/10" : ""}`}><div className="flex items-center gap-2"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${step === item.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{index + 1}</span><span className="text-sm font-semibold">{item.title}</span></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{item.description}</p></button>)}</div></CardContent></Card>

  {step === "basics" && <Panel icon={PackagePlus} title="Basic product details" description="Only product identity belongs here." badge="Step 1"><div className="grid gap-4 md:grid-cols-2"><div className="space-y-4">{isEdit && product?.sku && <ReadOnly label="Generated SKU" value={product.sku} />}<Field label="Product name" required><Input value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} /></Field><Field label="Category"><Input value={form.category} onChange={(e) => setForm((c) => ({ ...c, category: e.target.value }))} /></Field></div><Field label="Description"><Textarea value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} className="min-h-44" /></Field></div></Panel>}

  {step === "pricing" && <Panel icon={CircleDollarSign} title="Selling price and inventory" description="This stage is only for what you sell for and stock settings. Supplier costs are handled in the Suppliers stage." badge="Step 2"><div className="grid gap-4 md:grid-cols-2"><div className="space-y-4"><Field label="Selling price" required><Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm((c) => ({ ...c, price: e.target.value }))} /></Field><ReadOnly label="Selling currency" value={`${currency.baseCurrency} (base currency)`} /></div><div className="space-y-4">{isEdit ? <ReadOnly label="Current stock" value={`${product?.quantity ?? 0} units`} /> : <Field label="Initial quantity" required><Input type="number" min="0" value={form.quantity} onChange={(e) => setForm((c) => ({ ...c, quantity: e.target.value }))} /></Field>}<Field label="Low-stock alert" required><Input type="number" min="0" value={form.lowStockLevel} onChange={(e) => setForm((c) => ({ ...c, lowStockLevel: e.target.value }))} /></Field></div></div></Panel>}

  {step === "suppliers" && <Panel icon={Truck} title="Supplier costing" description="All vendor/cost work is here. One preferred supplier drives official product cost." badge="Step 3"><div className="space-y-4"><div className="grid gap-3 md:grid-cols-4"><SummaryCard label="Preferred supplier" value={preferredSupplier?.supplierCode ?? "Not set"} detail={preferredSupplier?.name ?? "Choose one supplier as preferred"} /><SummaryCard label="Preferred cost" value={preferredCost === undefined ? "Not set" : formatMoney(preferredCost, costCurrency ?? currency.baseCurrency)} detail={costCurrency ? `Supplier currency: ${costCurrency}` : "Inherited from supplier"} /><SummaryCard label="Converted cost" value={convertedCost === undefined ? "Not set" : formatMoney(convertedCost, currency.baseCurrency)} detail={`Base currency: ${currency.baseCurrency}`} /><SummaryCard label="Margin" value={margin} detail="Based on preferred cost" /></div><div className="flex flex-wrap items-center justify-between gap-3"><div className="text-sm text-muted-foreground">Add multiple suppliers for comparison. Only the preferred row becomes product cost.</div><Button type="button" variant="outline" onClick={addSupplierRow}><Plus className="h-4 w-4" />Add supplier</Button></div>{supplierRows.length === 0 ? <Card className="border-dashed"><CardContent className="p-8 text-center text-sm text-muted-foreground">No suppliers linked yet.</CardContent></Card> : <SupplierRowsTable rows={supplierRows} suppliers={suppliers} currency={currency} price={price} onSelectSupplier={selectSupplier} onUpdate={updateSupplierRow} onPreferred={makePreferred} onRemove={removeSupplierRow} />}</div></Panel>}

  {step === "images" && <Panel icon={ImageIcon} title="Product images" description="Only image upload and image URLs belong here." badge="Step 4"><div className="space-y-5"><label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 p-8 text-center transition hover:bg-muted/45">{uploading ? <Loader2 className="mb-3 h-8 w-8 animate-spin" /> : <UploadCloud className="mb-3 h-8 w-8" />}<span className="text-sm font-medium">Upload product images</span><Input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={(event) => uploadImage(event.target.files)} /></label><div className="grid gap-2 md:grid-cols-[1fr_auto]"><Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://example.com/product.jpg" /><Button type="button" variant="outline" onClick={addImageUrl}>Add image URL</Button></div>{images.length > 0 ? <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">{images.map((image, index) => <Card key={`${image}-${index}`} className="group relative overflow-hidden"><img src={image} alt={`Product image ${index + 1}`} className="h-44 w-full object-cover" /><Badge className="absolute left-2 top-2 bg-background/90 text-foreground hover:bg-background/90">{index === 0 ? "Primary" : `Image ${index + 1}`}</Badge><button type="button" onClick={() => setImages((current) => current.filter((_, i) => i !== index))} className="absolute right-2 top-2 rounded-md bg-background/90 p-1.5"><X className="h-4 w-4" /></button></Card>)}</div> : <Card className="border-dashed"><CardContent className="p-8 text-center text-sm text-muted-foreground">No images added yet</CardContent></Card>}</div></Panel>}

  {step === "attributes" && <Panel icon={DatabaseZap} title="Product attributes" description="Only custom product fields belong here." badge="Step 5"><div className="grid gap-4 md:grid-cols-2">{fields.length === 0 ? <div className="text-sm text-muted-foreground">No custom attributes configured.</div> : fields.map((field) => <Field key={field.id} label={field.label} required={field.required}><AttributeInput field={field} value={customValues[field.id] ?? ""} onChange={(value) => setCustomValues((current) => ({ ...current, [field.id]: value }))} /></Field>)}</div></Panel>}

  {step === "review" && <Panel icon={ShieldCheck} title="Review product" description="Summary only. Go back to the matching stage to edit." badge="Final"><div className="grid gap-4 md:grid-cols-2"><Card><CardHeader><CardTitle>Product</CardTitle><CardDescription>Identity, selling price, and stock</CardDescription></CardHeader><CardContent className="space-y-3"><Review label="Name" value={form.name || "Missing"} /><Review label="Category" value={form.category || "Uncategorized"} /><Review label={`Selling price (${currency.baseCurrency})`} value={formatMoney(price, currency.baseCurrency)} /><Review label="Stock" value={isEdit ? `${product?.quantity ?? 0} units` : `${form.quantity || 0} units`} /><Review label="Low-stock alert" value={`${form.lowStockLevel} units`} /></CardContent></Card><Card><CardHeader><CardTitle>Supplier costing</CardTitle><CardDescription>{linkedRows.length} supplier link{linkedRows.length === 1 ? "" : "s"}</CardDescription></CardHeader><CardContent className="space-y-3"><Review label="Preferred" value={preferredSupplier ? `${preferredSupplier.supplierCode} · ${preferredSupplier.name}` : "Not set"} /><Review label={costCurrency ? `Preferred cost (${costCurrency})` : "Preferred cost"} value={preferredCost === undefined ? "Not set" : formatMoney(preferredCost, costCurrency ?? currency.baseCurrency)} /><Review label={`Converted cost (${currency.baseCurrency})`} value={convertedCost === undefined ? "Not set" : formatMoney(convertedCost, currency.baseCurrency)} /><Review label="Margin" value={margin} /><Review label="Images" value={`${images.length}`} /></CardContent></Card></div></Panel>}

  <Card><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><Button type="button" variant="outline" onClick={() => setStep(steps[Math.max(stepIndex - 1, 0)].id)} disabled={stepIndex === 0 || saving}><ArrowLeft className="h-4 w-4" />Back</Button><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => router.push(isEdit && product ? `/products/${product.id}` : "/products")} disabled={saving}>Cancel</Button>{step === "review" ? <Button type="button" onClick={saveProduct} disabled={saving || uploading}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? <Save className="h-4 w-4" /> : <PackagePlus className="h-4 w-4" />}{saving ? "Saving..." : isEdit ? "Update product" : "Create product"}</Button> : <Button type="button" onClick={() => setStep(steps[Math.min(stepIndex + 1, steps.length - 1)].id)} disabled={saving}>Continue<ArrowRight className="h-4 w-4" /></Button>}</div></CardContent></Card></div><aside className="space-y-6 xl:sticky xl:top-24 xl:self-start"><Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Readiness</CardTitle></CardHeader><CardContent className="space-y-2"><Ready label="Basic details" ready={Boolean(form.name.trim())} /><Ready label="Selling price" ready={price >= 0} /><Ready label="Supplier cost source" ready={!linkedRows.length || Boolean(preferredSupplier)} /><Ready label="Inventory" ready={isEdit ? Number(form.lowStockLevel) >= 0 : Number(form.quantity) >= 0 && Number(form.lowStockLevel) >= 0} /></CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><Warehouse className="h-5 w-5" />Cost summary</CardTitle><CardDescription>Read-only summary from the Suppliers stage</CardDescription></CardHeader><CardContent className="space-y-3"><Side label="Selling currency" value={currency.baseCurrency} /><Side label="Preferred cost currency" value={costCurrency ?? "Not set"} /><Side label={`Converted cost (${currency.baseCurrency})`} value={convertedCost === undefined ? "-" : formatMoney(convertedCost, currency.baseCurrency)} /><Side label="Margin" value={margin} /><Side label="Suppliers" value={`${linkedRows.length}`} /></CardContent></Card></aside></div>;
}

function SupplierRowsTable({ rows, suppliers, currency, price, onSelectSupplier, onUpdate, onPreferred, onRemove }: { rows: SupplierRow[]; suppliers: Supplier[]; currency: CurrencyState; price: number; onSelectSupplier: (rowId: string, supplierId: string) => void; onUpdate: (rowId: string, patch: Partial<SupplierRow>) => void; onPreferred: (rowId: string) => void; onRemove: (rowId: string) => void }) {
  return <Card><Table><TableHeader><TableRow><TableHead>Cost source</TableHead><TableHead>Supplier</TableHead><TableHead>Supplier SKU</TableHead><TableHead>Cost</TableHead><TableHead>Currency</TableHead><TableHead>Converted</TableHead><TableHead>MOQ</TableHead><TableHead>Lead</TableHead><TableHead /></TableRow></TableHeader><TableBody>{rows.map((row) => { const selected = suppliers.find((supplier) => supplier.id === row.supplierId); const cost = row.cost === "" ? undefined : Number(row.cost); const converted = cost === undefined || Number.isNaN(cost) ? undefined : Number((cost * rateFor(row.currency, currency)).toFixed(2)); return <TableRow key={row.rowId} className={row.isPreferred ? "bg-primary/5" : undefined}><TableCell><Button type="button" size="sm" variant={row.isPreferred ? "default" : "outline"} onClick={() => onPreferred(row.rowId)}><Star className="h-4 w-4" />{row.isPreferred ? "Preferred" : "Use"}</Button></TableCell><TableCell className="min-w-[16rem]"><Select value={row.supplierId || "none"} onValueChange={(value) => onSelectSupplier(row.rowId, value === "none" ? "" : value)}><SelectTrigger><SelectValue placeholder="Choose supplier" /></SelectTrigger><SelectContent><SelectItem value="none">Choose supplier</SelectItem>{suppliers.map((supplier) => <SelectItem key={supplier.id} value={supplier.id}>{supplier.supplierCode} · {supplier.name}</SelectItem>)}</SelectContent></Select>{selected && <p className="mt-1 font-mono text-xs text-muted-foreground">{selected.supplierCode}</p>}</TableCell><TableCell><Input value={row.supplierSku} onChange={(event) => onUpdate(row.rowId, { supplierSku: event.target.value })} placeholder="Vendor SKU" /></TableCell><TableCell><Input type="number" min="0" step="0.01" value={row.cost} onChange={(event) => onUpdate(row.rowId, { cost: event.target.value })} placeholder="0.00" /></TableCell><TableCell><Badge variant="secondary">{row.supplierId ? row.currency : "-"}</Badge></TableCell><TableCell>{converted === undefined ? "-" : <div><p className="font-medium">{formatMoney(converted, currency.baseCurrency)}</p><p className="text-xs text-muted-foreground">Margin {calculateMargin(price, converted)}</p></div>}</TableCell><TableCell><Input className="w-20" type="number" min="0" value={row.minimumOrderQty} onChange={(event) => onUpdate(row.rowId, { minimumOrderQty: event.target.value })} /></TableCell><TableCell><Input className="w-20" type="number" min="0" value={row.leadTimeDays} onChange={(event) => onUpdate(row.rowId, { leadTimeDays: event.target.value })} /></TableCell><TableCell><Button type="button" size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => onRemove(row.rowId)}><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>; })}</TableBody></Table></Card>;
}

function Panel({ icon, title, description, badge, children }: { icon: any; title: string; description?: string; badge?: string; children: ReactNode }) { return <Card><CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle className="flex items-center gap-2"><IconWrap icon={icon} />{title}</CardTitle>{description && <CardDescription className="mt-1">{description}</CardDescription>}</div>{badge && <Badge variant="secondary">{badge}</Badge>}</div></CardHeader><CardContent>{children}</CardContent></Card>; }
function IconWrap({ icon: Icon }: { icon: any }) { return <Icon className="h-5 w-5" />; }
function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) { return <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}{required && <span className="ml-1 text-destructive">*</span>}</Label>{children}</div>; }
function ReadOnly({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border bg-muted/20 p-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p><p className="mt-2 font-mono text-sm font-semibold">{value}</p></div>; }
function SummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) { return <Card><CardContent className="p-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p><p className="mt-2 text-lg font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></CardContent></Card>; }
function Review({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4 text-sm"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div>; }
function Ready({ label, ready }: { label: string; ready: boolean }) { return <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"><span className="flex items-center gap-2">{ready ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-amber-600" />}{label}</span><Badge variant={ready ? "default" : "secondary"}>{ready ? "Ready" : "Needed"}</Badge></div>; }
function Side({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div>; }
function AttributeInput({ field, value, onChange }: { field: ProductField; value: string; onChange: (value: string) => void }) { if (field.type === "select") return <Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue placeholder={`Select ${field.label.toLowerCase()}`} /></SelectTrigger><SelectContent>{(field.options ?? []).map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>; if (field.type === "boolean") return <Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue placeholder="Select true or false" /></SelectTrigger><SelectContent><SelectItem value="true">True</SelectItem><SelectItem value="false">False</SelectItem></SelectContent></Select>; if (field.type === "json") return <Textarea value={value} onChange={(event) => onChange(event.target.value)} className="min-h-24 font-mono text-sm" />; return <Input type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"} value={value} onChange={(event) => onChange(event.target.value)} />; }
function rateFor(code: string, state: CurrencyState) { const normalized = normalizeCurrencyCode(code || state.baseCurrency); if (normalized === state.baseCurrency) return 1; return state.exchangeRates.find((item) => item.code === normalized)?.rateToBase ?? 1; }
function calculateMargin(price: number, cost?: number) { if (!price || !cost) return "-"; return `${Math.round(((price - cost) / price) * 100)}%`; }
function parseFieldValue(field: ProductField, raw?: string) { if (raw === undefined || raw === null || String(raw).trim() === "") return undefined; if (field.type === "number") { const value = Number(raw); return Number.isNaN(value) ? undefined : value; } if (field.type === "boolean") return raw === "true"; if (field.type === "json") { try { return JSON.parse(raw); } catch { return raw; } } return raw; }
function hasDuplicateSupplier(rows: SupplierRow[]) { const seen = new Set<string>(); for (const row of rows) { if (!row.supplierId) continue; if (seen.has(row.supplierId)) return true; seen.add(row.supplierId); } return false; }
