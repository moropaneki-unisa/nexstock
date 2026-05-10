"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  DatabaseZap,
  FileSpreadsheet,
  Loader2,
  PackagePlus,
  Rows3,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, PageShell } from "@/components/system/page-shell";

type StepId = "upload" | "preview" | "mapping" | "validate" | "summary";
type ParsedFile = { name: string; size: number; rows: string[][]; headers: string[] };
type MappingTarget = "ignore" | "name" | "category" | "description" | "price" | "cost" | "quantity" | "lowStockLevel";

const steps: Array<{ id: StepId; title: string; description: string }> = [
  { id: "upload", title: "Upload", description: "Choose a CSV file" },
  { id: "preview", title: "Preview", description: "Review detected rows" },
  { id: "mapping", title: "Mapping", description: "Match columns" },
  { id: "validate", title: "Validate", description: "Check readiness" },
  { id: "summary", title: "Summary", description: "Review result" },
];

const mappingTargets: Array<{ value: MappingTarget; label: string; required?: boolean }> = [
  { value: "ignore", label: "Ignore column" },
  { value: "name", label: "Product name", required: true },
  { value: "category", label: "Category" },
  { value: "description", label: "Description" },
  { value: "price", label: "Price", required: true },
  { value: "cost", label: "Cost" },
  { value: "quantity", label: "Quantity", required: true },
  { value: "lowStockLevel", label: "Low-stock level" },
];

