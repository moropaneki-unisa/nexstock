"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  CircleIcon,
  ClockIcon,
  EditIcon,
  FilterIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PlusIcon,
  RocketIcon,
  SaveIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ButtonGroup, ButtonGroupItem } from "@/components/ui/button-group"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
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
  reminderEnabled?: boolean | null
  reminderAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  completedAt?: string | null
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

type TaskPayload = {
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  category?: string
  dueAt?: string
  reminderEnabled: boolean
  reminderAt?: string
}

type TaskFormState = {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  category: string
  dueAt: string
  reminderEnabled: boolean
  reminderAt: string
}

const emptySummary: TaskSummary = {
  total: 0,
  todo: 0,
  inProgress: 0,
  blocked: 0,
  done: 0,
  dueToday: 0,
  overdue: 0,
}

const emptyForm: TaskFormState = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  category: "",
  dueAt: "",
  reminderEnabled: false,
  reminderAt: "",
}

const priorityRank: Record<TaskPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
}

const views: Array<{ id: TaskView; label: string; helper: string }> = [
  { id: "focus", label: "Focus", helper: "Priority work" },
  { id: "today", label: "Today", helper: "Due today" },
  { id: "overdue", label: "Overdue", helper: "Past due" },
  { id: "upcoming", label: "Upcoming", helper: "Future work" },
  { id: "blocked", label: "Blocked", helper: "Waiting" },
  { id: "done", label: "Done", helper: "Completed" },
  { id: "all", label: "All", helper: "Everything" },
]

function statusLabel(status: TaskStatus) {
  if (status === "todo") return "To do"
  if (status === "in_progress") return "In progress"
  return status[0].toUpperCase() + status.slice(1)
}

function priorityLabel(priority: TaskPriority) {
  return priority[0].toUpperCase() + priority.slice(1)
}

function dateValue(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function dateInputValue(value?: string | null) {
  const date = dateValue(value)
  return date ? date.toISOString().slice(0, 10) : ""
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
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  return due < startOfToday
}

function isUpcoming(task: Task) {
  const due = dateValue(task.dueAt)
  if (!due || task.status === "done") return false
  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)
  return due > endOfToday
}

function viewMatches(task: Task, view: TaskView) {
  if (view === "all") return true
  if (view === "done") return task.status === "done"
  if (view === "blocked") return task.status === "blocked"
  if (view === "today") return task.status !== "done" && isToday(task.dueAt)
  if (view === "overdue") return isOverdue(task)
  if (view === "upcoming") return isUpcoming(task)

  return (
    task.status !== "done" &&
    (task.status === "in_progress" ||
      task.priority === "urgent" ||
      task.priority === "high" ||
      isOverdue(task) ||
      isToday(task.dueAt))
  )
}

function groupLabel(task: Task) {
  if (task.status === "done") return "Done"
  if (isOverdue(task)) return "Overdue"
  if (isToday(task.dueAt)) return "Today"
  if (task.status === "blocked") return "Blocked"
  if (isUpcoming(task)) return "Upcoming"
  return "No due date"
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

function taskToForm(task: Task): TaskFormState {
  return {
    title: task.title || "",
    description: task.description || "",
    status: task.status || "todo",
    priority: task.priority || "medium",
    category: task.category || "",
    dueAt: dateInputValue(task.dueAt),
    reminderEnabled: Boolean(task.reminderEnabled),
    reminderAt: dateInputValue(task.reminderAt),
  }
}

function withOptionalText<T extends Record<string, unknown>>(payload: T, key: string, value: string) {
  const text = value.trim()
  if (text) payload[key] = text
}

function formToPayload(form: TaskFormState): TaskPayload {
  const payload: TaskPayload = {
    title: form.title.trim(),
    status: form.status,
    priority: form.priority,
    reminderEnabled: form.reminderEnabled,
  }

  withOptionalText(payload, "description", form.description)
  withOptionalText(payload, "category", form.category)
  if (form.dueAt) payload.dueAt = form.dueAt
  if (form.reminderEnabled) payload.reminderAt = form.reminderAt || form.dueAt

  return payload
}

async function fetchTasks() {
  return apiFetch<TasksResponse>("/api/tasks")
}

async function fetchTask(taskId: string) {
  return apiFetch<Task>(`/api/tasks/${taskId}`)
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const variant = status === "done" ? "default" : status === "blocked" ? "destructive" : "secondary"
  return <Badge variant={variant}>{statusLabel(status)}</Badge>
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const variant = priority === "urgent" || priority === "high" ? "destructive" : priority === "medium" ? "secondary" : "outline"
  return <Badge variant={variant}>{priorityLabel(priority)}</Badge>
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}{required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      {children}
    </div>
  )
}

