"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { ArrowRightLeft, CheckCircle2, Download, FileJson, FileSpreadsheet, Loader2, Sparkles, UploadCloud, Wand2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { cn } from "@/lib/utils";

type DataFormat = "csv" | "xlsx" | "json";
type RawRow = Record<string, unknown>;
type SanitizedProduct = Record<string, string | number>;
type Issue = { row: number; field: string; message: string; level: "fixed" | "warning" | "error" };

const formats: Array<{ value: DataFormat; label: string }> = [
  { value: "csv", label: "CSV" },
  { value: "xlsx", label: "XLSX" },
  { value: "json", label: "JSON" },
];

const aliases = {
  name: ["name", "product name", "product_name", "title", "item name", "item_name"],
  sku: ["sku", "code", "item code", "item_code", "product code", "product_code"],
  description: ["description", "details", "body", "body html", "body_html"],
  price: ["price", "rate", "selling price", "selling_price", "sales rate", "sales_rate"],
  cost: ["cost", "purchase rate", "purchase_rate", "buying price", "buying_price"],
  quantity: ["quantity", "qty", "stock", "stock on hand", "stock_on_hand", "inventory quantity"],
  category: ["category", "product type", "product_type", "type"],
  images: ["images", "image", "image url", "image_url", "photo", "media", "gallery"],
};

