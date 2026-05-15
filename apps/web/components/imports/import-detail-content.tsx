"use client"

import * as React from "react"
import Link from "next/link"
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  ClockIcon,
  CopyIcon,
  FileSpreadsheetIcon,
  Loader2Icon,
  RefreshCwIcon,
  SearchIcon,
  XCircleIcon,
} from "lucide-react"
import { toast } from "sonner"

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
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

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

function formatDuration(start?: string | null, end?: string | null) {
  if (!start || !end) return "—"
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  if (Number.isNaN(s) || Number.isNaN(e) || e < s) return "—"
  const ms = e - s
  if (ms < 1000) return `${ms} ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.round((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

function statusVisuals(status?: string | null) {
  if (status === "completed")
    return {
      badge: (
        <Badge className="gap-1">
          <CheckCircle2Icon className="size-3" />
          Completed
        </Badge>
      ),
      tone: "success" as const,
    }
  if (status === "completed_with_errors")
    return {
      badge: (
        <Badge variant="secondary" className="gap-1">
          <AlertTriangleIcon className="size-3" />
          Completed with errors
        </Badge>
      ),
      tone: "warning" as const,
    }
  if (status === "failed")
    return {
      badge: (
        <Badge variant="destructive" className="gap-1">
          <XCircleIcon className="size-3" />
          Failed
        </Badge>
      ),
      tone: "destructive" as const,
    }
  return {
    badge: (
      <Badge variant="outline" className="gap-1">
        <ClockIcon className="size-3" />
        {status || "Processing"}
      </Badge>
    ),
    tone: "default" as const,
  }
}

function normalizeErrors(value: ImportLog["errors"]) {
  return Array.isArray(value) ? value : []
}

export function ImportDetailContent({ logId }: { logId: string }) {
  const [log, setLog] = React.useState<ImportLog | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [errorSearch, setErrorSearch] = React.useState("")

  async function loadLog() {
    setLoading(true)
    try {
      setLog(await apiFetch<ImportLog>(`/api/products/import-logs/${logId}`))
    } catch (error) {
      toast.error("Could not load import", {
        description: error instanceof Error ? error.message : "Request failed",
      })
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    void loadLog()
  }, [logId])

  const errors = normalizeErrors(log?.errors)
  const mapping = log?.mapping && typeof log.mapping === "object" ? Object.entries(log.mapping) : []
  const status = statusVisuals(log?.status)
  const totalRows = Number(log?.totalRows ?? 0)
  const errorCount = Number(log?.errorCount ?? 0)
  const skippedCount = Number(log?.skippedCount ?? 0)
  const createdCount = Number(log?.createdCount ?? 0)
  const updatedCount = Number(log?.updatedCount ?? 0)
  const okRows = Math.max(totalRows - errorCount - skippedCount, 0)
  const okPct = totalRows ? Math.round((okRows / totalRows) * 100) : 0
  const skipPct = totalRows ? Math.round((skippedCount / totalRows) * 100) : 0
  const errorPct = totalRows ? Math.round((errorCount / totalRows) * 100) : 0

  const filteredErrors = React.useMemo(() => {
    const term = errorSearch.trim().toLowerCase()
    if (!term) return errors
    return errors.filter((error) => {
      const haystack = `${error.row ?? ""} ${error.message ?? ""}`.toLowerCase()
      return haystack.includes(term)
    })
  }, [errors, errorSearch])

  function copyErrors() {
    if (!errors.length) return
    const text = errors
      .map((error) => `Row ${error.row ?? "?"}: ${error.message || "Import failed"}`)
      .join("\n")
    void navigator.clipboard.writeText(text)
    toast.success("Errors copied to clipboard")
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
        <div>
          <p className="text-sm text-muted-foreground">Imports</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Import details</h1>
          <p className="text-sm text-muted-foreground">
            View import status, mapping, row counts, and errors.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/imports">
              <ArrowLeftIcon className="size-4" />
              Back to imports
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => void loadLog()} disabled={loading}>
            {loading ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <RefreshCwIcon className="size-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {loading && !log ? (
        <div className="space-y-4 px-4 lg:px-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : log ? (
        <>
          <div className="px-4 lg:px-6">
            <Card
              className={cn(
                "overflow-hidden",
                status.tone === "success" && "border-emerald-500/30",
                status.tone === "warning" && "border-amber-500/30",
                status.tone === "destructive" && "border-destructive/30",
              )}
            >
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex size-12 shrink-0 items-center justify-center rounded-xl border",
                        status.tone === "success" && "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400",
                        status.tone === "warning" && "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400",
                        status.tone === "destructive" && "border-destructive/30 bg-destructive/5 text-destructive",
                        status.tone === "default" && "bg-muted/40 text-muted-foreground",
                      )}
                    >
                      <FileSpreadsheetIcon className="size-6" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-lg font-semibold">{log.fileName}</h2>
                        {status.badge}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Created {formatDateTime(log.createdAt)} · Duration{" "}
                        {formatDuration(log.startedAt, log.finishedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="w-full max-w-md">
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Row outcomes</span>
                      <span className="font-medium tabular-nums">{totalRows.toLocaleString()} rows</span>
                    </div>
                    {totalRows > 0 ? (
                      <>
                        <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                          {okPct > 0 ? (
                            <div
                              className="bg-emerald-500"
                              style={{ width: `${okPct}%` }}
                              title={`${okRows} processed`}
                            />
                          ) : null}
                          {skipPct > 0 ? (
                            <div
                              className="bg-muted-foreground/50"
                              style={{ width: `${skipPct}%` }}
                              title={`${skippedCount} skipped`}
                            />
                          ) : null}
                          {errorPct > 0 ? (
                            <div
                              className="bg-destructive"
                              style={{ width: `${errorPct}%` }}
                              title={`${errorCount} errors`}
                            />
                          ) : null}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                          <LegendDot
                            color="bg-emerald-500"
                            label={`${okRows.toLocaleString()} processed`}
                          />
                          {skippedCount > 0 ? (
                            <LegendDot
                              color="bg-muted-foreground/50"
                              label={`${skippedCount.toLocaleString()} skipped`}
                            />
                          ) : null}
                          {errorCount > 0 ? (
                            <LegendDot
                              color="bg-destructive"
                              label={`${errorCount.toLocaleString()} errors`}
                            />
                          ) : null}
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">No rows processed.</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
            <SummaryCard title="Total rows" value={totalRows} tone="default" />
            <SummaryCard title="Created" value={createdCount} tone="success" />
            <SummaryCard title="Updated" value={updatedCount} tone="default" />
            <SummaryCard
              title="Errors"
              value={errorCount}
              tone={errorCount > 0 ? "destructive" : "default"}
            />
          </div>

          <div className="px-4 lg:px-6">
            <Tabs defaultValue="overview" className="gap-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="errors">
                  Errors
                  {errorCount > 0 ? (
                    <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-[10px]">
                      {errorCount}
                    </Badge>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="mapping">
                  Mapping
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                    {mapping.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="metadata">Metadata</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Timeline</CardTitle>
                      <CardDescription>Key timestamps for this import.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <TimelineRow label="Created" value={formatDateTime(log.createdAt)} />
                      <TimelineRow label="Started" value={formatDateTime(log.startedAt)} />
                      <TimelineRow label="Finished" value={formatDateTime(log.finishedAt)} />
                      <TimelineRow
                        label="Duration"
                        value={formatDuration(log.startedAt, log.finishedAt)}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Row breakdown</CardTitle>
                      <CardDescription>How rows were processed.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <BreakdownRow
                        label="Created"
                        value={createdCount}
                        total={totalRows}
                        color="bg-emerald-500"
                      />
                      <BreakdownRow
                        label="Updated"
                        value={updatedCount}
                        total={totalRows}
                        color="bg-foreground/70"
                      />
                      <BreakdownRow
                        label="Skipped"
                        value={skippedCount}
                        total={totalRows}
                        color="bg-muted-foreground/50"
                      />
                      <BreakdownRow
                        label="Errors"
                        value={errorCount}
                        total={totalRows}
                        color="bg-destructive"
                      />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="errors">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <CardTitle>Row error log</CardTitle>
                        <CardDescription>
                          {errors.length
                            ? `${errors.length} row issue${errors.length === 1 ? "" : "s"} recorded`
                            : "No row errors recorded for this import."}
                        </CardDescription>
                      </div>
                      {errors.length ? (
                        <div className="flex items-center gap-2">
                          <div className="relative w-full sm:w-56">
                            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              value={errorSearch}
                              onChange={(event) => setErrorSearch(event.target.value)}
                              placeholder="Search errors..."
                              className="pl-8"
                            />
                          </div>
                          <Button variant="outline" size="sm" onClick={copyErrors}>
                            <CopyIcon className="size-3.5" />
                            Copy
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent className="px-0">
                    {errors.length ? (
                      filteredErrors.length ? (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/30 hover:bg-muted/30">
                                <TableHead className="w-24 pl-6">Row</TableHead>
                                <TableHead className="pr-6">Message</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredErrors.map((error, index) => (
                                <TableRow key={index}>
                                  <TableCell className="pl-6 align-top font-mono text-xs">
                                    <Badge variant="outline">
                                      {error.row ?? "?"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="pr-6 align-top">
                                    <p className="text-sm">{error.message || "Import failed"}</p>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <p className="px-6 py-6 text-center text-sm text-muted-foreground">
                          No errors match this search.
                        </p>
                      )
                    ) : (
                      <Alert className="mx-6 mb-6">
                        <CheckCircle2Icon />
                        <AlertTitle>No errors</AlertTitle>
                        <AlertDescription>
                          Every row in this import processed without recorded issues.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="mapping">
                <Card>
                  <CardHeader>
                    <CardTitle>Column mapping</CardTitle>
                    <CardDescription>
                      How NexStock fields matched the uploaded spreadsheet columns.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-0">
                    {mapping.length ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                              <TableHead className="pl-6">NexStock field</TableHead>
                              <TableHead className="pr-6">Spreadsheet column</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {mapping.map(([field, column]) => (
                              <TableRow key={field}>
                                <TableCell className="pl-6 font-mono text-xs">{field}</TableCell>
                                <TableCell className="pr-6">{column}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="px-6 py-6 text-sm text-muted-foreground">
                        Automatic header matching was used — no explicit mapping was sent.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="metadata">
                <Card>
                  <CardHeader>
                    <CardTitle>Upload metadata</CardTitle>
                    <CardDescription>Raw metadata stored with this import.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <pre className="max-h-96 overflow-auto rounded-md border bg-muted/30 p-3 font-mono text-xs">
                      {JSON.stringify(log.metadata ?? {}, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </>
      ) : (
        <div className="px-4 lg:px-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-2 p-10 text-center">
              <XCircleIcon className="size-7 text-muted-foreground" />
              <p className="font-medium">Import log not found</p>
              <p className="text-sm text-muted-foreground">
                This import may have been removed or the link is incorrect.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/imports">
                  <ArrowLeftIcon className="size-4" />
                  Back to imports
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function SummaryCard({
  title,
  value,
  tone = "default",
}: {
  title: string
  value: number
  tone?: "default" | "success" | "destructive"
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "destructive"
        ? "text-destructive"
        : ""
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className={cn("text-2xl font-semibold tabular-nums", toneClass)}>
          {value.toLocaleString()}
        </CardTitle>
      </CardHeader>
    </Card>
  )
}

function TimelineRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border p-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

function BreakdownRow({
  label,
  value,
  total,
  color,
}: {
  label: string
  value: number
  total: number
  color: string
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span>{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {value.toLocaleString()} · {pct}%
        </span>
      </div>
      <Progress
        value={pct}
        className="h-1.5"
        indicatorClassName={color}
      />
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <span className={cn("size-2 rounded-full", color)} />
      <span>{label}</span>
    </div>
  )
}
