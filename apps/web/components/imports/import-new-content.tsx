"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeftIcon, DownloadIcon, Loader2Icon, UploadIcon } from "lucide-react"
import { toast } from "sonner"
import * as XLSX from "xlsx"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiFetch } from "@/lib/api"
import { getCachedLayouts } from "@/lib/cached-api"

type ImportResult = {
  logId?: string
  status?: string
  created?: number
  updated?: number
  skipped?: number
  total?: number
  errors?: Array<{ row?: number; message?: string } | string>
}

type LayoutField = {
  id?: string
  key: string
  label: string
  type: string
  required?: boolean | null
  options?: string[] | null
  defaultValue?: unknown
  placeholder?: string | null
  helpText?: string | null
}

type Layout = {
  id: string
  name: string
  kind?: string | null
  trackInventory?: boolean | null
  fields?: LayoutField[] | null
}

type Paginated<T> = {
  items?: T[]
  data?: T[]
}

type ImportFieldDefinition = {
  key: string
  column: string
  source: "core" | "layout"
  dataType: string
  required: boolean
  defaultValue: unknown
  example: string
  allowedValues: string[]
  importFormat: string
  notes: string
}

const coreFieldDefinitions: ImportFieldDefinition[] = [
  {
    key: "name",
    column: "Product Name",
    source: "core",
    dataType: "text",
    required: true,
    defaultValue: null,
    example: "Example Product",
    allowedValues: [],
    importFormat: "Plain text",
    notes: "Required. Used as the product display name.",
  },
  {
    key: "sku",
    column: "SKU",
    source: "core",
    dataType: "text",
    required: false,
    defaultValue: "Auto-generated when empty",
    example: "EXAMPLE-001",
    allowedValues: [],
    importFormat: "Plain text; must be unique per organization when provided",
    notes: "Existing SKU updates the matching product; empty SKU creates a new generated SKU.",
  },
  {
    key: "description",
    column: "Description",
    source: "core",
    dataType: "text",
    required: false,
    defaultValue: null,
    example: "Example product description",
    allowedValues: [],
    importFormat: "Plain text",
    notes: "Optional product description.",
  },
  {
    key: "price",
    column: "Price",
    source: "core",
    dataType: "decimal",
    required: false,
    defaultValue: 0,
    example: "100.00",
    allowedValues: [],
    importFormat: "Number or decimal, e.g. 100 or 100.50",
    notes: "Selling price. Current backend expects selling currency to match organization base currency.",
  },
  {
    key: "quantity",
    column: "Quantity",
    source: "core",
    dataType: "integer",
    required: false,
    defaultValue: 0,
    example: "10",
    allowedValues: [],
    importFormat: "Whole number, zero or more",
    notes: "Stock on hand. Inventory logs are created when quantity changes.",
  },
  {
    key: "lowStockLevel",
    column: "Low Stock Level",
    source: "core",
    dataType: "integer",
    required: false,
    defaultValue: 5,
    example: "2",
    allowedValues: [],
    importFormat: "Whole number, zero or more",
    notes: "Used for low-stock alerts. Defaults to 5 when empty.",
  },
  {
    key: "category",
    column: "Category",
    source: "core",
    dataType: "text",
    required: false,
    defaultValue: null,
    example: "Example Category",
    allowedValues: [],
    importFormat: "Plain text",
    notes: "Optional category label.",
  },
  {
    key: "status",
    column: "Status",
    source: "core",
    dataType: "select",
    required: false,
    defaultValue: "active",
    example: "active",
    allowedValues: ["active", "draft", "archived"],
    importFormat: "One of: active, draft, archived",
    notes: "Defaults to active when empty or unrecognized.",
  },
  {
    key: "images",
    column: "Images",
    source: "core",
    dataType: "images",
    required: false,
    defaultValue: [],
    example: "https://example.com/image.jpg",
    allowedValues: [],
    importFormat: "One or more URLs separated by comma or pipe",
    notes: "Optional image URLs.",
  },
]

function normalizeList<T>(value: T[] | Paginated<T> | null | undefined) {
  if (!value) return []
  if (Array.isArray(value)) return value
  return value.items ?? value.data ?? []
}

function importSummary(result: ImportResult) {
  return [
    typeof result.created === "number" ? `${result.created} created` : null,
    typeof result.updated === "number" ? `${result.updated} updated` : null,
    typeof result.skipped === "number" ? `${result.skipped} skipped` : null,
  ].filter(Boolean).join(" · ") || "Import completed"
}

function parseMapping(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return {}
  const parsed = JSON.parse(trimmed)
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Mapping must be a JSON object")
  return parsed as Record<string, string>
}