export default function DataToolsPage() {
  const [rows, setRows] = useState<RawRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [pasteValue, setPasteValue] = useState("");
  const [pasteFormat, setPasteFormat] = useState<DataFormat>("json");
  const [outputFormat, setOutputFormat] = useState<DataFormat>("xlsx");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const result = useMemo(() => sanitizeRows(rows), [rows]);

  async function handleFile(file: File | null) {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const format = detectFormat(file.name, file.type);
      const parsedRows = await parseFile(file, format);
      setRows(parsedRows);
      setFileName(file.name);
      setOutputFormat(format === "json" ? "xlsx" : "json");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not parse file");
    } finally {
      setLoading(false);
    }
  }

  function parsePastedData() {
    setError(null);
    try {
      if (!pasteValue.trim()) throw new Error("Paste JSON or CSV data first.");
      const parsedRows = parseText(pasteValue, pasteFormat);
      setRows(parsedRows);
      setFileName(`pasted.${pasteFormat}`);
      setOutputFormat(pasteFormat === "json" ? "xlsx" : "json");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not parse pasted data");
    }
  }

  function downloadSanitized() {
    if (!result.rows.length) return;
    const blob = createExportBlob(result.rows, outputFormat);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sanitizeFileName(fileName || "nexstock-data")}-sanitized.${outputFormat}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <PageShell className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Data operations"
        title="Data sanitation & converter"
        description="Clean messy product files and convert between JSON, CSV, and XLSX before importing into NexStock."
        actions={<Button type="button" onClick={downloadSanitized} disabled={!result.rows.length} className="rounded-xl shadow-sm"><Download className="h-4 w-4" />Download sanitized file</Button>}
      />

      {error && <div className="border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

      <section className="grid gap-6 xl:grid-cols-[24rem_1fr]">
        <aside className="space-y-6">
          <section className="border bg-card/95">
            <SectionTitle icon={UploadCloud} title="Upload data" description="CSV, XLSX, XLS, and JSON are supported." />
            <div className="border-t p-5">
              <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center border border-dashed bg-muted/20 p-6 text-center transition hover:bg-muted/35">
                {loading ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <UploadCloud className="h-8 w-8 text-primary" />}
                <span className="mt-3 text-sm font-semibold">Choose a file</span>
                <span className="mt-1 text-xs text-muted-foreground">JSON, CSV, XLSX, or XLS</span>
                <input type="file" accept=".json,.csv,.xlsx,.xls" className="hidden" onChange={(event) => void handleFile(event.target.files?.[0] ?? null)} />
              </label>
              {fileName && <div className="mt-4 border bg-background p-3 text-xs text-muted-foreground"><p className="font-semibold text-foreground">{fileName}</p><p>{rows.length} rows detected</p></div>}
            </div>
          </section>

          <section className="border bg-card/95">
            <SectionTitle icon={FileJson} title="Paste data" description="Use this for quick JSON or CSV cleanup." />
            <div className="space-y-3 border-t p-5">
              <div className="flex gap-2">{formats.filter((item) => item.value !== "xlsx").map((format) => <FormatButton key={format.value} active={pasteFormat === format.value} onClick={() => setPasteFormat(format.value)}>{format.label}</FormatButton>)}</div>
              <textarea value={pasteValue} onChange={(event) => setPasteValue(event.target.value)} placeholder='[{"Product Name":" Generator ","SKU":" gen-001 ","Price":"R 120,500","Stock":"7"}]' className="min-h-44 w-full border bg-background p-3 font-mono text-xs outline-none transition focus:border-primary" />
              <Button type="button" variant="outline" onClick={parsePastedData} className="w-full rounded-xl bg-background/70"><Wand2 className="h-4 w-4" />Sanitize pasted data</Button>
            </div>
          </section>
        </aside>

        <main className="space-y-6">
          <section className="grid gap-3 md:grid-cols-4">
            <Metric label="Rows detected" value={rows.length} />
            <Metric label="Sanitized rows" value={result.rows.length} />
            <Metric label="Fixed issues" value={result.issues.filter((issue) => issue.level === "fixed").length} />
            <Metric label="Warnings" value={result.issues.filter((issue) => issue.level !== "fixed").length} />
          </section>

          <section className="border bg-card/95">
            <SectionTitle icon={Sparkles} title="Sanitation rules" description="NexStock keeps useful data while normalizing product fields." />
            <div className="grid gap-3 border-t p-5 md:grid-cols-2 xl:grid-cols-3">
              {["Trims names, SKUs, descriptions, and categories", "Converts price, cost, and stock into numbers", "Normalizes image JSON strings and URL lists", "Generates missing SKUs", "Removes unsafe HTML/script content", "Keeps unknown fields in metadata"].map((rule) => <div key={rule} className="flex gap-3 border bg-background p-3 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>{rule}</span></div>)}
            </div>
          </section>

          <section className="border bg-card/95">
            <div className="flex flex-col gap-4 border-b p-5 md:flex-row md:items-center md:justify-between">
              <div><h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><ArrowRightLeft className="h-5 w-5" />Convert output</h2><p className="mt-1 text-sm text-muted-foreground">Export the sanitized result into your preferred format.</p></div>
              <div className="flex flex-wrap gap-2">{formats.map((format) => <FormatButton key={format.value} active={outputFormat === format.value} onClick={() => setOutputFormat(format.value)}>{format.label}</FormatButton>)}</div>
            </div>
            <div className="overflow-x-auto">{result.rows.length ? <PreviewTable rows={result.rows} /> : <div className="p-10 text-center text-sm text-muted-foreground">Upload or paste data to preview sanitized rows.</div>}</div>
          </section>

          <section className="border bg-card/95">
            <SectionTitle icon={FileSpreadsheet} title="Sanitation report" description="Review fields NexStock fixed or could not confidently repair." badge={`${result.issues.length} notices`} />
            <div className="border-t">{result.issues.length ? <div className="max-h-72 divide-y overflow-y-auto">{result.issues.slice(0, 100).map((issue, index) => <div key={`${issue.row}-${issue.field}-${index}`} className="p-4 text-sm"><Badge variant="outline">{issue.level}</Badge><span className="ml-3 font-medium">Row {issue.row} · {issue.field}</span><p className="mt-1 text-muted-foreground">{issue.message}</p></div>)}</div> : <div className="p-8 text-center text-sm text-muted-foreground">No issues yet.</div>}</div>
          </section>
        </main>
      </section>
    </PageShell>
  );
}

function SectionTitle({ icon: Icon, title, description, badge }: { icon: any; title: string; description?: string; badge?: string }) {
  return <div className="flex items-start justify-between gap-4 p-5"><div><h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><Icon className="h-5 w-5" />{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>{badge && <Badge variant="secondary">{badge}</Badge>}</div>;
}
function Metric({ label, value }: { label: string; value: number }) { return <div className="border bg-card/95 p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>; }
function FormatButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button type="button" onClick={onClick} className={cn("rounded-xl border px-3 py-2 text-sm font-semibold transition", active ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted/50")}>{children}</button>; }
function PreviewTable({ rows }: { rows: SanitizedProduct[] }) { const headers = ["name", "sku", "price", "quantity", "category", "images"]; return <table className="w-full min-w-[720px] text-sm"><thead><tr className="border-b bg-muted/25">{headers.map((header) => <th key={header} className="px-4 py-3 text-left font-semibold capitalize">{header}</th>)}</tr></thead><tbody>{rows.slice(0, 12).map((row, index) => <tr key={`${row.sku}-${index}`} className="border-b last:border-b-0">{headers.map((header) => <td key={header} className="max-w-[16rem] truncate px-4 py-3 text-muted-foreground">{String(row[header] ?? "")}</td>)}</tr>)}</tbody></table>; }
async function parseFile(file: File, format: DataFormat): Promise<RawRow[]> { if (format === "json" || format === "csv") return parseText(await file.text(), format); const buffer = await file.arrayBuffer(); const workbook = XLSX.read(buffer, { type: "array" }); const sheetName = workbook.SheetNames[0]; return sheetName ? XLSX.utils.sheet_to_json<RawRow>(workbook.Sheets[sheetName], { defval: "" }) : []; }
function parseText(value: string, format: DataFormat): RawRow[] { if (format === "json") { const parsed = JSON.parse(value); const data = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.products) ? parsed.products : Array.isArray(parsed?.items) ? parsed.items : [parsed]; return data.map(flattenObject); } if (format === "xlsx") throw new Error("Upload XLSX files instead of pasting them."); return parseCsv(value); }
function sanitizeRows(rows: RawRow[]) { const issues: Issue[] = []; const cleanRows = rows.map((row, index) => sanitizeRow(row, index + 1, issues)); return { rows: cleanRows, issues }; }
function sanitizeRow(row: RawRow, rowNumber: number, issues: Issue[]): SanitizedProduct { const normalized = new Map(Object.entries(row).map(([key, value]) => [normalizeHeader(key), value])); const used = new Set<string>(); const get = (field: keyof typeof aliases) => { for (const alias of aliases[field]) { const key = normalizeHeader(alias); if (normalized.has(key)) { used.add(key); return normalized.get(key); } } return undefined; }; const name = cleanText(get("name")); const skuRaw = cleanText(get("sku")); const sku = sanitizeSku(skuRaw || `AUTO-${String(rowNumber).padStart(5, "0")}`); if (!skuRaw) issues.push({ row: rowNumber, field: "sku", level: "fixed", message: `Missing SKU. Generated ${sku}.` }); if (!name) issues.push({ row: rowNumber, field: "name", level: "error", message: "Missing product name." }); const metadata: Record<string, unknown> = {}; for (const [key, value] of Object.entries(row)) { if (!used.has(normalizeHeader(key)) && String(value ?? "").trim()) metadata[key] = value; } return { name, sku, description: cleanText(get("description")), price: parseMoney(get("price")), cost: parseMoney(get("cost")), quantity: parseInteger(get("quantity"), 0), lowStockLevel: 5, category: cleanText(get("category")) || "Uncategorized", images: normalizeImages(get("images")), metadata: JSON.stringify(metadata) }; }
function createExportBlob(rows: SanitizedProduct[], format: DataFormat) { if (format === "json") return new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" }); if (format === "csv") return new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }); const worksheet = XLSX.utils.json_to_sheet(rows); const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, worksheet, "Sanitized products"); return new Blob([XLSX.write(workbook, { type: "array", bookType: "xlsx" })], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }); }
function detectFormat(fileName: string, mimeType: string): DataFormat { const name = fileName.toLowerCase(); if (name.endsWith(".json") || mimeType.includes("json")) return "json"; if (name.endsWith(".xlsx") || name.endsWith(".xls") || mimeType.includes("spreadsheet")) return "xlsx"; if (name.endsWith(".csv") || mimeType.includes("csv")) return "csv"; throw new Error("Unsupported file type. Use JSON, CSV, XLSX, or XLS."); }
function parseCsv(content: string): RawRow[] { const rows = XLSX.utils.sheet_to_json<RawRow>(XLSX.read(content, { type: "string" }).Sheets.Sheet1, { defval: "" }); return rows; }
function toCsv(rows: SanitizedProduct[]) { const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row)))); return [headers.join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))].join("\n"); }
function csvEscape(value: unknown) { const text = value == null ? "" : String(value); return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; }
function normalizeHeader(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function cleanText(value: unknown) { return value == null ? "" : String(value).replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim(); }
function sanitizeSku(value: string) { return value.trim().toUpperCase().replace(/\s+/g, "-").replace(/[^A-Z0-9-_]/g, "").slice(0, 64) || "AUTO-SKU"; }
function parseMoney(value: unknown) { if (value == null || value === "") return 0; const parsed = Number(String(value).replace(/[^0-9.-]/g, "")); return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0; }
function parseInteger(value: unknown, fallback: number) { if (value == null || value === "") return fallback; const parsed = Math.round(Number(String(value).replace(/[^0-9.-]/g, ""))); return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback; }
function normalizeImages(value: unknown) { if (value == null || value === "") return ""; if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean).join("|"); const text = String(value).trim(); try { const parsed = JSON.parse(text); if (Array.isArray(parsed)) return parsed.map((item) => typeof item === "string" ? item : item?.url || item?.src || "").map(String).filter(Boolean).join("|"); } catch {} return text.split(/[|,;]/).map((item) => item.trim()).filter(Boolean).join("|"); }
function flattenObject(value: any, prefix = ""): RawRow { if (!value || typeof value !== "object" || Array.isArray(value)) return { [prefix || "value"]: value }; const result: RawRow = {}; for (const [key, item] of Object.entries(value)) { const nextKey = prefix ? `${prefix}.${key}` : key; if (Array.isArray(item)) result[nextKey] = item.every((entry) => typeof entry !== "object") ? item.join("|") : JSON.stringify(item); else if (item && typeof item === "object") Object.assign(result, flattenObject(item, nextKey)); else result[nextKey] = item; } return result; }
function sanitizeFileName(value: string) { return value.toLowerCase().replace(/\.[^.]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "nexstock-data"; }
