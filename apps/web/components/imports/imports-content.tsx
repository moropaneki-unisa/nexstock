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
  XCircleIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
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

type ImportStatusFilter = "all" | "completed" | "errors" | "failed"

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
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
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
  if (status === "completed") {
    return (
      <Badge className="gap-1">
        <CheckCircle2Icon className="size-3" />Completed
      </Badge>
    )
  }
  if (status === "completed_with_errors") {
    return (
      <Badge variant="secondary" className="gap-1">
        <AlertTriangleIcon className="size-3" />With errors
      </Badge>
    )
  }
  if (status === "failed") {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircleIcon className="size-3" />Failed
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="gap-1">
      <ClockIcon className="size-3" />{status || "Processing"}
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

function CompactStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex h-8 min-w-0 items-center justify-between gap-2 rounded-md border bg-background px-2.5 sm:justify-start">
      <span className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{typeof value === "number" ? value.toLocaleString() : value}</span>
    </div>
  )
}

function TableSkeleton({ rows }: { rows: number }) {
  return Array.from({ length: rows }).map((_, index) => (
    <TableRow key={index} className="h-14">
      <TableCell><Skeleton className="h-5 w-56" /></TableCell>
      <TableCell><Skeleton className="h-6 w-28" /></TableCell>
      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
      <TableCell><Skeleton className="ml-auto h-8 w-16" /></TableCell>
    </TableRow>
  ))
}

function EmptyRows({ rows }: { rows: number }) {
  if (rows <= 0) return null
  return Array.from({ length: rows }).map((_, index) => (
    <TableRow key={`empty-${index}`} className="h-14 hover:bg-transparent">
      <TableCell colSpan={8}>&nbsp;</TableCell>
    </TableRow>
  ))
}

