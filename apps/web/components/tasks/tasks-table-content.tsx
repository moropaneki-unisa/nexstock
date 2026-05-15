"use client"

import * as React from "react"
import Link from "next/link"
import {
  AlertCircleIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  EditIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PlusIcon,
  RocketIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { TaskDeleteDialog } from "@/components/tasks/task-delete-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { apiFetch } from "@/lib/api"

type TaskStatus = "todo" | "in_progress" | "blocked" | "done"
type TaskPriority = "low" | "medium" | "high" | "urgent"
type TaskView = "focus" | "today" | "overdue" | "upcoming" | "blocked" | "done" | "all"
type TaskSort = "smart" | "due" | "priority" | "created"

type Task = {
  id: string
  title: string
  description?: string | null
  status: TaskStatus
  priority: TaskPriority
  category?: string | null
  dueAt?: string | null
  createdAt?: string | null
}

type TaskSummary = {
  total: number
  todo: number
  inProgress: number
  blocked: number
  done: number
  dueToday: number
  overdue: number
}

type TasksResponse = {
  tasks: Task[]
  summary: TaskSummary
}

const emptySummary: TaskSummary = { total: 0, todo: 0, inProgress: 0, blocked: 0, done: 0, dueToday: 0, overdue: 0 }
const priorityRank: Record<TaskPriority, number> = { urgent: 4, high: 3, medium: 2, low: 1 }
const views: Array<{ id: TaskView; label: string }> = [
  { id: "focus", label: "Focus" },
  { id: "today", label: "Today" },
  { id: "overdue", label: "Overdue" },
  { id: "upcoming", label: "Upcoming" },
  { id: "blocked", label: "Blocked" },
  { id: "done", label: "Done" },
  { id: "all", label: "All" },
]

function dateValue(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDate(value?: string | null) {
  const date = dateValue(value)
  if (!date) return "No due date"
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(date)
}

function isToday(value?: string | null) {
  const date = dateValue(value)
  return Boolean(date && date.toDateString() === new Date().toDateString())
}

function isOverdue(task: Task) {
  const due = dateValue(task.dueAt)
  if (!due || task.status === "done") return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return due < today
}

function isUpcoming(task: Task) {
  const due = dateValue(task.dueAt)
  if (!due || task.status === "done") return false
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  return due > today
}

function viewMatches(task: Task, view: TaskView) {
  if (view === "all") return true
  if (view === "done") return task.status === "done"
  if (view === "blocked") return task.status === "blocked"
  if (view === "today") return task.status !== "done" && isToday(task.dueAt)
  if (view === "overdue") return isOverdue(task)
  if (view === "upcoming") return isUpcoming(task)
  return task.status !== "done" && (task.status === "in_progress" || task.priority === "urgent" || task.priority === "high" || isToday(task.dueAt) || isOverdue(task))
}

function statusLabel(status: TaskStatus) {
  if (status === "todo") return "To do"
  if (status === "in_progress") return "In progress"
  return status[0].toUpperCase() + status.slice(1)
}

function priorityLabel(priority: TaskPriority) {
  return priority[0].toUpperCase() + priority.slice(1)
}

function sortTasks(tasks: Task[], sort: TaskSort) {
  return [...tasks].sort((a, b) => {
    if (sort === "priority") return priorityRank[b.priority] - priorityRank[a.priority]
    if (sort === "created") return (dateValue(b.createdAt)?.getTime() ?? 0) - (dateValue(a.createdAt)?.getTime() ?? 0)
    const aDue = dateValue(a.dueAt)?.getTime() ?? Number.MAX_SAFE_INTEGER
    const bDue = dateValue(b.dueAt)?.getTime() ?? Number.MAX_SAFE_INTEGER
    if (sort === "due") return aDue - bDue
    const aScore = (isOverdue(a) ? 100 : 0) + (isToday(a.dueAt) ? 50 : 0) + priorityRank[a.priority] * 10 + (a.status === "in_progress" ? 5 : 0)
    const bScore = (isOverdue(b) ? 100 : 0) + (isToday(b.dueAt) ? 50 : 0) + priorityRank[b.priority] * 10 + (b.status === "in_progress" ? 5 : 0)
    return bScore === aScore ? aDue - bDue : bScore - aScore
  })
}

function StatusBadge({ status }: { status: TaskStatus }) {
  return <Badge variant={status === "done" ? "default" : status === "blocked" ? "destructive" : "secondary"}>{statusLabel(status)}</Badge>
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return <Badge variant={priority === "urgent" || priority === "high" ? "destructive" : priority === "medium" ? "secondary" : "outline"}>{priorityLabel(priority)}</Badge>
}

function CompactStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex h-8 min-w-0 items-center justify-between gap-2 rounded-md border bg-background px-2.5 sm:justify-start">
      <span className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  )
}

