"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon, DownloadIcon, Loader2Icon, UploadIcon } from "lucide-react"
import { toast } from "sonner"
import * as XLSX from "xlsx"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { apiFetch } from "@/lib/api"
import { getCachedLayouts } from "@/lib/cached-api"

type ImportResult = { logId?: string; created?: number; updated?: number; skipped?: number; errors?: Array<{ row?: number; message?: string } | string> }
type LayoutField = { id?: string; key: string; label: string; type: string; required?: boolean | null; options?: string[] | null; defaultValue?: unknown; placeholder?: string | null; helpText?: string | null }
type Layout = { id: string; name: string; kind?: string | null; trackInventory?: boolean | null; fields?: LayoutField[] | null }
type Paginated<T> = { items?: T[]; data?: T[] }
type ImportDataType = "text" | "richtext" | "number" | "decimal" | "currency" | "attachment" | "images" | "lookup" | "boolean" | "select" | "date"
type ImportFieldDefinition = { key: string; column: string; source: "core" | "layout"; dataType: ImportDataType; required: boolean; defaultValue: unknown; example: string; allowedValues: string[]; importFormat: string; notes: string }

const backendFieldTypes: ImportDataType[] = ["text", "richtext", "number", "decimal", "currency", "attachment", "images", "lookup", "boolean", "select", "date"]
const noneValue = "none"

const coreFieldDefinitions: ImportFieldDefinition[] = [
  { key: "name", column: "Product Name", source: "core", dataType: "text", required: true, defaultValue: null, example: "Example Product", allowedValues: [], importFormat: "Plain text", notes: "Required. Backend skips rows without a product name." },
  { key: "sku", column: "SKU", source: "core", dataType: "text", required: false, defaultValue: "Auto-generated when empty", example: "EXAMPLE-001", allowedValues: [], importFormat: "Plain text", notes: "Existing SKU updates the matching product; empty SKU creates a new generated SKU." },
  { key: "description", column: "Description", source: "core", dataType: "text", required: false, defaultValue: null, example: "Example product description", allowedValues: [], importFormat: "Plain text", notes: "Optional product description." },
  { key: "price", column: "Price", source: "core", dataType: "decimal", required: false, defaultValue: 0, example: "100.00", allowedValues: [], importFormat: "Number or decimal", notes: "Selling price. Price currency must match the organization's base currency." },
  { key: "priceCurrency", column: "Price Currency", source: "core", dataType: "text", required: false, defaultValue: "Organization base currency", example: "ZAR", allowedValues: [], importFormat: "3-letter currency code", notes: "Backend parses this as a currency code. This is not a layout field type." },
  { key: "cost", column: "Cost", source: "core", dataType: "decimal", required: false, defaultValue: null, example: "70.00", allowedValues: [], importFormat: "Number or decimal", notes: "Optional buying/vendor cost." },
  { key: "costCurrency", column: "Cost Currency", source: "core", dataType: "text", required: false, defaultValue: "Price currency", example: "ZAR", allowedValues: [], importFormat: "3-letter enabled currency code", notes: "Backend parses this as a currency code. It must be enabled in organization currency settings." },
  { key: "exchangeRateToBase", column: "Exchange Rate To Base", source: "core", dataType: "decimal", required: false, defaultValue: "System rate or 1", example: "1", allowedValues: [], importFormat: "Number or decimal", notes: "Used to convert cost to base currency when cost currency differs." },
  { key: "quantity", column: "Quantity", source: "core", dataType: "number", required: false, defaultValue: 0, example: "10", allowedValues: [], importFormat: "Whole number, zero or more", notes: "Backend rounds this to a whole number for product stock." },
  { key: "lowStockLevel", column: "Low Stock Level", source: "core", dataType: "number", required: false, defaultValue: 5, example: "2", allowedValues: [], importFormat: "Whole number, zero or more", notes: "Backend rounds this to a whole number. Defaults to 5 when empty." },
  { key: "category", column: "Category", source: "core", dataType: "text", required: false, defaultValue: null, example: "Example Category", allowedValues: [], importFormat: "Plain text", notes: "Optional category label." },
  { key: "status", column: "Status", source: "core", dataType: "select", required: false, defaultValue: "active", example: "active", allowedValues: ["active", "draft", "archived"], importFormat: "One of: active, draft, archived", notes: "Backend defaults to active when empty or unrecognized." },
  { key: "images", column: "Images", source: "core", dataType: "images", required: false, defaultValue: [], example: "https://example.com/image.jpg", allowedValues: [], importFormat: "One or more URLs separated by comma or pipe", notes: "Optional image URLs." },
]