function normalizeFieldType(type: string | null | undefined) {
  return String(type || "text").trim().toLowerCase()
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

function mappingForLayout(layout: Layout | null) {
  const mapping = Object.fromEntries(fieldDefinitionsForLayout(layout).map((field) => [field.key, field.column]))
  return JSON.stringify(mapping, null, 2)
}

function templateRows(layout: Layout | null) {
  const row = Object.fromEntries(fieldDefinitionsForLayout(layout).map((field) => [field.column, field.example]))
  return [row]
}

function safeFilePart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "products"
}

function downloadBlob(fileName: string, contentType: string, content: BlobPart) {
  const blob = new Blob([content], { type: contentType })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

function csvEscape(value: unknown) {
  const text = String(value ?? "")
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function schemaForLayout(layout: Layout | null, mapping: Record<string, string>) {
  const fields = fieldDefinitionsForLayout(layout)
  return {
    schemaVersion: 1,
    app: "NexStock",
    generatedAt: new Date().toISOString(),
    purpose: "Product spreadsheet import structure and validation guide",
    layout: layout
      ? {
          id: layout.id,
          name: layout.name,
          kind: layout.kind ?? "physical",
          trackInventory: layout.trackInventory ?? true,
        }
      : null,
    defaults: {
      layout: "none until selected by user",
      selectFields: "none/empty until spreadsheet value matches configured option",
      sku: "auto-generated when empty",
      status: "active",
      quantity: 0,
      lowStockLevel: 5,
    },
    mapping,
    columns: fields.map((field) => ({
      column: field.column,
      mapsTo: field.key,
      source: field.source,
      dataType: field.dataType,
      required: field.required,
      defaultValue: field.defaultValue,
      allowedValues: field.allowedValues,
      example: field.example,
      importFormat: field.importFormat,
      notes: field.notes,
    })),
    sampleRows: templateRows(layout),
    validationRules: [
      "Product Name is required.",
      "SKU updates an existing product when it matches; empty SKU creates a generated SKU.",
      "Price must be numeric and use the organization's base currency.",
      "Quantity and Low Stock Level must be zero or positive whole numbers.",
      "Status should be active, draft, or archived.",
      "Selected layout required fields must be mapped and provided.",
      "Selected layout select fields must match one of their configured options; none is treated as empty and is not saved.",
    ],
  }
}

export function ImportNewContent() {
  const router = useRouter()
  const [mapping, setMapping] = React.useState(() => mappingForLayout(null))
  const [layouts, setLayouts] = React.useState<Layout[]>([])
  const [selectedLayoutId, setSelectedLayoutId] = React.useState("none")
  const [loadingLayouts, setLoadingLayouts] = React.useState(true)
  const [uploading, setUploading] = React.useState(false)
  const [fileName, setFileName] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    async function loadLayouts() {
      setLoadingLayouts(true)
      try {
        const result = await getCachedLayouts<Layout[] | Paginated<Layout>>()
        setLayouts(normalizeList(result).filter((layout) => layout?.id))
      } catch (error) {
        toast.error("Could not load layouts", { description: error instanceof Error ? error.message : "Request failed" })
      } finally {
        setLoadingLayouts(false)
      }
    }

    void loadLayouts()
  }, [])

  const selectedLayout = layouts.find((layout) => layout.id === selectedLayoutId) ?? null
  const selectedFields = selectedLayout?.fields ?? []

  function handleLayoutChange(value: string) {
    const layout = layouts.find((item) => item.id === value) ?? null
    setSelectedLayoutId(value)
    setMapping(mappingForLayout(layout))
  }

  function exportTemplate(format: "csv" | "xlsx" | "json") {
    const layoutName = selectedLayout?.name || "no-layout"
    const fileBase = `nexstock-import-template-${safeFilePart(layoutName)}`
    const fields = fieldDefinitionsForLayout(selectedLayout)
    const columns = fields.map((field) => field.column)
    const rows = templateRows(selectedLayout)
    const parsedMapping = parseMapping(mapping)
    const fieldGuideRows = fields.map((field) => ({
      Column: field.column,
      "Maps To": field.key,
      Source: field.source,
      "Data Type": field.dataType,
      Required: field.required ? "Yes" : "No",
      Default: field.defaultValue === null || field.defaultValue === undefined ? "None" : JSON.stringify(field.defaultValue),
      Example: field.example,
      "Allowed Values": field.allowedValues.join(", "),
      Format: field.importFormat,
      Notes: field.notes,
    }))
    const selectRows = fields
      .filter((field) => field.dataType === "select")
      .flatMap((field) => (field.allowedValues.length ? field.allowedValues : ["None / configure options in settings"]).map((option) => ({
        Field: field.key,
        Column: field.column,
        Option: option,
      })))

    if (format === "json") {
      downloadBlob(`${fileBase}.json`, "application/json", JSON.stringify(schemaForLayout(selectedLayout, parsedMapping), null, 2))
      toast.success("JSON schema exported")
      return
    }

    if (format === "csv") {
      const csv = [columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))].join("\n")
      downloadBlob(`${fileBase}.csv`, "text/csv;charset=utf-8", csv)
      toast.success("CSV import template exported")
      return
    }

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows, { header: columns }), "Import Template")
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(fieldGuideRows), "Field Guide")
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(selectRows.length ? selectRows : [{ Field: "No select fields", Column: "", Option: "" }]), "Select Options")
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ Key: "Layout", Value: selectedLayout?.name || "None" }, { Key: "Layout ID", Value: selectedLayout?.id || "none" }, { Key: "Generated At", Value: new Date().toISOString() }]), "Import Info")
    XLSX.writeFile(workbook, `${fileBase}.xlsx`)
    toast.success("XLSX workbook exported")
  }

  async function uploadImport(file: File) {
    setUploading(true)
    setFileName(file.name)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("mapping", JSON.stringify(parseMapping(mapping)))
      formData.append("productTypeId", selectedLayoutId === "none" ? "none" : selectedLayoutId)

      const result = await apiFetch<ImportResult>("/api/products/import", {
        method: "POST",
        body: formData,
      })

      const errors = result.errors ?? []
      if (errors.length) {
        toast.warning("Import completed with warnings", {
          description: `${importSummary(result)} · ${errors.length} row issue${errors.length === 1 ? "" : "s"}`,
        })
      } else {
        toast.success("Import completed", { description: importSummary(result) })
      }

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
          <p className="text-sm text-muted-foreground">Upload a product spreadsheet, choose a layout, and map its columns to NexStock fields.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/imports">
            <ArrowLeftIcon className="size-4" />
            Back to imports
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 px-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Upload spreadsheet</CardTitle>
            <CardDescription>Supported formats: CSV and XLSX. Select a layout only when the import should follow that layout's fields and rules.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void uploadImport(file)
              }}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium">Product layout</label>
              <Select value={selectedLayoutId} onValueChange={handleLayoutChange} disabled={loadingLayouts || uploading}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {layouts.map((layout) => (
                    <SelectItem key={layout.id} value={layout.id}>{layout.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Default is None. Choosing a layout updates the mapping JSON and export schema with that layout's field types and rules.
              </p>
            </div>

            <div className="rounded-md border bg-muted/20 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">Export data structure</p>
                  <p className="text-xs text-muted-foreground">CSV is upload-ready. XLSX includes field guide sheets. JSON includes a typed schema.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => exportTemplate("csv")}>
                    <DownloadIcon className="size-4" />
                    CSV
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => exportTemplate("xlsx")}>
                    <DownloadIcon className="size-4" />
                    XLSX
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => exportTemplate("json")}>
                    <DownloadIcon className="size-4" />
                    JSON Schema
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Column mapping JSON</label>
              <textarea
                value={mapping}
                onChange={(event) => setMapping(event.target.value)}
                className="min-h-64 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">
                Keys are NexStock fields. Values are spreadsheet column names. Use <span className="font-mono">custom:fieldKey</span> for selected layout fields.
              </p>
            </div>

            <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2Icon className="size-4 animate-spin" /> : <UploadIcon className="size-4" />}
              {uploading ? `Uploading ${fileName || "file"}...` : "Choose file and import"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import rules</CardTitle>
            <CardDescription>How layout and select defaults are applied.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <FieldHint label="Layout default" description="Layout defaults to None until the user chooses one." />
            <FieldHint label="Typed JSON schema" description="JSON export includes data types, required flags, defaults, allowed values, examples, and validation rules." />
            <FieldHint label="XLSX workbook" description="XLSX export includes Import Template, Field Guide, Select Options, and Import Info sheets." />
            <FieldHint label="Select defaults" description="Select fields are treated as None unless a spreadsheet value is provided and it matches a configured option." />
            <FieldHint label="Required layout fields" description="If a selected layout field is required, the import row must include a mapped value." />
            {selectedLayout ? (
              <div className="rounded-md border p-3">
                <p className="font-medium">Selected layout: {selectedLayout.name}</p>
                <p className="text-xs text-muted-foreground">{selectedFields.length} field{selectedFields.length === 1 ? "" : "s"} available for mapping.</p>
                <div className="mt-3 space-y-2">
                  {selectedFields.slice(0, 8).map((field) => (
                    <div key={field.key} className="rounded border p-2 text-xs">
                      <p className="font-mono">custom:{field.key}</p>
                      <p className="text-muted-foreground">{field.label} · {field.type}{field.required ? " · required" : ""}</p>
                      {field.type === "select" && field.options?.length ? (
                        <p className="text-muted-foreground">Options: {field.options.join(", ")}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function FieldHint({ label, description }: { label: string; description: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="font-mono text-xs font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}