function TableSkeleton({ rows }: { rows: number }) {
  return Array.from({ length: rows }).map((_, index) => (
    <TableRow key={index} className="h-14">
      <TableCell><Skeleton className="h-5 w-48 sm:w-64" /></TableCell>
      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
      <TableCell><Skeleton className="h-5 w-28" /></TableCell>
      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
      <TableCell><Skeleton className="ml-auto h-8 w-8" /></TableCell>
    </TableRow>
  ))
}

function EmptyRows({ rows }: { rows: number }) {
  if (rows <= 0) return null
  return Array.from({ length: rows }).map((_, index) => (
    <TableRow key={`empty-${index}`} className="h-14 hover:bg-transparent">
      <TableCell colSpan={6}>&nbsp;</TableCell>
    </TableRow>
  ))
}

function TaskActions({ task, busy, onStatus, onDelete }: { task: Task; busy: boolean; onStatus: (status: TaskStatus) => void; onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" disabled={busy}>
          <MoreHorizontalIcon className="size-4" />
          <span className="sr-only">Task actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Move task</DropdownMenuLabel>
        {task.status !== "in_progress" ? <DropdownMenuItem onClick={() => onStatus("in_progress")}>Start work</DropdownMenuItem> : null}
        {task.status !== "blocked" ? <DropdownMenuItem onClick={() => onStatus("blocked")}>Mark blocked</DropdownMenuItem> : null}
        {task.status !== "done" ? <DropdownMenuItem onClick={() => onStatus("done")}><CheckCircle2Icon className="size-4" />Mark done</DropdownMenuItem> : <DropdownMenuItem onClick={() => onStatus("todo")}>Reopen task</DropdownMenuItem>}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/tasks/${task.id}/edit`}><EditIcon className="size-4" />Edit</Link>
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2Icon className="size-4" />Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function TasksTableContent() {
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [summary, setSummary] = React.useState<TaskSummary>(emptySummary)
  const [view, setView] = React.useState<TaskView>("focus")
  const [query, setQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<TaskStatus | "all">("all")
  const [priorityFilter, setPriorityFilter] = React.useState<TaskPriority | "all">("all")
  const [categoryFilter, setCategoryFilter] = React.useState("all")
  const [sort, setSort] = React.useState<TaskSort>("smart")
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(10)
  const [loading, setLoading] = React.useState(true)
  const [busy, setBusy] = React.useState<string | null>(null)
  const [deleteTask, setDeleteTask] = React.useState<Task | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<TasksResponse>("/api/tasks")
      setTasks(data.tasks || [])
      setSummary(data.summary || emptySummary)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load tasks"
      setError(message)
      toast.error("Tasks could not load", { description: message })
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { void load() }, [load])

  const categories = React.useMemo(() => Array.from(new Set(tasks.map((task) => task.category).filter(Boolean).map(String))).sort((a, b) => a.localeCompare(b)), [tasks])
  const viewCounts = React.useMemo(() => views.reduce<Record<TaskView, number>>((acc, item) => {
    acc[item.id] = tasks.filter((task) => viewMatches(task, item.id)).length
    return acc
  }, { focus: 0, today: 0, overdue: 0, upcoming: 0, blocked: 0, done: 0, all: 0 }), [tasks])

  const visibleTasks = React.useMemo(() => {
    const search = query.trim().toLowerCase()
    const filtered = tasks.filter((task) => {
      if (!viewMatches(task, view)) return false
      if (statusFilter !== "all" && task.status !== statusFilter) return false
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false
      if (categoryFilter !== "all" && task.category !== categoryFilter) return false
      if (!search) return true
      return [task.title, task.description, task.category, task.priority, task.status].filter(Boolean).join(" ").toLowerCase().includes(search)
    })
    return sortTasks(filtered, sort)
  }, [tasks, view, statusFilter, priorityFilter, categoryFilter, query, sort])

  const totalPages = Math.max(1, Math.ceil(visibleTasks.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const startIndex = visibleTasks.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endIndex = Math.min(currentPage * pageSize, visibleTasks.length)
  const paginatedTasks = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return visibleTasks.slice(start, start + pageSize)
  }, [visibleTasks, currentPage, pageSize])
  const emptyRowCount = !loading && visibleTasks.length > 0 ? Math.max(0, pageSize - paginatedTasks.length) : 0

  React.useEffect(() => {
    setPage(1)
  }, [view, query, statusFilter, priorityFilter, categoryFilter, sort, pageSize])

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  function resetFilters() {
    setQuery("")
    setStatusFilter("all")
    setPriorityFilter("all")
    setCategoryFilter("all")
    setSort("smart")
    setPage(1)
  }

  async function updateStatus(task: Task, status: TaskStatus) {
    setBusy(task.id)
    try {
      await apiFetch<Task>(`/api/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ status }) })
      toast.success("Task updated")
      await load()
    } catch (err) {
      toast.error("Task could not update", { description: err instanceof Error ? err.message : "API request failed" })
    } finally {
      setBusy(null)
    }
  }

  async function removeTask() {
    if (!deleteTask) return
    setBusy(deleteTask.id)
    try {
      await apiFetch(`/api/tasks/${deleteTask.id}`, { method: "DELETE" })
      toast.success("Task deleted")
      setDeleteTask(null)
      await load()
    } catch (err) {
      toast.error("Task could not delete", { description: err instanceof Error ? err.message : "API request failed" })
    } finally {
      setBusy(null)
    }
  }

  async function createChecklist() {
    setBusy("launch-checklist")
    try {
      const result = await apiFetch<{ created: number; skipped: number; total: number }>("/api/tasks/launch-checklist", { method: "POST" })
      toast.success("Launch checklist ready", { description: `${result.created} created, ${result.skipped} already existed.` })
      setView("focus")
      await load()
    } catch (err) {
      toast.error("Checklist could not be created", { description: err instanceof Error ? err.message : "API request failed" })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex min-h-[calc(100svh-var(--header-height))] flex-1 flex-col gap-3 p-3 sm:gap-4 sm:p-4 md:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Workspace</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Tasks</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Manage all tasks from one table. Filters stay in the table header and only the task rows scroll.</p>
        </div>
        <div className="grid gap-2 sm:flex sm:flex-row">
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={createChecklist} disabled={busy === "launch-checklist"}>
            {busy === "launch-checklist" ? <Loader2Icon className="size-4 animate-spin" /> : <RocketIcon className="size-4" />}
            Launch checklist
          </Button>
          <Button asChild className="w-full sm:w-auto"><Link href="/tasks/new"><PlusIcon className="size-4" />New task</Link></Button>
        </div>
      </div>

      {error ? <div className="flex gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive sm:p-4"><AlertCircleIcon className="size-4 shrink-0" />{error}</div> : null}

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <CompactStat label="Open" value={summary.todo + summary.inProgress + summary.blocked} />
        <CompactStat label="Today" value={summary.dueToday} />
        <CompactStat label="Overdue" value={summary.overdue} />
        <CompactStat label="Blocked" value={summary.blocked} />
        <CompactStat label="Done" value={summary.done} />
      </div>

      <div className="flex h-[calc(100svh-18rem)] min-h-[34rem] flex-1 flex-col overflow-hidden rounded-xl border bg-background sm:h-[calc(100svh-17rem)] md:h-[46rem]">
        <Tabs value={view} onValueChange={(value) => setView(value as TaskView)} className="shrink-0 gap-0">
          <div className="overflow-x-auto p-2 sm:p-3">
            <TabsList variant="line" className="w-max min-w-full justify-start">
              {views.map((item) => (
                <TabsTrigger key={item.id} value={item.id} className="min-w-fit gap-2 px-3">
                  {item.label}<Badge variant="outline" className="rounded-full px-1.5 py-0 text-[10px]">{viewCounts[item.id]}</Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <Separator />
          <div className="grid gap-2 p-2 sm:grid-cols-2 sm:p-3 lg:grid-cols-[minmax(0,1fr)_9rem_9rem_10rem_9rem]">
            <div className="relative min-w-0 sm:col-span-2 lg:col-span-1">
              <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, description, prompt, category..." className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as TaskStatus | "all")}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="todo">To do</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as TaskPriority | "all")}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(value) => setSort(value as TaskSort)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="smart">Smart sort</SelectItem>
                <SelectItem value="due">Due date</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="created">Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2 border-t p-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:p-3">
            <span>Showing <span className="font-medium text-foreground">{startIndex}-{endIndex}</span> of <span className="font-medium text-foreground">{visibleTasks.length}</span> filtered tasks</span>
            <Button type="button" variant="ghost" size="sm" className="w-full sm:w-auto" onClick={resetFilters}>Clear filters</Button>
          </div>
        </Tabs>

        <div className="min-w-0 flex-1 overflow-auto border-t">
          <Table className="min-w-[760px]">
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead className="min-w-[18rem]">Task</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="w-12 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? <TableSkeleton rows={pageSize} /> : null}
              {!loading && visibleTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="flex h-[20rem] flex-col items-center justify-center gap-3 p-6 text-center sm:h-[28rem] sm:p-8">
                      <p className="font-medium">{tasks.length ? "No tasks match these filters" : "No tasks yet"}</p>
                      <p className="max-w-md text-sm text-muted-foreground">{tasks.length ? "Change the filters or clear them to see more tasks." : "Create your first task or generate the launch checklist."}</p>
                      <div className="grid w-full max-w-xs gap-2 sm:flex sm:max-w-none sm:flex-wrap sm:justify-center">
                        {tasks.length ? <Button type="button" variant="outline" onClick={resetFilters}>Clear filters</Button> : null}
                        <Button asChild><Link href="/tasks/new"><PlusIcon className="size-4" />New task</Link></Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}
              {!loading && paginatedTasks.map((task) => (
                <TableRow key={task.id} className="h-14">
                  <TableCell className="min-w-[18rem] max-w-[34rem]">
                    <Link href={`/tasks/${task.id}`} className="font-medium hover:underline">{task.title}</Link>
                    {task.description ? <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{task.description}</p> : null}
                  </TableCell>
                  <TableCell><StatusBadge status={task.status} /></TableCell>
                  <TableCell><PriorityBadge priority={task.priority} /></TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <CalendarClockIcon className="size-3.5" />{formatDate(task.dueAt)}
                    </span>
                    {isOverdue(task) ? <Badge variant="destructive" className="ml-2">Overdue</Badge> : null}
                    {isToday(task.dueAt) && task.status !== "done" ? <Badge variant="outline" className="ml-2">Today</Badge> : null}
                  </TableCell>
                  <TableCell>{task.category ? <Badge variant="outline">{task.category}</Badge> : <span className="text-muted-foreground">None</span>}</TableCell>
                  <TableCell className="text-right">
                    <TaskActions task={task} busy={busy === task.id} onStatus={(status) => updateStatus(task, status)} onDelete={() => setDeleteTask(task)} />
                  </TableCell>
                </TableRow>
              ))}
              <EmptyRows rows={emptyRowCount} />
            </TableBody>
          </Table>
        </div>

        <div className="shrink-0 border-t bg-background px-2 py-2 sm:px-3 sm:py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              Page <span className="font-medium text-foreground">{currentPage}</span> of <span className="font-medium text-foreground">{totalPages}</span>
            </div>
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

      <TaskDeleteDialog open={Boolean(deleteTask)} title={deleteTask?.title} deleting={Boolean(deleteTask && busy === deleteTask.id)} onOpenChange={(open) => { if (!open) setDeleteTask(null) }} onConfirm={() => void removeTask()} />
    </div>
  )
}
