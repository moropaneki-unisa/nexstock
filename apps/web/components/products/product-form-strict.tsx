"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, CircleDollarSign, DatabaseZap, ImageIcon, Loader2, PackagePlus, Save, ShieldCheck, Truck, UploadCloud, Warehouse, X } from "lucide-react";

import { normalizeExchangeRates, type Organization } from "@/components/organization/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { DEFAULT_CURRENCY, formatMoney, normalizeCurrencyCode, normalizeCurrencyList } from "@/lib/currencies";
import type { Product, ProductField } from "@/lib/types";

type Supplier = {
  id: string;
  supplierCode: string;
  name: string;
  supplierType?: string | null;
  currency: string;
  leadTimeDays?: number | null;
  minimumOrderQty?: number | null;
  status: "active" | "archived";
};

type ProductSupplierLink = {
  id: string;
  supplierId: string;
  supplierSku?: string | null;
  cost?: string | number | null;
  currency: string;
  minimumOrderQty?: number | null;
  leadTimeDays?: number | null;
  isPreferred: boolean;
  notes?: string | null;
  supplier: Supplier;
};

type CurrencyState = { baseCurrency: string; enabledCurrencies: string[]; exchangeRates: Array<{ code: string; rateToBase: number }> };
type StepId = "basics" | "pricing" | "supplier" | "images" | "attributes" | "review";

type SupplierForm = {
  linkId?: string;
  supplierId: string;
  supplierSku: string;
  cost: string;
  currency: string;
  minimumOrderQty: string;
  leadTimeDays: string;
  isPreferred: boolean;
  notes: string;
};

type ProductFormStrictProps = { product?: Product; mode?: "create" | "edit" };

const steps: Array<{ id: StepId; title: string; description: string }> = [
  { id: "basics", title: "Basics", description: "Name and category" },
  { id: "pricing", title: "Pricing", description: "Base selling price" },
  { id: "supplier", title: "Supplier", description: "Cost source" },
  { id: "images", title: "Images", description: "Product media" },
  { id: "attributes", title: "Attributes", description: "Custom fields" },
  { id: "review", title: "Review", description: "Save product" },
];

const emptySupplier: SupplierForm = { supplierId: "", supplierSku: "", cost: "", currency: DEFAULT_CURRENCY, minimumOrderQty: "", leadTimeDays: "", isPreferred: true, notes: "" };

