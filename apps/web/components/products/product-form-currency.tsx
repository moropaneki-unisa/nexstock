"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, CircleDollarSign, DatabaseZap, ImageIcon, LinkIcon, Loader2, PackagePlus, Save, ShieldCheck, Star, Truck, UploadCloud, Warehouse, X } from "lucide-react";

import { normalizeExchangeRates, type Organization } from "@/components/organization/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { currencyOptions, DEFAULT_CURRENCY, formatMoney, normalizeCurrencyCode, normalizeCurrencyList } from "@/lib/currencies";
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

type FormValues = {
  name: string;
  category?: string;
  description?: string;
  price: number;
  priceCurrency: string;
  cost?: number | string;
  costCurrency: string;
  exchangeRateToBase?: number | string;
  quantity: number;
  lowStockLevel: number;
  imageUrl?: string;
  customFieldValues: Record<string, string>;
};

type SupplierFormState = {
  supplierId: string;
  supplierSku: string;
  cost: string;
  currency: string;
  minimumOrderQty: string;
  leadTimeDays: string;
  isPreferred: boolean;
  notes: string;
  linkId?: string;
};

type ImagePreview = { id: string; name: string; url: string };
type UploadResponse = { url: string; fileName: string; originalName: string; mimeType: string; size: number };
type ProductFormProps = { product?: Product; mode?: "create" | "edit" };
type StepId = "basics" | "pricing" | "suppliers" | "images" | "attributes" | "review";
type CurrencyState = { baseCurrency: string; enabledCurrencies: string[]; exchangeRates: Array<{ code: string; rateToBase: number }> };

const steps: Array<{ id: StepId; title: string; description: string }> = [
  { id: "basics", title: "Basic details", description: "Name, category, description" },
  { id: "pricing", title: "Pricing & stock", description: "Price, cost, stock" },
  { id: "suppliers", title: "Supplier", description: "Vendor cost sync" },
  { id: "images", title: "Images", description: "Upload or paste URLs" },
  { id: "attributes", title: "Attributes", description: "Custom product fields" },
  { id: "review", title: "Review", description: "Confirm and save" },
];

const emptySupplierForm: SupplierFormState = { supplierId: "", supplierSku: "", cost: "", currency: DEFAULT_CURRENCY, minimumOrderQty: "", leadTimeDays: "", isPreferred: true, notes: "" };

