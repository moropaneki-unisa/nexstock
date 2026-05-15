"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  CheckIcon,
  DownloadIcon,
  FileJsonIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  LayersIcon,
  LayoutTemplateIcon,
  SparklesIcon,
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
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { getCachedLayouts } from "@/lib/cached-api"
import { cn } from "@/lib/utils"

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
  defaultValue: unknown
  example: string
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

function normalizeList<T>(value: T[] | Paginated<T> | null | undefined) {
  return !value ? [] : Array.isArray(value) ? value : (value.items ?? value.data ?? [])
}
function normalizeFieldType(type: string | null | undefined): ImportDataType {
  const value = String(type || "text").trim().toLowerCase()
  return backendFieldTypes.includes(value as ImportDataType) ? (value as ImportDataType) : "text"
}
function safeFilePart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "products"
}
function csvEscape(value: unknown) {
  const text = String(value ?? "")
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
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

function importFormatForLayoutField(field: LayoutField) {
  const type = normalizeFieldType(field.type)
  const options = field.options?.filter(Boolean) ?? []
  if (type === "select") return options.length ? `One of: ${options.join(", ")}` : "Select option configured in layout settings"
  if (type === "number") return "Whole number"
  if (type === "decimal") return "Number or decimal, e.g. 10.50"
  if (type === "currency") return 'Amount and optional currency, e.g. 100 ZAR or {"amount":100,"currency":"ZAR"}'
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
  if (field.defaultValue !== undefined && field.defaultValue !== null && field.defaultValue !== "")
    return String(field.defaultValue)
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
    notes: [
      field.helpText,
      field.placeholder ? `Placeholder: ${field.placeholder}` : null,
      Boolean(field.required) ? "Required by selected layout." : "Optional layout field.",
    ]
      .filter(Boolean)
      .join(" "),
  }))
  return [...coreFieldDefinitions, ...layoutFields]
}

function templateRows(layout: Layout | null) {
  return [
    Object.fromEntries(
      fieldDefinitionsForLayout(layout).map((field) => [field.column, field.example]),
    ),
  ]
}
function schemaForLayout(layout: Layout | null) {
  const fields = fieldDefinitionsForLayout(layout)
  return {
    schemaVersion: 1,
    app: "NexStock",
    importableByBackend: false,
    validUploadFormats: ["csv", "xlsx"],
    supportedLayoutFieldTypes: backendFieldTypes,
    generatedAt: new Date().toISOString(),
    purpose:
      "Developer/reference schema for the CSV/XLSX product import template. This JSON file is not uploadable to the current backend importer.",
    backendContract: {
      endpoint: "POST /api/products/import",
      contentType: "multipart/form-data",
      fields: ["file", "mapping", "productTypeId"],
      xlsxImporterReads: "first worksheet only",
    },
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
      fieldMappings: "none until selected by user",
      selectFields: "none/empty until spreadsheet value matches configured option",
      sku: "auto-generated when empty",
      status: "active",
      quantity: 0,
      lowStockLevel: 5,
    },
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
  }
}

