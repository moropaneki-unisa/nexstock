"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeftIcon, Loader2Icon, UploadIcon } from "lucide-react"
import { toast } from "sonner"
import * as XLSX from "xlsx"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiFetch } from "@/lib/api"
import { getCachedLayouts } from "@/lib/cached-api"

type ImportResult = { logId?: string; created?: number; updated?: number; skipped?: number; errors?: Array<{ row?: number; message?: string } | string> }
type LayoutField = { id?: string; key: string; label: string; type: string; required?: boolean | null; options?: string[] | null; defaultValue?: unknown; placeholder?: string | null; helpText?: string | null }
type Layout = { id: string; name: string; kind?: string | null; trackInventory?: boolean | null; fields?: LayoutField[] | null }
type Paginated<T> = { items?: T[]; data?: T[] }
type ImportDataType = "text" | "richtext" | "number" | "decimal" | "currency" | "attachment" | "images" | "lookup" | "boolean" | "select" | "date"
type ImportFieldDefinition = { key: string; column: string; source: "core" | "layout"; dataType: ImportDataType; required: boolean; allowedValues: string[]; importFormat: string; notes: string }

const backendFieldTypes: ImportDataType[] = ["text", "richtext", "number", "decimal", "currency", "attachment", "images", "lookup", "boolean", "select", "date"]
const noneValue = "none"

const coreFieldDefinitions: ImportFieldDefinition[] = [
  { key: "name", column: "Product Name", source: "core", dataType: "text", required: true, allowedValues: [], importFormat: "Plain text", notes: "Required. Backend skips rows without a product name." },
  { key: "sku", column: "SKU", source: "core", dataType: "text", required: false, allowedValues: [], importFormat: "Plain text", notes: "Existing SKU updates the matching product; empty SKU creates a generated SKU." },
  { key: "description", column: "Description", source: "core", dataType: "text", required: false, allowedValues: [], importFormat: "Plain text", notes: "Optional product description." },
  { key: "price", column: "Price", source: "core", dataType: "decimal", required: false, allowedValues: [], importFormat: "Number or decimal", notes: "Selling price." },
  { key: "priceCurrency", column: "Price Currency", source: "core", dataType: "text", required: false, allowedValues: [], importFormat: "3-letter currency code", notes: "Must match organization base currency." },
  { key: "cost", column: "Cost", source: "core", dataType: "decimal", required: false, allowedValues: [], importFormat: "Number or decimal", notes: "Optional buying/vendor cost." },
  { key: "costCurrency", column: "Cost Currency", source: "core", dataType: "text", required: false, allowedValues: [], importFormat: "3-letter enabled currency code", notes: "Must be enabled in currency settings." },
  { key: "exchangeRateToBase", column: "Exchange Rate To Base", source: "core", dataType: "decimal", required: false, allowedValues: [], importFormat: "Number or decimal", notes: "Used to convert cost to base currency." },
  { key: "quantity", column: "Quantity", source: "core", dataType: "number", required: false, allowedValues: [], importFormat: "Whole number, zero or more", notes: "Backend rounds this to whole product stock." },
  { key: "lowStockLevel", column: "Low Stock Level", source: "core", dataType: "number", required: false, allowedValues: [], importFormat: "Whole number, zero or more", notes: "Defaults to 5 when empty." },
  { key: "category", column: "Category", source: "core", dataType: "text", required: false, allowedValues: [], importFormat: "Plain text", notes: "Optional category label." },
  { key: "status", column: "Status", source: "core", dataType: "select", required: false, allowedValues: ["active", "draft", "archived"], importFormat: "One of: active, draft, archived", notes: "Defaults to active when empty or unrecognized." },
  { key: "images", column: "Images", source: "core", dataType: "images", required: false, allowedValues: [], importFormat: "URLs separated by comma or pipe", notes: "Optional image URLs." },
]

function normalizeList<T>(value: T[] | Paginated<T> | null | undefined) { return !value ? [] : Array.isArray(value) ? value : value.items ?? value.data ?? [] }
function normalizeFieldType(type: string | null | undefined): ImportDataType { const value = String(type || "text").trim().toLowerCase(); return backendFieldTypes.includes(value as ImportDataType) ? value as ImportDataType : "text" }
function normalizeHeader(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() }
function importSummary(result: ImportResult) { return [typeof result.created === "number" ? `${result.created} created` : null, typeof result.updated === "number" ? `${result.updated} updated` : null, typeof result.skipped === "number" ? `${result.skipped} skipped` : null].filter(Boolean).join(" · ") || "Import completed" }

async function readSpreadsheetHeaders(file: File) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: "array" })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return []
  const rows = XLSX.utils.sheet_to_json<Array<string | number | boolean>>(workbook.Sheets[sheetName], { header: 1, defval: "" })
  const headerRow = rows[0] ?? []
  return headerRow.map((cell) => String(cell ?? "").trim()).filter(Boolean)
}

