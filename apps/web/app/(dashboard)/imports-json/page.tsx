"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, DatabaseZap, FileJson, FileImage, Loader2, PackagePlus, ShieldCheck, Trash2, UploadCloud } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { apiFetch } from "@/lib/api";

type StepId = "upload" | "fields" | "mapping" | "validate" | "import";
type FieldType = "text" | "number" | "boolean" | "select" | "date" | "json";
type CoreTarget = "ignore" | "name" | "category" | "description" | "price" | "cost" | "quantity" | "lowStockLevel" | "images";
type Target = CoreTarget | "customField";
type ProductField = { id: string; key: string; label: string; type: FieldType };
type JsonRecord = Record<string, unknown>;
type DetectedField = { id: string; key: string; label: string; sample: unknown; active: boolean; target: Target; productFieldId?: string; productFieldType?: FieldType };
type ProductPayload = { name: string; category?: string; description?: string; price: number; cost?: number; quantity: number; lowStockLevel: number; images?: string[]; customFieldValues?: Array<{ fieldId: string; value: unknown }> };

const steps: Array<{ id: StepId; title: string; description: string }> = [
  { id: "upload", title: "Configuration", description: "Upload JSON" },
  { id: "fields", title: "Detected fields", description: "Review fields" },
  { id: "mapping", title: "Mapping", description: "Map JSON keys" },
  { id: "validate", title: "Validation", description: "Check records" },
  { id: "import", title: "Import", description: "Create products" },
];

const coreTargets: Array<{ value: CoreTarget; label: string; required?: boolean }> = [
  { value: "ignore", label: "Ignore field" },
  { value: "name", label: "Product name", required: true },
  { value: "category", label: "Category" },
  { value: "description", label: "Description" },
  { value: "price", label: "Price", required: true },
  { value: "cost", label: "Cost" },
  { value: "quantity", label: "Quantity", required: true },
  { value: "lowStockLevel", label: "Low-stock level" },
  { value: "images", label: "Images" },
];

const coreTargetValues = new Set<Target>(["name", "category", "description", "price", "cost", "quantity", "lowStockLevel", "images"]);
const requiredTargets: CoreTarget[] = ["name", "price", "quantity"];