export function ImportNewContent() {
  const router = useRouter()
  const [layouts, setLayouts] = React.useState<Layout[]>([])
  const [selectedLayoutId, setSelectedLayoutId] = React.useState(noneValue)
  const [loadingLayouts, setLoadingLayouts] = React.useState(true)
  const [downloadedFormat, setDownloadedFormat] = React.useState<"csv" | "xlsx" | "json" | null>(null)

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

  const selectedLayout = layouts.find((layout) => layout.id === selectedLayoutId) ?? null
  const selectedFields = selectedLayout?.fields ?? []
  const requiredFields = selectedFields.filter((field) => field.required)
  const fieldCount = coreFieldDefinitions.length + selectedFields.length
  const layoutSelected = selectedLayoutId !== noneValue

  function exportTemplate(format: "csv" | "xlsx" | "json") {
    const fileBase = `nexstock-import-template-${safeFilePart(selectedLayout?.name || "no-layout")}`
    const exportFields = fieldDefinitionsForLayout(selectedLayout)
    const columns = exportFields.map((field) => field.column)
    const rows = templateRows(selectedLayout)
    const fieldGuideRows = exportFields.map((field) => ({
      Column: field.column,
      "Maps To": field.key,
      Source: field.source,
      "Data Type": field.dataType,
      Required: field.required ? "Yes" : "No",
      Default:
        field.defaultValue === null || field.defaultValue === undefined
          ? "None"
          : JSON.stringify(field.defaultValue),
      Example: field.example,
      "Allowed Values": field.allowedValues.join(", "),
      Format: field.importFormat,
      Notes: field.notes,
    }))
    const selectRows = exportFields
      .filter((field) => field.dataType === "select")
      .flatMap((field) =>
        (field.allowedValues.length ? field.allowedValues : ["None / configure options in settings"]).map(
          (option) => ({ Field: field.key, Column: field.column, Option: option }),
        ),
      )

    if (format === "json") {
      downloadBlob(
        `${fileBase}.schema.json`,
        "application/json",
        JSON.stringify(schemaForLayout(selectedLayout), null, 2),
      )
      toast.success("Developer schema exported", {
        description: "JSON is a reference file, not an import upload.",
      })
      setDownloadedFormat("json")
      return
    }
    if (format === "csv") {
      downloadBlob(
        `${fileBase}.csv`,
        "text/csv;charset=utf-8",
        [
          columns.join(","),
          ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(",")),
        ].join("\n"),
      )
      toast.success("CSV import template exported")
      setDownloadedFormat("csv")
      return
    }

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(rows, { header: columns }),
      "Import Template",
    )
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(fieldGuideRows), "Field Guide")
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        selectRows.length ? selectRows : [{ Field: "No select fields", Column: "", Option: "" }],
      ),
      "Select Options",
    )
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet([
        { Key: "Layout", Value: selectedLayout?.name || "None" },
        { Key: "Layout ID", Value: selectedLayout?.id || "none" },
        {
          Key: "Backend imports",
          Value: "Only the first worksheet named Import Template is imported",
        },
        { Key: "Generated At", Value: new Date().toISOString() },
      ]),
      "Import Info",
    )
    XLSX.writeFile(workbook, `${fileBase}.xlsx`)
    toast.success("XLSX import workbook exported", {
      description: "Upload the workbook as-is; backend imports the first sheet.",
    })
    setDownloadedFormat("xlsx")
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
          <p className="text-sm text-muted-foreground">
            Prepare your product import, then continue to column mapping.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/imports">
            <ArrowLeftIcon className="size-4" />
            Back to imports
          </Link>
        </Button>
      </div>

      <div className="px-4 lg:px-6">
        <ProgressRail current={1} />
      </div>

      <div className="grid gap-5 px-4 lg:px-6 @5xl/main:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-4">
          <div>
            <h2 className="font-heading text-lg font-semibold tracking-tight">Import setup</h2>
            <p className="text-sm text-muted-foreground">
              Choose a layout, export a template if needed, then move to mapping.
            </p>
          </div>
          <div className="grid gap-4 @3xl/main:grid-cols-3">
            <StepCard
              step="1"
              title="Choose layout"
              description="Default is None. Choose a layout only when imported products must follow layout fields and required rules."
              icon={LayoutTemplateIcon}
              complete={layoutSelected}
            >
              {loadingLayouts ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select value={selectedLayoutId} onValueChange={setSelectedLayoutId}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={noneValue}>None - core fields only</SelectItem>
                    {layouts.map((layout) => (
                      <SelectItem key={layout.id} value={layout.id}>
                        {layout.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="flex flex-wrap gap-1.5 text-xs">
                <Badge variant="secondary" className="gap-1">
                  <LayersIcon className="size-3" />
                  {fieldCount} fields
                </Badge>
                <Badge variant={requiredFields.length ? "destructive" : "outline"}>
                  {requiredFields.length} required
                </Badge>
              </div>
            </StepCard>

            <StepCard
              step="2"
              title="Download template"
              description="Templates match the selected layout. CSV/XLSX can be imported; JSON is reference only."
              icon={DownloadIcon}
              complete={downloadedFormat !== null}
            >
              <div className="grid gap-2">
                <TemplateButton
                  active={downloadedFormat === "csv"}
                  onClick={() => exportTemplate("csv")}
                  icon={FileTextIcon}
                  label="CSV template"
                  hint="Simple comma-separated values"
                />
                <TemplateButton
                  active={downloadedFormat === "xlsx"}
                  onClick={() => exportTemplate("xlsx")}
                  icon={FileSpreadsheetIcon}
                  label="XLSX workbook"
                  hint="Includes field guide sheets"
                  recommended
                />
                <TemplateButton
                  active={downloadedFormat === "json"}
                  onClick={() => exportTemplate("json")}
                  icon={FileJsonIcon}
                  label="Schema JSON"
                  hint="Developer reference only"
                />
              </div>
            </StepCard>

            <StepCard
              step="3"
              title="Map columns"
              description="Upload the completed CSV/XLSX and map spreadsheet columns on the next page."
              icon={SparklesIcon}
              complete={false}
            >
              <Button
                type="button"
                className="w-full justify-between"
                onClick={continueToMapping}
              >
                Continue to mapping
                <ArrowRightIcon className="size-4" />
              </Button>
              <p className="text-xs text-muted-foreground">
                You can change the layout later from the mapping page.
              </p>
            </StepCard>
          </div>
        </section>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Import summary</CardTitle>
              <CardDescription>Stable setup overview.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <SummaryRow label="Selected layout" value={selectedLayout?.name || "None"} />
              <div className="grid grid-cols-2 gap-2">
                <SummaryStat label="Core fields" value={coreFieldDefinitions.length} />
                <SummaryStat label="Layout fields" value={selectedFields.length} />
                <SummaryStat
                  label="Required"
                  value={requiredFields.length}
                  tone={requiredFields.length ? "destructive" : "default"}
                />
                <SummaryStat label="Total" value={fieldCount} />
              </div>

              {selectedFields.length ? (
                <div className="rounded-md border">
                  <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
                    Layout fields ({selectedFields.length})
                  </div>
                  <div className="max-h-44 space-y-1 overflow-auto p-2">
                    {selectedFields.map((field) => (
                      <div
                        key={field.key}
                        className="flex items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-xs hover:bg-muted/50"
                      >
                        <span className="truncate font-medium">{field.label}</span>
                        <span className="shrink-0 text-muted-foreground">
                          {normalizeFieldType(field.type)}
                          {field.required ? " - req" : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
                  No layout fields selected. The import will use core product fields only.
                </p>
              )}
            </CardContent>
          </Card>

          <Alert>
            <CheckCircle2Icon />
            <AlertTitle>Next step</AlertTitle>
            <AlertDescription>
              The mapping page handles file upload, header detection, column mapping, validation, and
              starting the import.
            </AlertDescription>
          </Alert>
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
    <Card size="sm">
      <CardContent className="space-y-3">
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

function StepCard({
  step,
  title,
  description,
  icon: Icon,
  complete,
  children,
}: {
  step: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  complete: boolean
  children: React.ReactNode
}) {
  return (
    <Card
      size="sm"
      className={cn(
        "flex min-h-[260px] flex-col transition-colors",
        complete && "border-foreground/30 bg-muted/20",
      )}
    >
      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
            complete ? "border-transparent bg-foreground text-background" : "bg-muted",
          )}
        >
          {complete ? <CheckIcon className="size-4" /> : step}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Icon className="size-4 text-muted-foreground" />
            <p className="font-medium">{title}</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
      </CardHeader>
      <CardContent className="mt-auto space-y-3">{children}</CardContent>
    </Card>
  )
}

function TemplateButton({
  onClick,
  icon: Icon,
  label,
  hint,
  active,
  recommended,
}: {
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string
  hint: string
  active: boolean
  recommended?: boolean
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className={cn(
        "group h-auto w-full justify-start gap-3 px-3 py-2.5 text-left",
        active && "border-foreground/40 bg-muted/40",
      )}
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium">{label}</span>
          {recommended ? (
            <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px]">
              Recommended
            </Badge>
          ) : null}
        </div>
        <p className="truncate text-xs text-muted-foreground">{hint}</p>
      </div>
      {active ? (
        <CheckIcon className="size-4 text-foreground" />
      ) : (
        <DownloadIcon className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </Button>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border p-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

function SummaryStat({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: number
  tone?: "default" | "destructive"
}) {
  return (
    <div className="rounded-md border p-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-lg font-semibold tabular-nums",
          tone === "destructive" && value > 0 && "text-destructive",
        )}
      >
        {value.toLocaleString()}
      </p>
    </div>
  )
}