export function ProductForm({ product, mode = "create" }: ProductFormStrictProps) {
  const router = useRouter();
  const isEdit = mode === "edit" && Boolean(product);
  const [step, setStep] = useState<StepId>("basics");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<CurrencyState>({ baseCurrency: DEFAULT_CURRENCY, enabledCurrencies: [DEFAULT_CURRENCY], exchangeRates: [] });
  const [fields, setFields] = useState<ProductField[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierLinks, setSupplierLinks] = useState<ProductSupplierLink[]>([]);
  const [supplier, setSupplier] = useState<SupplierForm>(emptySupplier);
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
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

  const selectedSupplier = useMemo(() => suppliers.find((item) => item.id === supplier.supplierId) ?? supplierLinks.find((link) => link.supplierId === supplier.supplierId)?.supplier, [supplier.supplierId, supplierLinks, suppliers]);
  const price = Number(form.price || 0);
  const cost = supplier.cost === "" ? undefined : Number(supplier.cost);
  const costCurrency = supplier.supplierId ? supplier.currency : undefined;
  const rate = costCurrency ? rateFor(costCurrency, currency) : undefined;
  const convertedCost = cost === undefined || rate === undefined ? undefined : Number((cost * rate).toFixed(2));
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
      setCurrency({ baseCurrency, enabledCurrencies: normalizeCurrencyList(baseCurrency, org?.enabledCurrencies ?? []), exchangeRates: normalizeExchangeRates(org?.exchangeRates) });
      setFields(productFields.filter((field) => field.isActive).sort((a, b) => a.order - b.order));
      setSuppliers(supplierList.filter((item) => item.status !== "archived"));
      setSupplierLinks(links);
      const preferred = links.find((link) => link.isPreferred) ?? links[0];
      if (preferred) setSupplierFromLink(preferred, baseCurrency);
    });
    return () => { active = false; };
  }, [product?.id]);

  function setSupplierFromLink(link: ProductSupplierLink, baseCurrency: string) {
    setSupplier({
      linkId: link.id,
      supplierId: link.supplierId,
      supplierSku: link.supplierSku ?? "",
      cost: link.cost == null ? "" : String(link.cost),
      currency: normalizeCurrencyCode(link.supplier?.currency || link.currency || baseCurrency),
      minimumOrderQty: link.minimumOrderQty == null ? "" : String(link.minimumOrderQty),
      leadTimeDays: link.leadTimeDays == null ? "" : String(link.leadTimeDays),
      isPreferred: link.isPreferred,
      notes: link.notes ?? "",
    });
  }

  function selectSupplier(supplierId: string) {
    const item = suppliers.find((entry) => entry.id === supplierId);
    const existing = supplierLinks.find((link) => link.supplierId === supplierId);
    if (existing) return setSupplierFromLink(existing, currency.baseCurrency);
    setSupplier((current) => ({
      ...current,
      supplierId,
      linkId: undefined,
      currency: normalizeCurrencyCode(item?.currency || currency.baseCurrency),
      leadTimeDays: item?.leadTimeDays == null ? current.leadTimeDays : String(item.leadTimeDays),
      minimumOrderQty: item?.minimumOrderQty == null ? current.minimumOrderQty : String(item.minimumOrderQty),
    }));
  }

  async function uploadImage(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not an image file.`);
        const body = new FormData();
        body.append("file", file);
        const result = await apiFetch<{ url: string }>("/api/products/images", { method: "POST", body });
        uploaded.push(result.url);
      }
      setImages((current) => [...current, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploading(false);
    }
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

    const missingField = fields.find((field) => field.required && !String(customValues[field.id] ?? "").trim());
    if (missingField) {
      setStep("attributes");
      return setError(`Product attribute "${missingField.label}" is required.`);
    }

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
      cost,
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
      const saved = isEdit && product
        ? await apiFetch<Product>(`/api/products/${product.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        : await apiFetch<Product>("/api/products", { method: "POST", body: JSON.stringify(payload) });

      if (saved.id && supplier.supplierId) await saveProductSupplier(saved.id);
      router.push(`/products/${saved.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isEdit ? "update" : "create"} product`);
    } finally {
      setSaving(false);
    }
  }

  async function saveProductSupplier(productId: string) {
    const supplierCost = supplier.cost === "" ? undefined : Number(supplier.cost);
    const payload = {
      supplierId: supplier.supplierId,
      supplierSku: supplier.supplierSku.trim() || undefined,
      cost: supplierCost,
      currency: supplier.currency,
      minimumOrderQty: supplier.minimumOrderQty === "" ? undefined : Number(supplier.minimumOrderQty),
      leadTimeDays: supplier.leadTimeDays === "" ? undefined : Number(supplier.leadTimeDays),
      isPreferred: supplier.isPreferred,
      notes: supplier.notes.trim() || undefined,
    };
    if (supplier.linkId) await apiFetch(`/api/products/${productId}/suppliers/${supplier.linkId}`, { method: "PATCH", body: JSON.stringify(payload) });
    else await apiFetch(`/api/products/${productId}/suppliers`, { method: "POST", body: JSON.stringify(payload) });
  }

  const stepIndex = steps.findIndex((item) => item.id === step);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        {error && <div className="border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"><AlertCircle className="mr-2 inline h-4 w-4" />{error}</div>}

        <section className="border bg-card/95">
          <div className="grid divide-y md:grid-cols-6 md:divide-x md:divide-y-0">
            {steps.map((item, index) => <button key={item.id} type="button" onClick={() => setStep(item.id)} className={`p-4 text-left transition hover:bg-muted/40 ${step === item.id ? "bg-primary/10" : ""}`}><div className="flex items-center gap-2"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${step === item.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{index + 1}</span><span className="text-sm font-semibold">{item.title}</span></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{item.description}</p></button>)}
          </div>
        </section>

        {step === "basics" && <Panel icon={PackagePlus} title="Basic product details" badge="Step 1"><div className="grid divide-y md:grid-cols-2 md:divide-x md:divide-y-0"><div className="divide-y">{isEdit && product?.sku && <ReadOnly label="Generated SKU" value={product.sku} />}<Field label="Product name" required><Input value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} className="rounded-xl" /></Field><Field label="Category"><Input value={form.category} onChange={(e) => setForm((c) => ({ ...c, category: e.target.value }))} className="rounded-xl" /></Field></div><Field label="Description"><Textarea value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} className="min-h-44 rounded-xl" /></Field></div></Panel>}

        {step === "pricing" && <Panel icon={CircleDollarSign} title="Pricing and inventory" description={`Selling price is locked to ${currency.baseCurrency}. Cost is inherited from the selected supplier.`} badge="Step 2"><div className="grid divide-y md:grid-cols-2 md:divide-x md:divide-y-0"><div className="divide-y"><Field label="Selling price" required><Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm((c) => ({ ...c, price: e.target.value }))} className="rounded-xl" /></Field><ReadOnly label="Selling currency" value={`${currency.baseCurrency} (base currency)`} /><ReadOnly label="Product cost source" value={selectedSupplier ? `${selectedSupplier.supplierCode} · ${selectedSupplier.name}` : "Choose supplier in Supplier step"} /><ReadOnly label="Cost currency" value={costCurrency ? `${costCurrency} (supplier currency)` : "Not set"} /></div><div className="divide-y"><ReadOnly label="Product cost" value={cost === undefined ? "Not set" : formatMoney(cost, costCurrency ?? currency.baseCurrency)} /><ReadOnly label={`Converted cost (${currency.baseCurrency})`} value={convertedCost === undefined ? "Not set" : formatMoney(convertedCost, currency.baseCurrency)} />{isEdit ? <ReadOnly label="Current stock" value={`${product?.quantity ?? 0} units`} /> : <Field label="Initial quantity" required><Input type="number" min="0" value={form.quantity} onChange={(e) => setForm((c) => ({ ...c, quantity: e.target.value }))} className="rounded-xl" /></Field>}<Field label="Low-stock alert" required><Input type="number" min="0" value={form.lowStockLevel} onChange={(e) => setForm((c) => ({ ...c, lowStockLevel: e.target.value }))} className="rounded-xl" /></Field></div></div></Panel>}

        {step === "supplier" && <Panel icon={Truck} title="Supplier and inherited cost" description="Supplier currency is read-only from the supplier record. Product cost and currency inherit from this supplier." badge="Step 3"><div className="grid divide-y md:grid-cols-2 md:divide-x md:divide-y-0"><div className="divide-y"><Field label="Supplier"><Select value={supplier.supplierId || "none"} onValueChange={(value) => selectSupplier(value === "none" ? "" : value)}><SelectTrigger className="rounded-xl"><SelectValue placeholder="Choose supplier" /></SelectTrigger><SelectContent><SelectItem value="none">No supplier linked</SelectItem>{suppliers.map((item) => <SelectItem key={item.id} value={item.id}>{item.supplierCode} · {item.name}</SelectItem>)}</SelectContent></Select></Field><ReadOnly label="Supplier code" value={selectedSupplier?.supplierCode || "Choose supplier"} /><ReadOnly label="Supplier currency" value={selectedSupplier ? `${supplier.currency} (from supplier)` : "Choose supplier"} /><Field label="Supplier product SKU"><Input value={supplier.supplierSku} onChange={(e) => setSupplier((c) => ({ ...c, supplierSku: e.target.value }))} className="rounded-xl" /></Field><Field label="Preferred supplier"><label className="flex items-center gap-3 border bg-muted/15 p-4 text-sm"><input type="checkbox" checked={supplier.isPreferred} onChange={(e) => setSupplier((c) => ({ ...c, isPreferred: e.target.checked }))} /><span>Mark as preferred cost source</span></label></Field></div><div className="divide-y"><Field label={`Supplier cost (${supplier.currency})`}><Input type="number" min="0" step="0.01" value={supplier.cost} onChange={(e) => setSupplier((c) => ({ ...c, cost: e.target.value }))} className="rounded-xl" /></Field><ReadOnly label={`Exchange rate to ${currency.baseCurrency}`} value={rate ? String(rate) : "Not set"} /><ReadOnly label={`Converted cost (${currency.baseCurrency})`} value={convertedCost === undefined ? "Not set" : formatMoney(convertedCost, currency.baseCurrency)} /><ReadOnly label="Margin" value={margin} /><Field label="MOQ / lead time"><div className="grid gap-3 sm:grid-cols-2"><Input type="number" min="0" value={supplier.minimumOrderQty} onChange={(e) => setSupplier((c) => ({ ...c, minimumOrderQty: e.target.value }))} placeholder="MOQ" className="rounded-xl" /><Input type="number" min="0" value={supplier.leadTimeDays} onChange={(e) => setSupplier((c) => ({ ...c, leadTimeDays: e.target.value }))} placeholder="Lead days" className="rounded-xl" /></div></Field></div></div><div className="border-t p-5"><div className="border bg-emerald-50 p-4 text-sm text-emerald-900"><CheckCircle2 className="mr-2 inline h-4 w-4" />Product cost currency is inherited from supplier currency. Selling price remains in base currency.</div><Textarea value={supplier.notes} onChange={(e) => setSupplier((c) => ({ ...c, notes: e.target.value }))} className="mt-4 min-h-24 rounded-xl" placeholder="Supplier notes..." /></div></Panel>}

        {step === "images" && <Panel icon={ImageIcon} title="Product images" badge="Step 4"><div className="space-y-5 border-t p-5"><label className="flex cursor-pointer flex-col items-center justify-center border border-dashed bg-muted/20 p-8 text-center transition hover:bg-muted/45">{uploading ? <Loader2 className="mb-3 h-8 w-8 animate-spin" /> : <UploadCloud className="mb-3 h-8 w-8" />}<span className="text-sm font-medium">Upload product images</span><Input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={(event) => uploadImage(event.target.files)} /></label><div className="grid gap-2 md:grid-cols-[1fr_auto]"><Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://example.com/product.jpg" className="rounded-xl" /><Button type="button" variant="outline" onClick={addImageUrl} className="rounded-xl bg-background/70">Add image URL</Button></div>{images.length > 0 ? <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">{images.map((image, index) => <div key={`${image}-${index}`} className="group relative overflow-hidden border bg-muted/30"><img src={image} alt={`Product image ${index + 1}`} className="h-44 w-full object-cover" /><Badge className="absolute left-2 top-2 bg-background/90 text-foreground hover:bg-background/90">{index === 0 ? "Primary" : `Image ${index + 1}`}</Badge><button type="button" onClick={() => setImages((current) => current.filter((_, i) => i !== index))} className="absolute right-2 top-2 bg-background/90 p-1.5"><X className="h-4 w-4" /></button></div>)}</div> : <div className="border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">No images added yet</div>}</div></Panel>}

        {step === "attributes" && <Panel icon={DatabaseZap} title="Product attributes" badge="Step 5"><div className="grid gap-4 border-t p-5 md:grid-cols-2">{fields.length === 0 ? <div className="text-sm text-muted-foreground">No custom attributes configured.</div> : fields.map((field) => <Field key={field.id} label={field.label} required={field.required}><AttributeInput field={field} value={customValues[field.id] ?? ""} onChange={(value) => setCustomValues((current) => ({ ...current, [field.id]: value }))} /></Field>)}</div></Panel>}

        {step === "review" && <Panel icon={ShieldCheck} title="Review product" badge="Final"><div className="grid divide-y border-t md:grid-cols-2 md:divide-x md:divide-y-0"><div className="divide-y"><Review label="Name" value={form.name || "Missing"} /><Review label="Category" value={form.category || "Uncategorized"} /><Review label={`Selling price (${currency.baseCurrency})`} value={formatMoney(price, currency.baseCurrency)} /><Review label={costCurrency ? `Cost (${costCurrency})` : "Cost"} value={cost === undefined ? "Not set" : formatMoney(cost, costCurrency ?? currency.baseCurrency)} /><Review label={`Converted cost (${currency.baseCurrency})`} value={convertedCost === undefined ? "Not set" : formatMoney(convertedCost, currency.baseCurrency)} /></div><div className="divide-y"><Review label="Supplier" value={selectedSupplier ? `${selectedSupplier.supplierCode} · ${selectedSupplier.name}` : "Not linked"} /><Review label="Supplier product SKU" value={supplier.supplierSku || "Not set"} /><Review label="Margin" value={margin} /><Review label="Images" value={`${images.length}`} /><Review label="Low-stock alert" value={`${form.lowStockLevel} units`} /></div></div></Panel>}

        <div className="flex flex-wrap items-center justify-between gap-3 border bg-card/95 p-4"><Button type="button" variant="outline" onClick={() => setStep(steps[Math.max(stepIndex - 1, 0)].id)} disabled={stepIndex === 0 || saving} className="rounded-xl bg-background/70"><ArrowLeft className="h-4 w-4" />Back</Button><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => router.push(isEdit && product ? `/products/${product.id}` : "/products")} disabled={saving} className="rounded-xl bg-background/70">Cancel</Button>{step === "review" ? <Button type="button" onClick={saveProduct} disabled={saving || uploading} className="rounded-xl">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? <Save className="h-4 w-4" /> : <PackagePlus className="h-4 w-4" />}{saving ? "Saving..." : isEdit ? "Update product" : "Create product"}</Button> : <Button type="button" onClick={() => setStep(steps[Math.min(stepIndex + 1, steps.length - 1)].id)} disabled={saving} className="rounded-xl">Continue<ArrowRight className="h-4 w-4" /></Button>}</div></div>
      </div>

      <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start"><section className="border bg-card/95"><Header icon={ShieldCheck} title="Readiness" /><div className="divide-y border-t"><Ready label="Basic details" ready={Boolean(form.name.trim())} /><Ready label="Base selling price" ready={price >= 0} /><Ready label="Supplier cost source" ready={!supplier.supplierId || Boolean(selectedSupplier?.supplierCode)} /><Ready label="Inventory" ready={isEdit ? Number(form.lowStockLevel) >= 0 : Number(form.quantity) >= 0 && Number(form.lowStockLevel) >= 0} /></div></section><section className="border bg-card/95"><Header icon={Warehouse} title="Cost summary" /><div className="divide-y border-t"><Side label="Selling currency" value={currency.baseCurrency} /><Side label="Cost currency" value={costCurrency ?? "Not set"} /><Side label={`Converted cost (${currency.baseCurrency})`} value={convertedCost === undefined ? "-" : formatMoney(convertedCost, currency.baseCurrency)} /><Side label="Margin" value={margin} /><Side label="Supplier" value={selectedSupplier?.supplierCode || "Not linked"} /></div></section></aside>
    </div>
  );
}