function normalizeList<T>(value: T[] | Paginated<T> | null | undefined) { return !value ? [] : Array.isArray(value) ? value : value.items ?? value.data ?? [] }
function normalizeFieldType(type: string | null | undefined): ImportDataType { const value = String(type || "text").trim().toLowerCase(); return backendFieldTypes.includes(value as ImportDataType) ? value as ImportDataType : "text" }
function normalizeHeader(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() }
function importSummary(result: ImportResult) { return [typeof result.created === "number" ? `${result.created} created` : null, typeof result.updated === "number" ? `${result.updated} updated` : null, typeof result.skipped === "number" ? `${result.skipped} skipped` : null].filter(Boolean).join(" · ") || "Import completed" }
function safeFilePart(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "products" }
function csvEscape(value: unknown) { const text = String(value ?? ""); return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text }
function downloadBlob(fileName: string, contentType: string, content: BlobPart) { const blob = new Blob([content], { type: contentType }); const url = window.URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = fileName; document.body.appendChild(link); link.click(); link.remove(); window.URL.revokeObjectURL(url) }

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
  if (type === "currency") return "Amount and optional currency, e.g. 100 ZAR or {\"amount\":100,\"currency\":\"ZAR\"}"
  if (type === "boolean") return "Yes/No, true/false, or 1/0"
  if (type === "date") return "YYYY-MM-DD"
  if (type === "images") return "One or more image URLs separated by comma or pipe"
  if (type === "attachment") return "Name=https://example.com/file.pdf, separated by pipe for multiple files"
  if (type === "lookup") return "Lookup name or JSON object with id/name"
  if (type === "richtext") return "Plain text or HTML text"
  return "Plain text"
}

function exampleValueForField(field: LayoutField) {
  const type = normalizeFieldType(field.type)
  if (field.defaultValue !== undefined && field.defaultValue !== null && field.defaultValue !== "") return String(field.defaultValue)
  if (type === "select") return field.options?.[0] || ""
  if (type === "number") return "10"
  if (type === "decimal") return "10.50"
  if (type === "currency") return "100 ZAR"
  if (type === "boolean") return "Yes"
  if (type === "date") return "2026-05-15"
  if (type === "images") return "https://example.com/image.jpg"
  if (type === "attachment") return "Spec Sheet=https://example.com/spec.pdf"
  if (type === "lookup") return "Example Lookup"
  if (type === "richtext") return "Example rich text"
  return ""
}

function fieldDefinitionsForLayout(layout: Layout | null): ImportFieldDefinition[] {
  const layoutFields = (layout?.fields ?? []).map((field): ImportFieldDefinition => ({
    key: `custom:${field.key}`,
    column: field.label,
    source: "layout",
    dataType: normalizeFieldType(field.type),
    required: Boolean(field.required),
    defaultValue: field.defaultValue ?? null,
    example: exampleValueForField(field),
    allowedValues: field.options?.filter(Boolean) ?? [],
    importFormat: importFormatForLayoutField(field),
    notes: [field.helpText, field.placeholder ? `Placeholder: ${field.placeholder}` : null, Boolean(field.required) ? "Required by selected layout." : "Optional layout field."].filter(Boolean).join(" "),
  }))
  return [...coreFieldDefinitions, ...layoutFields]
}

function emptyMappings(fields: ImportFieldDefinition[]) { return Object.fromEntries(fields.map((field) => [field.key, noneValue])) as Record<string, string> }
function buildMapping(fields: ImportFieldDefinition[], mappings: Record<string, string>) { return Object.fromEntries(fields.filter((field) => mappings[field.key] && mappings[field.key] !== noneValue).map((field) => [field.key, mappings[field.key]])) }
function mappingPreview(fields: ImportFieldDefinition[], mappings: Record<string, string>) { return JSON.stringify(buildMapping(fields, mappings), null, 2) }
function templateRows(layout: Layout | null) { return [Object.fromEntries(fieldDefinitionsForLayout(layout).map((field) => [field.column, field.example]))] }

