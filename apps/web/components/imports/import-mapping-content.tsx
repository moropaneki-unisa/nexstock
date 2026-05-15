"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FileSpreadsheetIcon,
  Loader2Icon,
  RefreshCwIcon,
  SearchIcon,
  SparklesIcon,
  UploadCloudIcon,
  UploadIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"
import * as XLSX from "xlsx"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { apiFetch } from "@/lib/api"
import { getCachedLayouts } from "@/lib/cached-api"
import { cn } from "@/lib/utils"

type ImportResult = {
  logId?: string
  created?: number
  updated?: number
  skipped?: number
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
type Paginated<T> = { items?: T[]; data?: T[] }
type ImportDataType =
  | "text"
  | "richtext"
  | "number"
  | "decimal"
  | "currency"
  | "attachment"
  | "images"
  | "lookup"
  | "boolean"
  | "select"
  | "date"
type ImportFieldDefinition = {
  key: string
  column: string
  source: "core" | "layout"
  dataType: ImportDataType
  required: boolean
  allowedValues: string[]
  importFormat: string
  notes: string
}

const backendFieldTypes: ImportDataType[] = [
  "text",
  "richtext",
  "number",
  "decimal",
  "currency",
  "attachment",
  "images",
  "lookup",
  "boolean",
  "select",
  "date",
]
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

function normalizeList<T>(value: T[] | Paginated<T> | null | undefined) {
  return !value ? [] : Array.isArray(value) ? value : (value.items ?? value.data ?? [])
}
function normalizeFieldType(type: string | null | undefined): ImportDataType {
  const value = String(type || "text").trim().toLowerCase()
  return backendFieldTypes.includes(value as ImportDataType) ? (value as ImportDataType) : "text"
}
function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}
function importSummary(result: ImportResult) {
  return (
    [
      typeof result.created === "number" ? `${result.created} created` : null,
      typeof result.updated === "number" ? `${result.updated} updated` : null,
      typeof result.skipped === "number" ? `${result.skipped} skipped` : null,
    ]
      .filter(Boolean)
      .join(" · ") || "Import completed"
  )
}

async function readSpreadsheetHeaders(file: File) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: "array" })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return []
  const rows = XLSX.utils.sheet_to_json<Array<string | number | boolean>>(
    workbook.Sheets[sheetName],
    { header: 1, defval: "" },
  )
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
  const layoutFields = (layout?.fields ?? []).map(
    (field): ImportFieldDefinition => ({
      key: `custom:${field.key}`,
      column: field.label,
      source: "layout",
      dataType: normalizeFieldType(field.type),
      required: Boolean(field.required),
      allowedValues: field.options?.filter(Boolean) ?? [],
      importFormat: importFormatForLayoutField(field),
      notes: [
        field.helpText,
        field.placeholder ? `Placeholder: ${field.placeholder}` : null,
        Boolean(field.required) ? "Required by selected layout." : "Optional layout field.",
      ]
        .filter(Boolean)
        .join(" "),
    }),
  )
  return [...coreFieldDefinitions, ...layoutFields]
}