function StatCard({ label, value, helper }: { label: string; value: number; helper: string }) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  )
}

function TasksLoading() {
  return (
    <div className="space-y-2 rounded-xl border p-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="grid gap-3 border-b p-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_10rem_8rem_3rem] md:items-center">
          <div className="space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-8 w-8" />
        </div>
      ))}
    </div>
  )
}

function EmptyTasksState({ hasTasks, onReset }: { hasTasks: boolean; onReset: () => void }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/10 p-10 text-center">
      <CircleIcon className="size-10 text-muted-foreground" />
      <div>
        <p className="font-medium">{hasTasks ? "No tasks match this view" : "No tasks yet"}</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {hasTasks ? "Adjust the filters, switch tabs, or clear the search to find the work you need." : "Create a task or generate the launch checklist to start running the app from one place."}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {hasTasks ? <Button type="button" variant="outline" onClick={onReset}>Clear filters</Button> : null}
        <Button asChild>
          <Link href="/tasks/new"><PlusIcon className="size-4" />New task</Link>
        </Button>
      </div>
    </div>
  )
}

function TaskActions({ task, busy, onStatus, onDelete }: { task: Task; busy: boolean; onStatus: (status: TaskStatus) => void; onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={busy}>
          <MoreHorizontalIcon className="size-4" />
          <span className="sr-only">Task actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Move task</DropdownMenuLabel>
        {task.status !== "in_progress" ? <DropdownMenuItem onClick={() => onStatus("in_progress")}>Start work</DropdownMenuItem> : null}
        {task.status !== "blocked" ? <DropdownMenuItem onClick={() => onStatus("blocked")}>Mark blocked</DropdownMenuItem> : null}
        {task.status !== "done" ? <DropdownMenuItem onClick={() => onStatus("done")}>Mark done</DropdownMenuItem> : <DropdownMenuItem onClick={() => onStatus("todo")}>Reopen task</DropdownMenuItem>}
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

function TaskMobileCard({ task, busy, onStatus, onDelete }: { task: Task; busy: boolean; onStatus: (status: TaskStatus) => void; onDelete: () => void }) {
  return (
    <Card className="shadow-none md:hidden">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={task.status} />
              <PriorityBadge priority={task.priority} />
              {isOverdue(task) ? <Badge variant="destructive">Overdue</Badge> : null}
              {isToday(task.dueAt) && task.status !== "done" ? <Badge variant="outline">Today</Badge> : null}
            </div>
            <Link href={`/tasks/${task.id}`} className="block text-base font-semibold hover:underline">{task.title}</Link>
          </div>
          <TaskActions task={task} busy={busy} onStatus={onStatus} onDelete={onDelete} />
        </div>
        {task.description ? <p className="line-clamp-2 text-sm text-muted-foreground">{task.description}</p> : null}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><CalendarClockIcon className="size-3.5" />{formatDate(task.dueAt)}</span>
          {task.category ? <Badge variant="outline">{task.category}</Badge> : null}
        </div>
      </CardContent>
    </Card>
  )
}

export function TasksContent() {
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [summary, setSummary] = React.useState<TaskSummary>(emptySummary)
  const [view, setView] = React.useState<TaskView>("focus")
  const [query, setQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<TaskStatus | "all">("all")
  const [priorityFilter, setPriorityFilter] = React.useState<TaskPriority | "all">("all")
  const [categoryFilter, setCategoryFilter] = React.useState("all")
  const [sort, setSort] = React.useState<TaskSort>("smart")
  const [loading, setLoading] = React.useState(true)
  const [busy, setBusy] = React.useState<string | null>(null)
  const [deleteTask, setDeleteTask] = React.useState<Task | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchTasks()
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

  React.useEffect(() => {
    void load()
  }, [load])

  const categories = React.useMemo(() => {
    return Array.from(new Set(tasks.map((task) => task.category).filter(Boolean).map(String))).sort((a, b) => a.localeCompare(b))
  }, [tasks])

  const viewCounts = React.useMemo(() => {
    return views.reduce<Record<TaskView, number>>((acc, item) => {
      acc[item.id] = tasks.filter((task) => viewMatches(task, item.id)).length
      return acc
    }, { focus: 0, today: 0, overdue: 0, upcoming: 0, blocked: 0, done: 0, all: 0 })
  }, [tasks])

  const visibleTasks = React.useMemo(() => {
    const search = query.trim().toLowerCase()
    const filtered = tasks.filter((task) => {
      if (!viewMatches(task, view)) return false
      if (statusFilter !== "all" && task.status !== statusFilter) return false
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false
      if (categoryFilter !== "all" && task.category !== categoryFilter) return false
      if (!search) return true
      return [task.title, task.description, task.category, task.priority, task.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search)
    })
    return sortTasks(filtered, sort)
  }, [tasks, view, statusFilter, priorityFilter, categoryFilter, query, sort])

  const groupedTasks = React.useMemo(() => {
    const groups = new Map<string, Task[]>()
    for (const task of visibleTasks) {
      const group = groupLabel(task)
      groups.set(group, [...(groups.get(group) || []), task])
    }
    return Array.from(groups.entries())
  }, [visibleTasks])

  function resetFilters() {
    setQuery("")
    setStatusFilter("all")
    setPriorityFilter("all")
    setCategoryFilter("all")
    setSort("smart")
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
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Workspace</p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Tasks</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Manage launch and operational work from one focused page with views, filters, quick actions, and clear task ownership.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={createChecklist} disabled={busy === "launch-checklist"}>
            {busy === "launch-checklist" ? <Loader2Icon className="size-4 animate-spin" /> : <RocketIcon className="size-4" />}
            Launch checklist
          </Button>
          <Button asChild>
            <Link href="/tasks/new"><PlusIcon className="size-4" />New task</Link>
          </Button>
        </div>
      </div>

      {error ? (
        <div className="flex gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircleIcon className="size-4" />{error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Open" value={summary.todo + summary.inProgress + summary.blocked} helper="Not completed" />
        <StatCard label="Today" value={summary.dueToday} helper="Due now" />
        <StatCard label="Overdue" value={summary.overdue} helper="Needs action" />
        <StatCard label="Blocked" value={summary.blocked} helper="Waiting" />
        <StatCard label="Done" value={summary.done} helper="Completed" />
      </div>

      <Tabs value={view} onValueChange={(value) => setView(value as TaskView)} className="gap-4">
        <div className="flex flex-col gap-3 rounded-xl border bg-background p-3">
          <TabsList variant="line" className="w-full justify-start overflow-x-auto">
            {views.map((item) => (
              <TabsTrigger key={item.id} value={item.id} className="min-w-fit gap-2 px-3">
                {item.label}
                <Badge variant="outline" className="rounded-full px-1.5 py-0 text-[10px]">{viewCounts[item.id]}</Badge>
              </TabsTrigger>
            ))}
          </TabsList>
          <Separator />
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_9rem_9rem_10rem_9rem]">
            <div className="relative min-w-0">
              <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, description, prompt, category..." className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as TaskStatus | "all")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="todo">To do</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as TaskPriority | "all")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(value) => setSort(value as TaskSort)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="smart">Smart sort</SelectItem>
                <SelectItem value="due">Due date</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="created">Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>Showing <span className="font-medium text-foreground">{visibleTasks.length}</span> of <span className="font-medium text-foreground">{tasks.length}</span> tasks</span>
            <Button type="button" variant="ghost" size="sm" onClick={resetFilters}><FilterIcon className="size-4" />Clear filters</Button>
          </div>
        </div>

        {views.map((item) => (
          <TabsContent key={item.id} value={item.id} className="space-y-5">
            {loading ? <TasksLoading /> : null}
            {!loading && visibleTasks.length === 0 ? <EmptyTasksState hasTasks={tasks.length > 0} onReset={resetFilters} /> : null}
            {!loading && groupedTasks.map(([group, groupTasks]) => (
              <section key={group} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{group}</h2>
                    <p className="text-xs text-muted-foreground">{groupTasks.length} task{groupTasks.length === 1 ? "" : "s"}</p>
                  </div>
                  <Badge variant="outline">{groupTasks.length}</Badge>
                </div>

                <div className="hidden overflow-hidden rounded-xl border bg-background md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Due</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="w-12 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupTasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell className="max-w-[34rem]">
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
                    </TableBody>
                  </Table>
                </div>

                <div className="grid gap-2 md:hidden">
                  {groupTasks.map((task) => (
                    <TaskMobileCard key={task.id} task={task} busy={busy === task.id} onStatus={(status) => updateStatus(task, status)} onDelete={() => setDeleteTask(task)} />
                  ))}
                </div>
              </section>
            ))}
          </TabsContent>
        ))}
      </Tabs>

      <AlertDialog open={Boolean(deleteTask)} onOpenChange={(open) => { if (!open) setDeleteTask(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="text-destructive"><Trash2Icon className="size-5" /></AlertDialogMedia>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {deleteTask ? `"${deleteTask.title}"` : "this task"}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deleteTask && busy === deleteTask.id)}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={Boolean(deleteTask && busy === deleteTask.id)} onClick={() => void removeTask()}>
              {deleteTask && busy === deleteTask.id ? "Deleting..." : "Delete task"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export function TaskFormContent({ taskId }: { taskId?: string }) {
  const router = useRouter()
  const editing = Boolean(taskId)
  const [form, setForm] = React.useState<TaskFormState>(emptyForm)
  const [loading, setLoading] = React.useState(Boolean(taskId))
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!taskId) return
    let active = true
    setLoading(true)
    fetchTask(taskId)
      .then((task) => {
        if (!active) return
        setForm(taskToForm(task))
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Task could not load")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [taskId])

  function update<K extends keyof TaskFormState>(key: K, value: TaskFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function saveTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const payload = formToPayload(form)
    if (!payload.title) {
      setError("Task title is required.")
      return
    }
    if (payload.reminderEnabled && !payload.reminderAt) {
      setError("Choose a reminder date or due date when reminders are enabled.")
      return
    }
    setSaving(true)
    try {
      const saved = editing && taskId
        ? await apiFetch<Task>(`/api/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(payload) })
        : await apiFetch<Task>("/api/tasks", { method: "POST", body: JSON.stringify(payload) })
      toast.success(editing ? "Task updated" : "Task created")
      router.push(`/tasks/${saved.id}`)
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Task could not save"
      setError(message)
      toast.error("Task could not save", { description: message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2Icon className="size-4 animate-spin" />Loading task...</CardContent>
        </Card>
      </div>
    )
  }

  return (
    <form onSubmit={saveTask} className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Tasks</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{editing ? "Edit task" : "New task"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Use reminders and priorities to keep launch work organized.</p>
        </div>
        <Button asChild variant="outline" size="sm"><Link href={editing && taskId ? `/tasks/${taskId}` : "/tasks"}><ArrowLeftIcon className="size-4" />Back</Link></Button>
      </div>

      {error ? <Card className="border-destructive/30 bg-destructive/5"><CardContent className="flex gap-2 p-4 text-sm text-destructive"><AlertCircleIcon className="size-4" />{error}</CardContent></Card> : null}

      <Card>
        <CardHeader>
          <CardTitle>Task details</CardTitle>
          <CardDescription>These fields map directly to the task API.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Title" required><Input value={form.title} maxLength={160} onChange={(event) => update("title", event.target.value)} /></Field>
          <Field label="Category"><Input value={form.category} maxLength={80} placeholder="Launch, QA, Billing..." onChange={(event) => update("category", event.target.value)} /></Field>
          <Field label="Status"><Select value={form.status} onValueChange={(value) => update("status", value as TaskStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todo">To do</SelectItem><SelectItem value="in_progress">In progress</SelectItem><SelectItem value="blocked">Blocked</SelectItem><SelectItem value="done">Done</SelectItem></SelectContent></Select></Field>
          <Field label="Priority"><Select value={form.priority} onValueChange={(value) => update("priority", value as TaskPriority)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent></Select></Field>
          <Field label="Due date"><Input type="date" value={form.dueAt} onChange={(event) => update("dueAt", event.target.value)} /></Field>
          <Field label="Reminder"><div className="flex h-9 items-center justify-between gap-3 rounded-md border px-3"><span className="text-sm text-muted-foreground">Enable reminder email</span><Switch checked={form.reminderEnabled} onCheckedChange={(checked) => update("reminderEnabled", checked)} /></div></Field>
          {form.reminderEnabled ? <Field label="Reminder date"><Input type="date" value={form.reminderAt} onChange={(event) => update("reminderAt", event.target.value)} /></Field> : null}
          <div className="md:col-span-2"><Field label="Description"><Textarea value={form.description} maxLength={3000} className="min-h-40" onChange={(event) => update("description", event.target.value)} /></Field></div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <ButtonGroup>
          <ButtonGroupItem><Button type="button" variant="outline" disabled={saving} onClick={() => router.push(editing && taskId ? `/tasks/${taskId}` : "/tasks")}>Cancel</Button></ButtonGroupItem>
          <ButtonGroupItem><Button type="submit" disabled={saving}>{saving ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}{saving ? "Saving..." : editing ? "Update task" : "Create task"}</Button></ButtonGroupItem>
        </ButtonGroup>
      </div>
    </form>
  )
}