export default function ImportsPage() {
  const [activeStep, setActiveStep] = useState<StepId>("upload");
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<Record<string, MappingTarget>>({});
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentIndex = steps.findIndex((step) => step.id === activeStep);
  const previewRows = parsedFile?.rows.slice(1, 9) ?? [];
  const dataRows = parsedFile?.rows.slice(1) ?? [];
  const requiredTargets = mappingTargets.filter((target) => target.required).map((target) => target.value);
  const mappedRequiredTargets = requiredTargets.filter((target) => Object.values(mapping).includes(target));
  const missingRequiredTargets = requiredTargets.filter((target) => !Object.values(mapping).includes(target));
  const validation = useMemo(() => validateRows(parsedFile, mapping), [parsedFile, mapping]);
  const progress = Math.round(((currentIndex + 1) / steps.length) * 100);

  async function handleFile(file: File | undefined) {
    setError(null);
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith(".csv")) {
      setError("CSV import is available now. XLSX support will be connected next.");
      return;
    }

    setIsParsing(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length < 2) throw new Error("The file must contain a header row and at least one product row.");
      const headers = rows[0].map((header, index) => header.trim() || `Column ${index + 1}`);
      setParsedFile({ name: file.name, size: file.size, rows, headers });
      setMapping(autoMapHeaders(headers));
      setActiveStep("preview");
      toast.success("File detected", { description: `${rows.length - 1} product row${rows.length - 1 === 1 ? "" : "s"} found.` });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not parse file";
      setError(message);
      toast.error("Import file failed", { description: message });
    } finally {
      setIsParsing(false);
    }
  }

  function goNext() {
    setError(null);
    if (!parsedFile) {
      setError("Upload a file before continuing.");
      return;
    }
    if (activeStep === "mapping" && missingRequiredTargets.length > 0) {
      setError(`Map required columns first: ${missingRequiredTargets.map(getTargetLabel).join(", ")}.`);
      return;
    }
    setActiveStep(steps[Math.min(currentIndex + 1, steps.length - 1)].id);
  }

  function goBack() {
    setError(null);
    setActiveStep(steps[Math.max(currentIndex - 1, 0)].id);
  }

  function markAsReady() {
    toast.success("Import reviewed", { description: "Next step: connect this reviewed file to the backend import job." });
  }

  return (
    <PageShell className="max-w-full space-y-6 overflow-x-hidden pb-10">
      <PageHeader
        eyebrow="Imports"
        title="Product import wizard"
        description="Upload product spreadsheets, preview rows, map columns to NexStock fields, and validate before importing."
        actions={
          <Button asChild variant="outline" className="w-full rounded-xl bg-background/70 sm:w-auto">
            <Link href="/integrations"><ArrowLeft className="h-4 w-4" />Back to integrations</Link>
          </Button>
        }
      />

      {error && <div className="border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"><AlertCircle className="mr-2 inline h-4 w-4" />{error}</div>}

      <section className="border bg-card/95">
        <div className="grid divide-y sm:grid-cols-2 md:grid-cols-5 md:divide-x md:divide-y-0">
          {steps.map((step, index) => (
            <button key={step.id} type="button" onClick={() => parsedFile && setActiveStep(step.id)} className={`p-4 text-left transition hover:bg-muted/40 ${activeStep === step.id ? "bg-primary/10" : ""}`}>
              <div className="flex items-center gap-2">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${activeStep === step.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{index + 1}</span>
                <span className="text-sm font-semibold">{step.title}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{step.description}</p>
            </button>
          ))}
        </div>
        <div className="border-t p-5">
          <div className="flex items-center justify-between gap-4 text-sm"><span className="font-medium">Import progress</span><span className="font-semibold">{progress}%</span></div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
        </div>
      </section>

      {activeStep === "upload" && (
        <section className="border bg-card/95">
          <SectionHeader icon={UploadCloud} title="Upload product file" description="Start with a CSV file. XLSX import will be connected after the backend job is added." />
          <div className="border-t p-5">
            <label className="flex cursor-pointer flex-col items-center justify-center border border-dashed bg-muted/20 p-8 text-center transition hover:bg-muted/45 sm:p-10">
              {isParsing ? <Loader2 className="mb-3 h-10 w-10 animate-spin text-muted-foreground" /> : <FileSpreadsheet className="mb-3 h-10 w-10 text-muted-foreground" />}
              <span className="text-sm font-semibold">{isParsing ? "Reading file..." : "Upload CSV file"}</span>
              <span className="mt-1 text-sm text-muted-foreground">Required columns: product name, price, quantity.</span>
              <Input type="file" accept=".csv" className="hidden" disabled={isParsing} onChange={(event) => handleFile(event.target.files?.[0])} />
            </label>
          </div>
        </section>
      )}

      {activeStep === "preview" && parsedFile && (
        <section className="border bg-card/95">
          <SectionHeader icon={Rows3} title="Preview detected rows" description={`${parsedFile.name} · ${dataRows.length} product row${dataRows.length === 1 ? "" : "s"}`} badge={`${parsedFile.headers.length} columns`} />
          <PreviewTable headers={parsedFile.headers} rows={previewRows} />
        </section>
      )}

      {activeStep === "mapping" && parsedFile && (
        <section className="border bg-card/95">
          <SectionHeader icon={DatabaseZap} title="Map columns" description="Match spreadsheet columns to NexStock product fields." badge={`${mappedRequiredTargets.length}/${requiredTargets.length} required`} />
          <div className="divide-y border-t">
            {parsedFile.headers.map((header) => (
              <div key={header} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_18rem] md:items-center">
                <div className="min-w-0"><p className="truncate font-medium">{header}</p><p className="mt-1 text-xs text-muted-foreground">Detected source column</p></div>
                <select value={mapping[header] ?? "ignore"} onChange={(event) => setMapping((current) => ({ ...current, [header]: event.target.value as MappingTarget }))} className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25">
                  {mappingTargets.map((target) => <option key={target.value} value={target.value}>{target.label}{target.required ? " *" : ""}</option>)}
                </select>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeStep === "validate" && parsedFile && (
        <section className="border bg-card/95">
          <SectionHeader icon={ShieldCheck} title="Validate import" description="Review required mappings and row readiness before creating products." badge={validation.errors.length === 0 ? "Ready" : `${validation.errors.length} issues`} />
          <div className="grid divide-y border-t md:grid-cols-3 md:divide-x md:divide-y-0">
            <ValidationCard title="Rows" value={dataRows.length} ready={dataRows.length > 0} />
            <ValidationCard title="Required mappings" value={`${mappedRequiredTargets.length}/${requiredTargets.length}`} ready={missingRequiredTargets.length === 0} />
            <ValidationCard title="Validation issues" value={validation.errors.length} ready={validation.errors.length === 0} />
          </div>
          {validation.errors.length > 0 && <div className="divide-y border-t">{validation.errors.slice(0, 10).map((item, index) => <div key={index} className="p-4 text-sm text-destructive">{item}</div>)}</div>}
        </section>
      )}

      {activeStep === "summary" && parsedFile && (
        <section className="border bg-card/95">
          <SectionHeader icon={PackagePlus} title="Import summary" description="This wizard is ready for backend job integration. The next step will create products using the mapped file data." />
          <div className="grid divide-y border-t md:grid-cols-3 md:divide-x md:divide-y-0">
            <ValidationCard title="File" value={parsedFile.name} ready />
            <ValidationCard title="Rows ready" value={validation.validRows} ready={validation.errors.length === 0} />
            <ValidationCard title="Mapped fields" value={Object.values(mapping).filter((value) => value !== "ignore").length} ready />
          </div>
          <div className="border-t p-5"><Button type="button" onClick={markAsReady} className="w-full rounded-xl sm:w-auto"><CheckCircle2 className="h-4 w-4" />Mark reviewed</Button></div>
        </section>
      )}

      <div className="flex flex-col-reverse justify-between gap-3 border bg-card/95 p-4 sm:flex-row">
        <Button type="button" variant="outline" onClick={goBack} disabled={activeStep === "upload"} className="rounded-xl bg-background/70">Back</Button>
        {activeStep === "summary" ? <Button asChild className="rounded-xl"><Link href="/products">Go to products<ArrowRight className="h-4 w-4" /></Link></Button> : <Button type="button" onClick={goNext} disabled={!parsedFile} className="rounded-xl">Continue<ArrowRight className="h-4 w-4" /></Button>}
      </div>
    </PageShell>
  );
}

function SectionHeader({ icon: Icon, title, description, badge }: { icon: any; title: string; description?: string; badge?: string }) {
  return <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5"><div className="min-w-0"><h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><Icon className="h-5 w-5 shrink-0" />{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>{badge && <Badge variant="secondary" className="w-fit shrink-0">{badge}</Badge>}</div>;
}

function PreviewTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return <div className="max-w-full overflow-x-auto border-t"><Table><TableHeader><TableRow>{headers.map((header) => <TableHead key={header} className="min-w-[10rem]">{header}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.map((row, index) => <TableRow key={index}>{headers.map((header, cellIndex) => <TableCell key={header} className="max-w-[14rem] truncate">{row[cellIndex] || "-"}</TableCell>)}</TableRow>)}</TableBody></Table></div>;
}

function ValidationCard({ title, value, ready }: { title: string; value: string | number; ready: boolean }) {
  return <div className="flex items-center justify-between gap-3 p-5"><div className="min-w-0"><p className="text-sm text-muted-foreground">{title}</p><p className="mt-1 truncate text-lg font-semibold">{value}</p></div><span className={`flex h-10 w-10 shrink-0 items-center justify-center ${ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{ready ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}</span></div>;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') { cell += '"'; i += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === "," && !quoted) { row.push(cell.trim()); cell = ""; continue; }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function autoMapHeaders(headers: string[]): Record<string, MappingTarget> {
  const mapping: Record<string, MappingTarget> = {};
  for (const header of headers) {
    const key = header.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (["name", "productname", "title"].includes(key)) mapping[header] = "name";
    else if (["category", "productcategory"].includes(key)) mapping[header] = "category";
    else if (["description", "desc"].includes(key)) mapping[header] = "description";
    else if (["price", "sellingprice", "saleprice"].includes(key)) mapping[header] = "price";
    else if (["cost", "costprice"].includes(key)) mapping[header] = "cost";
    else if (["quantity", "qty", "stock"].includes(key)) mapping[header] = "quantity";
    else if (["lowstocklevel", "reorderlevel", "minimumstock"].includes(key)) mapping[header] = "lowStockLevel";
    else mapping[header] = "ignore";
  }
  return mapping;
}

function validateRows(file: ParsedFile | null, mapping: Record<string, MappingTarget>) {
  if (!file) return { validRows: 0, errors: [] as string[] };
  const errors: string[] = [];
  const targetToIndex = new Map<MappingTarget, number>();
  file.headers.forEach((header, index) => targetToIndex.set(mapping[header] ?? "ignore", index));
  const nameIndex = targetToIndex.get("name");
  const priceIndex = targetToIndex.get("price");
  const quantityIndex = targetToIndex.get("quantity");
  let validRows = 0;
  file.rows.slice(1).forEach((row, index) => {
    const rowNumber = index + 2;
    const rowErrors: string[] = [];
    if (nameIndex === undefined || !row[nameIndex]) rowErrors.push(`Row ${rowNumber}: product name is missing.`);
    if (priceIndex === undefined || Number.isNaN(Number(row[priceIndex]))) rowErrors.push(`Row ${rowNumber}: price must be a number.`);
    if (quantityIndex === undefined || Number.isNaN(Number(row[quantityIndex]))) rowErrors.push(`Row ${rowNumber}: quantity must be a number.`);
    if (rowErrors.length === 0) validRows += 1;
    errors.push(...rowErrors);
  });
  return { validRows, errors };
}

function getTargetLabel(value: MappingTarget) { return mappingTargets.find((target) => target.value === value)?.label ?? value; }
