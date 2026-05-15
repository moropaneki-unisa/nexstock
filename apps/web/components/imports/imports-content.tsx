"use client"

import * as React from "react"
import Link from "next/link"
import { AlertTriangleIcon, ArrowRightIcon, FileSpreadsheetIcon, Loader2Icon, PlusIcon, RefreshCwIcon } from "lucide-react"
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

function count(logs: ImportLog[], key: keyof Pick<ImportLog, "createdCount" | "updatedCount" | "skippedCount" | "errorCount" | "totalRows">) {
  return logs.reduce((sum, log) => sum + Number(log[key] ?? 0), 0)
}

export function ImportsContent() {
  const [logs, setLogs] = React.useState<ImportLog[]>([])
  const [loading, setLoading] = React.useState(true)

  async function loadLogs() {
    setLoading(true)
    try {
      const result = await apiFetch<ImportLog[]>("/api/products/import-logs")
      setLogs(Array.isArray(result) ? result : [])
    } catch (error) {
      toast.error("Could not load import logs", { description: error instanceof Error ? error.message : "Request failed" })
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    void loadLogs()
  }, [])

  const latestLog = logs[0]
  const failedLogs = logs.filter((log) => log.status === "failed" || Number(log.errorCount ?? 0) > 0)

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
        <div>
          <p className="text-sm text-muted-foreground">Data</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Imports</h1>
          <p className="text-sm text-muted-foreground">Review previous imports, row logs, errors, mapping used, and import activity.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadLogs()} disabled={loading}>
            {loading ? <Loader2Icon className="size-4 animate-spin" /> : <RefreshCwIcon className="size-4" />}
            Refresh
          </Button>
          <Button asChild size="sm">
            <Link href="/imports/new">
              <PlusIcon className="size-4" />
              New import
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <ImportMetricCard title="Import runs" value={logs.length} detail={`${failedLogs.length} need review`} />
        <ImportMetricCard title="Rows processed" value={count(logs, "totalRows")} detail="Across recent imports" />
        <ImportMetricCard title="Created" value={count(logs, "createdCount")} detail="Products created" />
        <ImportMetricCard title="Updated" value={count(logs, "updatedCount")} detail="Products updated" />
      </div>

      <div className="grid gap-4 px-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Previous imports</CardTitle>
            <CardDescription>Open any import to view mapping, status, row totals, and error logs.</CardDescription>
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
                      <th className="py-2 pr-4 font-medium">Skipped</th>
                      <th className="py-2 pr-4 font-medium">Errors</th>
                      <th className="py-2 pr-4 font-medium">Date</th>
                      <th className="py-2 pr-4 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-3 pr-4 font-medium">{log.fileName}</td>
                        <td className="py-3 pr-4">{statusBadge(log.status)}</td>
                        <td className="py-3 pr-4 tabular-nums">{log.totalRows ?? 0}</td>
                        <td className="py-3 pr-4 tabular-nums">{log.createdCount ?? 0}</td>
                        <td className="py-3 pr-4 tabular-nums">{log.updatedCount ?? 0}</td>
                        <td className="py-3 pr-4 tabular-nums">{log.skippedCount ?? 0}</td>
                        <td className="py-3 pr-4 tabular-nums">{log.errorCount ?? 0}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{formatDateTime(log.createdAt)}</td>
                        <td className="py-3 pr-4 text-right">
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/imports/${log.id}`}>
                              View
                              <ArrowRightIcon className="size-4" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-10 text-center">
                <FileSpreadsheetIcon className="size-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">No imports yet</p>
                  <p className="text-sm text-muted-foreground">Create your first product import to see logs here.</p>
                </div>
                <Button asChild size="sm"><Link href="/imports/new">New import</Link></Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import overview</CardTitle>
            <CardDescription>Latest activity and issues to review.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {latestLog ? (
              <>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Latest import</p>
                  <p className="font-medium">{latestLog.fileName}</p>
                  <p className="text-muted-foreground">{formatDateTime(latestLog.createdAt)}</p>
                  <div className="pt-1">{statusBadge(latestLog.status)}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <SummaryCell label="Rows" value={latestLog.totalRows ?? 0} />
                  <SummaryCell label="Errors" value={latestLog.errorCount ?? 0} />
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">No latest import yet.</p>
            )}

            {failedLogs.length ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <p className="mb-2 flex items-center gap-2 font-medium text-destructive">
                  <AlertTriangleIcon className="size-4" />
                  Imports needing review
                </p>
                <div className="space-y-2">
                  {failedLogs.slice(0, 5).map((log) => (
                    <Link key={log.id} href={`/imports/${log.id}`} className="block rounded-md p-2 hover:bg-background/70">
                      <p className="font-medium">{log.fileName}</p>
                      <p className="text-xs text-muted-foreground">{log.errorCount ?? 0} error(s) · {formatDateTime(log.createdAt)}</p>
                    </Link>
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

function ImportMetricCard({ title, value, detail }: { title: string; value: number; detail: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums">{value.toLocaleString()}</CardTitle>
        <CardDescription>{detail}</CardDescription>
      </CardHeader>
    </Card>
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
