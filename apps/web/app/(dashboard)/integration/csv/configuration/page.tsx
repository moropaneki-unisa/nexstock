"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  DatabaseZap,
  FileSpreadsheet,
  Loader2,
  Save,
  ShieldCheck,
  Upload,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import {
  autoMapFields,
  createDefaultConfiguration,
  createHistory,
  createLog,
  storageKey,
  type IntegrationConfiguration,
  type SourceField,
} from "@/lib/integrations";

type CsvPreview = {
  fileName: string;
  rowCount: number;
  fields: SourceField[];
};

export default function CsvConfigurationPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const readiness = useMemo(
    () => [
      { label: "CSV selected", ready: Boolean(file) },
      { label: "Fields detected", ready: Boolean(preview?.fields.length) },
      { label: "Mapping draft created", ready: Boolean(preview?.fields.length) },
    ],
    [file, preview],
  );

  async function detectFields() {
    if (!file) {
      setError("Choose a CSV file before detecting fields.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const result = await extractCsvFields(file);
      if (!result.fields.length) throw new Error("No columns were detected in this CSV file.");
      setPreview(result);
      persistCsvConfiguration(result);
      setMessage(`${result.fields.length} fields detected. A mapping draft was saved and is ready to review.`);
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : "Could not detect fields from this CSV file.");
    } finally {
      setLoading(false);
    }
  }

  function persistCsvConfiguration(result: CsvPreview) {
    const base = createDefaultConfiguration("csv");
    const next: IntegrationConfiguration = {
      ...base,
      status: "configured",
      detectedFields: result.fields,
      mappings: autoMapFields(result.fields),
      mappingStatus: "draft",
      savedAt: new Date().toISOString(),
      history: [
        createHistory("CSV field detection", "success", `${result.fields.length} columns detected from ${result.fileName}.`),
        ...base.history,
      ],
      logs: [
        createLog("success", `CSV configuration saved for ${result.fileName}.`),
        ...base.logs,
      ],
      credentials: {
        fileName: result.fileName,
        rowCount: String(result.rowCount),
      },
    };

    window.localStorage.setItem(storageKey("csv"), JSON.stringify(next));
  }

  return (
    <PageShell className="space-y-6 pb-10">
      <PageHeader
        eyebrow="CSV integration"
        title="CSV configuration"
        description="Upload a CSV file, detect source columns, create a mapping draft, then review the mapping before syncing products."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-xl bg-background/70">
              <Link href="/integrations"><ArrowLeft className="h-4 w-4" />Back to integrations</Link>
            </Button>
            <Button asChild className="rounded-xl shadow-sm" disabled={!preview}>
              <Link href="/integration/csv/mapping">Review mapping<ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        }
      />

      {error && <div className="border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}
      {message && <div className="border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div>}

      <section className="border bg-card/95">
        <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          <Metric icon={FileSpreadsheet} label="Source" value="CSV" helper="File import" />
          <Metric icon={Upload} label="File" value={file ? "Selected" : "Required"} helper={file?.name ?? "Choose a file"} />
          <Metric icon={DatabaseZap} label="Fields" value={preview?.fields.length ?? 0} helper="Detected columns" />
          <Metric icon={ShieldCheck} label="Mapping" value={preview ? "Draft" : "Locked"} helper={preview ? "Ready to review" : "Detect fields first"} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <main className="space-y-6">
          <section className="border bg-card/95">
            <SectionHeader icon={FileSpreadsheet} title="Upload source file" description="Choose a CSV file exported from your store, supplier, ERP, spreadsheet, or inventory system." />
            <div className="border-t p-5">
              <label className="flex cursor-pointer flex-col items-center justify-center border border-dashed bg-muted/20 p-8 text-center transition hover:bg-muted/45">
                <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium">{file ? file.name : "Choose CSV file"}</span>
                <span className="mt-1 text-xs text-muted-foreground">CSV only. First row must contain column headers.</span>
                <Input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(event) => {
                    setFile(event.target.files?.[0] ?? null);
                    setPreview(null);
                    setError(null);
                    setMessage(null);
                  }}
                />
              </label>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button type="button" onClick={detectFields} disabled={loading || !file} className="rounded-xl">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <DatabaseZap className="h-4 w-4" />}
                  Detect fields
                </Button>
                {preview && (
                  <Button asChild variant="outline" className="rounded-xl bg-background/70">
                    <Link href="/integration/csv/mapping"><Save className="h-4 w-4" />Continue to mapping</Link>
                  </Button>
                )}
              </div>
            </div>
          </section>

          <section className="border bg-card/95">
            <SectionHeader icon={DatabaseZap} title="Detected CSV fields" description="These source columns were detected and saved as mapping suggestions." badge={preview ? `${preview.fields.length} fields` : undefined} />
            <div className="border-t">
              {preview?.fields.length ? (
                <div className="grid divide-y md:grid-cols-2 md:divide-x md:divide-y-0">
                  <div className="divide-y">
                    {preview.fields.filter((_, index) => index % 2 === 0).map((field) => <FieldRow key={field.key} field={field} />)}
                  </div>
                  <div className="divide-y">
                    {preview.fields.filter((_, index) => index % 2 === 1).map((field) => <FieldRow key={field.key} field={field} />)}
                  </div>
                </div>
              ) : (
                <EmptyState />
              )}
            </div>
          </section>
        </main>

        <aside className="space-y-6">
          <section className="border bg-card/95">
            <SectionHeader icon={CheckCircle2} title="Configuration readiness" />
            <div className="divide-y border-t">
              {readiness.map((item) => <ReadinessLine key={item.label} {...item} />)}
            </div>
          </section>

          <section className="border bg-card/95">
            <SectionHeader icon={ShieldCheck} title="Next steps" />
            <div className="divide-y border-t">
              <NextStep number="01" label="Upload CSV" ready={Boolean(file)} />
              <NextStep number="02" label="Detect fields" ready={Boolean(preview)} />
              <NextStep number="03" label="Review mapping" ready={false} />
              <NextStep number="04" label="Preview and sync" ready={false} />
            </div>
          </section>
        </aside>
      </section>
    </PageShell>
  );
}

