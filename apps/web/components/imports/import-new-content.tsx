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

type Layout = {
  id: string
  name: string
  kind?: string | null
  trackInventory?: boolean | null
  fields?: Array<{
    id?: string
    key: string
    label: string
    type: string
    required?: boolean | null
    options?: string[] | null
  }> | null
}

type Paginated<T> = {
  items?: T[]
  data?: T[]
}

const coreColumns = ["Product Name", "SKU", "Description", "Price", "Quantity", "Low Stock Level", "Category", "Status", "Images"]

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

function mappingForLayout(layout: Layout | null) {
  const mapping: Record<string, string> = {
    name: "Product Name",
    sku: "SKU",
    description: "Description",
    price: "Price",
    quantity: "Quantity",
    lowStockLevel: "Low Stock Level",
    category: "Category",
    status: "Status",
    images: "Images",
  }

  for (const field of layout?.fields ?? []) {
    mapping[`custom:${field.key}`] = field.label
  }

  return JSON.stringify(mapping, null, 2)
}

function templateColumns(layout: Layout | null) {
  return [...coreColumns, ...(layout?.fields ?? []).map((field) => field.label)]
}

function exampleValueForField(field: NonNullable<Layout["fields"]>[number]) {
  if (field.type === "select") return field.options?.[0] || ""
  if (field.type === "number") return "10"
  if (field.type === "decimal") return "10.50"
  if (field.type === "currency") return "100 ZAR"
  if (field.type === "boolean") return "Yes"
  if (field.type === "date") return "2026-05-15"
  if (field.type === "images") return "https://example.com/image.jpg"
  if (field.type === "attachment") return "Spec Sheet=https://example.com/spec.pdf"
  return ""
}

function templateRows(layout: Layout | null) {
  const row: Record<string, string> = {
    "Product Name": "Example Product",
    SKU: "EXAMPLE-001",
    Description: "Example product description",
    Price: "100",
    Quantity: "10",
    "Low Stock Level": "2",
    Category: "Example Category",
    Status: "active",
    Images: "https://example.com/image.jpg",
  }

  for (const field of layout?.fields ?? []) {
    row[field.label] = exampleValueForField(field)
  }

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
    const columns = templateColumns(selectedLayout)
    const rows = templateRows(selectedLayout)

    if (format === "json") {
      downloadBlob(`${fileBase}.json`, "application/json", JSON.stringify({ layout: selectedLayout ? { id: selectedLayout.id, name: selectedLayout.name } : null, mapping: parseMapping(mapping), columns, rows }, null, 2))
      toast.success("JSON import structure exported")
      return
    }

    if (format === "csv") {
      const csv = [columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))].join("\n")
      downloadBlob(`${fileBase}.csv`, "text/csv;charset=utf-8", csv)
      toast.success("CSV import structure exported")
      return
    }

    const worksheet = XLSX.utils.json_to_sheet(rows, { header: columns })
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Import Template")
    XLSX.writeFile(workbook, `${fileBase}.xlsx`)
    toast.success("XLSX import structure exported")
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
                Default is None. Choosing a layout updates the JSON mapping example and applies its fields/rules to imported products.
              </p>
            </div>

            <div className="rounded-md border bg-muted/20 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">Export data structure</p>
                  <p className="text-xs text-muted-foreground">Download a template matching the selected layout.</p>
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
                    JSON
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
            <FieldHint label="Mapping example" description="Changing the selected layout regenerates the mapping JSON example with that layout's custom fields." />
            <FieldHint label="Template export" description="Export CSV, XLSX, or JSON import structures for the selected layout." />
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
