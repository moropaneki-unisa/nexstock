"use client"

import * as React from "react"
import Link from "next/link"
import { AlertTriangleIcon, ArrowLeftIcon, Loader2Icon, RefreshCwIcon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { apiFetch } from "@/lib/api"

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

function statusBadge(status?: string | null) {
  if (status === "completed") return <Badge>Completed</Badge>
  if (status === "completed_with_errors") return <Badge variant="secondary">Completed with errors</Badge>
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>
  return <Badge variant="outline">{status || "Processing"}</Badge>
}

function normalizeErrors(value: ImportLog["errors"]) {
  return Array.isArray(value) ? value : []
}

export function ImportDetailContent({ logId }: { logId: string }) {
  const [log, setLog] = React.useState<ImportLog | null>(null)
  const [loading, setLoading] = React.useState(true)

  async function loadLog() {
    setLoading(true)
    try {
      setLog(await apiFetch<ImportLog>(`/api/products/import-logs/${logId}`))
    } catch (error) {
      toast.error("Could not load import", { description: error instanceof Error ? error.message : "Request failed" })
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    void loadLog()
  }, [logId])

  const errors = normalizeErrors(log?.errors)
  const mapping = log?.mapping && typeof log.mapping === "object" ? Object.entries(log.mapping) : []

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
        <div>
          <p className="text-sm text-muted-foreground">Imports</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Import details</h1>
          <p className="text-sm text-muted-foreground">View import status, mapping, row counts, and errors.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/imports">
              <ArrowLeftIcon className="size-4" />
              Back to imports
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => void loadLog()} disabled={loading}>
            {loading ? <Loader2Icon className="size-4 animate-spin" /> : <RefreshCwIcon className="size-4" />}
            Refresh
          </Button>
        </div>
      </div>

      {loading && !log ? (
        <div className="px-4 lg:px-6">
          <Card>
            <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Loading import details...
            </CardContent>
          </Card>
        </div>
      ) : log ? (
        <>
          <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
            <SummaryCard title="Rows" value={log.totalRows ?? 0} />
            <SummaryCard title="Created" value={log.createdCount ?? 0} />
            <SummaryCard title="Updated" value={log.updatedCount ?? 0} />
            <SummaryCard title="Errors" value={log.errorCount ?? 0} />
          </div>

          <div className="grid gap-4 px-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{log.fileName}</CardTitle>
                    <CardDescription>Created {formatDateTime(log.createdAt)}</CardDescription>
                  </div>
                  {statusBadge(log.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Info label="Started" value={formatDateTime(log.startedAt)} />
                  <Info label="Finished" value={formatDateTime(log.finishedAt)} />
                  <Info label="Skipped" value={String(log.skippedCount ?? 0)} />
                  <Info label="Status" value={log.status || "processing"} />
                </div>

                {errors.length ? (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                    <p className="mb-3 flex items-center gap-2 font-medium text-destructive">
                      <AlertTriangleIcon className="size-4" />
                      Row error log
                    </p>
                    <div className="max-h-96 space-y-2 overflow-auto text-xs">
                      {errors.map((error, index) => (
                        <div key={index} className="rounded-md border bg-background p-2">
                          <p className="font-medium">Row {error.row ?? "?"}</p>
                          <p className="text-muted-foreground">{error.message || "Import failed"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border p-3 text-sm text-muted-foreground">No row errors recorded for this import.</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mapping and metadata</CardTitle>
                <CardDescription>Column mapping and upload metadata used for this import.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="mb-2 font-medium">Mapping</p>
                  {mapping.length ? (
                    <div className="space-y-2">
                      {mapping.map(([field, column]) => (
                        <div key={field} className="rounded-md border p-2">
                          <p className="font-mono text-xs">{field}</p>
                          <p className="text-xs text-muted-foreground">Spreadsheet column: {column}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Automatic header matching was used.</p>
                  )}
                </div>

                <div>
                  <p className="mb-2 font-medium">Metadata</p>
                  <pre className="max-h-52 overflow-auto rounded-md border bg-muted/30 p-3 text-xs">
                    {JSON.stringify(log.metadata ?? {}, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <div className="px-4 lg:px-6">
          <Card><CardContent className="p-6 text-sm text-muted-foreground">Import log not found.</CardContent></Card>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums">{value.toLocaleString()}</CardTitle>
      </CardHeader>
    </Card>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}