export function ImportsContent() {
  const [logs, setLogs] = React.useState<ImportLog[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<ImportStatusFilter>("all")
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(10)

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
  const failedLogs = logs.filter((log) => log.status === "failed" || Number(log.errorCount ?? 0) > 0)

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

  const filters: Array<{ key: ImportStatusFilter; label: string; count: number }> = [
    { key: "all", label: "All", count: logs.length },
    { key: "completed", label: "Completed", count: logs.filter((log) => log.status === "completed").length },
    { key: "errors", label: "With errors", count: failedLogs.length },
    { key: "failed", label: "Failed", count: logs.filter((log) => log.status === "failed").length },
  ]

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const startIndex = filteredLogs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endIndex = Math.min(currentPage * pageSize, filteredLogs.length)
  const paginatedLogs = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredLogs.slice(start, start + pageSize)
  }, [filteredLogs, currentPage, pageSize])
  const emptyRowCount = !loading && filteredLogs.length > 0 ? Math.max(0, pageSize - paginatedLogs.length) : 0

  React.useEffect(() => {
    setPage(1)
  }, [search, statusFilter, pageSize])

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  function clearFilters() {
    setSearch("")
    setStatusFilter("all")
    setPage(1)
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 py-4 md:gap-5 md:py-6">
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
            <Link href="/imports/new"><PlusIcon className="size-4" />New import</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 px-4 sm:flex sm:flex-wrap lg:px-6">
        <CompactStat label="Runs" value={logs.length} />
        <CompactStat label="Rows" value={sumKey(logs, "totalRows")} />
        <CompactStat label="Created" value={sumKey(logs, "createdCount")} />
        <CompactStat label="Updated" value={sumKey(logs, "updatedCount")} />
        <CompactStat label="Skipped" value={sumKey(logs, "skippedCount")} />
        <CompactStat label="Errors" value={sumKey(logs, "errorCount")} />
      </div>

      {failedLogs.length ? (
        <div className="px-4 lg:px-6">
          <Alert variant="destructive">
            <AlertTriangleIcon />
            <AlertTitle>{failedLogs.length} import{failedLogs.length === 1 ? "" : "s"} need review</AlertTitle>
            <AlertDescription>
              The latest issue is {failedLogs[0]?.fileName || "an import"}. Open the import details to review row-level errors.
            </AlertDescription>
          </Alert>
        </div>
      ) : null}

      <div className="px-4 lg:px-6">
        <div className="flex h-[44rem] min-h-[34rem] flex-col overflow-hidden rounded-xl border bg-background md:h-[46rem]">
          <div className="shrink-0 p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <h2 className="font-heading text-lg font-medium tracking-tight">Previous imports</h2>
                <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                  Open any import to view mapping, status, row totals, and error logs.
                  {latestLog ? ` Latest: ${latestLog.fileName} (${successRate(latestLog)}% success).` : ""}
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                <Link href={latestLog ? `/imports/${latestLog.id}` : "/imports/new"}>
                  {latestLog ? "Open latest" : "Start import"}
                  <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="shrink-0 border-t p-3">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="relative min-w-0">
                <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by file name..." className="pl-8" />
              </div>
              <div className="overflow-x-auto">
                <ToggleGroup
                  type="single"
                  value={statusFilter}
                  onValueChange={(value) => {
                    if (value) setStatusFilter(value as ImportStatusFilter)
                  }}
                  variant="outline"
                  size="sm"
                  spacing={1}
                  className="w-max justify-start"
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
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 border-t px-3 py-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>Showing <span className="font-medium text-foreground">{startIndex}-{endIndex}</span> of <span className="font-medium text-foreground">{filteredLogs.length}</span> imports</span>
            {(search || statusFilter !== "all") ? <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button> : null}
          </div>

          <div className="min-w-0 flex-1 overflow-auto border-t">
            <Table className="min-w-[900px]">
              <TableHeader className="sticky top-0 z-10 bg-muted/60">
                <TableRow>
                  <TableHead className="pl-6">File</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Rows</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                  <TableHead className="text-right">Updated</TableHead>
                  <TableHead className="text-right">Skipped</TableHead>
                  <TableHead className="text-right">Errors</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? <TableSkeleton rows={pageSize} /> : null}
                {!loading && filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <div className="flex h-72 flex-col items-center justify-center gap-3 p-6 text-center">
                        <FileSpreadsheetIcon className="size-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{logs.length ? "No imports match these filters" : "No imports yet"}</p>
                          <p className="max-w-md text-sm text-muted-foreground">
                            {logs.length ? "Try a different file name or clear the status filter." : "Create your first product import to see logs here."}
                          </p>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2">
                          {logs.length ? <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button> : null}
                          <Button asChild size="sm"><Link href="/imports/new"><PlusIcon className="size-4" />New import</Link></Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
                {!loading && paginatedLogs.map((log) => {
                  const rate = successRate(log)
                  const errorCount = Number(log.errorCount ?? 0)
                  return (
                    <TableRow key={log.id} className="h-14 group">
                      <TableCell className="pl-6">
                        <Link href={`/imports/${log.id}`} className="flex items-center gap-2.5">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted/40 group-hover:bg-muted">
                            <FileSpreadsheetIcon className="size-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium group-hover:underline">{log.fileName}</p>
                            <p className="text-xs text-muted-foreground">{rate}% success</p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>{statusBadge(log.status)}</TableCell>
                      <TableCell className="text-right tabular-nums">{(log.totalRows ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">{(log.createdCount ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">{(log.updatedCount ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{(log.skippedCount ?? 0).toLocaleString()}</TableCell>
                      <TableCell className={cn("text-right tabular-nums", errorCount > 0 && "text-destructive")}>{errorCount.toLocaleString()}</TableCell>
                      <TableCell className="text-muted-foreground"><span title={formatDateTime(log.createdAt)}>{formatRelative(log.createdAt)}</span></TableCell>
                      <TableCell className="pr-6 text-right">
                        <Button asChild variant="ghost" size="sm"><Link href={`/imports/${log.id}`}>View<ArrowRightIcon className="size-4" /></Link></Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
                <EmptyRows rows={emptyRowCount} />
              </TableBody>
            </Table>
          </div>

          <div className="shrink-0 border-t bg-background px-3 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">Page <span className="font-medium text-foreground">{currentPage}</span> of <span className="font-medium text-foreground">{totalPages}</span></div>
              <div className="grid grid-cols-[1fr_1fr_1fr] items-center gap-2 sm:flex sm:flex-wrap">
                <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                  <SelectTrigger className="w-full sm:w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 / page</SelectItem>
                    <SelectItem value="10">10 / page</SelectItem>
                    <SelectItem value="20">20 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
                <Button type="button" variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
