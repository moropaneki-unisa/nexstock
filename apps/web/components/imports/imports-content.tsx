"use client"

import * as React from "react"
import Link from "next/link"
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  ClockIcon,
  FileSpreadsheetIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  TrendingUpIcon,
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
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

function formatRelative(value?: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  const diff = Date.now() - date.getTime()
  const minutes = Math.round(diff / 60000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function statusBadge(status?: string | null) {
  if (status === "completed")
    return (
      <Badge className="gap-1">
        <CheckCircle2Icon className="size-3" />
        Completed
      </Badge>
    )
  if (status === "completed_with_errors")
    return (
      <Badge variant="secondary" className="gap-1">
        <AlertTriangleIcon className="size-3" />
        With errors
      </Badge>
    )
  if (status === "failed")
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircleIcon className="size-3" />
        Failed
      </Badge>
    )
  return (
    <Badge variant="outline" className="gap-1">
      <ClockIcon className="size-3" />
      {status || "Processing"}
    </Badge>
  )
}

function sumKey(
  logs: ImportLog[],
  key: keyof Pick<ImportLog, "createdCount" | "updatedCount" | "skippedCount" | "errorCount" | "totalRows">,
) {
  return logs.reduce((sum, log) => sum + Number(log[key] ?? 0), 0)
}

function successRate(log: ImportLog) {
  const total = Number(log.totalRows ?? 0)
  if (!total) return 0
  const errors = Number(log.errorCount ?? 0)
  const skipped = Number(log.skippedCount ?? 0)
  const good = Math.max(total - errors - skipped, 0)
  return Math.min(100, Math.round((good / total) * 100))
}

export function ImportsContent() {
  const [logs, setLogs] = React.useState<ImportLog[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<"all" | "completed" | "errors" | "failed">("all")

  async function loadLogs() {
    setLoading(true)
    try {
      const result = await apiFetch<ImportLog[]>("/api/products/import-logs")
      setLogs(Array.isArray(result) ? result : [])
    } catch (error) {
      toast.error("Could not load import logs", {
        description: error instanceof Error ? error.message : "Request failed",
      })
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    void loadLogs()
  }, [])

  const latestLog = logs[0]
  const failedLogs = logs.filter(
    (log) => log.status === "failed" || Number(log.errorCount ?? 0) > 0,
  )

  const filteredLogs = React.useMemo(() => {
    const term = search.trim().toLowerCase()
    return logs.filter((log) => {
      if (term && !log.fileName?.toLowerCase().includes(term)) return false
      if (statusFilter === "completed" && log.status !== "completed") return false
      if (statusFilter === "errors" && Number(log.errorCount ?? 0) === 0) return false
      if (statusFilter === "failed" && log.status !== "failed") return false
      return true
    })
  }, [logs, search, statusFilter])

  const filters: Array<{ key: typeof statusFilter; label: string; count: number }> = [
    { key: "all", label: "All", count: logs.length },
    {
      key: "completed",
      label: "Completed",
      count: logs.filter((log) => log.status === "completed").length,
    },
    { key: "errors", label: "With errors", count: failedLogs.length },
    {
      key: "failed",
      label: "Failed",
      count: logs.filter((log) => log.status === "failed").length,
    },
  ]

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
        <div>
          <p className="text-sm text-muted-foreground">Data</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Imports</h1>
          <p className="text-sm text-muted-foreground">
            Review previous imports, row logs, errors, mapping used, and import activity.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadLogs()} disabled={loading}>
            {loading ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <RefreshCwIcon className="size-4" />
            )}
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
        <ImportMetricCard
          title="Import runs"
          value={logs.length}
          detail={`${failedLogs.length} need review`}
          icon={FileSpreadsheetIcon}
          tone="default"
        />
        <ImportMetricCard
          title="Rows processed"
          value={sumKey(logs, "totalRows")}
          detail="Across recent imports"
          icon={TrendingUpIcon}
          tone="default"
        />
        <ImportMetricCard
          title="Created"
          value={sumKey(logs, "createdCount")}
          detail="Products created"
          icon={CheckCircle2Icon}
          tone="success"
        />
        <ImportMetricCard
          title="Errors"
          value={sumKey(logs, "errorCount")}
          detail="Across recent imports"
          icon={AlertTriangleIcon}
          tone={sumKey(logs, "errorCount") > 0 ? "destructive" : "default"}
        />
      </div>

      <div className="grid gap-4 px-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-6">
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Previous imports</CardTitle>
                <CardDescription>
                  Open any import to view mapping, status, row totals, and error logs.
                </CardDescription>
              </div>
              <div className="relative w-full sm:max-w-xs">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by file name..."
                  className="pl-8"
                />
              </div>
            </div>
            <ToggleGroup
              type="single"
              value={statusFilter}
              onValueChange={(value) => {
                if (value) setStatusFilter(value as typeof statusFilter)
              }}
              variant="outline"
              size="sm"
              spacing={1}
              className="flex-wrap justify-start pt-2"
            >
              {filters.map((filter) => (
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
            {loading ? (
              <div className="space-y-2 px-6 pb-4">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : filteredLogs.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="pl-6">File</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Rows</TableHead>
                      <TableHead className="text-right">Created</TableHead>
                      <TableHead className="text-right">Updated</TableHead>
                      <TableHead className="text-right">Skipped</TableHead>
                      <TableHead className="text-right">Errors</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="pr-6" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => {
                      const rate = successRate(log)
                      const errorCount = Number(log.errorCount ?? 0)
                      return (
                        <TableRow key={log.id} className="group">
                          <TableCell className="pl-6">
                            <Link
                              href={`/imports/${log.id}`}
                              className="flex items-center gap-2.5"
                            >
                              <div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted/40 group-hover:bg-muted">
                                <FileSpreadsheetIcon className="size-4 text-muted-foreground" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-medium group-hover:underline">
                                  {log.fileName}
                                </p>
                                <p className="text-xs text-muted-foreground">{rate}% success</p>
                              </div>
                            </Link>
                          </TableCell>
                          <TableCell>{statusBadge(log.status)}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {(log.totalRows ?? 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                            {(log.createdCount ?? 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {(log.updatedCount ?? 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {(log.skippedCount ?? 0).toLocaleString()}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right tabular-nums",
                              errorCount > 0 && "text-destructive",
                            )}
                          >
                            {errorCount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            <span title={formatDateTime(log.createdAt)}>
                              {formatRelative(log.createdAt)}
                            </span>
                          </TableCell>
                          <TableCell className="pr-6 text-right">
                            <Button asChild variant="ghost" size="sm">
                              <Link href={`/imports/${log.id}`}>
                                View
                                <ArrowRightIcon className="size-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : logs.length ? (
              <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
                <SearchIcon className="size-7 text-muted-foreground" />
                <p className="font-medium">No imports match these filters</p>
                <p className="text-sm text-muted-foreground">
                  Try a different search term or clear the status filter.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch("")
                    setStatusFilter("all")
                  }}
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="mx-6 mb-6 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 p-10 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-background shadow-sm">
                  <FileSpreadsheetIcon className="size-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">No imports yet</p>
                  <p className="text-sm text-muted-foreground">
                    Create your first product import to see logs here.
                  </p>
                </div>
                <Button asChild size="sm">
                  <Link href="/imports/new">
                    <PlusIcon className="size-4" />
                    New import
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Latest import</CardTitle>
              <CardDescription>The most recent run on this organization.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {loading && !latestLog ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : latestLog ? (
                <>
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate font-medium">{latestLog.fileName}</p>
                      {statusBadge(latestLog.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(latestLog.createdAt)}
                    </p>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Success rate</span>
                      <span className="font-medium tabular-nums text-foreground">
                        {successRate(latestLog)}%
                      </span>
                    </div>
                    <Progress value={successRate(latestLog)} className="h-1.5" />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <SummaryCell label="Rows" value={latestLog.totalRows ?? 0} />
                    <SummaryCell
                      label="Errors"
                      value={latestLog.errorCount ?? 0}
                      tone={Number(latestLog.errorCount ?? 0) > 0 ? "destructive" : "default"}
                    />
                    <SummaryCell label="Created" value={latestLog.createdCount ?? 0} />
                    <SummaryCell label="Updated" value={latestLog.updatedCount ?? 0} />
                  </div>

                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href={`/imports/${latestLog.id}`}>
                      Open import details
                      <ArrowRightIcon className="size-4" />
                    </Link>
                  </Button>
                </>
              ) : (
                <p className="text-muted-foreground">No imports yet.</p>
              )}
            </CardContent>
          </Card>

          {failedLogs.length ? (
            <Alert variant="destructive">
              <AlertTriangleIcon />
              <AlertTitle>{failedLogs.length} import{failedLogs.length === 1 ? "" : "s"} need review</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-1.5">
                  {failedLogs.slice(0, 4).map((log) => (
                    <Link
                      key={log.id}
                      href={`/imports/${log.id}`}
                      className="flex items-center justify-between gap-2 rounded-md border bg-background/60 px-2.5 py-2 text-xs hover:bg-background"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{log.fileName}</p>
                        <p className="text-muted-foreground">
                          {log.errorCount ?? 0} error{Number(log.errorCount ?? 0) === 1 ? "" : "s"} ·{" "}
                          {formatRelative(log.createdAt)}
                        </p>
                      </div>
                      <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function ImportMetricCard({
  title,
  value,
  detail,
  icon: Icon,
  tone = "default",
}: {
  title: string
  value: number
  detail: string
  icon: React.ComponentType<{ className?: string }>
  tone?: "default" | "success" | "destructive"
}) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : tone === "destructive"
        ? "bg-destructive/10 text-destructive"
        : "bg-muted text-muted-foreground"
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardDescription>{title}</CardDescription>
          <div className={cn("flex size-7 items-center justify-center rounded-md", toneClass)}>
            <Icon className="size-3.5" />
          </div>
        </div>
        <CardTitle className="text-2xl font-semibold tabular-nums">
          {value.toLocaleString()}
        </CardTitle>
        <CardDescription className="text-xs">{detail}</CardDescription>
      </CardHeader>
    </Card>
  )
}

function SummaryCell({
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
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-lg font-semibold tabular-nums",
          tone === "destructive" && "text-destructive",
        )}
      >
        {value.toLocaleString()}
      </p>
    </div>
  )
}