function emptyMappings(fields: ImportFieldDefinition[]) {
  return Object.fromEntries(fields.map((field) => [field.key, noneValue])) as Record<string, string>
}
function buildMapping(fields: ImportFieldDefinition[], mappings: Record<string, string>) {
  return Object.fromEntries(
    fields
      .filter((field) => mappings[field.key] && mappings[field.key] !== noneValue)
      .map((field) => [field.key, mappings[field.key]]),
  )
}
function mappingPreview(fields: ImportFieldDefinition[], mappings: Record<string, string>) {
  return JSON.stringify(buildMapping(fields, mappings), null, 2)
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

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
  const [dragOver, setDragOver] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [sourceFilter, setSourceFilter] = React.useState<"all" | "core" | "layout" | "required" | "mapped" | "unmapped">("all")
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    async function loadLayouts() {
      setLoadingLayouts(true)
      try {
        setLayouts(
          normalizeList(await getCachedLayouts<Layout[] | Paginated<Layout>>()).filter(
            (layout) => layout?.id,
          ),
        )
      } catch (error) {
        toast.error("Could not load layouts", {
          description: error instanceof Error ? error.message : "Request failed",
        })
      } finally {
        setLoadingLayouts(false)
      }
    }
    void loadLayouts()
  }, [])

  const selectedLayout = layouts.find((layout) => layout.id === layoutIdFromQuery) ?? null
  const fields = React.useMemo(() => fieldDefinitionsForLayout(selectedLayout), [selectedLayout])
  const requiredFields = fields.filter((field) => field.required)
  const requiredMissing = requiredFields.filter(
    (field) => !mappings[field.key] || mappings[field.key] === noneValue,
  )
  const visualMapping = React.useMemo(() => buildMapping(fields, mappings), [fields, mappings])
  const mappedCount = Object.keys(visualMapping).length
  const totalUsable = mappedCount / Math.max(fields.length, 1)

  const filteredFields = React.useMemo(() => {
    const term = search.trim().toLowerCase()
    return fields.filter((field) => {
      if (term) {
        const haystack = `${field.column} ${field.key} ${field.dataType}`.toLowerCase()
        if (!haystack.includes(term)) return false
      }
      const isMapped = mappings[field.key] && mappings[field.key] !== noneValue
      if (sourceFilter === "core" && field.source !== "core") return false
      if (sourceFilter === "layout" && field.source !== "layout") return false
      if (sourceFilter === "required" && !field.required) return false
      if (sourceFilter === "mapped" && !isMapped) return false
      if (sourceFilter === "unmapped" && isMapped) return false
      return true
    })
  }, [fields, mappings, search, sourceFilter])

  React.useEffect(() => {
    setMappings(emptyMappings(fields))
  }, [fields])

  async function handleFileSelected(file: File) {
    setSelectedFile(file)
    setHeaders([])
    setMappings(emptyMappings(fields))
    try {
      const parsedHeaders = await readSpreadsheetHeaders(file)
      setHeaders(parsedHeaders)
      if (!parsedHeaders.length)
        toast.warning("No headers found", { description: "The first row must contain column names." })
      else
        toast.success("Spreadsheet headers loaded", {
          description: `${parsedHeaders.length} column${parsedHeaders.length === 1 ? "" : "s"} found.`,
        })
    } catch (error) {
      toast.error("Could not read spreadsheet headers", {
        description: error instanceof Error ? error.message : "File parsing failed",
      })
    }
  }

  function autoMap() {
    if (!headers.length) return
    const next = emptyMappings(fields)
    for (const field of fields) {
      const targetNames = [field.column, field.key.replace(/^custom:/, ""), field.key]
      const match = headers.find((header) =>
        targetNames.some((target) => normalizeHeader(target) === normalizeHeader(header)),
      )
      if (match) next[field.key] = match
    }
    setMappings(next)
    toast.success("Suggested mappings applied", { description: "Review before starting import." })
  }

  function clearAllMappings() {
    setMappings(emptyMappings(fields))
    toast.message("Mappings cleared")
  }

  function clearFile() {
    setSelectedFile(null)
    setHeaders([])
    setMappings(emptyMappings(fields))
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function uploadImport() {
    if (!selectedFile) {
      toast.error("Choose a CSV/XLSX file first")
      return
    }
    if (requiredMissing.length) {
      toast.error("Required mappings missing", {
        description: requiredMissing.map((field) => field.column).join(", "),
      })
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("mapping", JSON.stringify(visualMapping))
      formData.append(
        "productTypeId",
        layoutIdFromQuery === noneValue ? noneValue : layoutIdFromQuery,
      )
      const result = await apiFetch<ImportResult>("/api/products/import", {
        method: "POST",
        body: formData,
      })
      const errors = result.errors ?? []
      if (errors.length)
        toast.warning("Import completed with warnings", {
          description: `${importSummary(result)} · ${errors.length} row issue${errors.length === 1 ? "" : "s"}`,
        })
      else toast.success("Import completed", { description: importSummary(result) })
      router.push(result.logId ? `/imports/${result.logId}` : "/imports")
    } catch (error) {
      toast.error("Import failed", {
        description: error instanceof Error ? error.message : "Upload failed",
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault()
    if (!uploading) setDragOver(true)
  }
  function handleDragLeave(event: React.DragEvent) {
    event.preventDefault()
    setDragOver(false)
  }
  function handleDrop(event: React.DragEvent) {
    event.preventDefault()
    setDragOver(false)
    if (uploading) return
    const file = event.dataTransfer.files?.[0]
    if (file) void handleFileSelected(file)
  }

  const sourceFilters: Array<{ key: typeof sourceFilter; label: string; count: number }> = [
    { key: "all", label: "All", count: fields.length },
    { key: "required", label: "Required", count: requiredFields.length },
    { key: "core", label: "Core", count: fields.filter((f) => f.source === "core").length },
    { key: "layout", label: "Layout", count: fields.filter((f) => f.source === "layout").length },
    { key: "mapped", label: "Mapped", count: mappedCount },
    { key: "unmapped", label: "Unmapped", count: fields.length - mappedCount },
  ]

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
        <div>
          <p className="text-sm text-muted-foreground">Imports</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Map import columns</h1>
          <p className="text-sm text-muted-foreground">
            Upload your CSV/XLSX file, map columns, and start the import.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/imports/new">
            <ArrowLeftIcon className="size-4" />
            Back to setup
          </Link>
        </Button>
      </div>

      <div className="px-4 lg:px-6">
        <ProgressRail current={2} />
      </div>

      <div className="grid gap-4 px-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-6">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload spreadsheet</CardTitle>
              <CardDescription>
                Drop a CSV or XLSX file. Backend reads the first worksheet and uses the first row as column
                headers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void handleFileSelected(file)
                }}
              />
              {selectedFile ? (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-muted/20 p-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-background">
                    <FileSpreadsheetIcon className="size-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(selectedFile.size)} · {headers.length} header
                      {headers.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <RefreshCwIcon className="size-3.5" />
                      Change
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearFile}
                      disabled={uploading}
                    >
                      <XIcon className="size-3.5" />
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                    "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition-colors",
                    dragOver
                      ? "border-foreground bg-muted/40"
                      : "border-input bg-muted/10 hover:border-foreground/40 hover:bg-muted/20",
                  )}
                >
                  <div className="flex size-10 items-center justify-center rounded-full bg-background shadow-sm">
                    <UploadCloudIcon className="size-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Drop your file here, or click to browse</p>
                    <p className="text-xs text-muted-foreground">CSV or XLSX · first row must be headers</p>
                  </div>
                </button>
              )}
            </CardContent>
          </Card>

          {selectedFile && headers.length ? (
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>Column mapping</CardTitle>
                    <CardDescription>
                      Match NexStock fields to spreadsheet columns. Defaults to None.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={autoMap}
                      disabled={uploading}
                    >
                      <SparklesIcon className="size-4" />
                      Auto-match
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearAllMappings}
                      disabled={uploading || mappedCount === 0}
                    >
                      Clear all
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-1 items-center gap-3">
                    <div className="relative w-full sm:max-w-xs">
                      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search fields..."
                        className="pl-8"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="tabular-nums">
                        <span className="font-medium text-foreground">{mappedCount}</span> /{" "}
                        {fields.length} mapped
                      </span>
                      <Progress value={Math.round(totalUsable * 100)} className="h-1.5 w-24" />
                    </div>
                  </div>
                  {requiredMissing.length ? (
                    <Badge variant="destructive">
                      {requiredMissing.length} required missing
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <CheckIcon className="size-3" /> Required fields mapped
                    </Badge>
                  )}
                </div>

                <ToggleGroup
                  type="single"
                  value={sourceFilter}
                  onValueChange={(value) => {
                    if (value) setSourceFilter(value as typeof sourceFilter)
                  }}
                  variant="outline"
                  size="sm"
                  spacing={1}
                  className="flex-wrap justify-start pt-2"
                >
                  {sourceFilters.map((filter) => (
                    <ToggleGroupItem key={filter.key} value={filter.key} className="gap-1.5">
                      {filter.label}
                      <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground group-data-[state=on]/toggle:bg-background/20 group-data-[state=on]/toggle:text-foreground">
                        {filter.count}
                      </span>
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </CardHeader>
              <CardContent className="px-0">
                {filteredFields.length ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableHead className="pl-6">NexStock field</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="pr-6">Spreadsheet column</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredFields.map((field) => {
                          const value = mappings[field.key] ?? noneValue
                          const mapped = value !== noneValue
                          const missing = field.required && !mapped
                          return (
                            <TableRow
                              key={field.key}
                              className={cn(missing && "bg-destructive/5")}
                            >
                              <TableCell className="pl-6 align-top">
                                <div className="space-y-1 py-2">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="font-medium">{field.column}</span>
                                    {field.required ? (
                                      <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">
                                        Required
                                      </Badge>
                                    ) : null}
                                    {field.source === "layout" ? (
                                      <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                                        Layout
                                      </Badge>
                                    ) : null}
                                    {mapped ? (
                                      <CheckCircle2Icon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                                    ) : null}
                                  </div>
                                  <p className="font-mono text-[11px] text-muted-foreground">
                                    {field.key}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{field.importFormat}</p>
                                </div>
                              </TableCell>
                              <TableCell className="align-top">
                                <Badge variant="outline" className="font-normal">
                                  {field.dataType}
                                </Badge>
                              </TableCell>
                              <TableCell className="pr-6 align-top">
                                <div className="py-1">
                                  <Select
                                    value={value}
                                    onValueChange={(next) =>
                                      setMappings((current) => ({ ...current, [field.key]: next }))
                                    }
                                    disabled={!headers.length || uploading}
                                  >
                                    <SelectTrigger
                                      className={cn(
                                        "min-w-56",
                                        missing && "border-destructive",
                                      )}
                                    >
                                      <SelectValue placeholder="None" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value={noneValue}>None</SelectItem>
                                      {headers.map((header) => (
                                        <SelectItem
                                          key={`${field.key}-${header}`}
                                          value={header}
                                        >
                                          {header}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                    No fields match these filters.{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("")
                        setSourceFilter("all")
                      }}
                      className="underline hover:text-foreground"
                    >
                      Clear filters
                    </button>
                    .
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
                <UploadIcon className="size-7 text-muted-foreground" />
                <p className="font-medium">Choose a file to begin mapping</p>
                <p className="text-sm text-muted-foreground">
                  The first row of the first worksheet must contain spreadsheet column names.
                </p>
              </CardContent>
            </Card>
          )}

          {selectedFile && headers.length ? (
            <Card>
              <button
                type="button"
                onClick={() => setPreviewOpen((value) => !value)}
                className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left"
              >
                <div>
                  <p className="text-sm font-medium">Generated backend mapping</p>
                  <p className="text-xs text-muted-foreground">
                    Preview the payload that will be sent to the backend.
                  </p>
                </div>
                {previewOpen ? (
                  <ChevronUpIcon className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronDownIcon className="size-4 text-muted-foreground" />
                )}
              </button>
              {previewOpen ? (
                <div className="border-t px-6 pb-6">
                  <pre className="mt-3 max-h-60 overflow-auto rounded-md bg-muted/40 p-3 font-mono text-xs">
                    {mappingPreview(fields, mappings)}
                  </pre>
                </div>
              ) : null}
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card className="lg:sticky lg:top-20">
            <CardHeader>
              <CardTitle>Ready to import</CardTitle>
              <CardDescription>Final check before sending to the backend.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <StatusRow
                label="File selected"
                done={Boolean(selectedFile)}
                detail={selectedFile?.name || "No file selected"}
              />
              <StatusRow
                label="Headers detected"
                done={headers.length > 0}
                detail={
                  headers.length
                    ? `${headers.length} header${headers.length === 1 ? "" : "s"}`
                    : "Awaiting file"
                }
              />
              <StatusRow
                label="Required fields mapped"
                done={!requiredMissing.length && requiredFields.length > 0}
                detail={
                  requiredMissing.length
                    ? `${requiredMissing.length} missing`
                    : `${requiredFields.length} required`
                }
              />

              {requiredMissing.length && selectedFile ? (
                <Alert variant="destructive">
                  <AlertTriangleIcon />
                  <AlertTitle>Required mappings missing</AlertTitle>
                  <AlertDescription>
                    {requiredMissing.map((field) => field.column).join(", ")}
                  </AlertDescription>
                </Alert>
              ) : null}

              <Button
                type="button"
                className="w-full"
                onClick={() => void uploadImport()}
                disabled={!selectedFile || uploading || loadingLayouts || requiredMissing.length > 0}
              >
                {uploading ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <UploadIcon className="size-4" />
                )}
                {uploading ? "Importing..." : "Start import"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Importing sends file, mapping, and productTypeId to{" "}
                <span className="font-mono">POST /api/products/import</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mapping context</CardTitle>
              <CardDescription>Rules and selected layout for this import.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <FieldHint label="Layout" description={selectedLayout ? selectedLayout.name : "None"} />
              <FieldHint
                label="Defaults"
                description="Every field mapping starts as None and is only sent when a spreadsheet column is selected."
              />
              <FieldHint
                label="Required fields"
                description="Product Name and selected layout required fields must be mapped before import starts."
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ProgressRail({ current }: { current: number }) {
  const steps = [
    { num: 1, label: "Setup" },
    { num: 2, label: "Map columns" },
    { num: 3, label: "Import" },
  ]
  const value = ((current - 1) / Math.max(steps.length - 1, 1)) * 100
  return (
    <Card>
      <CardContent className="space-y-3 p-3">
        <Progress value={value} className="h-1.5" />
        <div className="grid grid-cols-3 gap-2 text-xs">
          {steps.map((step) => {
            const done = step.num < current
            const active = step.num === current
            return (
            <div
              key={step.num}
              className={cn(
                "flex min-w-0 items-center gap-2 rounded-md px-2.5 py-1.5",
                active && "bg-muted text-foreground",
                done && "text-foreground",
                !active && !done && "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[10px] font-semibold",
                  active && "bg-background text-foreground",
                  done && "bg-foreground text-background",
                  !active && !done && "border bg-muted",
                )}
              >
                {done ? <CheckIcon className="size-3" /> : step.num}
              </span>
              <span className="truncate font-medium">{step.label}</span>
            </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function StatusRow({ label, done, detail }: { label: string; done: boolean; detail: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-md border p-2.5">
      <div
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full",
          done ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground",
        )}
      >
        {done ? <CheckIcon className="size-3" /> : <span className="text-[10px]">·</span>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
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
