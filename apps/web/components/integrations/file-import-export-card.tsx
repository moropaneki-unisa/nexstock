"use client";

import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAccessToken, getApiUrl } from "@/lib/api";

type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  total: number;
  errors: Array<{ row: number; message: string }>;
};

export function FileImportExportCard() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState<"csv" | "xlsx" | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function exportProducts(format: "csv" | "xlsx") {
    setExporting(format);
    setError(null);

    try {
      const token = getAccessToken();
      const response = await fetch(`${getApiUrl()}/api/products/export/file?format=${format}`, {
        credentials: "include",
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || body?.error || "Export failed");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const fileName = disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? `nexstock-products.${format}`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(null);
    }
  }

  async function importProducts() {
    if (!file) {
      setError("Choose a CSV or XLSX file first.");
      return;
    }

    setImporting(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = getAccessToken();
      const response = await fetch(`${getApiUrl()}/api/products/import/file`, {
        method: "POST",
        credentials: "include",
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || body?.error || "Import failed");

      setResult(body as ImportResult);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <FileSpreadsheet className="h-5 w-5" />
            </span>
            <div>
              <CardTitle>CSV / XLSX product import and export</CardTitle>
              <CardDescription className="mt-1">
                Export your current catalog or import products from spreadsheets. Custom fields export as columns prefixed with <span className="font-mono">custom:</span>.
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="w-fit rounded-full">CSV + XLSX</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
        {result && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            Import complete: {result.total} rows processed, {result.created} created, {result.updated} updated, {result.skipped} skipped.
            {result.errors.length > 0 && <span className="block mt-1">First issue: row {result.errors[0].row} - {result.errors[0].message}</span>}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-2xl border bg-muted/20 p-4">
            <p className="text-sm font-medium">Import products</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Upload <span className="font-mono">.csv</span>, <span className="font-mono">.xls</span>, or <span className="font-mono">.xlsx</span>. Rows with the same SKU update existing products; new SKUs create products.
            </p>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="mt-4 rounded-xl"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            {file && <p className="mt-2 text-xs text-muted-foreground">Selected: {file.name}</p>}
            <Button type="button" onClick={importProducts} disabled={importing || !file} className="mt-4 rounded-xl">
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Import file
            </Button>
          </div>

          <div className="rounded-2xl border bg-muted/20 p-4">
            <p className="text-sm font-medium">Export products</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Download your product catalog with core fields, image URLs, status, and active custom fields.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => exportProducts("csv")} disabled={exporting !== null} className="rounded-xl">
                {exporting === "csv" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Export CSV
              </Button>
              <Button type="button" variant="outline" onClick={() => exportProducts("xlsx")} disabled={exporting !== null} className="rounded-xl">
                {exporting === "xlsx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Export XLSX
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
