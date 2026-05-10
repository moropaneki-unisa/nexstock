"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, DatabaseZap, Eye, FileSpreadsheet, Loader2, PackagePlus, Pencil, Rows3, ShieldCheck, Trash2, UploadCloud } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { apiFetch } from "@/lib/api";

type StepId = "configuration" | "fields" | "mapping" | "validation" | "import";
type MappingTarget = "ignore" | "name" | "category" | "description" | "price" | "cost" | "quantity" | "lowStockLevel";
type ParsedFile = { name: string; size: number; rows: string[][] };
type DetectedField = { id: string; originalLabel: string; label: string; index: number; sample: string; active: boolean; target: MappingTarget };

type ProductPayload = { name: string; category?: string; description?: string; price: number; cost?: number; quantity: number; lowStockLevel: number };

const steps: Array<{ id: StepId; title: string; description: string }> = [
  { id: "configuration", title: "Configuration", description: "Upload and detect" },
  { id: "fields", title: "Detected fields", description: "Rename or remove" },
  { id: "mapping", title: "Mapping", description: "Match to products" },
  { id: "validation", title: "Validation", description: "Check rows" },
  { id: "import", title: "Import", description: "Create products" },
];

const mappingTargets: Array<{ value: MappingTarget; label: string; required?: boolean }> = [
  { value: "ignore", label: "Ignore field" },
  { value: "name", label: "Product name", required: true },
  { value: "category", label: "Category" },
  { value: "description", label: "Description" },
  { value: "price", label: "Price", required: true },
  { value: "cost", label: "Cost" },
  { value: "quantity", label: "Quantity", required: true },
  { value: "lowStockLevel", label: "Low-stock level" },
];

