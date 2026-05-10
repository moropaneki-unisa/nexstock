"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, DatabaseZap, FileImage, FileSpreadsheet, Loader2, PackagePlus, Pencil, ShieldCheck, Trash2, UploadCloud } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { apiFetch } from "@/lib/api";

type StepId = "upload" | "fields" | "mapping" | "validate" | "import";
type FieldType = "text" | "number" | "boolean" | "select" | "date" | "json";
type CoreTarget = "ignore" | "name" | "category" | "description" | "price" | "cost" | "quantity" | "lowStockLevel" | "images";
type Target = CoreTarget | "customField";
type ParsedFile = { name: string; rows: string[][] };
type ProductField = { id: string; key: string; label: string; type: FieldType };
type DetectedField = { id: string; originalLabel: string; label: string; index: number; sample: string; active: boolean; target: Target; productFieldId?: string; productFieldType?: FieldType };
type ProductPayload = { name: string; category?: string; description?: string; price: number; cost?: number; quantity: number; lowStockLevel: number; images?: string[]; customFieldValues?: Array<{ fieldId: string; value: unknown }> };

const steps: Array<{ id: StepId; title: string; description: string }> = [
  { id: "upload", title: "Configuration", description: "Upload CSV" },
  { id: "fields", title: "Detected fields", description: "Rename/remove" },
  { id: "mapping", title: "Mapping", description: "Core, images, attributes" },
  { id: "validate", title: "Validation", description: "Check rows" },
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

export default function ImportsV2Page() {
  const [activeStep, setActiveStep] = useState<StepId>("upload");
  const [file, setFile] = useState<ParsedFile | null>(null);
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
  const validation = useMemo(() => validateImport(file, fields), [file, fields]);
  const products = useMemo(() => buildProducts(file, fields), [file, fields]);
  const imageCount = products.reduce((total, product) => total + (product.images?.length ?? 0), 0);
  const currentIndex = steps.findIndex((step) => step.id === activeStep);
  const progress = Math.round(((currentIndex + 1) / steps.length) * 100);

  async function handleFile(inputFile?: File) {
    setError(null);
    setNotice(null);
    setResult(null);
    if (!inputFile) return;
    if (!inputFile.name.toLowerCase().endsWith(".csv")) return setError("CSV import is available now. XLSX support can be added next.");

    setLoading(true);
    try {
      const rows = parseCsv(await inputFile.text());
      if (rows.length < 2) throw new Error("The file must contain a header row and at least one product row.");
      const headers = rows[0].map((header, index) => header.trim() || `Column ${index + 1}`);
      setFile({ name: inputFile.name, rows });
      setFields(headers.map((header, index) => ({ id: `${index}-${header}`, originalLabel: header, label: header, index, sample: firstSample(rows, index), active: true, target: autoMapHeader(header) })));
      setActiveStep("fields");
      setNotice(`${headers.length} fields detected. Image columns are kept as product images, not custom attributes.`);
      toast.success("Fields detected", { description: `${rows.length - 1} product rows ready for review.` });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not parse file";
      setError(message);
      toast.error("Import failed", { description: message });
    } finally {
      setLoading(false);
    }
  }

  function updateField(id: string, updates: Partial<DetectedField>) {
    setFields((current) => current.map((field) => (field.id === id ? { ...field, ...updates } : field)));
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

        const key = generateFieldKey(field.label || field.originalLabel);
        const existingField = existingByKey.get(normalizeKey(key));
        if (existingField) {
          reused += 1;
          nextFields.push({ ...field, target: "customField", productFieldId: existingField.id, productFieldType: existingField.type });
          continue;
        }

        const type = inferFieldType(field.sample);
        const createdField = await apiFetch<ProductField>("/api/product-fields", {
          method: "POST",
          body: JSON.stringify({ label: field.label.trim() || field.originalLabel, type, required: false, options: [], order: existing.length + created + 1, isActive: true }),
        });
        created += 1;
        nextFields.push({ ...field, target: "customField", productFieldId: createdField.id, productFieldType: createdField.type });
      }

      setFields(nextFields);
      setNotice(`${created} custom attribute${created === 1 ? "" : "s"} created and ${reused} reused. Image fields stayed mapped to product images.`);
      if (created || reused) toast.success("Import fields prepared", { description: `${created} created, ${reused} reused.` });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create custom attributes";
      setError(message);
      toast.error("Could not create custom attributes", { description: message });
      throw err;
    } finally {
      setCreatingFields(false);
    }
  }

  async function goNext() {
    setError(null);
    if (!file) return setError("Upload a CSV file first.");
    if (activeStep === "fields") await ensureCustomFields();
    if (activeStep === "mapping" && missingRequired.length > 0) return setError(`Map required fields first: ${missingRequired.map(getCoreLabel).join(", ")}.`);
    if (activeStep === "validate" && validation.errors.length > 0) return setError("Fix validation issues before importing.");
    setActiveStep(steps[Math.min(currentIndex + 1, steps.length - 1)].id);
  }

  function goBack() {
    setError(null);
    setActiveStep(steps[Math.max(currentIndex - 1, 0)].id);
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
      if (failed) toast.error("Import completed with issues", { description: `${created} created, ${failed} failed.` });
      else toast.success("Products imported", { description: `${created} products created with ${imageCount} image URLs.` });
    } finally {
      setImporting(false);
    }
  }

  return (
    <PageShell className="max-w-full space-y-6 overflow-x-hidden pb-10">
      <PageHeader eyebrow="Imports" title="Product import configuration" description="Upload CSV data, map images from JSON/comma/pipe strings, create custom attributes, validate, and import products." actions={<Button asChild variant="outline" className="w-full rounded-xl bg-background/70 sm:w-auto"><Link href="/integrations"><ArrowLeft className="h-4 w-4" />Back to integrations</Link></Button>} />

      {error && <div className="border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"><AlertCircle className="mr-2 inline h-4 w-4" />{error}</div>}
      {notice && <div className="border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}

      <section className="border bg-card/95">
        <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          <Metric icon={FileSpreadsheet} label="File" value={file?.name ?? "Not selected"} helper="CSV source" />
          <Metric icon={DatabaseZap} label="Detected fields" value={fields.length} helper={`${activeFields.length} active`} />
          <Metric icon={FileImage} label="Images" value={imageCount} helper={imageField ? `Mapped from ${imageField.label}` : "No image column"} />
          <Metric icon={PackagePlus} label="Custom attributes" value={customFields.length} helper="Auto-mapped" />
        </div>
      </section>

      <section className="border bg-card/95">
        <div className="grid divide-y sm:grid-cols-2 md:grid-cols-5 md:divide-x md:divide-y-0">
          {steps.map((step, index) => <button key={step.id} type="button" onClick={() => file && setActiveStep(step.id)} className={`p-4 text-left transition hover:bg-muted/40 ${activeStep === step.id ? "bg-primary/10" : ""}`}><div className="flex items-center gap-2"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${activeStep === step.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{index + 1}</span><span className="text-sm font-semibold">{step.title}</span></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{step.description}</p></button>)}
        </div>
        <div className="border-t p-5"><div className="flex items-center justify-between gap-4 text-sm"><span className="font-medium">Import progress</span><span className="font-semibold">{progress}%</span></div><div className="mt-3 h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} /></div></div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <main className="space-y-6">
          {activeStep === "upload" && <UploadStep loading={loading} file={file} onFile={handleFile} />}
          {activeStep === "fields" && <FieldsStep fields={fields} updateField={updateField} />}
          {activeStep === "mapping" && <MappingStep fields={activeFields} updateField={updateField} missingRequired={missingRequired} />}
          {activeStep === "validate" && <ValidateStep validation={validation} products={products} />}
          {activeStep === "import" && <ImportStep file={file} products={products} validation={validation} result={result} importing={importing} onImport={runImport} />}
        </main>

        <aside className="space-y-6">
          <section className="border bg-card/95"><SectionHeader icon={CheckCircle2} title="Import readiness" /><div className="divide-y border-t"><Readiness label="File uploaded" ready={Boolean(file)} /><Readiness label="Images mapped" ready={!imageField || imageCount >= 0} /><Readiness label="Custom attributes ready" ready={customFields.length > 0 || activeFields.every((field) => coreTargetValues.has(field.target))} /><Readiness label="Required fields mapped" ready={missingRequired.length === 0} /><Readiness label="Rows validated" ready={validation.errors.length === 0 && validation.validRows > 0} /></div></section>
          <section className="border bg-card/95"><SectionHeader icon={ShieldCheck} title="Image formats supported" /><div className="space-y-2 border-t p-4 text-xs text-muted-foreground"><code className="block break-all border bg-muted/30 p-2">["https://site/a.jpg","https://site/b.jpg"]</code><code className="block break-all border bg-muted/30 p-2">https://site/a.jpg, https://site/b.jpg</code><code className="block break-all border bg-muted/30 p-2">https://site/a.jpg | https://site/b.jpg</code></div></section>
        </aside>
      </section>

      <div className="flex flex-col-reverse justify-between gap-3 border bg-card/95 p-4 sm:flex-row"><Button type="button" variant="outline" onClick={goBack} disabled={activeStep === "upload" || creatingFields} className="rounded-xl bg-background/70">Back</Button>{activeStep === "import" ? <Button asChild className="rounded-xl"><Link href="/products">Go to products<ArrowRight className="h-4 w-4" /></Link></Button> : <Button type="button" onClick={goNext} disabled={!file || creatingFields} className="rounded-xl">{creatingFields ? <><Loader2 className="h-4 w-4 animate-spin" />Creating fields...</> : <>Continue<ArrowRight className="h-4 w-4" /></>}</Button>}</div>
    </PageShell>
  );
}

function UploadStep({ loading, file, onFile }: { loading: boolean; file: ParsedFile | null; onFile: (file?: File) => void }) { return <section className="border bg-card/95"><SectionHeader icon={UploadCloud} title="File configuration" description="The first row is treated as headers. Image columns can contain JSON arrays or separated URLs." badge="Required" /><div className="border-t p-5"><label className="flex cursor-pointer flex-col items-center justify-center border border-dashed bg-muted/20 p-8 text-center transition hover:bg-muted/45 sm:p-10">{loading ? <Loader2 className="mb-3 h-10 w-10 animate-spin text-muted-foreground" /> : <FileSpreadsheet className="mb-3 h-10 w-10 text-muted-foreground" />}<span className="text-sm font-semibold">{loading ? "Detecting fields..." : file ? file.name : "Upload CSV file"}</span><span className="mt-1 text-sm text-muted-foreground">Required: name, price, quantity. Optional: images.</span><Input type="file" accept=".csv" className="hidden" disabled={loading} onChange={(event) => onFile(event.target.files?.[0])} /></label></div></section>; }
function FieldsStep({ fields, updateField }: { fields: DetectedField[]; updateField: (id: string, updates: Partial<DetectedField>) => void }) { return <section className="border bg-card/95"><SectionHeader icon={DatabaseZap} title="Detected fields" description="Rename fields or remove them. Image columns remain product image fields, not custom attributes." badge={`${fields.filter((field) => field.active).length}/${fields.length} active`} /><div className="grid divide-y border-t md:grid-cols-2 md:divide-x md:divide-y-0"><div className="divide-y">{fields.filter((_, index) => index % 2 === 0).map((field) => <FieldRow key={field.id} field={field} updateField={updateField} />)}</div><div className="divide-y">{fields.filter((_, index) => index % 2 === 1).map((field) => <FieldRow key={field.id} field={field} updateField={updateField} />)}</div></div></section>; }
function FieldRow({ field, updateField }: { field: DetectedField; updateField: (id: string, updates: Partial<DetectedField>) => void }) { return <div className={`p-4 ${!field.active ? "bg-muted/30 opacity-70" : ""}`}><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{field.originalLabel}</p><Badge variant={field.active ? "default" : "secondary"}>{field.active ? "Active" : "Removed"}</Badge>{field.target !== "ignore" && <Badge variant="outline">{getTargetLabel(field)}</Badge>}</div>{field.active ? <Button type="button" variant="ghost" size="sm" className="rounded-xl text-destructive hover:text-destructive" onClick={() => updateField(field.id, { active: false, target: "ignore" })}><Trash2 className="h-4 w-4" />Remove</Button> : <Button type="button" variant="outline" size="sm" className="rounded-xl bg-background/70" onClick={() => updateField(field.id, { active: true, target: autoMapHeader(field.label) })}>Restore</Button>}</div><Label className="mt-4 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"><Pencil className="mr-1 inline h-3.5 w-3.5" />Display name</Label><Input className="mt-2 rounded-xl" value={field.label} disabled={!field.active} onChange={(event) => updateField(field.id, { label: event.target.value, productFieldId: undefined })} /><p className="mt-2 truncate text-sm text-muted-foreground">Sample: {field.sample || "No sample"}</p></div>; }
function MappingStep({ fields, updateField, missingRequired }: { fields: DetectedField[]; updateField: (id: string, updates: Partial<DetectedField>) => void; missingRequired: CoreTarget[] }) { return <section className="border bg-card/95"><SectionHeader icon={DatabaseZap} title="Map fields" description="Map images to the product image array. Non-core fields can stay as custom attributes." badge={missingRequired.length ? `${missingRequired.length} missing` : "Ready"} /><div className="divide-y border-t">{fields.map((field) => <div key={field.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_18rem] md:items-center"><div className="min-w-0"><p className="truncate font-medium">{field.label}</p><p className="mt-1 truncate text-xs text-muted-foreground">Original: {field.originalLabel} · Sample: {field.sample || "No sample"}</p>{field.target === "images" && <p className="mt-1 text-xs text-emerald-700">Images are parsed into product images array.</p>}{field.productFieldId && <p className="mt-1 text-xs text-emerald-700">Custom attribute created and auto-mapped.</p>}</div><select value={field.target} onChange={(event) => updateField(field.id, { target: event.target.value as Target })} className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25">{coreTargets.map((target) => <option key={target.value} value={target.value}>{target.label}{target.required ? " *" : ""}</option>)}{field.productFieldId && <option value="customField">Custom attribute: {field.label}</option>}</select></div>)}</div></section>; }
function ValidateStep({ validation, products }: { validation: { validRows: number; errors: string[] }; products: ProductPayload[] }) { return <section className="border bg-card/95"><SectionHeader icon={ShieldCheck} title="Validate import" description="Review required mappings, image parsing, and rows before import." badge={validation.errors.length ? `${validation.errors.length} issues` : "Ready"} /><div className="grid divide-y border-t md:grid-cols-3 md:divide-x md:divide-y-0"><ValidationCard title="Rows ready" value={validation.validRows} ready={validation.validRows > 0} /><ValidationCard title="Products" value={products.length} ready={products.length > 0} /><ValidationCard title="Images" value={products.reduce((total, product) => total + (product.images?.length ?? 0), 0)} ready /></div>{validation.errors.length ? <div className="divide-y border-t">{validation.errors.slice(0, 12).map((item, index) => <div key={index} className="p-4 text-sm text-destructive">{item}</div>)}</div> : <PreviewProducts products={products.slice(0, 8)} />}</section>; }
function ImportStep({ file, products, validation, result, importing, onImport }: { file: ParsedFile | null; products: ProductPayload[]; validation: { validRows: number; errors: string[] }; result: { created: number; failed: number } | null; importing: boolean; onImport: () => void }) { return <section className="border bg-card/95"><SectionHeader icon={PackagePlus} title="Create products" description="Products will be created with images and custom attribute values." badge={file?.name} /><div className="grid divide-y border-t md:grid-cols-3 md:divide-x md:divide-y-0"><ValidationCard title="Products ready" value={products.length} ready={products.length > 0} /><ValidationCard title="Images ready" value={products.reduce((total, product) => total + (product.images?.length ?? 0), 0)} ready /><ValidationCard title="Validation" value={validation.errors.length ? "Blocked" : "Passed"} ready={validation.errors.length === 0} /></div>{result && <div className="border-t p-4 text-sm"><p className="font-semibold">Import complete</p><p className="mt-1 text-muted-foreground">{result.created} created, {result.failed} failed.</p></div>}<div className="border-t p-5"><Button type="button" onClick={onImport} disabled={importing || validation.errors.length > 0 || products.length === 0} className="w-full rounded-xl sm:w-auto">{importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}Import products</Button></div></section>; }
function SectionHeader({ icon: Icon, title, description, badge }: { icon: any; title: string; description?: string; badge?: string }) { return <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5"><div className="min-w-0"><h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><Icon className="h-5 w-5 shrink-0" />{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>{badge && <Badge variant="secondary" className="w-fit shrink-0">{badge}</Badge>}</div>; }
function Metric({ icon: Icon, label, value, helper }: { icon: any; label: string; value: string | number; helper: string }) { return <div className="flex items-center justify-between p-4"><div className="min-w-0"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 truncate text-xl font-semibold capitalize">{value}</p><p className="mt-1 truncate text-xs text-muted-foreground">{helper}</p></div><span className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span></div>; }
function ValidationCard({ title, value, ready }: { title: string; value: string | number; ready: boolean }) { return <div className="flex items-center justify-between gap-3 p-5"><div className="min-w-0"><p className="text-sm text-muted-foreground">{title}</p><p className="mt-1 truncate text-lg font-semibold">{value}</p></div><span className={`flex h-10 w-10 shrink-0 items-center justify-center ${ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{ready ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}</span></div>; }
function Readiness({ label, ready }: { label: string; ready: boolean }) { return <div className="flex items-center justify-between px-4 py-3 text-sm"><span>{label}</span><Badge variant={ready ? "default" : "secondary"}>{ready ? "Ready" : "Needed"}</Badge></div>; }
function PreviewProducts({ products }: { products: ProductPayload[] }) { return <div className="max-w-full overflow-x-auto border-t"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">Quantity</TableHead><TableHead className="text-right">Images</TableHead><TableHead className="text-right">Custom</TableHead></TableRow></TableHeader><TableBody>{products.map((product, index) => <TableRow key={`${product.name}-${index}`}><TableCell className="min-w-[12rem]">{product.name}</TableCell><TableCell>{product.category || "-"}</TableCell><TableCell className="text-right">{product.price}</TableCell><TableCell className="text-right">{product.quantity}</TableCell><TableCell className="text-right">{product.images?.length ?? 0}</TableCell><TableCell className="text-right">{product.customFieldValues?.length ?? 0}</TableCell></TableRow>)}</TableBody></Table></div>; }

function parseCsv(text: string) { const rows: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false; for (let i = 0; i < text.length; i += 1) { const char = text[i]; const next = text[i + 1]; if (char === '"' && quoted && next === '"') { cell += '"'; i += 1; continue; } if (char === '"') { quoted = !quoted; continue; } if (char === "," && !quoted) { row.push(cell.trim()); cell = ""; continue; } if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && next === "\n") i += 1; row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = ""; continue; } cell += char; } row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); return rows; }
function firstSample(rows: string[][], index: number) { return rows.slice(1).find((row) => row[index])?.[index] ?? ""; }
function autoMapHeader(header: string): Target { const key = header.toLowerCase().replace(/[^a-z0-9]/g, ""); if (["name", "productname", "title"].includes(key)) return "name"; if (["category", "productcategory"].includes(key)) return "category"; if (["description", "desc"].includes(key)) return "description"; if (["price", "sellingprice", "saleprice"].includes(key)) return "price"; if (["cost", "costprice"].includes(key)) return "cost"; if (["quantity", "qty", "stock"].includes(key)) return "quantity"; if (["lowstocklevel", "reorderlevel", "minimumstock"].includes(key)) return "lowStockLevel"; if (["image", "images", "imageurl", "imageurls", "productimage", "productimages", "photos", "photo", "media", "mediaurls"].includes(key)) return "images"; return "ignore"; }
function getCoreLabel(target: CoreTarget) { return coreTargets.find((item) => item.value === target)?.label ?? target; }
function getTargetLabel(fieldOrTarget: DetectedField | Target) { if (typeof fieldOrTarget !== "string" && fieldOrTarget.target === "customField") return `Custom: ${fieldOrTarget.label}`; const value = typeof fieldOrTarget === "string" ? fieldOrTarget : fieldOrTarget.target; return coreTargets.find((target) => target.value === value)?.label ?? value; }
function fieldByTarget(fields: DetectedField[], target: Target) { return fields.find((field) => field.active && field.target === target); }
function getCell(row: string[], field?: DetectedField) { return field ? row[field.index] ?? "" : ""; }
function validateImport(file: ParsedFile | null, fields: DetectedField[]) { if (!file) return { validRows: 0, errors: [] as string[] }; const errors: string[] = []; const nameField = fieldByTarget(fields, "name"); const priceField = fieldByTarget(fields, "price"); const quantityField = fieldByTarget(fields, "quantity"); const imageField = fieldByTarget(fields, "images"); if (!nameField) errors.push("Product name field is not mapped."); if (!priceField) errors.push("Price field is not mapped."); if (!quantityField) errors.push("Quantity field is not mapped."); fields.filter((field) => field.active && field.target === "customField" && !field.productFieldId).forEach((field) => errors.push(`${field.label} is missing a saved custom attribute.`)); let validRows = 0; file.rows.slice(1).forEach((row, index) => { const rowNumber = index + 2; const rowErrors: string[] = []; if (!getCell(row, nameField)) rowErrors.push(`Row ${rowNumber}: product name is missing.`); if (!priceField || Number.isNaN(Number(getCell(row, priceField)))) rowErrors.push(`Row ${rowNumber}: price must be a number.`); if (!quantityField || Number.isNaN(Number(getCell(row, quantityField)))) rowErrors.push(`Row ${rowNumber}: quantity must be a number.`); if (imageField) { const parsed = parseImageList(getCell(row, imageField)); if (parsed.invalid.length) rowErrors.push(`Row ${rowNumber}: invalid image URL(s): ${parsed.invalid.join(", ")}.`); } if (!rowErrors.length) validRows += 1; errors.push(...rowErrors); }); return { validRows, errors }; }
function buildProducts(file: ParsedFile | null, fields: DetectedField[]): ProductPayload[] { if (!file) return []; const nameField = fieldByTarget(fields, "name"); const priceField = fieldByTarget(fields, "price"); const quantityField = fieldByTarget(fields, "quantity"); const categoryField = fieldByTarget(fields, "category"); const descriptionField = fieldByTarget(fields, "description"); const costField = fieldByTarget(fields, "cost"); const lowStockField = fieldByTarget(fields, "lowStockLevel"); const imageField = fieldByTarget(fields, "images"); const customFields = fields.filter((field) => field.active && field.target === "customField" && field.productFieldId); if (!nameField || !priceField || !quantityField) return []; return file.rows.slice(1).map((row) => { const images = imageField ? parseImageList(getCell(row, imageField)).urls : []; const customFieldValues = customFields.map((field) => ({ fieldId: field.productFieldId!, value: parseCustomFieldValue(getCell(row, field), field.productFieldType ?? inferFieldType(getCell(row, field))) })).filter((item) => item.value !== undefined && item.value !== ""); return { name: getCell(row, nameField), category: getCell(row, categoryField) || undefined, description: getCell(row, descriptionField) || undefined, price: Number(getCell(row, priceField)), cost: getCell(row, costField) ? Number(getCell(row, costField)) : undefined, quantity: Number(getCell(row, quantityField)), lowStockLevel: getCell(row, lowStockField) ? Number(getCell(row, lowStockField)) : 5, images, customFieldValues }; }).filter((product) => product.name && Number.isFinite(product.price) && Number.isFinite(product.quantity)); }
function parseImageList(value: string) { const raw = value.trim(); if (!raw) return { urls: [] as string[], invalid: [] as string[] }; let values: string[] = []; try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) values = parsed.map(String); else if (typeof parsed === "string") values = [parsed]; } catch { values = raw.split(raw.includes("|") ? "|" : ","); } const urls: string[] = []; const invalid: string[] = []; values.map((item) => item.trim()).filter(Boolean).forEach((item) => { try { const url = new URL(item); if (!url.protocol.startsWith("http")) invalid.push(item); else urls.push(item); } catch { invalid.push(item); } }); return { urls, invalid }; }
function normalizeKey(value: string) { return generateFieldKey(value).toLowerCase(); }
function generateFieldKey(value: string) { return value.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "") || "Imported_field"; }
function inferFieldType(value: string): FieldType { const trimmed = value.trim(); if (!trimmed) return "text"; if (["true", "false"].includes(trimmed.toLowerCase())) return "boolean"; if (!Number.isNaN(Number(trimmed))) return "number"; if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return "date"; return "text"; }
function parseCustomFieldValue(value: string, type: FieldType) { if (!value) return undefined; if (type === "number") { const numeric = Number(value); return Number.isNaN(numeric) ? value : numeric; } if (type === "boolean") return ["true", "1", "yes"].includes(value.toLowerCase()); if (type === "json") { try { return JSON.parse(value); } catch { return value; } } return value; }