function importFormatForLayoutField(field: LayoutField) {
  const type = normalizeFieldType(field.type)
  const options = field.options?.filter(Boolean) ?? []
  if (type === "select") return options.length ? `One of: ${options.join(", ")}` : "Select option configured in layout settings"
  if (type === "number") return "Whole number"
  if (type === "decimal") return "Number or decimal, e.g. 10.50"
  if (type === "currency") return "Amount and optional currency, e.g. 100 ZAR"
  if (type === "boolean") return "Yes/No, true/false, or 1/0"
  if (type === "date") return "YYYY-MM-DD"
  if (type === "images") return "One or more image URLs separated by comma or pipe"
  if (type === "attachment") return "Name=https://example.com/file.pdf, separated by pipe for multiple files"
  if (type === "lookup") return "Lookup name or JSON object with id/name"
  if (type === "richtext") return "Plain text or HTML text"
  return "Plain text"
}

function fieldDefinitionsForLayout(layout: Layout | null): ImportFieldDefinition[] {
  const layoutFields = (layout?.fields ?? []).map((field): ImportFieldDefinition => ({
    key: `custom:${field.key}`,
    column: field.label,
    source: "layout",
    dataType: normalizeFieldType(field.type),
    required: Boolean(field.required),
    allowedValues: field.options?.filter(Boolean) ?? [],
    importFormat: importFormatForLayoutField(field),
    notes: [field.helpText, field.placeholder ? `Placeholder: ${field.placeholder}` : null, Boolean(field.required) ? "Required by selected layout." : "Optional layout field."].filter(Boolean).join(" "),
  }))
  return [...coreFieldDefinitions, ...layoutFields]
}

function emptyMappings(fields: ImportFieldDefinition[]) { return Object.fromEntries(fields.map((field) => [field.key, noneValue])) as Record<string, string> }
function buildMapping(fields: ImportFieldDefinition[], mappings: Record<string, string>) { return Object.fromEntries(fields.filter((field) => mappings[field.key] && mappings[field.key] !== noneValue).map((field) => [field.key, mappings[field.key]])) }
function mappingPreview(fields: ImportFieldDefinition[], mappings: Record<string, string>) { return JSON.stringify(buildMapping(fields, mappings), null, 2) }