function schemaForLayout(layout: Layout | null, mapping: Record<string, string>) {
  const fields = fieldDefinitionsForLayout(layout)
  return {
    schemaVersion: 1,
    app: "NexStock",
    importableByBackend: false,
    validUploadFormats: ["csv", "xlsx"],
    supportedLayoutFieldTypes: backendFieldTypes,
    generatedAt: new Date().toISOString(),
    purpose: "Developer/reference schema for the CSV/XLSX product import template. This JSON file is not uploadable to the current backend importer.",
    backendContract: { endpoint: "POST /api/products/import", contentType: "multipart/form-data", fields: ["file", "mapping", "productTypeId"], xlsxImporterReads: "first worksheet only" },
    layout: layout ? { id: layout.id, name: layout.name, kind: layout.kind ?? "physical", trackInventory: layout.trackInventory ?? true } : null,
    defaults: { layout: "none until selected by user", fieldMappings: "none until selected by user", selectFields: "none/empty until spreadsheet value matches configured option", sku: "auto-generated when empty", status: "active", quantity: 0, lowStockLevel: 5 },
    mapping,
    columns: fields.map((field) => ({ column: field.column, mapsTo: field.key, source: field.source, dataType: field.dataType, required: field.required, defaultValue: field.defaultValue, allowedValues: field.allowedValues, example: field.example, importFormat: field.importFormat, notes: field.notes })),
    sampleRows: templateRows(layout),
    validationRules: ["Product Name is required.", "SKU updates an existing product when it matches; empty SKU creates a generated SKU.", "Price must be numeric and Price Currency must match the organization's base currency.", "Cost Currency must be enabled in organization currency settings.", "Quantity and Low Stock Level use the backend number datatype and are rounded to whole numbers for stock fields.", "Status uses the select datatype with active, draft, or archived; unrecognized/empty status becomes active.", "Selected layout required fields must be mapped and provided.", "Selected layout select fields must match one of their configured options; none is treated as empty and is not saved."],
  }
}

