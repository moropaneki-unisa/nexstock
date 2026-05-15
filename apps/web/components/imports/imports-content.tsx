"use client"

import * as React from "react"
import { AlertTriangleIcon, Loader2Icon, RefreshCwIcon, UploadIcon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
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

type ImportLog = {
  id: string
  fileName: string
  status: string
  totalRows?: number | null
  createdCount?: number | null
  updatedCount?: number | null
  skippedCount?: number | null
  errorCount?: number | null
  errors?: Array<{ row?: number; message?: string }> | null
  mapping?: Record<string, string> | null
  metadata?: Record<string, unknown> | null
  createdAt?: string | null
  startedAt?: string | null
  finishedAt?: string | null
}

const defaultMapping = `{
  "name": "Product Name",
  "sku": "SKU",
  "price": "Price",
  "quantity": "Quantity",
  "category": "Category"
}`

function formatDateTime(value?: string | null) {
  if (!value) return "Not set"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not set"
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function importSummary(result: ImportResult) {
  return [
    typeof result.created === "number" ? `${result.created} created` : null,
    typeof result.updated === "number" ? `${result.updated} updated` : null,
    typeof result.skipped === "number" ? `${result.skipped} skipped` : null,
  ].filter(Boolean).join(" · ") || "Import completed"
}

function statusBadge(status?: string | null) {
  if (status === "completed") return <Badge>Completed</Badge>
  if (status === "completed_with_errors") return <Badge variant="secondary">Completed with errors</Badge>
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>
  return <Badge variant="outline">{status || "Processing"}</Badge>
}

function parseMapping(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return {}
  const parsed = JSON.parse(trimmed)
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Mapping must be a JSON object")
  return parsed as Record<string, string>
}

function normalizeErrors(value: ImportLog["errors"]) {
  return Array.isArray(value) ? value : []
}

export function ImportsContent() {
  const [logs, setLogs] = React.useState<ImportLog[]>([])
  const [selectedLogId, setSelectedLogId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [uploading, setUploading] = React.useState(false)
  const [mapping, setMapping] = React.useState(defaultMapping)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  async function loadLogs() {
    setLoading(true)
    try {
      const result = await apiFetch<ImportLog[]>("/api/products/import-logs")
      setLogs(Array.isArray(result) ? result : [])
      if (!selectedLogId && Array.isArray(result) && result[0]) setSelectedLogId(result[0].id)
    } catch (error) {
      toast.error("Could not load import logs", { description: error instanceof Error ? error.message : "Request failed" })
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    void loadLogs()
  }, [])

  async function uploadImport(file: File) {
    setUploading(true)
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

      await loadLogs()
      if (result.logId) setSelectedLogId(result.logId)
    } catch (error) {
      toast.error("Import failed", { description: error instanceof Error ? error.message : "Upload failed" })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const selectedLog = logs.find((log) => log.id === selectedLogId) ?? logs[0]
  const selectedErrors = normalizeErrors(selectedLog?.errors)

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
        <div>
          <p className="text-sm text-muted-foreground">Data</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Imports</h1>
          <p className="text-sm text-muted-foreground">Upload product spreadsheets, map columns, and review import logs.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadLogs()} disabled={loading || uploading}>
          {loading ? <Loader2Icon className="size-4 animate-spin" /> : <RefreshCwIcon className="size-4" />}
          Refresh logs
        </Button>
      </div>

      <div className="grid gap-4 px-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.75fr)] lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>New product import</CardTitle>
            <CardDescription>Upload CSV/XLSX and map spreadsheet columns to product fields.</CardDescription>
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
                className="min-h-44 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">
                Keys are NexStock fields. Values are spreadsheet column names. Leave empty to use automatic header matching.
              </p>
            </div>

            <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2Icon className="size-4 animate-spin" /> : <UploadIcon className="size-4" />}
              Upload import file
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest result</CardTitle>
            <CardDescription>Summary of the selected import log.</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedLog ? (
              <div className="space-y-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{selectedLog.fileName}</p>
                    <p className="text-muted-foreground">{formatDateTime(selectedLog.createdAt)}</p>
                  </div>
                  {statusBadge(selectedLog.status)}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <SummaryCell label="Rows" value={selectedLog.totalRows ?? 0} />
                  <SummaryCell label="Created" value={selectedLog.createdCount ?? 0} />
                  <SummaryCell label="Updated" value={selectedLog.updatedCount ?? 0} />
                  <SummaryCell label="Skipped" value={selectedLog.skippedCount ?? 0} />
                </div>
                {selectedErrors.length ? (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                    <p className="mb-2 flex items-center gap-2 font-medium text-destructive">
                      <AlertTriangleIcon className="size-4" />
                      Row errors
                    </p>
                    <div className="max-h-44 space-y-2 overflow-auto text-xs">
                      {selectedErrors.slice(0, 20).map((error, index) => (
                        <p key={index} className="text-muted-foreground">
                          Row {error.row ?? "?"}: {error.message || "Import failed"}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No imports have been logged yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Import history</CardTitle>
            <CardDescription>Review previous imports, counts, statuses, and row-level errors.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" />
                Loading import history...
              </div>
            ) : logs.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b text-left text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-4 font-medium">File</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 pr-4 font-medium">Rows</th>
                      <th className="py-2 pr-4 font-medium">Created</th>
                      <th className="py-2 pr-4 font-medium">Updated</th>
                      <th className="py-2 pr-4 font-medium">Errors</th>
                      <th className="py-2 pr-4 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        className="cursor-pointer border-b last:border-0 hover:bg-muted/50"
                        onClick={() => setSelectedLogId(log.id)}
                      >
                        <td className="py-3 pr-4 font-medium">{log.fileName}</td>
                        <td className="py-3 pr-4">{statusBadge(log.status)}</td>
                        <td className="py-3 pr-4 tabular-nums">{log.totalRows ?? 0}</td>
                        <td className="py-3 pr-4 tabular-nums">{log.createdCount ?? 0}</td>
                        <td className="py-3 pr-4 tabular-nums">{log.updatedCount ?? 0}</td>
                        <td className="py-3 pr-4 tabular-nums">{log.errorCount ?? 0}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{formatDateTime(log.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No import logs yet. Upload a spreadsheet to create the first log.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SummaryCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value.toLocaleString()}</p>
    </div>
  )
}
