"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  EditIcon,
  ListFilterIcon,
  Loader2Icon,
  PlusIcon,
  RocketIcon,
  SaveIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ButtonGroup, ButtonGroupItem } from "@/components/ui/button-group"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
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

const emptySummary: TaskSummary = { total: 0, todo: 0, inProgress: 0, blocked: 0, done: 0, dueToday: 0, overdue: 0 }
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

const priorityRank: Record<TaskPriority, number> = { urgent: 4, high: 3, medium: 2, low: 1 }

const views: Array<{ id: TaskView; label: string; description: string }> = [
  { id: "focus", label: "Focus", description: "Open work that needs attention" },
  { id: "today", label: "Today", description: "Due today" },
  { id: "overdue", label: "Overdue", description: "Past due and unfinished" },
  { id: "upcoming", label: "Upcoming", description: "Future work" },
  { id: "blocked", label: "Blocked", description: "Waiting on something" },
  { id: "done", label: "Done", description: "Completed tasks" },
  { id: "all", label: "All", description: "Everything" },
]

function statusLabel(status: TaskStatus) {
  return status === "in_progress" ? "In progress" : status === "todo" ? "To do" : status[0].toUpperCase() + status.slice(1)
}

function priorityLabel(priority: TaskPriority) {
  return priority[0].toUpperCase() + priority.slice(1)
}

function dateInputValue(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 10)
}

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
  if (!date) return false
  return date.toDateString() === new Date().toDateString()
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