export function ImportNewContent() {
  const router = useRouter()
  const [layouts, setLayouts] = React.useState<Layout[]>([])
  const [selectedLayoutId, setSelectedLayoutId] = React.useState("none")
  const [headers, setHeaders] = React.useState<string[]>([])
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [mappings, setMappings] = React.useState<Record<string, string>>({})
  const [loadingLayouts, setLoadingLayouts] = React.useState(true)
  const [uploading, setUploading] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState("setup")
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

  const selectedLayout = layouts.find((layout) => layout.id === selectedLayoutId) ?? null
  const fields = React.useMemo(() => fieldDefinitionsForLayout(selectedLayout), [selectedLayout])
  const selectedFields = selectedLayout?.fields ?? []
  const requiredMissing = fields.filter((field) => field.required && (!mappings[field.key] || mappings[field.key] === noneValue))
  const visualMapping = React.useMemo(() => buildMapping(fields, mappings), [fields, mappings])
  const mappedCount = Object.keys(visualMapping).length

  React.useEffect(() => { setMappings(emptyMappings(fields)) }, [fields])

  function handleLayoutChange(value: string) {
    setSelectedLayoutId(value)
    setActiveTab("setup")
  }

  async function handleFileSelected(file: File) {
    setSelectedFile(file)
    setHeaders([])
    setMappings(emptyMappings(fields))
    try {
      const parsedHeaders = await readSpreadsheetHeaders(file)
      setHeaders(parsedHeaders)
      if (!parsedHeaders.length) toast.warning("No headers found", { description: "The first row must contain column names." })
      else {
        toast.success("Spreadsheet headers loaded", { description: `${parsedHeaders.length} column${parsedHeaders.length === 1 ? "" : "s"} found. Open Mapping to continue.` })
        setActiveTab("mapping")
      }
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

  function exportTemplate(format: "csv" | "xlsx" | "json") {
    const fileBase = `nexstock-import-template-${safeFilePart(selectedLayout?.name || "no-layout")}`
    const exportFields = fieldDefinitionsForLayout(selectedLayout)
    const columns = exportFields.map((field) => field.column)
    const rows = templateRows(selectedLayout)
    const fieldGuideRows = exportFields.map((field) => ({ Column: field.column, "Maps To": field.key, Source: field.source, "Data Type": field.dataType, Required: field.required ? "Yes" : "No", Default: field.defaultValue === null || field.defaultValue === undefined ? "None" : JSON.stringify(field.defaultValue), Example: field.example, "Allowed Values": field.allowedValues.join(", "), Format: field.importFormat, Notes: field.notes }))
    const selectRows = exportFields.filter((field) => field.dataType === "select").flatMap((field) => (field.allowedValues.length ? field.allowedValues : ["None / configure options in settings"]).map((option) => ({ Field: field.key, Column: field.column, Option: option })))

    if (format === "json") {
      downloadBlob(`${fileBase}.schema.json`, "application/json", JSON.stringify(schemaForLayout(selectedLayout, visualMapping), null, 2))
      toast.success("Developer schema exported", { description: "JSON is a reference file, not an import upload." })
      return
    }
    if (format === "csv") {
      downloadBlob(`${fileBase}.csv`, "text/csv;charset=utf-8", [columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))].join("\n"))
      toast.success("CSV import template exported")
      return
    }

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows, { header: columns }), "Import Template")
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(fieldGuideRows), "Field Guide")
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(selectRows.length ? selectRows : [{ Field: "No select fields", Column: "", Option: "" }]), "Select Options")
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ Key: "Layout", Value: selectedLayout?.name || "None" }, { Key: "Layout ID", Value: selectedLayout?.id || "none" }, { Key: "Backend imports", Value: "Only the first worksheet named Import Template is imported" }, { Key: "Generated At", Value: new Date().toISOString() }]), "Import Info")
    XLSX.writeFile(workbook, `${fileBase}.xlsx`)
    toast.success("XLSX import workbook exported", { description: "Upload the workbook as-is; backend imports the first sheet." })
  }

  async function uploadImport() {
    if (!selectedFile) {
      toast.error("Choose a CSV/XLSX file first")
      setActiveTab("setup")
      return
    }
    if (requiredMissing.length) {
      toast.error("Required mappings missing", { description: requiredMissing.map((field) => field.column).join(", ") })
      setActiveTab("mapping")
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("mapping", JSON.stringify(visualMapping))
      formData.append("productTypeId", selectedLayoutId === noneValue ? noneValue : selectedLayoutId)
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
          <h1 className="font-heading text-2xl font-semibold tracking-tight">New import</h1>
          <p className="text-sm text-muted-foreground">Set up the import, then map spreadsheet columns in a dedicated Mapping tab.</p>
        </div>
        <Button asChild variant="outline" size="sm"><Link href="/imports"><ArrowLeftIcon className="size-4" />Back to imports</Link></Button>
      </div>

      <div className="grid gap-4 px-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Upload and map spreadsheet</CardTitle>
            <CardDescription>Setup and mapping are split into tabs for a cleaner import workflow.</CardDescription>
          </CardHeader>
          <CardContent>
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleFileSelected(file) }} />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-5">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="setup">1. Setup</TabsTrigger>
                <TabsTrigger value="mapping">2. Mapping</TabsTrigger>
              </TabsList>

              <TabsContent value="setup" className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Product layout</label>
                  <Select value={selectedLayoutId} onValueChange={handleLayoutChange} disabled={loadingLayouts || uploading}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent><SelectItem value={noneValue}>None</SelectItem>{layouts.map((layout) => <SelectItem key={layout.id} value={layout.id}>{layout.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Default is None. Choosing a layout updates available fields and required mapping rules.</p>
                </div>

                <div className="rounded-md border bg-muted/20 p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div><p className="text-sm font-medium">Export data structure</p><p className="text-xs text-muted-foreground">CSV/XLSX are importable. JSON Schema is reference only.</p></div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => exportTemplate("csv")}><DownloadIcon className="size-4" />CSV template</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => exportTemplate("xlsx")}><DownloadIcon className="size-4" />XLSX workbook</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => exportTemplate("json")}><DownloadIcon className="size-4" />Schema JSON</Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-md border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">Import file</p>
                      <p className="text-xs text-muted-foreground">Choose a CSV/XLSX file. Headers are read from the first row of the first worksheet.</p>
                    </div>
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      <UploadIcon className="size-4" />
                      {selectedFile ? "Change file" : "Choose CSV/XLSX"}
                    </Button>
                  </div>
                  {selectedFile ? (
                    <div className="mt-4 rounded-md bg-muted/40 p-3 text-sm">
                      <p><span className="font-medium">Selected file:</span> {selectedFile.name}</p>
                      <p className="text-muted-foreground">{headers.length} header{headers.length === 1 ? "" : "s"} found</p>
                    </div>
                  ) : null}
                </div>

                <div className="flex justify-end">
                  <Button type="button" onClick={() => setActiveTab("mapping")} disabled={!selectedFile || !headers.length}>
                    Continue to Mapping
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="mapping" className="space-y-5">
                <div className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">Column mapper</p>
                    <p className="text-xs text-muted-foreground">Each select defaults to None. Required fields must be mapped before import.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => setActiveTab("setup")}>Back to Setup</Button>
                    <Button type="button" variant="outline" onClick={autoMap} disabled={!headers.length || uploading}>Auto-match columns</Button>
                    <Button type="button" onClick={() => void uploadImport()} disabled={!selectedFile || uploading}>
                      {uploading ? <Loader2Icon className="size-4 animate-spin" /> : <UploadIcon className="size-4" />}
                      Start import
                    </Button>
                  </div>
                </div>

                {!selectedFile || !headers.length ? (
                  <div className="rounded-md border border-dashed p-8 text-center">
                    <p className="font-medium">Choose a file first</p>
                    <p className="mt-1 text-sm text-muted-foreground">Go to Setup and choose a CSV/XLSX file so headers can be mapped.</p>
                    <Button className="mt-4" variant="outline" onClick={() => setActiveTab("setup")}>Go to Setup</Button>
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
                          <tr>
                            <th className="p-3 font-medium">NexStock field</th>
                            <th className="p-3 font-medium">Type</th>
                            <th className="p-3 font-medium">Spreadsheet column</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fields.map((field) => (
                            <tr key={field.key} className="border-b last:border-0">
                              <td className="p-3 align-top">
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-medium">{field.column}</span>
                                    {field.required ? <Badge variant="destructive">Required</Badge> : null}
                                    {field.source === "layout" ? <Badge variant="outline">Layout</Badge> : null}
                                  </div>
                                  <p className="font-mono text-xs text-muted-foreground">{field.key}</p>
                                  <p className="text-xs text-muted-foreground">{field.importFormat}</p>
                                </div>
                              </td>
                              <td className="p-3 align-top text-muted-foreground">{field.dataType}</td>
                              <td className="p-3 align-top">
                                <Select value={mappings[field.key] ?? noneValue} onValueChange={(value) => setMappings((current) => ({ ...current, [field.key]: value }))} disabled={!headers.length || uploading}>
                                  <SelectTrigger className="min-w-56"><SelectValue placeholder="None" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={noneValue}>None</SelectItem>
                                    {headers.map((header) => <SelectItem key={`${field.key}-${header}`} value={header}>{header}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </td>
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
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Import rules</CardTitle><CardDescription>Rules verified against the backend import service.</CardDescription></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <FieldHint label="Setup tab" description="Choose the product layout, export templates, and upload the CSV/XLSX file." />
            <FieldHint label="Mapping tab" description="Map spreadsheet columns to NexStock fields. Every select defaults to None." />
            <FieldHint label="Upload formats" description="Only CSV and XLSX are importable by the backend. JSON is schema/reference only." />
            <FieldHint label="Required fields" description="Product Name and selected layout required fields must be mapped before import starts." />
            {selectedLayout ? <div className="rounded-md border p-3"><p className="font-medium">Selected layout: {selectedLayout.name}</p><p className="text-xs text-muted-foreground">{selectedFields.length} field{selectedFields.length === 1 ? "" : "s"} available for mapping.</p><div className="mt-3 space-y-2">{selectedFields.slice(0, 8).map((field) => <div key={field.key} className="rounded border p-2 text-xs"><p className="font-mono">custom:{field.key}</p><p className="text-muted-foreground">{field.label} · {normalizeFieldType(field.type)}{field.required ? " · required" : ""}</p>{normalizeFieldType(field.type) === "select" && field.options?.length ? <p className="text-muted-foreground">Options: {field.options.join(", ")}</p> : null}</div>)}</div></div> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function FieldHint({ label, description }: { label: string; description: string }) {
  return <div className="rounded-md border p-3"><p className="font-mono text-xs font-medium">{label}</p><p className="text-xs text-muted-foreground">{description}</p></div>
}
