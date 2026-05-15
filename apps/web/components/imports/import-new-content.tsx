"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeftIcon, Loader2Icon, UploadIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { apiFetch } from "@/lib/api"

type ImportResult = {
  logId?: string
  status?: string
  created?: number
  updated?: number
  skipped?: number
  total?: number
  errors?: Array<{ row?: number; message?: string } | string>
}

const defaultMapping = `{
  "name": "Product Name",
  "sku": "SKU",
  "price": "Price",
  "quantity": "Quantity",
  "category": "Category"
}`

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

export function ImportNewContent() {
  const router = useRouter()
  const [mapping, setMapping] = React.useState(defaultMapping)
  const [uploading, setUploading] = React.useState(false)
  const [fileName, setFileName] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  async function uploadImport(file: File) {
    setUploading(true)
    setFileName(file.name)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("mapping", JSON.stringify(parseMapping(mapping)))

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
          <p className="text-sm text-muted-foreground">Upload a product spreadsheet and map its columns to NexStock fields.</p>
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
            <CardDescription>Supported formats: CSV and XLSX. The import will create a persistent import log.</CardDescription>
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
              <label className="text-sm font-medium">Column mapping JSON</label>
              <textarea
                value={mapping}
                onChange={(event) => setMapping(event.target.value)}
                className="min-h-64 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">
                Keys are NexStock fields. Values are spreadsheet column names. Leave empty to use automatic header matching.
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
            <CardTitle>Common fields</CardTitle>
            <CardDescription>Use these keys in the mapping JSON.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <FieldHint label="name" description="Product name. Required." />
            <FieldHint label="sku" description="Existing SKU updates, new SKU creates." />
            <FieldHint label="price" description="Selling price in base currency." />
            <FieldHint label="quantity" description="Stock on hand." />
            <FieldHint label="category" description="Product category." />
            <FieldHint label="custom:fieldKey" description="Maps to custom layout fields." />
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