export default function ImportsPage() {
  const [activeStep, setActiveStep] = useState<StepId>("configuration");
  const [file, setFile] = useState<ParsedFile | null>(null);
  const [fields, setFields] = useState<DetectedField[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const currentIndex = steps.findIndex((step) => step.id === activeStep);
  const activeFields = fields.filter((field) => field.active);
  const mappedFields = activeFields.filter((field) => field.target !== "ignore");
  const requiredTargets = mappingTargets.filter((target) => target.required).map((target) => target.value);
  const mappedRequiredTargets = requiredTargets.filter((target) => activeFields.some((field) => field.target === target));
  const missingRequiredTargets = requiredTargets.filter((target) => !activeFields.some((field) => field.target === target));
  const validation = useMemo(() => validateImport(file, fields), [file, fields]);
  const productsToImport = useMemo(() => buildProducts(file, fields), [file, fields]);
  const progress = Math.round(((currentIndex + 1) / steps.length) * 100);

  async function handleFile(inputFile: File | undefined) {
    setError(null);
    setMessage(null);
    setImportResult(null);
    if (!inputFile) return;
    if (!inputFile.name.toLowerCase().endsWith(".csv")) {
      setError("CSV import is available now. XLSX support can be added next.");
      return;
    }

    setIsParsing(true);
    try {
      const rows = parseCsv(await inputFile.text());
      if (rows.length < 2) throw new Error("The file must contain a header row and at least one product row.");
      const headers = rows[0].map((header, index) => header.trim() || `Column ${index + 1}`);
      const detectedFields = headers.map((header, index) => ({ id: `${index}-${header}`, originalLabel: header, label: header, index, sample: firstSample(rows, index), active: true, target: autoMapHeader(header) }));
      setFile({ name: inputFile.name, size: inputFile.size, rows });
      setFields(detectedFields);
      setActiveStep("fields");
      setMessage(`${detectedFields.length} fields detected from ${inputFile.name}.`);
      toast.success("Fields detected", { description: `${rows.length - 1} product row${rows.length - 1 === 1 ? "" : "s"} ready for review.` });
    } catch (err) {
      const nextError = err instanceof Error ? err.message : "Could not parse file";
      setError(nextError);
      toast.error("Import file failed", { description: nextError });
    } finally {
      setIsParsing(false);
    }
  }

  function updateField(id: string, updates: Partial<DetectedField>) {
    setFields((current) => current.map((field) => field.id === id ? { ...field, ...updates } : field));
    setError(null);
    setMessage(null);
  }

  function restoreField(id: string) {
    setFields((current) => current.map((field) => field.id === id ? { ...field, active: true, target: autoMapHeader(field.label) } : field));
  }

  function goNext() {
    setError(null);
    if (!file) return setError("Upload a CSV file before continuing.");
    if (activeStep === "mapping" && missingRequiredTargets.length > 0) return setError(`Map required fields first: ${missingRequiredTargets.map(getTargetLabel).join(", ")}.`);
    if (activeStep === "validation" && validation.errors.length > 0) return setError("Fix validation issues before continuing to import.");
    setActiveStep(steps[Math.min(currentIndex + 1, steps.length - 1)].id);
  }

  function goBack() {
    setError(null);
    setActiveStep(steps[Math.max(currentIndex - 1, 0)].id);
  }

  async function runImport() {
    setError(null);
    setMessage(null);
    setImportResult(null);
    if (!file) return setError("Upload a file first.");
    if (validation.errors.length > 0) return setError("Fix validation issues before importing.");

    setIsImporting(true);
    let created = 0;
    let failed = 0;
    try {
      for (const product of productsToImport) {
        try {
          await apiFetch("/api/products", { method: "POST", body: JSON.stringify(product) });
          created += 1;
        } catch {
          failed += 1;
        }
      }
      setImportResult({ created, failed });
      if (failed > 0) toast.error("Import completed with issues", { description: `${created} created, ${failed} failed.` });
      else toast.success("Products imported", { description: `${created} product${created === 1 ? "" : "s"} created.` });
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <PageShell className="max-w-full space-y-6 overflow-x-hidden pb-10">
      <PageHeader
        eyebrow="Imports"
        title="Product import configuration"
        description="Upload a CSV file, keep detected fields visible, rename or remove fields, map them to products, validate rows, then import."
        actions={<Button asChild variant="outline" className="w-full rounded-xl bg-background/70 sm:w-auto"><Link href="/integrations"><ArrowLeft className="h-4 w-4" />Back to integrations</Link></Button>}
      />

      {error && <div className="border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"><AlertCircle className="mr-2 inline h-4 w-4" />{error}</div>}
      {message && <div className="border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div>}

      <section className="border bg-card/95">
        <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          <Metric icon={FileSpreadsheet} label="File" value={file?.name ?? "Not selected"} helper="CSV source" />
          <Metric icon={DatabaseZap} label="Detected fields" value={fields.length} helper={`${activeFields.length} active`} />
          <Metric icon={ShieldCheck} label="Required mapping" value={`${mappedRequiredTargets.length}/${requiredTargets.length}`} helper={missingRequiredTargets.length ? "Needs review" : "Ready"} />
          <Metric icon={PackagePlus} label="Rows ready" value={validation.validRows} helper={`${validation.errors.length} issues`} />
        </div>
      </section>

      <section className="border bg-card/95">
        <div className="grid divide-y sm:grid-cols-2 md:grid-cols-5 md:divide-x md:divide-y-0">
          {steps.map((step, index) => (
            <button key={step.id} type="button" onClick={() => file && setActiveStep(step.id)} className={`p-4 text-left transition hover:bg-muted/40 ${activeStep === step.id ? "bg-primary/10" : ""}`}>
              <div className="flex items-center gap-2"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${activeStep === step.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{index + 1}</span><span className="text-sm font-semibold">{step.title}</span></div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{step.description}</p>
            </button>
          ))}
        </div>
        <div className="border-t p-5"><div className="flex items-center justify-between gap-4 text-sm"><span className="font-medium">Import progress</span><span className="font-semibold">{progress}%</span></div><div className="mt-3 h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div></div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <main className="space-y-6">
          {activeStep === "configuration" && <ConfigurationStep isParsing={isParsing} file={file} onFile={handleFile} />}
          {activeStep === "fields" && <DetectedFieldsStep fields={fields} updateField={updateField} restoreField={restoreField} />}
          {activeStep === "mapping" && <MappingStep fields={activeFields} updateField={updateField} requiredReady={`${mappedRequiredTargets.length}/${requiredTargets.length}`} />}
          {activeStep === "validation" && <ValidationStep validation={validation} products={productsToImport} />}
          {activeStep === "import" && <ImportStep file={file} products={productsToImport} validation={validation} result={importResult} isImporting={isImporting} onImport={runImport} />}
        </main>

        <aside className="space-y-6">
          <section className="border bg-card/95"><SectionHeader icon={CheckCircle2} title="Import readiness" /><div className="divide-y border-t"><ReadinessLine label="File uploaded" ready={Boolean(file)} /><ReadinessLine label="Fields detected" ready={fields.length > 0} /><ReadinessLine label="Fields reviewed" ready={activeFields.length > 0} /><ReadinessLine label="Required mapping" ready={missingRequiredTargets.length === 0} /><ReadinessLine label="Rows validated" ready={validation.errors.length === 0 && validation.validRows > 0} /></div></section>
          <section className="border bg-card/95"><SectionHeader icon={Rows3} title="Import plan" /><div className="divide-y border-t"><PlanItem number="01" label="Upload source file" ready={Boolean(file)} /><PlanItem number="02" label="Rename or remove fields" ready={activeFields.length > 0} /><PlanItem number="03" label="Map required fields" ready={missingRequiredTargets.length === 0} /><PlanItem number="04" label="Validate rows" ready={validation.errors.length === 0 && validation.validRows > 0} /><PlanItem number="05" label="Create products" ready={Boolean(importResult?.created)} /></div></section>
        </aside>
      </section>

      <div className="flex flex-col-reverse justify-between gap-3 border bg-card/95 p-4 sm:flex-row">
        <Button type="button" variant="outline" onClick={goBack} disabled={activeStep === "configuration"} className="rounded-xl bg-background/70">Back</Button>
        {activeStep === "import" ? <Button asChild className="rounded-xl"><Link href="/products">Go to products<ArrowRight className="h-4 w-4" /></Link></Button> : <Button type="button" onClick={goNext} disabled={!file} className="rounded-xl">Continue<ArrowRight className="h-4 w-4" /></Button>}
      </div>
    </PageShell>
  );
}

function ConfigurationStep({ isParsing, file, onFile }: { isParsing: boolean; file: ParsedFile | null; onFile: (file?: File) => void }) {
  return <section className="border bg-card/95"><SectionHeader icon={UploadCloud} title="File configuration" description="Upload a CSV file. The first row is treated as detected field headers." badge="Required" /><div className="border-t p-5"><label className="flex cursor-pointer flex-col items-center justify-center border border-dashed bg-muted/20 p-8 text-center transition hover:bg-muted/45 sm:p-10">{isParsing ? <Loader2 className="mb-3 h-10 w-10 animate-spin text-muted-foreground" /> : <FileSpreadsheet className="mb-3 h-10 w-10 text-muted-foreground" />}<span className="text-sm font-semibold">{isParsing ? "Detecting fields..." : file ? file.name : "Upload CSV file"}</span><span className="mt-1 text-sm text-muted-foreground">Required product data: name, price, quantity.</span><Input type="file" accept=".csv" className="hidden" disabled={isParsing} onChange={(event) => onFile(event.target.files?.[0])} /></label></div></section>;
}

function DetectedFieldsStep({ fields, updateField, restoreField }: { fields: DetectedField[]; updateField: (id: string, updates: Partial<DetectedField>) => void; restoreField: (id: string) => void }) {
  return <section className="border bg-card/95"><SectionHeader icon={DatabaseZap} title="Detected fields" description="Keep the detected fields visible. Rename fields for clarity or remove fields you do not want to import." badge={`${fields.filter((field) => field.active).length}/${fields.length} active`} /><div className="border-t">{fields.length === 0 ? <EmptyState /> : <div className="grid divide-y md:grid-cols-2 md:divide-x md:divide-y-0"><div className="divide-y">{fields.filter((_, index) => index % 2 === 0).map((field) => <DetectedFieldRow key={field.id} field={field} updateField={updateField} restoreField={restoreField} />)}</div><div className="divide-y">{fields.filter((_, index) => index % 2 === 1).map((field) => <DetectedFieldRow key={field.id} field={field} updateField={updateField} restoreField={restoreField} />)}</div></div>}</div></section>;
}

function DetectedFieldRow({ field, updateField, restoreField }: { field: DetectedField; updateField: (id: string, updates: Partial<DetectedField>) => void; restoreField: (id: string) => void }) {
  return <div className={`p-4 ${!field.active ? "bg-muted/30 opacity-70" : ""}`}><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{field.originalLabel}</p><Badge variant={field.active ? "default" : "secondary"}>{field.active ? "Active" : "Removed"}</Badge>{field.target !== "ignore" && <Badge variant="outline">{getTargetLabel(field.target)}</Badge>}</div>{field.active ? <Button type="button" variant="ghost" size="sm" className="rounded-xl text-destructive hover:text-destructive" onClick={() => updateField(field.id, { active: false, target: "ignore" })}><Trash2 className="h-4 w-4" />Remove</Button> : <Button type="button" variant="outline" size="sm" className="rounded-xl bg-background/70" onClick={() => restoreField(field.id)}>Restore</Button>}</div><Label className="mt-4 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"><Pencil className="mr-1 inline h-3.5 w-3.5" />Display name</Label><Input className="mt-2 rounded-xl" value={field.label} disabled={!field.active} onChange={(event) => updateField(field.id, { label: event.target.value })} /><p className="mt-2 truncate text-sm text-muted-foreground">Sample: {field.sample || "No sample"}</p></div>;
}

function MappingStep({ fields, updateField, requiredReady }: { fields: DetectedField[]; updateField: (id: string, updates: Partial<DetectedField>) => void; requiredReady: string }) {
  return <section className="border bg-card/95"><SectionHeader icon={DatabaseZap} title="Map fields" description="Map active detected fields to NexStock product fields. Removed fields are ignored." badge={`${requiredReady} required`} /><div className="divide-y border-t">{fields.map((field) => <div key={field.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_18rem] md:items-center"><div className="min-w-0"><p className="truncate font-medium">{field.label}</p><p className="mt-1 truncate text-xs text-muted-foreground">Original: {field.originalLabel} · Sample: {field.sample || "No sample"}</p></div><select value={field.target} onChange={(event) => updateField(field.id, { target: event.target.value as MappingTarget })} className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25">{mappingTargets.map((target) => <option key={target.value} value={target.value}>{target.label}{target.required ? " *" : ""}</option>)}</select></div>)}</div></section>;
}

function ValidationStep({ validation, products }: { validation: { validRows: number; errors: string[] }; products: ProductPayload[] }) {
  return <section className="border bg-card/95"><SectionHeader icon={ShieldCheck} title="Validate import" description="Review required mappings and row readiness before creating products." badge={validation.errors.length === 0 ? "Ready" : `${validation.errors.length} issues`} /><div className="grid divide-y border-t md:grid-cols-3 md:divide-x md:divide-y-0"><ValidationCard title="Rows ready" value={validation.validRows} ready={validation.validRows > 0} /><ValidationCard title="Preview products" value={products.length} ready={products.length > 0} /><ValidationCard title="Validation issues" value={validation.errors.length} ready={validation.errors.length === 0} /></div>{validation.errors.length > 0 ? <div className="divide-y border-t">{validation.errors.slice(0, 10).map((item, index) => <div key={index} className="p-4 text-sm text-destructive">{item}</div>)}</div> : <PreviewProducts products={products.slice(0, 8)} />}</section>;
}

function ImportStep({ file, products, validation, result, isImporting, onImport }: { file: ParsedFile | null; products: ProductPayload[]; validation: { validRows: number; errors: string[] }; result: { created: number; failed: number } | null; isImporting: boolean; onImport: () => void }) {
  return <section className="border bg-card/95"><SectionHeader icon={PackagePlus} title="Create products" description="Create products from the validated file using the existing NexStock product API." badge={file?.name} /><div className="grid divide-y border-t md:grid-cols-3 md:divide-x md:divide-y-0"><ValidationCard title="File" value={file?.name ?? "No file"} ready={Boolean(file)} /><ValidationCard title="Products ready" value={products.length} ready={products.length > 0} /><ValidationCard title="Validation" value={validation.errors.length === 0 ? "Passed" : "Blocked"} ready={validation.errors.length === 0} /></div>{result && <div className="border-t p-4 text-sm"><p className="font-semibold">Import complete</p><p className="mt-1 text-muted-foreground">{result.created} created, {result.failed} failed.</p></div>}<div className="border-t p-5"><Button type="button" onClick={onImport} disabled={isImporting || validation.errors.length > 0 || products.length === 0} className="w-full rounded-xl sm:w-auto">{isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}Import products</Button></div></section>;
}

function SectionHeader({ icon: Icon, title, description, badge }: { icon: any; title: string; description?: string; badge?: string }) { return <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5"><div className="min-w-0"><h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><Icon className="h-5 w-5 shrink-0" />{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>{badge && <Badge variant="secondary" className="w-fit shrink-0">{badge}</Badge>}</div>; }
function Metric({ icon: Icon, label, value, helper }: { icon: any; label: string; value: string | number; helper: string }) { return <div className="flex items-center justify-between p-4"><div className="min-w-0"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 truncate text-xl font-semibold capitalize">{value}</p><p className="mt-1 truncate text-xs text-muted-foreground">{helper}</p></div><span className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span></div>; }
function ValidationCard({ title, value, ready }: { title: string; value: string | number; ready: boolean }) { return <div className="flex items-center justify-between gap-3 p-5"><div className="min-w-0"><p className="text-sm text-muted-foreground">{title}</p><p className="mt-1 truncate text-lg font-semibold">{value}</p></div><span className={`flex h-10 w-10 shrink-0 items-center justify-center ${ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{ready ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}</span></div>; }
function ReadinessLine({ label, ready }: { label: string; ready: boolean }) { return <div className="flex items-center justify-between px-4 py-3 text-sm"><span className="flex items-center gap-2">{ready ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <ShieldCheck className="h-4 w-4 text-muted-foreground" />}{label}</span><Badge variant={ready ? "default" : "secondary"}>{ready ? "Ready" : "Required"}</Badge></div>; }
function PlanItem({ number, label, ready }: { number: string; label: string; ready: boolean }) { return <div className="flex items-center justify-between px-4 py-3 text-sm"><span className="flex items-center gap-3"><span className="font-mono text-xs text-muted-foreground">{number}</span>{label}</span><Badge variant={ready ? "default" : "secondary"}>{ready ? "Done" : "Next"}</Badge></div>; }
function EmptyState() { return <div className="p-10 text-center"><DatabaseZap className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><p className="font-semibold">No fields detected yet</p><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Upload a CSV file so NexStock can detect, rename, remove, map, and import product fields.</p></div>; }

function PreviewProducts({ products }: { products: ProductPayload[] }) { return <div className="max-w-full overflow-x-auto border-t"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">Quantity</TableHead></TableRow></TableHeader><TableBody>{products.map((product, index) => <TableRow key={`${product.name}-${index}`}><TableCell className="min-w-[12rem]">{product.name}</TableCell><TableCell>{product.category || "-"}</TableCell><TableCell className="text-right">{product.price}</TableCell><TableCell className="text-right">{product.quantity}</TableCell></TableRow>)}</TableBody></Table></div>; }

function parseCsv(text: string) { const rows: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false; for (let i = 0; i < text.length; i += 1) { const char = text[i]; const next = text[i + 1]; if (char === '"' && quoted && next === '"') { cell += '"'; i += 1; continue; } if (char === '"') { quoted = !quoted; continue; } if (char === "," && !quoted) { row.push(cell.trim()); cell = ""; continue; } if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && next === "\n") i += 1; row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = ""; continue; } cell += char; } row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); return rows; }
function firstSample(rows: string[][], index: number) { return rows.slice(1).find((row) => row[index])?.[index] ?? ""; }
function autoMapHeader(header: string): MappingTarget { const key = header.toLowerCase().replace(/[^a-z0-9]/g, ""); if (["name", "productname", "title"].includes(key)) return "name"; if (["category", "productcategory"].includes(key)) return "category"; if (["description", "desc"].includes(key)) return "description"; if (["price", "sellingprice", "saleprice"].includes(key)) return "price"; if (["cost", "costprice"].includes(key)) return "cost"; if (["quantity", "qty", "stock"].includes(key)) return "quantity"; if (["lowstocklevel", "reorderlevel", "minimumstock"].includes(key)) return "lowStockLevel"; return "ignore"; }
function getTargetLabel(value: MappingTarget) { return mappingTargets.find((target) => target.value === value)?.label ?? value; }
function fieldByTarget(fields: DetectedField[], target: MappingTarget) { return fields.find((field) => field.active && field.target === target); }
function getCell(row: string[], field?: DetectedField) { return field ? row[field.index] ?? "" : ""; }
function validateImport(file: ParsedFile | null, fields: DetectedField[]) { if (!file) return { validRows: 0, errors: [] as string[] }; const errors: string[] = []; const nameField = fieldByTarget(fields, "name"); const priceField = fieldByTarget(fields, "price"); const quantityField = fieldByTarget(fields, "quantity"); if (!nameField) errors.push("Product name field is not mapped."); if (!priceField) errors.push("Price field is not mapped."); if (!quantityField) errors.push("Quantity field is not mapped."); let validRows = 0; file.rows.slice(1).forEach((row, index) => { const rowNumber = index + 2; const rowErrors: string[] = []; if (!getCell(row, nameField)) rowErrors.push(`Row ${rowNumber}: product name is missing.`); if (!priceField || Number.isNaN(Number(getCell(row, priceField)))) rowErrors.push(`Row ${rowNumber}: price must be a number.`); if (!quantityField || Number.isNaN(Number(getCell(row, quantityField)))) rowErrors.push(`Row ${rowNumber}: quantity must be a number.`); if (rowErrors.length === 0) validRows += 1; errors.push(...rowErrors); }); return { validRows, errors }; }
function buildProducts(file: ParsedFile | null, fields: DetectedField[]): ProductPayload[] { if (!file) return []; const nameField = fieldByTarget(fields, "name"); const priceField = fieldByTarget(fields, "price"); const quantityField = fieldByTarget(fields, "quantity"); const categoryField = fieldByTarget(fields, "category"); const descriptionField = fieldByTarget(fields, "description"); const costField = fieldByTarget(fields, "cost"); const lowStockField = fieldByTarget(fields, "lowStockLevel"); if (!nameField || !priceField || !quantityField) return []; return file.rows.slice(1).map((row) => ({ name: getCell(row, nameField), category: getCell(row, categoryField) || undefined, description: getCell(row, descriptionField) || undefined, price: Number(getCell(row, priceField)), cost: getCell(row, costField) ? Number(getCell(row, costField)) : undefined, quantity: Number(getCell(row, quantityField)), lowStockLevel: getCell(row, lowStockField) ? Number(getCell(row, lowStockField)) : 5 })).filter((product) => product.name && Number.isFinite(product.price) && Number.isFinite(product.quantity)); }