function Panel({ icon, title, description, badge, children }: { icon: any; title: string; description?: string; badge?: string; children: React.ReactNode }) { return <section className="border bg-card/95"><Header icon={icon} title={title} description={description} badge={badge} />{children}</section>; }
function Header({ icon: Icon, title, description, badge }: { icon: any; title: string; description?: string; badge?: string }) { return <div className="flex items-start justify-between gap-4 p-5"><div><h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><Icon className="h-5 w-5" />{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>{badge && <Badge variant="secondary">{badge}</Badge>}</div>; }
function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) { return <div className="p-4"><Label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}{required && <span className="ml-1 text-destructive">*</span>}</Label><div className="mt-3">{children}</div></div>; }
function ReadOnly({ label, value }: { label: string; value: string }) { return <div className="p-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p><p className="mt-2 font-mono text-sm font-semibold">{value}</p></div>; }
function Review({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4 p-4 text-sm"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div>; }
function Ready({ label, ready }: { label: string; ready: boolean }) { return <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm"><span className="flex items-center gap-2">{ready ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-amber-600" />}{label}</span><Badge variant={ready ? "default" : "secondary"}>{ready ? "Ready" : "Needed"}</Badge></div>; }
function Side({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div>; }
function AttributeInput({ field, value, onChange }: { field: ProductField; value: string; onChange: (value: string) => void }) { if (field.type === "select") return <Select value={value} onValueChange={onChange}><SelectTrigger className="rounded-xl"><SelectValue placeholder={`Select ${field.label.toLowerCase()}`} /></SelectTrigger><SelectContent>{(field.options ?? []).map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>; if (field.type === "boolean") return <Select value={value} onValueChange={onChange}><SelectTrigger className="rounded-xl"><SelectValue placeholder="Select true or false" /></SelectTrigger><SelectContent><SelectItem value="true">True</SelectItem><SelectItem value="false">False</SelectItem></SelectContent></Select>; if (field.type === "json") return <Textarea value={value} onChange={(event) => onChange(event.target.value)} className="min-h-24 rounded-xl font-mono text-sm" />; return <Input className="rounded-xl" type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"} value={value} onChange={(event) => onChange(event.target.value)} />; }
function rateFor(code: string, state: CurrencyState) { const normalized = normalizeCurrencyCode(code || state.baseCurrency); if (normalized === state.baseCurrency) return 1; return state.exchangeRates.find((rate) => rate.code === normalized)?.rateToBase ?? 1; }
function calculateMargin(price: number, cost?: number) { if (!price || !cost) return "-"; return `${Math.round(((price - cost) / price) * 100)}%`; }
function parseFieldValue(field: ProductField, raw?: string) { if (raw === undefined || raw === null || String(raw).trim() === "") return undefined; if (field.type === "number") { const value = Number(raw); return Number.isNaN(value) ? undefined : value; } if (field.type === "boolean") return raw === "true"; if (field.type === "json") { try { return JSON.parse(raw); } catch { return raw; } } return raw; }