export default function JsonImportPage() {
  const [step, setStep] = useState<StepId>("upload");
  const [fileName, setFileName] = useState<string | null>(null);
  const [records, setRecords] = useState<JsonRecord[]>([]);
  const [fields, setFields] = useState<DetectedField[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingFields, setCreatingFields] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const activeFields = fields.filter((field) => field.active);
  const customFields = activeFields.filter((field) => field.target === "customField" && field.productFieldId);
  const imageField = activeFields.find((field) => field.target === "images");
  const missingRequired = requiredTargets.filter((target) => !activeFields.some((field) => field.target === target));
  const validation = useMemo(() => validate(records, fields), [records, fields]);
  const products = useMemo(() => buildProducts(records, fields), [records, fields]);
  const imageCount = products.reduce((sum, product) => sum + (product.images?.length ?? 0), 0);
  const stepIndex = steps.findIndex((item) => item.id === step);
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);

  async function handleFile(file?: File) {
    setError(null);
    setNotice(null);
    setResult(null);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json")) return setError("Please upload a .json file for JSON import.");

    setLoading(true);
    try {
      const parsed = JSON.parse(await file.text());
      const list = normalizeJsonRecords(parsed);
      if (!list.length) throw new Error("JSON file must contain an array of product objects or an object with a products/items array.");
      const keys = Array.from(new Set(list.flatMap((record) => Object.keys(record))));
      setFileName(file.name);
      setRecords(list);
      setFields(keys.map((key) => ({ id: key, key, label: key, sample: firstValue(list, key), active: true, target: autoMapKey(key) })));
      setStep("fields");
      setNotice(`${keys.length} JSON fields detected. Image fields will map to product images, not CSV import.`);
      toast.success("JSON fields detected", { description: `${list.length} product records ready for review.` });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not parse JSON file";
      setError(message);
      toast.error("JSON import failed", { description: message });
    } finally {
      setLoading(false);
    }
  }

  function updateField(id: string, updates: Partial<DetectedField>) {
    setFields((current) => current.map((field) => field.id === id ? { ...field, ...updates } : field));
    setError(null);
    setNotice(null);
  }

  async function ensureCustomFields() {
    setCreatingFields(true);
    setError(null);
    try {
      const existing = await apiFetch<ProductField[]>("/api/product-fields").catch(() => []);
      const existingByKey = new Map(existing.map((field) => [normalizeKey(field.key || field.label), field]));
      let created = 0;
      let reused = 0;
      const nextFields: DetectedField[] = [];

      for (const field of fields) {
        if (!field.active || coreTargetValues.has(field.target)) {
          nextFields.push(field);
          continue;
        }
        const key = generateFieldKey(field.label || field.key);
        const existingField = existingByKey.get(normalizeKey(key));
        if (existingField) {
          reused += 1;
          nextFields.push({ ...field, target: "customField", productFieldId: existingField.id, productFieldType: existingField.type });
          continue;
        }
        const createdField = await apiFetch<ProductField>("/api/product-fields", {
          method: "POST",
          body: JSON.stringify({ label: field.label.trim() || field.key, type: inferFieldType(field.sample), required: false, options: [], order: existing.length + created + 1, isActive: true }),
        });
        created += 1;
        nextFields.push({ ...field, target: "customField", productFieldId: createdField.id, productFieldType: createdField.type });
      }

      setFields(nextFields);
      setNotice(`${created} custom attribute${created === 1 ? "" : "s"} created and ${reused} reused. JSON image fields stayed mapped to product images.`);
      if (created || reused) toast.success("JSON fields prepared", { description: `${created} created, ${reused} reused.` });
    } finally {
      setCreatingFields(false);
    }
  }

  async function goNext() {
    setError(null);
    if (!records.length) return setError("Upload a JSON file first.");
    if (step === "fields") await ensureCustomFields();
    if (step === "mapping" && missingRequired.length > 0) return setError(`Map required fields first: ${missingRequired.map(getCoreLabel).join(", ")}.`);
    if (step === "validate" && validation.errors.length > 0) return setError("Fix validation issues before importing.");
    setStep(steps[Math.min(stepIndex + 1, steps.length - 1)].id);
  }

  function goBack() {
    setError(null);
    setStep(steps[Math.max(stepIndex - 1, 0)].id);
  }

  async function runImport() {
    if (validation.errors.length > 0) return setError("Fix validation issues before importing.");
    setImporting(true);
    let created = 0;
    let failed = 0;
    try {
      for (const product of products) {
        try {
          await apiFetch("/api/products", { method: "POST", body: JSON.stringify(product) });
          created += 1;
        } catch {
          failed += 1;
        }
      }
      setResult({ created, failed });
      if (failed) toast.error("JSON import completed with issues", { description: `${created} created, ${failed} failed.` });
      else toast.success("JSON products imported", { description: `${created} products created with ${imageCount} image URLs.` });
    } finally {
      setImporting(false);
    }
  }

  return (
    <PageShell className="max-w-full space-y-6 overflow-x-hidden pb-10">
      <PageHeader eyebrow="JSON Import" title="Product JSON import" description="Upload product JSON, map object keys, parse image arrays or strings, create custom attributes, validate, and import products." actions={<Button asChild variant="outline" className="w-full rounded-xl bg-background/70 sm:w-auto"><Link href="/integrations"><ArrowLeft className="h-4 w-4" />Back to integrations</Link></Button>} />

      {error && <div className="border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"><AlertCircle className="mr-2 inline h-4 w-4" />{error}</div>}
      {notice && <div className="border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}

      <section className="border bg-card/95"><div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4"><Metric icon={FileJson} label="File" value={fileName ?? "Not selected"} helper="JSON source" /><Metric icon={DatabaseZap} label="Detected keys" value={fields.length} helper={`${activeFields.length} active`} /><Metric icon={FileImage} label="Images" value={imageCount} helper={imageField ? `Mapped from ${imageField.label}` : "No image key"} /><Metric icon={PackagePlus} label="Custom attributes" value={customFields.length} helper="Auto-mapped" /></div></section>

      <section className="border bg-card/95"><div className="grid divide-y sm:grid-cols-2 md:grid-cols-5 md:divide-x md:divide-y-0">{steps.map((item, index) => <button key={item.id} type="button" onClick={() => records.length && setStep(item.id)} className={`p-4 text-left transition hover:bg-muted/40 ${step === item.id ? "bg-primary/10" : ""}`}><div className="flex items-center gap-2"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${step === item.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{index + 1}</span><span className="text-sm font-semibold">{item.title}</span></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{item.description}</p></button>)}</div><div className="border-t p-5"><div className="flex items-center justify-between gap-4 text-sm"><span className="font-medium">Import progress</span><span className="font-semibold">{progress}%</span></div><div className="mt-3 h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} /></div></div></section>

      <section className="grid gap-6 xl:grid-cols-[1fr_22rem]"><main className="space-y-6">{step === "upload" && <UploadJson loading={loading} fileName={fileName} onFile={handleFile} />}{step === "fields" && <Fields fields={fields} updateField={updateField} />}{step === "mapping" && <Mapping fields={activeFields} updateField={updateField} missingRequired={missingRequired} />}{step === "validate" && <Validate validation={validation} products={products} />}{step === "import" && <ImportPanel products={products} result={result} importing={importing} onImport={runImport} />}</main><aside className="space-y-6"><section className="border bg-card/95"><SectionHeader icon={CheckCircle2} title="JSON readiness" /><Readiness label="JSON uploaded" ready={records.length > 0} /><Readiness label="Image keys mapped" ready={!imageField || imageCount >= 0} /><Readiness label="Required fields mapped" ready={missingRequired.length === 0} /><Readiness label="Records validated" ready={validation.errors.length === 0 && validation.validRows > 0} /></section><section className="border bg-card/95"><SectionHeader icon={ShieldCheck} title="JSON formats supported" /><div className="space-y-2 border-t p-4 text-xs text-muted-foreground"><code className="block break-all border bg-muted/30 p-2">[{"{ name, price, quantity, images: [...] }"}]</code><code className="block break-all border bg-muted/30 p-2">{"{ products: [...] }"}</code><code className="block break-all border bg-muted/30 p-2">{"{ items: [...] }"}</code></div></section></aside></section>

      <div className="flex flex-col-reverse justify-between gap-3 border bg-card/95 p-4 sm:flex-row"><Button type="button" variant="outline" onClick={goBack} disabled={step === "upload" || creatingFields} className="rounded-xl bg-background/70">Back</Button>{step === "import" ? <Button asChild className="rounded-xl"><Link href="/products">Go to products<ArrowRight className="h-4 w-4" /></Link></Button> : <Button type="button" onClick={goNext} disabled={!records.length || creatingFields} className="rounded-xl">{creatingFields ? <><Loader2 className="h-4 w-4 animate-spin" />Creating fields...</> : <>Continue<ArrowRight className="h-4 w-4" /></>}</Button>}</div>
    </PageShell>
  );
}

function UploadJson({ loading, fileName, onFile }: { loading: boolean; fileName: string | null; onFile: (file?: File) => void }) { return <section className="border bg-card/95"><SectionHeader icon={UploadCloud} title="JSON configuration" description="Upload a JSON array of product objects, or an object with products/items array." badge="JSON" /><div className="border-t p-5"><label className="flex cursor-pointer flex-col items-center justify-center border border-dashed bg-muted/20 p-8 text-center transition hover:bg-muted/45 sm:p-10">{loading ? <Loader2 className="mb-3 h-10 w-10 animate-spin text-muted-foreground" /> : <FileJson className="mb-3 h-10 w-10 text-muted-foreground" />}<span className="text-sm font-semibold">{loading ? "Reading JSON..." : fileName ?? "Upload JSON file"}</span><span className="mt-1 text-sm text-muted-foreground">Required: name, price, quantity. Optional: images array/string.</span><Input type="file" accept=".json,application/json" className="hidden" disabled={loading} onChange={(event) => onFile(event.target.files?.[0])} /></label></div></section>; }
function Fields({ fields, updateField }: { fields: DetectedField[]; updateField: (id: string, updates: Partial<DetectedField>) => void }) { return <section className="border bg-card/95"><SectionHeader icon={DatabaseZap} title="Detected JSON fields" description="Review keys. Image keys stay product images; other non-core keys become custom attributes." badge={`${fields.filter((field) => field.active).length}/${fields.length} active`} /><div className="grid divide-y border-t md:grid-cols-2 md:divide-x md:divide-y-0"><div className="divide-y">{fields.filter((_, index) => index % 2 === 0).map((field) => <FieldRow key={field.id} field={field} updateField={updateField} />)}</div><div className="divide-y">{fields.filter((_, index) => index % 2 === 1).map((field) => <FieldRow key={field.id} field={field} updateField={updateField} />)}</div></div></section>; }
function FieldRow({ field, updateField }: { field: DetectedField; updateField: (id: string, updates: Partial<DetectedField>) => void }) { return <div className={`p-4 ${!field.active ? "bg-muted/30 opacity-70" : ""}`}><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{field.key}</p><Badge variant={field.active ? "default" : "secondary"}>{field.active ? "Active" : "Removed"}</Badge>{field.target !== "ignore" && <Badge variant="outline">{getTargetLabel(field)}</Badge>}</div>{field.active ? <Button type="button" variant="ghost" size="sm" className="rounded-xl text-destructive hover:text-destructive" onClick={() => updateField(field.id, { active: false, target: "ignore" })}><Trash2 className="h-4 w-4" />Remove</Button> : <Button type="button" variant="outline" size="sm" className="rounded-xl bg-background/70" onClick={() => updateField(field.id, { active: true, target: autoMapKey(field.label) })}>Restore</Button>}</div><label className="mt-4 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Display name</label><Input className="mt-2 rounded-xl" value={field.label} disabled={!field.active} onChange={(event) => updateField(field.id, { label: event.target.value, productFieldId: undefined })} /><p className="mt-2 truncate text-sm text-muted-foreground">Sample: {formatSample(field.sample)}</p></div>; }
function Mapping({ fields, updateField, missingRequired }: { fields: DetectedField[]; updateField: (id: string, updates: Partial<DetectedField>) => void; missingRequired: CoreTarget[] }) { return <section className="border bg-card/95"><SectionHeader icon={DatabaseZap} title="Map JSON keys" description="Images map to product images. Created attributes stay auto-mapped." badge={missingRequired.length ? `${missingRequired.length} missing` : "Ready"} /><div className="divide-y border-t">{fields.map((field) => <div key={field.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_18rem] md:items-center"><div className="min-w-0"><p className="truncate font-medium">{field.label}</p><p className="mt-1 truncate text-xs text-muted-foreground">Key: {field.key} · Sample: {formatSample(field.sample)}</p>{field.target === "images" && <p className="mt-1 text-xs text-emerald-700">Images are parsed into the product images array.</p>}{field.productFieldId && <p className="mt-1 text-xs text-emerald-700">Custom attribute created and auto-mapped.</p>}</div><select value={field.target} onChange={(event) => updateField(field.id, { target: event.target.value as Target })} className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25">{coreTargets.map((target) => <option key={target.value} value={target.value}>{target.label}{target.required ? " *" : ""}</option>)}{field.productFieldId && <option value="customField">Custom attribute: {field.label}</option>}</select></div>)}</div></section>; }
function Validate({ validation, products }: { validation: { validRows: number; errors: string[] }; products: ProductPayload[] }) { return <section className="border bg-card/95"><SectionHeader icon={ShieldCheck} title="Validate JSON import" description="Review mapped product records before import." badge={validation.errors.length ? `${validation.errors.length} issues` : "Ready"} /><div className="grid divide-y border-t md:grid-cols-3 md:divide-x md:divide-y-0"><Metric icon={CheckCircle2} label="Records ready" value={validation.validRows} helper="Valid products" /><Metric icon={PackagePlus} label="Products" value={products.length} helper="Prepared payloads" /><Metric icon={FileImage} label="Images" value={products.reduce((sum, product) => sum + (product.images?.length ?? 0), 0)} helper="Image URLs" /></div>{validation.errors.length ? <div className="divide-y border-t">{validation.errors.slice(0, 12).map((item, index) => <div key={index} className="p-4 text-sm text-destructive">{item}</div>)}</div> : <Preview products={products.slice(0, 8)} />}</section>; }
function ImportPanel({ products, result, importing, onImport }: { products: ProductPayload[]; result: { created: number; failed: number } | null; importing: boolean; onImport: () => void }) { return <section className="border bg-card/95"><SectionHeader icon={PackagePlus} title="Create products" description="Create products from validated JSON records." badge={`${products.length} products`} />{result && <div className="border-t p-4 text-sm"><p className="font-semibold">JSON import complete</p><p className="mt-1 text-muted-foreground">{result.created} created, {result.failed} failed.</p></div>}<div className="border-t p-5"><Button type="button" onClick={onImport} disabled={importing || products.length === 0} className="w-full rounded-xl sm:w-auto">{importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}Import JSON products</Button></div></section>; }
function SectionHeader({ icon: Icon, title, description, badge }: { icon: any; title: string; description?: string; badge?: string }) { return <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5"><div className="min-w-0"><h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><Icon className="h-5 w-5 shrink-0" />{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>{badge && <Badge variant="secondary" className="w-fit shrink-0">{badge}</Badge>}</div>; }
function Metric({ icon: Icon, label, value, helper }: { icon: any; label: string; value: string | number; helper: string }) { return <div className="flex items-center justify-between p-4"><div className="min-w-0"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 truncate text-xl font-semibold capitalize">{value}</p><p className="mt-1 truncate text-xs text-muted-foreground">{helper}</p></div><span className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span></div>; }
function Readiness({ label, ready }: { label: string; ready: boolean }) { return <div className="flex items-center justify-between border-t px-4 py-3 text-sm"><span>{label}</span><Badge variant={ready ? "default" : "secondary"}>{ready ? "Ready" : "Needed"}</Badge></div>; }
function Preview({ products }: { products: ProductPayload[] }) { return <div className="max-w-full overflow-x-auto border-t"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">Quantity</TableHead><TableHead className="text-right">Images</TableHead><TableHead className="text-right">Custom</TableHead></TableRow></TableHeader><TableBody>{products.map((product, index) => <TableRow key={`${product.name}-${index}`}><TableCell className="min-w-[12rem]">{product.name}</TableCell><TableCell className="text-right">{product.price}</TableCell><TableCell className="text-right">{product.quantity}</TableCell><TableCell className="text-right">{product.images?.length ?? 0}</TableCell><TableCell className="text-right">{product.customFieldValues?.length ?? 0}</TableCell></TableRow>)}</TableBody></Table></div>; }
function normalizeJsonRecords(value: unknown): JsonRecord[] { const source = Array.isArray(value) ? value : isRecord(value) && Array.isArray(value.products) ? value.products : isRecord(value) && Array.isArray(value.items) ? value.items : []; return source.filter(isRecord) as JsonRecord[]; }
function isRecord(value: unknown): value is JsonRecord { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function firstValue(records: JsonRecord[], key: string) { return records.find((record) => record[key] !== undefined)?.[key] ?? ""; }
function autoMapKey(key: string): Target { const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, ""); if (["name", "productname", "title"].includes(normalized)) return "name"; if (["category", "productcategory"].includes(normalized)) return "category"; if (["description", "desc"].includes(normalized)) return "description"; if (["price", "sellingprice", "saleprice"].includes(normalized)) return "price"; if (["cost", "costprice"].includes(normalized)) return "cost"; if (["quantity", "qty", "stock"].includes(normalized)) return "quantity"; if (["lowstocklevel", "reorderlevel", "minimumstock"].includes(normalized)) return "lowStockLevel"; if (["image", "images", "imageurl", "imageurls", "productimage", "productimages", "photos", "photo", "media", "mediaurls"].includes(normalized)) return "images"; return "ignore"; }
function getCoreLabel(target: CoreTarget) { return coreTargets.find((item) => item.value === target)?.label ?? target; }
function getTargetLabel(fieldOrTarget: DetectedField | Target) { if (typeof fieldOrTarget !== "string" && fieldOrTarget.target === "customField") return `Custom: ${fieldOrTarget.label}`; const value = typeof fieldOrTarget === "string" ? fieldOrTarget : fieldOrTarget.target; return coreTargets.find((target) => target.value === value)?.label ?? value; }
function fieldByTarget(fields: DetectedField[], target: Target) { return fields.find((field) => field.active && field.target === target); }
function getRecordValue(record: JsonRecord, field?: DetectedField) { return field ? record[field.key] : undefined; }
function validate(records: JsonRecord[], fields: DetectedField[]) { const errors: string[] = []; const nameField = fieldByTarget(fields, "name"); const priceField = fieldByTarget(fields, "price"); const quantityField = fieldByTarget(fields, "quantity"); const imageField = fieldByTarget(fields, "images"); if (!nameField) errors.push("Product name field is not mapped."); if (!priceField) errors.push("Price field is not mapped."); if (!quantityField) errors.push("Quantity field is not mapped."); fields.filter((field) => field.active && field.target === "customField" && !field.productFieldId).forEach((field) => errors.push(`${field.label} is missing a saved custom attribute.`)); let validRows = 0; records.forEach((record, index) => { const row = index + 1; const rowErrors: string[] = []; if (!getRecordValue(record, nameField)) rowErrors.push(`Record ${row}: product name is missing.`); if (!priceField || Number.isNaN(Number(getRecordValue(record, priceField)))) rowErrors.push(`Record ${row}: price must be a number.`); if (!quantityField || Number.isNaN(Number(getRecordValue(record, quantityField)))) rowErrors.push(`Record ${row}: quantity must be a number.`); if (imageField) { const parsed = parseImages(getRecordValue(record, imageField)); if (parsed.invalid.length) rowErrors.push(`Record ${row}: invalid image URL(s): ${parsed.invalid.join(", ")}.`); } if (!rowErrors.length) validRows += 1; errors.push(...rowErrors); }); return { validRows, errors }; }
function buildProducts(records: JsonRecord[], fields: DetectedField[]): ProductPayload[] { const nameField = fieldByTarget(fields, "name"); const priceField = fieldByTarget(fields, "price"); const quantityField = fieldByTarget(fields, "quantity"); const categoryField = fieldByTarget(fields, "category"); const descriptionField = fieldByTarget(fields, "description"); const costField = fieldByTarget(fields, "cost"); const lowStockField = fieldByTarget(fields, "lowStockLevel"); const imageField = fieldByTarget(fields, "images"); const customFields = fields.filter((field) => field.active && field.target === "customField" && field.productFieldId); if (!nameField || !priceField || !quantityField) return []; return records.map((record) => { const customFieldValues = customFields.map((field) => ({ fieldId: field.productFieldId!, value: parseCustomValue(getRecordValue(record, field), field.productFieldType ?? inferFieldType(getRecordValue(record, field))) })).filter((item) => item.value !== undefined && item.value !== ""); return { name: String(getRecordValue(record, nameField) ?? ""), category: stringOrUndefined(getRecordValue(record, categoryField)), description: stringOrUndefined(getRecordValue(record, descriptionField)), price: Number(getRecordValue(record, priceField)), cost: getRecordValue(record, costField) === undefined ? undefined : Number(getRecordValue(record, costField)), quantity: Number(getRecordValue(record, quantityField)), lowStockLevel: getRecordValue(record, lowStockField) === undefined ? 5 : Number(getRecordValue(record, lowStockField)), images: imageField ? parseImages(getRecordValue(record, imageField)).urls : [], customFieldValues }; }).filter((product) => product.name && Number.isFinite(product.price) && Number.isFinite(product.quantity)); }
function parseImages(value: unknown) { const rawValues = Array.isArray(value) ? value : typeof value === "string" ? parseImageString(value) : value ? [value] : []; const urls: string[] = []; const invalid: string[] = []; rawValues.map(String).map((item) => item.trim()).filter(Boolean).forEach((item) => { try { const url = new URL(item); if (!url.protocol.startsWith("http")) invalid.push(item); else urls.push(item); } catch { invalid.push(item); } }); return { urls, invalid }; }
function parseImageString(value: string) { const raw = value.trim(); if (!raw) return []; try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) return parsed; if (typeof parsed === "string") return [parsed]; } catch {} return raw.split(raw.includes("|") ? "|" : ","); }
function formatSample(value: unknown) { if (value === undefined || value === null) return "No sample"; return typeof value === "object" ? JSON.stringify(value) : String(value); }
function stringOrUndefined(value: unknown) { return value === undefined || value === null || value === "" ? undefined : String(value); }
function normalizeKey(value: string) { return generateFieldKey(value).toLowerCase(); }
function generateFieldKey(value: string) { return value.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "") || "Imported_field"; }
function inferFieldType(value: unknown): FieldType { if (typeof value === "number") return "number"; if (typeof value === "boolean") return "boolean"; if (isRecord(value) || Array.isArray(value)) return "json"; const text = String(value ?? "").trim(); if (!text) return "text"; if (["true", "false"].includes(text.toLowerCase())) return "boolean"; if (!Number.isNaN(Number(text))) return "number"; if (/^\d{4}-\d{2}-\d{2}/.test(text)) return "date"; return "text"; }
function parseCustomValue(value: unknown, type: FieldType) { if (value === undefined || value === null || value === "") return undefined; if (type === "number") return Number.isNaN(Number(value)) ? value : Number(value); if (type === "boolean") return typeof value === "boolean" ? value : ["true", "1", "yes"].includes(String(value).toLowerCase()); return value; }