export function ProductForm({ product, mode = "create" }: ProductFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit" && Boolean(product);
  const [activeStep, setActiveStep] = useState<StepId>("basics");
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [attributeFields, setAttributeFields] = useState<ProductField[]>([]);
  const [attributesLoading, setAttributesLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [currency, setCurrency] = useState<CurrencyState>({ baseCurrency: DEFAULT_CURRENCY, enabledCurrencies: [DEFAULT_CURRENCY], exchangeRates: [] });
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierLinks, setSupplierLinks] = useState<ProductSupplierLink[]>([]);
  const [supplierForm, setSupplierForm] = useState<SupplierFormState>(emptySupplierForm);
  const [syncSupplierCost, setSyncSupplierCost] = useState(true);
  const [images, setImages] = useState<ImagePreview[]>(() => (product?.images ?? []).map((url, index) => ({ id: `existing-${index}-${url}`, name: `Image ${index + 1}`, url })));

  const existingCustomValues = useMemo(() => {
    const values: Record<string, string> = {};
    for (const item of product?.customFieldValues ?? []) values[item.fieldId] = formatAttributeInputValue(item.value);
    return values;
  }, [product?.customFieldValues]);

  const form = useForm<FormValues>({
    defaultValues: {
      name: product?.name ?? "",
      category: product?.category ?? "",
      description: product?.description ?? "",
      price: Number(product?.price ?? 0),
      priceCurrency: product?.priceCurrency || DEFAULT_CURRENCY,
      cost: product?.cost == null ? "" : Number(product.cost),
      costCurrency: product?.costCurrency || product?.priceCurrency || DEFAULT_CURRENCY,
      exchangeRateToBase: product?.exchangeRateToBase == null ? 1 : Number(product.exchangeRateToBase),
      quantity: product?.quantity ?? 0,
      lowStockLevel: product?.lowStockLevel ?? 5,
      imageUrl: "",
      customFieldValues: existingCustomValues,
    },
  });

  const { register, handleSubmit, setValue, watch, reset, trigger, formState: { isSubmitting, errors, isDirty } } = form;

  useEffect(() => {
    let active = true;
    apiFetch<Organization>("/api/organization")
      .then((org) => {
        if (!active) return;
        const baseCurrency = org.baseCurrency || DEFAULT_CURRENCY;
        const enabledCurrencies = normalizeCurrencyList(baseCurrency, org.enabledCurrencies ?? []);
        const exchangeRates = normalizeExchangeRates(org.exchangeRates);
        setCurrency({ baseCurrency, enabledCurrencies, exchangeRates });
        if (!product?.priceCurrency) setValue("priceCurrency", baseCurrency);
        if (!product?.costCurrency) setValue("costCurrency", baseCurrency);
        if (!product?.exchangeRateToBase) setValue("exchangeRateToBase", 1);
        setSupplierForm((current) => ({ ...current, currency: current.currency || baseCurrency }));
      })
      .catch(() => null);
    return () => { active = false; };
  }, [product?.costCurrency, product?.exchangeRateToBase, product?.priceCurrency, setValue]);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiFetch<Supplier[]>("/api/suppliers").catch(() => []),
      product?.id ? apiFetch<ProductSupplierLink[]>(`/api/products/${product.id}/suppliers`).catch(() => []) : Promise.resolve([]),
    ]).then(([supplierList, links]) => {
      if (!active) return;
      setSuppliers(supplierList.filter((supplier) => supplier.status !== "archived"));
      setSupplierLinks(links);
      const preferred = links.find((link) => link.isPreferred) ?? links[0];
      if (preferred) {
        setSupplierForm({
          linkId: preferred.id,
          supplierId: preferred.supplierId,
          supplierSku: preferred.supplierSku ?? "",
          cost: preferred.cost == null ? "" : String(preferred.cost),
          currency: normalizeCurrencyCode(preferred.currency || preferred.supplier?.currency || DEFAULT_CURRENCY),
          minimumOrderQty: preferred.minimumOrderQty == null ? "" : String(preferred.minimumOrderQty),
          leadTimeDays: preferred.leadTimeDays == null ? "" : String(preferred.leadTimeDays),
          isPreferred: preferred.isPreferred,
          notes: preferred.notes ?? "",
        });
      }
    });
    return () => { active = false; };
  }, [product?.id]);

  useEffect(() => {
    let active = true;
    apiFetch<ProductField[]>("/api/product-fields")
      .then((fields) => { if (active) setAttributeFields(fields.filter((field) => field.isActive).sort((a, b) => a.order - b.order)); })
      .catch(() => { if (active) setAttributeFields([]); })
      .finally(() => { if (active) setAttributesLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!product) return;
    reset({
      name: product.name,
      category: product.category ?? "",
      description: product.description ?? "",
      price: Number(product.price ?? 0),
      priceCurrency: product.priceCurrency || currency.baseCurrency,
      cost: product.cost == null ? "" : Number(product.cost),
      costCurrency: product.costCurrency || product.priceCurrency || currency.baseCurrency,
      exchangeRateToBase: product.exchangeRateToBase == null ? 1 : Number(product.exchangeRateToBase),
      quantity: product.quantity ?? 0,
      lowStockLevel: product.lowStockLevel ?? 5,
      imageUrl: "",
      customFieldValues: existingCustomValues,
    });
    setImages((product.images ?? []).map((url, index) => ({ id: `existing-${index}-${url}`, name: `Image ${index + 1}`, url })));
  }, [currency.baseCurrency, existingCustomValues, product, reset]);

  const customFieldValues = watch("customFieldValues");
  const imageUrl = watch("imageUrl");
  const name = watch("name");
  const category = watch("category");
  const description = watch("description");
  const price = Number(watch("price") ?? 0);
  const priceCurrency = watch("priceCurrency") || currency.baseCurrency;
  const cost = watch("cost") === "" ? undefined : Number(watch("cost") ?? 0);
  const costCurrency = watch("costCurrency") || priceCurrency;
  const exchangeRateToBase = Number(watch("exchangeRateToBase") || rateFor(costCurrency, currency));
  const convertedCost = cost === undefined ? undefined : Number((cost * exchangeRateToBase).toFixed(2));
  const quantity = Number(watch("quantity") ?? 0);
  const lowStockLevel = Number(watch("lowStockLevel") ?? 0);
  const displayedQuantity = isEdit ? Number(product?.quantity ?? 0) : quantity;
  const selectedSupplier = suppliers.find((supplier) => supplier.id === supplierForm.supplierId) ?? supplierLinks.find((link) => link.supplierId === supplierForm.supplierId)?.supplier;
  const supplierCost = supplierForm.cost === "" ? undefined : Number(supplierForm.cost);
  const supplierRate = rateFor(supplierForm.currency, currency);
  const supplierConvertedCost = supplierCost === undefined ? undefined : Number((supplierCost * supplierRate).toFixed(2));
  const supplierMargin = supplierConvertedCost === undefined ? "—" : calculateMargin(price, supplierConvertedCost);
  const productMargin = calculateMargin(price, convertedCost ?? cost);
  const requiredAttributeFields = attributeFields.filter((field) => field.required);
  const completedRequiredAttributeFields = requiredAttributeFields.filter((field) => String(customFieldValues?.[field.id] ?? "").trim() !== "").length;

  useEffect(() => {
    const nextRate = rateFor(costCurrency, currency);
    if (!product?.exchangeRateToBase && Number(watch("exchangeRateToBase") || 0) !== nextRate) setValue("exchangeRateToBase", nextRate, { shouldDirty: true });
  }, [costCurrency, currency, product?.exchangeRateToBase, setValue, watch]);

  const readiness = [
    { label: "Basic details", ready: Boolean(name?.trim()) },
    { label: "Selling price", ready: Number.isFinite(price) && price >= 0 },
    { label: "Currency setup", ready: Boolean(priceCurrency) && Boolean(costCurrency) },
    { label: "Supplier link", ready: !supplierForm.supplierId || Boolean(selectedSupplier?.supplierCode) },
    { label: "Inventory", ready: isEdit ? Number.isFinite(lowStockLevel) && lowStockLevel >= 0 : Number.isFinite(quantity) && quantity >= 0 && Number.isFinite(lowStockLevel) && lowStockLevel >= 0 },
    { label: "Required attributes", ready: completedRequiredAttributeFields === requiredAttributeFields.length },
  ];

  const currentIndex = steps.findIndex((step) => step.id === activeStep);
  const isFinalStep = activeStep === "review";

  async function goNext() {
    setError(null);
    if (activeStep === "basics" && !(await trigger("name"))) return;
    if (activeStep === "pricing") {
      const fieldsToValidate: Array<keyof FormValues> = isEdit ? ["price", "priceCurrency", "costCurrency", "lowStockLevel"] : ["price", "priceCurrency", "costCurrency", "quantity", "lowStockLevel"];
      if (!(await trigger(fieldsToValidate))) return;
    }
    setActiveStep(steps[Math.min(currentIndex + 1, steps.length - 1)].id);
  }

  function goBack() { setError(null); setActiveStep(steps[Math.max(currentIndex - 1, 0)].id); }

  function selectSupplier(supplierId: string) {
    const supplier = suppliers.find((item) => item.id === supplierId);
    setSupplierForm((current) => ({
      ...current,
      supplierId,
      linkId: supplierLinks.find((link) => link.supplierId === supplierId)?.id,
      currency: normalizeCurrencyCode(supplier?.currency || current.currency || currency.baseCurrency),
      leadTimeDays: current.leadTimeDays || (supplier?.leadTimeDays == null ? "" : String(supplier.leadTimeDays)),
      minimumOrderQty: current.minimumOrderQty || (supplier?.minimumOrderQty == null ? "" : String(supplier.minimumOrderQty)),
    }));
  }

  function applySupplierCostToProduct() {
    if (supplierCost === undefined || Number.isNaN(supplierCost)) return;
    setValue("cost", supplierCost, { shouldDirty: true });
    setValue("costCurrency", supplierForm.currency, { shouldDirty: true });
    setValue("exchangeRateToBase", supplierRate, { shouldDirty: true });
    setSyncSupplierCost(true);
  }

  function updateSupplierCost(value: string) {
    setSupplierForm((current) => ({ ...current, cost: value }));
    if (syncSupplierCost) {
      const numericCost = value === "" ? undefined : Number(value);
      setValue("cost", numericCost === undefined || Number.isNaN(numericCost) ? "" : numericCost, { shouldDirty: true });
      setValue("costCurrency", supplierForm.currency, { shouldDirty: true });
      setValue("exchangeRateToBase", rateFor(supplierForm.currency, currency), { shouldDirty: true });
    }
  }

  function updateSupplierCurrency(value: string) {
    setSupplierForm((current) => ({ ...current, currency: value }));
    if (syncSupplierCost) {
      setValue("costCurrency", value, { shouldDirty: true });
      setValue("exchangeRateToBase", rateFor(value, currency), { shouldDirty: true });
    }
  }

  async function handleImageUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true); setImageError(null);
    try {
      const uploaded: ImagePreview[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not an image file.`);
        if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name} is larger than 5MB.`);
        const formData = new FormData();
        formData.append("file", file);
        const result = await apiFetch<UploadResponse>("/api/products/images", { method: "POST", body: formData });
        uploaded.push({ id: result.fileName, name: result.originalName, url: result.url });
      }
      setImages((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Failed to upload image");
    } finally { setUploading(false); }
  }

  function addImageUrl() {
    const url = imageUrl?.trim();
    if (!url) return;
    try { new URL(url); } catch { setImageError("Enter a valid image URL"); return; }
    setImages((prev) => [...prev, { id: `url-${Date.now()}-${url}`, name: url, url }]);
    setImageError(null); setValue("imageUrl", "");
  }

  async function upsertProductSupplier(savedProductId: string) {
    if (!supplierForm.supplierId) return;
    const payload = {
      supplierId: supplierForm.supplierId,
      supplierSku: supplierForm.supplierSku.trim() || undefined,
      cost: supplierCost === undefined || Number.isNaN(supplierCost) ? undefined : supplierCost,
      currency: supplierForm.currency || currency.baseCurrency,
      minimumOrderQty: supplierForm.minimumOrderQty === "" ? undefined : Number(supplierForm.minimumOrderQty),
      leadTimeDays: supplierForm.leadTimeDays === "" ? undefined : Number(supplierForm.leadTimeDays),
      isPreferred: supplierForm.isPreferred,
      notes: supplierForm.notes.trim() || undefined,
    };
    const existingLinkId = supplierForm.linkId || supplierLinks.find((link) => link.supplierId === supplierForm.supplierId)?.id;
    if (existingLinkId) {
      await apiFetch(`/api/products/${savedProductId}/suppliers/${existingLinkId}`, { method: "PATCH", body: JSON.stringify(payload) });
    } else {
      await apiFetch(`/api/products/${savedProductId}/suppliers`, { method: "POST", body: JSON.stringify(payload) });
    }
  }

  async function onSubmit(values: FormValues) {
    setError(null);
    const missingRequiredField = requiredAttributeFields.find((field) => String(values.customFieldValues?.[field.id] ?? "").trim() === "");
    if (missingRequiredField) { setActiveStep("attributes"); setError(`Product attribute "${missingRequiredField.label}" is required.`); return; }

    const costValue = values.cost === undefined || values.cost === null || String(values.cost) === "" ? undefined : Number(values.cost);
    const rate = Number(values.exchangeRateToBase || rateFor(values.costCurrency, currency));
    const customFieldPayload = attributeFields.map((field) => {
      const value = parseCustomFieldValue(field, values.customFieldValues?.[field.id]);
      return value === undefined ? null : { fieldId: field.id, value };
    }).filter(Boolean);

    const basePayload = {
      name: values.name.trim(),
      category: values.category?.trim() || undefined,
      description: values.description?.trim() || undefined,
      price: Number(values.price),
      priceCurrency: values.priceCurrency || currency.baseCurrency,
      cost: costValue,
      costCurrency: costValue === undefined ? undefined : values.costCurrency,
      exchangeRateToBase: costValue === undefined ? undefined : rate,
      convertedCost: costValue === undefined ? undefined : Number((costValue * rate).toFixed(2)),
      lowStockLevel: Number(values.lowStockLevel),
      images: images.map((image) => image.url),
      customFieldValues: customFieldPayload,
    };
    const payload = isEdit ? basePayload : { ...basePayload, quantity: Number(values.quantity) };

    try {
      const savedProduct = isEdit && product
        ? await apiFetch<Product>(`/api/products/${product.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        : await apiFetch<Product>("/api/products", { method: "POST", body: JSON.stringify(payload) });
      if (savedProduct?.id && supplierForm.supplierId) await upsertProductSupplier(savedProduct.id);
      router.push(savedProduct?.id ? `/products/${savedProduct.id}` : "/products");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isEdit ? "update" : "create"} product`);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 xl:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        {error && <div className="border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"><AlertCircle className="mr-2 inline h-4 w-4" />{error}</div>}
        <section className="border bg-card/95"><div className="grid divide-y md:grid-cols-6 md:divide-x md:divide-y-0">{steps.map((step, index) => <button key={step.id} type="button" onClick={() => setActiveStep(step.id)} className={`p-4 text-left transition hover:bg-muted/40 ${activeStep === step.id ? "bg-primary/10" : ""}`}><div className="flex items-center gap-2"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${activeStep === step.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{index + 1}</span><span className="text-sm font-semibold">{step.title}</span></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{step.description}</p></button>)}</div></section>
        {activeStep === "basics" && <section className="border bg-card/95"><SectionHeader icon={PackagePlus} title="Basic product details" description="Start with the product identity customers and integrations will recognize." badge="Step 1" /><div className="grid divide-y border-t md:grid-cols-2 md:divide-x md:divide-y-0"><div className="divide-y">{isEdit && product?.sku && <ReadOnlyItem label="Generated SKU" value={product.sku} />}<Field label="Product name" required error={errors.name ? "Product name is required" : undefined}><Input className="rounded-xl" placeholder="Classic cotton t-shirt" {...register("name", { required: true })} /></Field><Field label="Category"><Input className="rounded-xl" placeholder="Apparel" {...register("category")} /></Field></div><div><Field label="Description"><Textarea placeholder="Describe the product, supplier notes, or important usage details." className="min-h-44 resize-none rounded-xl" {...register("description")} /></Field></div></div></section>}
        {activeStep === "pricing" && <section className="border bg-card/95"><SectionHeader icon={CircleDollarSign} title="Pricing, currency, and inventory" description={`Selling price uses ${currency.baseCurrency}. Product cost should match the preferred supplier cost when supplier sync is enabled.`} badge="Step 2" />{isEdit && <div className="border-t border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">Current stock is <strong>{product?.quantity ?? 0} units</strong>. Use Adjust stock on the product profile for stock movements.</div>}<div className="grid divide-y border-t md:grid-cols-2 md:divide-x md:divide-y-0"><div className="divide-y"><Field label="Selling price" required error={errors.price ? "Price is required" : undefined}><Input className="rounded-xl" type="number" step="0.01" min={0} placeholder="299.99" {...register("price", { required: true, valueAsNumber: true })} /></Field><Field label="Selling currency"><CurrencySelect value={priceCurrency} currencies={[currency.baseCurrency]} onChange={(value) => setValue("priceCurrency", value, { shouldDirty: true })} lockedText="Locked to organization base currency" /></Field><Field label="Product cost"><Input className="rounded-xl" type="number" step="0.01" min={0} placeholder="120.00" {...register("cost")} /></Field><Field label="Cost currency"><CurrencySelect value={costCurrency} currencies={currency.enabledCurrencies} onChange={(value) => { setValue("costCurrency", value, { shouldDirty: true }); setValue("exchangeRateToBase", rateFor(value, currency), { shouldDirty: true }); setSyncSupplierCost(false); }} /></Field></div><div className="divide-y"><Field label={`Exchange rate to ${currency.baseCurrency}`}><Input className="rounded-xl" type="number" min={0} step="0.0001" {...register("exchangeRateToBase")} onChange={(event) => { register("exchangeRateToBase").onChange(event); setSyncSupplierCost(false); }} /></Field><ReadOnlyItem label={`Converted cost in ${currency.baseCurrency}`} value={convertedCost === undefined ? "Not set" : formatMoney(convertedCost, currency.baseCurrency)} />{isEdit ? <ReadOnlyItem label="Current stock" value={`${product?.quantity ?? 0} units`} /> : <Field label="Initial quantity" required error={errors.quantity ? "Quantity is required" : undefined}><Input className="rounded-xl" type="number" min={0} placeholder="0" {...register("quantity", { required: true, valueAsNumber: true })} /></Field>}<Field label="Low-stock alert" required error={errors.lowStockLevel ? "Low stock alert is required" : undefined}><Input className="rounded-xl" type="number" min={0} placeholder="5" {...register("lowStockLevel", { required: true, valueAsNumber: true })} /></Field></div></div></section>}
        {activeStep === "suppliers" && <section className="border bg-card/95"><SectionHeader icon={Truck} title="Supplier and cost sync" description="Link the preferred supplier here. Supplier code is read-only, and the supplier cost can automatically drive product cost calculations." badge="Step 3" /><div className="border-t"><div className="grid divide-y md:grid-cols-2 md:divide-x md:divide-y-0"><div className="divide-y"><Field label="Supplier"><Select value={supplierForm.supplierId || "none"} onValueChange={(value) => selectSupplier(value === "none" ? "" : value)}><SelectTrigger className="rounded-xl"><SelectValue placeholder="Choose supplier" /></SelectTrigger><SelectContent><SelectItem value="none">No supplier linked</SelectItem>{suppliers.map((supplier) => <SelectItem key={supplier.id} value={supplier.id}>{supplier.supplierCode} · {supplier.name}</SelectItem>)}</SelectContent></Select></Field><ReadOnlyItem label="Supplier code" value={selectedSupplier?.supplierCode || "Choose supplier"} /><Field label="Supplier product SKU"><Input className="rounded-xl" value={supplierForm.supplierSku} onChange={(event) => setSupplierForm((current) => ({ ...current, supplierSku: event.target.value }))} placeholder="Vendor item code" /></Field><Field label="Preferred supplier"><label className="flex items-center gap-3 border bg-muted/15 p-4 text-sm"><input type="checkbox" checked={supplierForm.isPreferred} onChange={(event) => setSupplierForm((current) => ({ ...current, isPreferred: event.target.checked }))} /><span><span className="font-semibold">Mark as preferred</span><span className="block text-muted-foreground">Preferred supplier cost is used for product costing.</span></span></label></Field></div><div className="divide-y"><Field label="Supplier cost"><Input className="rounded-xl" type="number" min={0} step="0.01" value={supplierForm.cost} onChange={(event) => updateSupplierCost(event.target.value)} placeholder="0.00" /></Field><Field label="Supplier cost currency"><CurrencySelect value={supplierForm.currency} currencies={currency.enabledCurrencies} onChange={updateSupplierCurrency} /></Field><ReadOnlyItem label={`Supplier converted cost (${currency.baseCurrency})`} value={supplierConvertedCost === undefined ? "Not set" : formatMoney(supplierConvertedCost, currency.baseCurrency)} /><ReadOnlyItem label="Supplier margin" value={supplierMargin} /><Field label="MOQ / lead time"><div className="grid gap-3 sm:grid-cols-2"><Input className="rounded-xl" type="number" min={0} value={supplierForm.minimumOrderQty} onChange={(event) => setSupplierForm((current) => ({ ...current, minimumOrderQty: event.target.value }))} placeholder="MOQ" /><Input className="rounded-xl" type="number" min={0} value={supplierForm.leadTimeDays} onChange={(event) => setSupplierForm((current) => ({ ...current, leadTimeDays: event.target.value }))} placeholder="Lead time days" /></div></Field></div></div><div className="border-t p-5"><label className="mb-4 flex items-center gap-3 border bg-muted/15 p-4 text-sm"><input type="checkbox" checked={syncSupplierCost} onChange={(event) => setSyncSupplierCost(event.target.checked)} /><span><span className="font-semibold">Keep product cost matched with supplier cost</span><span className="block text-muted-foreground">When enabled, supplier cost, currency, exchange rate, and converted cost update the product costing fields.</span></span></label><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={applySupplierCostToProduct} disabled={supplierCost === undefined || Number.isNaN(supplierCost)} className="rounded-xl bg-background/70"><CheckCircle2 className="h-4 w-4" />Apply supplier cost to product</Button>{supplierForm.linkId && <Badge variant="secondary" className="px-3 py-2">Existing supplier link will be updated</Badge>}</div><Textarea className="mt-4 min-h-24 rounded-xl" value={supplierForm.notes} onChange={(event) => setSupplierForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Supplier notes, packaging rules, MOQ exceptions, cost assumptions..." /></div></div></section>}
        {activeStep === "images" && <section className="border bg-card/95"><SectionHeader icon={ImageIcon} title="Product images" description="Upload images or paste image URLs. The first image becomes primary." badge="Step 4" /><div className="space-y-5 border-t p-5">{imageError && <div className="border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{imageError}</div>}<label className="flex cursor-pointer flex-col items-center justify-center border border-dashed bg-muted/20 p-8 text-center transition hover:bg-muted/45">{uploading ? <Loader2 className="mb-3 h-8 w-8 animate-spin text-muted-foreground" /> : <UploadCloud className="mb-3 h-8 w-8 text-muted-foreground" />}<span className="text-sm font-medium">{uploading ? "Uploading images..." : "Upload product images"}</span><span className="mt-1 text-xs text-muted-foreground">JPG, PNG, WEBP, GIF. Max 5MB per file.</span><Input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" disabled={uploading} onChange={(event) => handleImageUpload(event.target.files)} /></label><div className="grid gap-2 md:grid-cols-[1fr_auto]"><div className="relative"><LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="rounded-xl pl-9" placeholder="https://example.com/product.jpg" {...register("imageUrl")} /></div><Button type="button" variant="outline" onClick={addImageUrl} className="rounded-xl bg-background/70">Add image URL</Button></div>{images.length > 0 ? <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">{images.map((image, index) => <div key={image.id} className="group relative overflow-hidden border bg-muted/30"><img src={image.url} alt={image.name} className="h-44 w-full object-cover transition group-hover:scale-105" /><div className="absolute left-2 top-2"><Badge className="bg-background/90 text-foreground hover:bg-background/90">{index === 0 ? "Primary" : `Image ${index + 1}`}</Badge></div><button type="button" onClick={() => setImages((prev) => prev.filter((item) => item.id !== image.id))} className="absolute right-2 top-2 bg-background/90 p-1.5 shadow-sm transition hover:bg-background" aria-label="Remove image"><X className="h-4 w-4" /></button><div className="border-t bg-background p-2"><p className="truncate text-xs text-muted-foreground">{image.name}</p></div></div>)}</div> : <div className="border border-dashed bg-muted/20 p-8 text-center"><ImageIcon className="mx-auto mb-2 h-7 w-7 text-muted-foreground" /><p className="text-sm font-medium">No images added yet</p></div>}</div></section>}
        {activeStep === "attributes" && <section className="border bg-card/95"><SectionHeader icon={DatabaseZap} title="Product attributes" description="Custom business attributes are saved against this product." badge={requiredAttributeFields.length > 0 ? `${completedRequiredAttributeFields}/${requiredAttributeFields.length} required` : "Optional"} /><div className="border-t p-5">{attributesLoading ? <div className="flex items-center gap-2 border bg-muted/20 p-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading product attributes...</div> : attributeFields.length === 0 ? <div className="border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground"><DatabaseZap className="mx-auto mb-2 h-7 w-7" /><p className="font-medium text-foreground">No custom attributes yet</p><Button asChild type="button" variant="outline" className="mt-5 rounded-xl bg-background/70"><Link href="/products/fields">Manage product attributes</Link></Button></div> : <div className="grid gap-4 md:grid-cols-2">{attributeFields.map((field) => <Field key={field.id} label={field.label} required={field.required}><AttributeInput field={field} value={customFieldValues?.[field.id] ?? ""} onChange={(value) => setValue(`customFieldValues.${field.id}`, value, { shouldDirty: true })} /></Field>)}</div>}</div></section>}
        {activeStep === "review" && <section className="border bg-card/95"><SectionHeader icon={ShieldCheck} title={isEdit ? "Review product changes" : "Review new product"} description="Confirm the product record before saving it to your catalog." badge="Final step" /><div className="grid divide-y border-t md:grid-cols-2 md:divide-x md:divide-y-0"><div className="divide-y"><ReviewLine label="Product name" value={name || "Missing"} /><ReviewLine label="Category" value={category || "Uncategorized"} /><ReviewLine label={`Price (${priceCurrency})`} value={formatMoney(price, priceCurrency)} /><ReviewLine label={cost === undefined ? "Product cost" : `Product cost (${costCurrency})`} value={cost === undefined ? "Not set" : formatMoney(cost, costCurrency)} /><ReviewLine label={`Converted cost (${currency.baseCurrency})`} value={convertedCost === undefined ? "Not set" : formatMoney(convertedCost, currency.baseCurrency)} /><ReviewLine label="Stock" value={`${displayedQuantity} units`} /></div><div className="divide-y"><ReviewLine label="Supplier" value={selectedSupplier ? `${selectedSupplier.supplierCode} · ${selectedSupplier.name}` : "Not linked"} /><ReviewLine label={supplierCost === undefined ? "Supplier cost" : `Supplier cost (${supplierForm.currency})`} value={supplierCost === undefined ? "Not set" : formatMoney(supplierCost, supplierForm.currency)} /><ReviewLine label={`Supplier converted cost (${currency.baseCurrency})`} value={supplierConvertedCost === undefined ? "Not set" : formatMoney(supplierConvertedCost, currency.baseCurrency)} /><ReviewLine label="Product margin" value={productMargin} /><ReviewLine label="Supplier margin" value={supplierMargin} /><div className="p-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Description</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{description || "No description"}</p></div></div></div></section>}
        <div className="flex flex-wrap items-center justify-between gap-3 border bg-card/95 p-4"><Button type="button" variant="outline" onClick={goBack} disabled={currentIndex === 0 || isSubmitting} className="rounded-xl bg-background/70"><ArrowLeft className="h-4 w-4" />Back</Button><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => router.push(isEdit && product ? `/products/${product.id}` : "/products")} disabled={isSubmitting} className="rounded-xl bg-background/70">Cancel</Button>{isFinalStep ? <Button type="submit" disabled={isSubmitting || uploading} className="rounded-xl">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? <Save className="h-4 w-4" /> : <PackagePlus className="h-4 w-4" />}{isSubmitting ? "Saving..." : isEdit ? "Update product" : "Create product"}</Button> : <Button type="button" onClick={goNext} disabled={isSubmitting} className="rounded-xl">Continue<ArrowRight className="h-4 w-4" /></Button>}</div></div>
      </div>
      <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start"><section className="border bg-card/95"><SectionHeader icon={ShieldCheck} title="Product readiness" description="Complete the essentials before saving." /><div className="divide-y border-t">{readiness.map((item) => <ReadinessLine key={item.label} ready={item.ready} label={item.label} />)}</div></section><section className="border bg-card/95"><SectionHeader icon={Warehouse} title={isEdit ? "Update summary" : "Create summary"} /><div className="divide-y border-t"><SideFact label="Product margin" value={productMargin} /><SideFact label="Supplier margin" value={supplierMargin} /><SideFact label={`Converted product cost (${currency.baseCurrency})`} value={convertedCost === undefined ? "—" : formatMoney(convertedCost, currency.baseCurrency)} /><SideFact label={`Supplier cost (${currency.baseCurrency})`} value={supplierConvertedCost === undefined ? "—" : formatMoney(supplierConvertedCost, currency.baseCurrency)} /><SideFact label="Supplier" value={selectedSupplier?.supplierCode || "Not linked"} /><SideFact label="Cost sync" value={syncSupplierCost ? "On" : "Off"} /></div></section>{selectedSupplier && <section className="border bg-card/95 p-5"><div className="flex items-center gap-2 text-sm font-semibold"><Star className="h-4 w-4 text-primary" />Preferred supplier</div><p className="mt-2 font-mono text-xs text-muted-foreground">{selectedSupplier.supplierCode}</p><p className="mt-1 text-sm font-medium">{selectedSupplier.name}</p></section>}{isDirty && <section className="border bg-card/95 p-5"><Badge variant="secondary">Unsaved changes</Badge><p className="mt-2 text-xs leading-5 text-muted-foreground">Product and supplier cost values will be saved together.</p></section>}</aside>
    </form>
  );
}

function CurrencySelect({ value, currencies, onChange, lockedText }: { value: string; currencies: string[]; onChange: (value: string) => void; lockedText?: string }) { return <div className="space-y-2"><Select value={value} onValueChange={onChange}><SelectTrigger className="rounded-xl"><SelectValue placeholder="Select currency" /></SelectTrigger><SelectContent>{currencies.map((code) => <SelectItem key={code} value={code}>{code} · {currencyOptions.find((item) => item.code === code)?.name ?? code}</SelectItem>)}</SelectContent></Select>{lockedText && <p className="text-xs text-muted-foreground">{lockedText}</p>}</div>; }
function SectionHeader({ icon: Icon, title, description, badge }: { icon: any; title: string; description?: string; badge?: string }) { return <div className="flex flex-row items-start justify-between gap-4 p-5"><div><h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><Icon className="h-5 w-5" />{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>{badge && <Badge variant="secondary">{badge}</Badge>}</div>; }
function ReadOnlyItem({ label, value }: { label: string; value: string }) { return <div className="p-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p><p className="mt-2 font-mono text-sm font-semibold">{value}</p></div>; }
function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: ReactNode }) { return <div className="p-4"><Label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}{required && <span className="ml-1 text-destructive">*</span>}</Label><div className="mt-3">{children}</div>{error && <p className="mt-2 text-xs text-destructive">{error}</p>}</div>; }
function AttributeInput({ field, value, onChange }: { field: ProductField; value: string; onChange: (value: string) => void }) { if (field.type === "select") return <Select value={value} onValueChange={onChange}><SelectTrigger className="rounded-xl"><SelectValue placeholder={`Select ${field.label.toLowerCase()}`} /></SelectTrigger><SelectContent>{(field.options ?? []).map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>; if (field.type === "boolean") return <Select value={value} onValueChange={onChange}><SelectTrigger className="rounded-xl"><SelectValue placeholder="Select true or false" /></SelectTrigger><SelectContent><SelectItem value="true">True</SelectItem><SelectItem value="false">False</SelectItem></SelectContent></Select>; if (field.type === "json") return <Textarea value={value} onChange={(event) => onChange(event.target.value)} className="min-h-24 resize-none rounded-xl font-mono text-sm" placeholder='{ "supplier": "Acme" }' />; return <Input className="rounded-xl" type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"} value={value} onChange={(event) => onChange(event.target.value)} />; }
function ReadinessLine({ ready, label }: { ready: boolean; label: string }) { return <div className="flex items-center justify-between gap-3 px-4 py-3"><span className="flex items-center gap-2 text-sm font-medium">{ready ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-amber-600" />}{label}</span><Badge variant={ready ? "default" : "secondary"}>{ready ? "Ready" : "Needed"}</Badge></div>; }
function SideFact({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div>; }
function ReviewLine({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4 p-4 text-sm"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div>; }
function calculateMargin(price: number, cost?: number) { if (!price || !cost) return "—"; return `${Math.round(((price - cost) / price) * 100)}%`; }
function rateFor(code: string, state: CurrencyState) { if (code === state.baseCurrency) return 1; return state.exchangeRates.find((rate) => rate.code === code)?.rateToBase ?? 1; }
function formatAttributeInputValue(value: unknown) { if (value === undefined || value === null) return ""; if (typeof value === "object") return JSON.stringify(value); return String(value); }
function parseCustomFieldValue(field: ProductField, rawValue?: string) { if (rawValue === undefined || rawValue === null || String(rawValue).trim() === "") return undefined; if (field.type === "number") { const value = Number(rawValue); return Number.isNaN(value) ? undefined : value; } if (field.type === "boolean") return rawValue === "true"; if (field.type === "json") { try { return JSON.parse(rawValue); } catch { return rawValue; } } return rawValue; }
