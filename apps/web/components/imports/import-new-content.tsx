"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon, ArrowRightIcon, DownloadIcon } from "lucide-react"
import { toast } from "sonner"
import * as XLSX from "xlsx"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getCachedLayouts } from "@/lib/cached-api"

type LayoutField = { id?: string; key: string; label: string; type: string; required?: boolean | null; options?: string[] | null; defaultValue?: unknown; placeholder?: string | null; helpText?: string | null }
type Layout = { id: string; name: string; kind?: string | null; trackInventory?: boolean | null; fields?: LayoutField[] | null }
type Paginated<T> = { items?: T[]; data?: T[] }
type ImportDataType = "text" | "richtext" | "number" | "decimal" | "currency" | "attachment" | "images" | "lookup" | "boolean" | "select" | "date"
type ImportFieldDefinition = { key: string; column: string; source: "core" | "layout"; dataType: ImportDataType; required: boolean; defaultValue: unknown; example: string; allowedValues: string[]; importFormat: string; notes: string }

const backendFieldTypes: ImportDataType[] = ["text", "richtext", "number", "decimal", "currency", "attachment", "images", "lookup", "boolean", "select", "date"]
const noneValue = "none"

const coreFieldDefinitions: ImportFieldDefinition[] = [
  { key: "name", column: "Product Name", source: "core", dataType: "text", required: true, defaultValue: null, example: "Example Product", allowedValues: [], importFormat: "Plain text", notes: "Required. Backend skips rows without a product name." },
  { key: "sku", column: "SKU", source: "core", dataType: "text", required: false, defaultValue: "Auto-generated when empty", example: "EXAMPLE-001", allowedValues: [], importFormat: "Plain text", notes: "Existing SKU updates the matching product; empty SKU creates a generated SKU." },
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
function safeFilePart(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "products" }
function csvEscape(value: unknown) { const text = String(value ?? ""); return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text }
function downloadBlob(fileName: string, contentType: string, content: BlobPart) { const blob = new Blob([content], { type: contentType }); const url = window.URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = fileName; document.body.appendChild(link); link.click(); link.remove(); window.URL.revokeObjectURL(url) }

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

function templateRows(layout: Layout | null) { return [Object.fromEntries(fieldDefinitionsForLayout(layout).map((field) => [field.column, field.example]))] }
function schemaForLayout(layout: Layout | null) {
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
    columns: fields.map((field) => ({ column: field.column, mapsTo: field.key, source: field.source, dataType: field.dataType, required: field.required, defaultValue: field.defaultValue, allowedValues: field.allowedValues, example: field.example, importFormat: field.importFormat, notes: field.notes })),
    sampleRows: templateRows(layout),
  }
}

export function ImportNewContent() {
  const router = useRouter()
  const [layouts, setLayouts] = React.useState<Layout[]>([])
  const [selectedLayoutId, setSelectedLayoutId] = React.useState(noneValue)
  const [loadingLayouts, setLoadingLayouts] = React.useState(true)

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
  const selectedFields = selectedLayout?.fields ?? []

  function exportTemplate(format: "csv" | "xlsx" | "json") {
    const fileBase = `nexstock-import-template-${safeFilePart(selectedLayout?.name || "no-layout")}`
    const exportFields = fieldDefinitionsForLayout(selectedLayout)
    const columns = exportFields.map((field) => field.column)
    const rows = templateRows(selectedLayout)
    const fieldGuideRows = exportFields.map((field) => ({ Column: field.column, "Maps To": field.key, Source: field.source, "Data Type": field.dataType, Required: field.required ? "Yes" : "No", Default: field.defaultValue === null || field.defaultValue === undefined ? "None" : JSON.stringify(field.defaultValue), Example: field.example, "Allowed Values": field.allowedValues.join(", "), Format: field.importFormat, Notes: field.notes }))
    const selectRows = exportFields.filter((field) => field.dataType === "select").flatMap((field) => (field.allowedValues.length ? field.allowedValues : ["None / configure options in settings"]).map((option) => ({ Field: field.key, Column: field.column, Option: option })))

    if (format === "json") {
      downloadBlob(`${fileBase}.schema.json`, "application/json", JSON.stringify(schemaForLayout(selectedLayout), null, 2))
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

  function continueToMapping() {
    const query = selectedLayoutId === noneValue ? "" : `?layoutId=${encodeURIComponent(selectedLayoutId)}`
    router.push(`/imports/new/mapping${query}`)
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
        <div>
          <p className="text-sm text-muted-foreground">Imports</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">New import</h1>
          <p className="text-sm text-muted-foreground">Choose a layout and download templates, then continue to the mapping page.</p>
        </div>
        <Button asChild variant="outline" size="sm"><Link href="/imports"><ArrowLeftIcon className="size-4" />Back to imports</Link></Button>
      </div>

      <div className="grid gap-4 px-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Import setup</CardTitle>
            <CardDescription>Set the layout context before opening the dedicated mapping page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Product layout</label>
              <Select value={selectedLayoutId} onValueChange={setSelectedLayoutId} disabled={loadingLayouts}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent><SelectItem value={noneValue}>None</SelectItem>{layouts.map((layout) => <SelectItem key={layout.id} value={layout.id}>{layout.name}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Default is None. Choose a layout only when this import should follow that layout's fields and required rules.</p>
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

            <div className="flex justify-end">
              <Button type="button" onClick={continueToMapping}>
                Continue to mapping
                <ArrowRightIcon className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Setup rules</CardTitle><CardDescription>How this page affects the import.</CardDescription></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <FieldHint label="Layout default" description="The layout starts as None. The chosen layout is passed to the mapping page." />
            <FieldHint label="Dedicated mapping page" description="CSV/XLSX upload, header detection, column mapping, and Start Import happen on /imports/new/mapping." />
            <FieldHint label="Templates" description="Templates use the selected layout. XLSX guide sheets are reference-only; the first sheet is importable." />
            {selectedLayout ? <div className="rounded-md border p-3"><p className="font-medium">Selected layout: {selectedLayout.name}</p><p className="text-xs text-muted-foreground">{selectedFields.length} field{selectedFields.length === 1 ? "" : "s"} available for mapping.</p><div className="mt-3 space-y-2">{selectedFields.slice(0, 8).map((field) => <div key={field.key} className="rounded border p-2 text-xs"><p className="font-mono">custom:{field.key}</p><p className="text-muted-foreground">{field.label} · {normalizeFieldType(field.type)}{field.required ? " · required" : ""}</p></div>)}</div></div> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function FieldHint({ label, description }: { label: string; description: string }) {
  return <div className="rounded-md border p-3"><p className="font-mono text-xs font-medium">{label}</p><p className="text-xs text-muted-foreground">{description}</p></div>
}