function SectionHeader({ icon: Icon, title, description, badge }: { icon: any; title: string; description?: string; badge?: string }) {
  return <div className="flex flex-row items-start justify-between gap-4 p-5"><div><h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><Icon className="h-5 w-5" />{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>{badge && <Badge variant="secondary">{badge}</Badge>}</div>;
}

function Metric({ icon: Icon, label, value, helper }: { icon: any; label: string; value: string | number; helper: string }) {
  return <div className="flex items-center justify-between p-4"><div className="min-w-0"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 truncate text-xl font-semibold capitalize">{value}</p><p className="mt-1 truncate text-xs text-muted-foreground">{helper}</p></div><span className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span></div>;
}

function FieldRow({ field }: { field: SourceField }) {
  return <div className="p-4"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{field.label}</p>{field.type && <Badge variant="outline">{field.type}</Badge>}</div><p className="mt-2 font-mono text-xs text-muted-foreground">{field.key}</p>{field.sample && <p className="mt-2 truncate text-sm text-muted-foreground">Sample: {field.sample}</p>}</div>;
}

function ReadinessLine({ label, ready }: { label: string; ready: boolean }) {
  return <div className="flex items-center justify-between px-4 py-3 text-sm"><span className="flex items-center gap-2">{ready ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <ShieldCheck className="h-4 w-4 text-muted-foreground" />}{label}</span><Badge variant={ready ? "default" : "secondary"}>{ready ? "Ready" : "Required"}</Badge></div>;
}

function NextStep({ number, label, ready }: { number: string; label: string; ready: boolean }) {
  return <div className="flex items-center justify-between px-4 py-3 text-sm"><span className="flex items-center gap-3"><span className="font-mono text-xs text-muted-foreground">{number}</span>{label}</span><Badge variant={ready ? "default" : "secondary"}>{ready ? "Done" : "Next"}</Badge></div>;
}

function EmptyState() {
  return <div className="p-10 text-center"><DatabaseZap className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><p className="font-semibold">No fields detected yet</p><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Upload a CSV and click Detect fields. NexStock will read the headers and create a draft mapping.</p></div>;
}

async function extractCsvFields(file: File): Promise<CsvPreview> {
  const text = await file.text();
  const workbook = XLSX.read(text, { type: "string" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const sample = rows[0] ?? {};
  const fields = Object.keys(sample).map((key) => ({ key, label: key, sample: stringifySample(sample[key]), type: typeof sample[key] }));
  return { fileName: file.name, rowCount: rows.length, fields };
}

function stringifySample(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