export function ImportMappingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const layoutIdFromQuery = searchParams.get("layoutId") || noneValue
  const [layouts, setLayouts] = React.useState<Layout[]>([])
  const [headers, setHeaders] = React.useState<string[]>([])
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [mappings, setMappings] = React.useState<Record<string, string>>({})
  const [loadingLayouts, setLoadingLayouts] = React.useState(true)
  const [uploading, setUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    async function loadLayouts() {
      setLoadingLayouts(true)
      try { setLayouts(normalizeList(await getCachedLayouts<Layout[] | Paginated<Layout>>()).filter((layout) => layout?.id)) }
      catch (error) { toast.error("Could not load layouts", { description: error instanceof Error ? error.message : "Request failed" }) }
      finally { setLoadingLayouts(false) }
    }
    void loadLayouts()
  }, [])

  const selectedLayout = layouts.find((layout) => layout.id === layoutIdFromQuery) ?? null
  const fields = React.useMemo(() => fieldDefinitionsForLayout(selectedLayout), [selectedLayout])
  const requiredMissing = fields.filter((field) => field.required && (!mappings[field.key] || mappings[field.key] === noneValue))
  const visualMapping = React.useMemo(() => buildMapping(fields, mappings), [fields, mappings])
  const mappedCount = Object.keys(visualMapping).length

  React.useEffect(() => { setMappings(emptyMappings(fields)) }, [fields])

  async function handleFileSelected(file: File) {
    setSelectedFile(file)
    setHeaders([])
    setMappings(emptyMappings(fields))
    try {
      const parsedHeaders = await readSpreadsheetHeaders(file)
      setHeaders(parsedHeaders)
      if (!parsedHeaders.length) toast.warning("No headers found", { description: "The first row must contain column names." })
      else toast.success("Spreadsheet headers loaded", { description: `${parsedHeaders.length} column${parsedHeaders.length === 1 ? "" : "s"} found.` })
    } catch (error) {
      toast.error("Could not read spreadsheet headers", { description: error instanceof Error ? error.message : "File parsing failed" })
    }
  }

  function autoMap() {
    if (!headers.length) return
    const next = emptyMappings(fields)
    for (const field of fields) {
      const targetNames = [field.column, field.key.replace(/^custom:/, ""), field.key]
      const match = headers.find((header) => targetNames.some((target) => normalizeHeader(target) === normalizeHeader(header)))
      if (match) next[field.key] = match
    }
    setMappings(next)
    toast.success("Suggested mappings applied", { description: "Review before starting import." })
  }

  async function uploadImport() {
    if (!selectedFile) {
      toast.error("Choose a CSV/XLSX file first")
      return
    }
    if (requiredMissing.length) {
      toast.error("Required mappings missing", { description: requiredMissing.map((field) => field.column).join(", ") })
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("mapping", JSON.stringify(visualMapping))
      formData.append("productTypeId", layoutIdFromQuery === noneValue ? noneValue : layoutIdFromQuery)
      const result = await apiFetch<ImportResult>("/api/products/import", { method: "POST", body: formData })
      const errors = result.errors ?? []
      if (errors.length) toast.warning("Import completed with warnings", { description: `${importSummary(result)} · ${errors.length} row issue${errors.length === 1 ? "" : "s"}` })
      else toast.success("Import completed", { description: importSummary(result) })
      router.push(result.logId ? `/imports/${result.logId}` : "/imports")
    } catch (error) {
      toast.error("Import failed", { description: error instanceof Error ? error.message : "Upload failed" })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
        <div>
          <p className="text-sm text-muted-foreground">Imports</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Map import columns</h1>
          <p className="text-sm text-muted-foreground">Upload your CSV/XLSX file, map columns, and start the import.</p>
        </div>
        <Button asChild variant="outline" size="sm"><Link href="/imports/new"><ArrowLeftIcon className="size-4" />Back to setup</Link></Button>
      </div>

      <div className="grid gap-4 px-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Column mapping</CardTitle>
            <CardDescription>Every mapping defaults to None. Select only spreadsheet columns that should be imported.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleFileSelected(file) }} />

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <UploadIcon className="size-4" />
                {selectedFile ? "Change file" : "Choose CSV/XLSX"}
              </Button>
              <Button type="button" variant="outline" onClick={autoMap} disabled={!headers.length || uploading}>Auto-match columns</Button>
              <Button type="button" onClick={() => void uploadImport()} disabled={!selectedFile || uploading || loadingLayouts}>
                {uploading ? <Loader2Icon className="size-4 animate-spin" /> : <UploadIcon className="size-4" />}
                Start import
              </Button>
            </div>

            {selectedFile ? <p className="text-sm text-muted-foreground">Selected file: <span className="font-medium text-foreground">{selectedFile.name}</span> · {headers.length} header{headers.length === 1 ? "" : "s"} found</p> : null}

            {!selectedFile || !headers.length ? (
              <div className="rounded-md border border-dashed p-8 text-center">
                <p className="font-medium">Choose a file to begin mapping</p>
                <p className="mt-1 text-sm text-muted-foreground">The first row of the first worksheet must contain spreadsheet column names.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">{mappedCount} mapped · {headers.length} spreadsheet header{headers.length === 1 ? "" : "s"}</p>
                  {requiredMissing.length ? <Badge variant="destructive">{requiredMissing.length} required missing</Badge> : <Badge variant="secondary">Required fields mapped</Badge>}
                </div>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/40 text-left text-muted-foreground">
                      <tr><th className="p-3 font-medium">NexStock field</th><th className="p-3 font-medium">Type</th><th className="p-3 font-medium">Spreadsheet column</th></tr>
                    </thead>
                    <tbody>
                      {fields.map((field) => (
                        <tr key={field.key} className="border-b last:border-0">
                          <td className="p-3 align-top"><div className="space-y-1"><div className="flex flex-wrap items-center gap-2"><span className="font-medium">{field.column}</span>{field.required ? <Badge variant="destructive">Required</Badge> : null}{field.source === "layout" ? <Badge variant="outline">Layout</Badge> : null}</div><p className="font-mono text-xs text-muted-foreground">{field.key}</p><p className="text-xs text-muted-foreground">{field.importFormat}</p></div></td>
                          <td className="p-3 align-top text-muted-foreground">{field.dataType}</td>
                          <td className="p-3 align-top"><Select value={mappings[field.key] ?? noneValue} onValueChange={(value) => setMappings((current) => ({ ...current, [field.key]: value }))} disabled={!headers.length || uploading}><SelectTrigger className="min-w-56"><SelectValue placeholder="None" /></SelectTrigger><SelectContent><SelectItem value={noneValue}>None</SelectItem>{headers.map((header) => <SelectItem key={`${field.key}-${header}`} value={header}>{header}</SelectItem>)}</SelectContent></Select></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <details className="rounded-md border p-3">
                  <summary className="cursor-pointer text-sm font-medium">Generated backend mapping preview</summary>
                  <pre className="mt-3 max-h-60 overflow-auto rounded-md bg-muted/40 p-3 text-xs">{mappingPreview(fields, mappings)}</pre>
                </details>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Mapping context</CardTitle><CardDescription>Rules and selected layout for this import.</CardDescription></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <FieldHint label="Layout" description={selectedLayout ? selectedLayout.name : "None"} />
            <FieldHint label="Defaults" description="Every field mapping starts as None and is only sent when a spreadsheet column is selected." />
            <FieldHint label="Required fields" description="Product Name and selected layout required fields must be mapped before import starts." />
            <FieldHint label="Backend payload" description="This page sends file, mapping, and productTypeId to POST /api/products/import." />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function FieldHint({ label, description }: { label: string; description: string }) {
  return <div className="rounded-md border p-3"><p className="font-mono text-xs font-medium">{label}</p><p className="text-xs text-muted-foreground">{description}</p></div>
}