function MetricButton({ label, value, active, onClick }: { label: string; value: number; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition hover:bg-muted/40 ${active ? "border-primary bg-primary/5" : "bg-background"}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </button>
  )
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

function TaskListSkeleton() {
  return (
    <div className="grid gap-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="rounded-xl border p-4">
          <div className="flex flex-wrap gap-2">
            <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
            <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
          </div>
          <div className="mt-3 h-5 w-2/3 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}

function EmptyTasksState({ hasTasks, onReset }: { hasTasks: boolean; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/10 p-10 text-center">
      <ClipboardListIcon className="size-10 text-muted-foreground" />
      <div>
        <p className="font-medium">{hasTasks ? "No tasks match this view" : "No tasks yet"}</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {hasTasks ? "Clear filters or switch views to find the task you need." : "Create a task or generate the launch checklist to start tracking real work."}
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

function viewMatches(task: Task, view: TaskView) {
  if (view === "all") return true
  if (view === "done") return task.status === "done"
  if (view === "blocked") return task.status === "blocked"
  if (view === "today") return task.status !== "done" && isToday(task.dueAt)
  if (view === "overdue") return isOverdue(task)
  if (view === "upcoming") return isUpcoming(task)
  return task.status !== "done" && (task.status === "in_progress" || task.priority === "urgent" || task.priority === "high" || isOverdue(task) || isToday(task.dueAt))
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
    if (bScore !== aScore) return bScore - aScore
    return aDue - bDue
  })
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
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null)
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
      const group = task.status === "done" ? "Done" : isOverdue(task) ? "Overdue" : isToday(task.dueAt) ? "Today" : task.status === "blocked" ? "Blocked" : isUpcoming(task) ? "Upcoming" : "No due date"
      groups.set(group, [...(groups.get(group) || []), task])
    }
    return Array.from(groups.entries())
  }, [visibleTasks])

  function resetFilters() {
    setView("all")
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

  async function removeTask(task: Task) {
    setBusy(task.id)
    try {
      await apiFetch(`/api/tasks/${task.id}`, { method: "DELETE" })
      toast.success("Task deleted")
      setPendingDeleteId(null)
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
    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Workspace</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Plan launch work, filter by urgency, and move tasks through the workflow without opening every detail page.</p>
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

      {error ? <div className="flex gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><AlertCircleIcon className="size-4" />{error}</div> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        <MetricButton label="Focus" value={tasks.filter((task) => viewMatches(task, "focus")).length} active={view === "focus"} onClick={() => setView("focus")} />
        <MetricButton label="Today" value={summary.dueToday} active={view === "today"} onClick={() => setView("today")} />
        <MetricButton label="Overdue" value={summary.overdue} active={view === "overdue"} onClick={() => setView("overdue")} />
        <MetricButton label="Blocked" value={summary.blocked} active={view === "blocked"} onClick={() => setView("blocked")} />
        <MetricButton label="To do" value={summary.todo} active={statusFilter === "todo"} onClick={() => { setView("all"); setStatusFilter("todo") }} />
        <MetricButton label="In progress" value={summary.inProgress} active={statusFilter === "in_progress"} onClick={() => { setView("all"); setStatusFilter("in_progress") }} />
        <MetricButton label="Done" value={summary.done} active={view === "done"} onClick={() => setView("done")} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="grid gap-4 self-start rounded-xl border bg-muted/10 p-3 xl:sticky xl:top-20">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium"><ListFilterIcon className="size-4" />Views</div>
            <div className="mt-2 grid gap-1">
              {views.map((item) => (
                <button key={item.id} type="button" onClick={() => setView(item.id)} className={`rounded-lg px-3 py-2 text-left text-sm transition hover:bg-muted ${view === item.id ? "bg-background shadow-xs" : "text-muted-foreground"}`}>
                  <span className="font-medium text-foreground">{item.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{item.description}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3">
            <Field label="Status">
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as TaskStatus | "all")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="todo">To do</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as TaskPriority | "all")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Category">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Sort">
              <Select value={sort} onValueChange={(value) => setSort(value as TaskSort)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="smart">Smart priority</SelectItem>
                  <SelectItem value="due">Due date</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="created">Newest</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Button type="button" variant="outline" onClick={resetFilters}>Clear filters</Button>
          </div>
        </aside>

        <main className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 rounded-xl border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks, prompts, categories..." className="pl-9" />
            </div>
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{visibleTasks.length}</span> of <span className="font-medium text-foreground">{tasks.length}</span>
            </div>
          </div>

          {loading ? <TaskListSkeleton /> : null}
          {!loading && visibleTasks.length === 0 ? <EmptyTasksState hasTasks={tasks.length > 0} onReset={resetFilters} /> : null}

          {!loading && groupedTasks.map(([group, groupTasks]) => (
            <section key={group} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{group}</h2>
                <Badge variant="outline">{groupTasks.length}</Badge>
              </div>
              <div className="grid gap-2">
                {groupTasks.map((task) => (
                  <div key={task.id} className="rounded-xl border bg-background p-4 transition hover:bg-muted/20">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={task.status} />
                          <PriorityBadge priority={task.priority} />
                          {isOverdue(task) ? <Badge variant="destructive">Overdue</Badge> : null}
                          {isToday(task.dueAt) && task.status !== "done" ? <Badge variant="outline">Today</Badge> : null}
                          {task.category ? <Badge variant="outline">{task.category}</Badge> : null}
                        </div>
                        <Link href={`/tasks/${task.id}`} className="mt-2 block truncate text-base font-semibold hover:underline">
                          {task.title}
                        </Link>
                        {task.description ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{task.description}</p> : null}
                        <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <CalendarClockIcon className="size-3.5" />{formatDate(task.dueAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        {task.status !== "in_progress" && task.status !== "done" ? <Button type="button" size="sm" variant="outline" disabled={busy === task.id} onClick={() => updateStatus(task, "in_progress")}>Start</Button> : null}
                        {task.status !== "blocked" && task.status !== "done" ? <Button type="button" size="sm" variant="outline" disabled={busy === task.id} onClick={() => updateStatus(task, "blocked")}>Block</Button> : null}
                        {task.status !== "done" ? <Button type="button" size="sm" disabled={busy === task.id} onClick={() => updateStatus(task, "done")}><CheckCircle2Icon className="size-4" />Done</Button> : <Button type="button" size="sm" variant="outline" disabled={busy === task.id} onClick={() => updateStatus(task, "todo")}>Reopen</Button>}
                        <Button asChild variant="ghost" size="icon"><Link href={`/tasks/${task.id}/edit`}><EditIcon className="size-4" /></Link></Button>
                        {pendingDeleteId === task.id ? (
                          <div className="flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/5 p-1">
                            <Button type="button" size="sm" variant="ghost" onClick={() => setPendingDeleteId(null)}>Cancel</Button>
                            <Button type="button" size="sm" variant="destructive" disabled={busy === task.id} onClick={() => void removeTask(task)}>Delete</Button>
                          </div>
                        ) : (
                          <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" disabled={busy === task.id} onClick={() => setPendingDeleteId(task.id)}><Trash2Icon className="size-4" /></Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </main>
      </div>
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
    return <div className="p-4 md:p-6"><Card><CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2Icon className="size-4 animate-spin" />Loading task...</CardContent></Card></div>
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
