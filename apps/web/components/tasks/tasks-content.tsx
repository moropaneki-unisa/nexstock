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
  Loader2Icon,
  PlusIcon,
  RocketIcon,
  SaveIcon,
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
  description?: string | null
  status: TaskStatus
  priority: TaskPriority
  category?: string | null
  dueAt?: string | null
  reminderEnabled: boolean
  reminderAt?: string | null
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

function formatDate(value?: string | null) {
  if (!value) return "Not set"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not set"
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(date)
}

function isOverdue(task: Task) {
  if (!task.dueAt || task.status === "done") return false
  const due = new Date(task.dueAt)
  if (Number.isNaN(due.getTime())) return false
  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)
  return due < endOfToday && due.toDateString() !== new Date().toDateString()
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

function formToPayload(form: TaskFormState): TaskPayload {
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    status: form.status,
    priority: form.priority,
    category: form.category.trim() || null,
    dueAt: form.dueAt || null,
    reminderEnabled: form.reminderEnabled,
    reminderAt: form.reminderEnabled ? form.reminderAt || form.dueAt || null : null,
  }
}

async function fetchTasks() {
  return apiFetch<TasksResponse>("/api/tasks")
}

async function fetchTask(taskId: string) {
  const data = await fetchTasks()
  return data.tasks.find((task) => task.id === taskId) || null
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const variant = status === "done" ? "default" : status === "blocked" ? "destructive" : "secondary"
  return <Badge variant={variant}>{statusLabel(status)}</Badge>
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const variant = priority === "urgent" || priority === "high" ? "destructive" : priority === "medium" ? "secondary" : "outline"
  return <Badge variant={variant}>{priorityLabel(priority)}</Badge>
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
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

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 p-10 text-center">
        <ClipboardListIcon className="size-10 text-muted-foreground" />
        <div>
          <p className="font-medium">No tasks yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create a task or generate the launch checklist to start tracking work.</p>
        </div>
        <Button asChild>
          <Link href="/tasks/new"><PlusIcon className="size-4" />New task</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export function TasksContent() {
  const router = useRouter()
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [summary, setSummary] = React.useState<TaskSummary>(emptySummary)
  const [statusFilter, setStatusFilter] = React.useState<TaskStatus | "all">("all")
  const [loading, setLoading] = React.useState(true)
  const [busy, setBusy] = React.useState<string | null>(null)
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

  const filteredTasks = React.useMemo(() => {
    return statusFilter === "all" ? tasks : tasks.filter((task) => task.status === statusFilter)
  }, [tasks, statusFilter])

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
    if (!window.confirm(`Delete task "${task.title}"?`)) return
    setBusy(task.id)
    try {
      await apiFetch(`/api/tasks/${task.id}`, { method: "DELETE" })
      toast.success("Task deleted")
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
      await load()
    } catch (err) {
      toast.error("Checklist could not be created", { description: err instanceof Error ? err.message : "API request failed" })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Workspace</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track personal work, launch tasks, reminders, and follow-ups.</p>
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

      {error ? <Card className="border-destructive/30 bg-destructive/5"><CardContent className="flex gap-2 p-4 text-sm text-destructive"><AlertCircleIcon className="size-4" />{error}</CardContent></Card> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        <Metric label="Total" value={summary.total} />
        <Metric label="To do" value={summary.todo} />
        <Metric label="In progress" value={summary.inProgress} />
        <Metric label="Blocked" value={summary.blocked} />
        <Metric label="Done" value={summary.done} />
        <Metric label="Due today" value={summary.dueToday} />
        <Metric label="Overdue" value={summary.overdue} />
      </div>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Task list</CardTitle>
            <CardDescription>Filter by status, open details, edit, complete, or delete tasks.</CardDescription>
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as TaskStatus | "all")}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="todo">To do</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="grid gap-3">
          {loading ? <div className="flex items-center gap-2 rounded-xl border p-4 text-sm text-muted-foreground"><Loader2Icon className="size-4 animate-spin" />Loading tasks...</div> : null}
          {!loading && filteredTasks.length === 0 ? <EmptyState /> : null}
          {!loading && filteredTasks.map((task) => (
            <Card key={task.id} className="shadow-none">
              <CardContent className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={task.status} />
                    <PriorityBadge priority={task.priority} />
                    {isOverdue(task) ? <Badge variant="destructive">Overdue</Badge> : null}
                    {task.category ? <Badge variant="outline">{task.category}</Badge> : null}
                  </div>
                  <Link href={`/tasks/${task.id}`} className="mt-2 block truncate text-base font-semibold hover:underline">
                    {task.title}
                  </Link>
                  {task.description ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{task.description}</p> : null}
                  <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarClockIcon className="size-3.5" />Due {formatDate(task.dueAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <Select value={task.status} onValueChange={(status) => updateStatus(task, status as TaskStatus)} disabled={busy === task.id}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To do</SelectItem>
                      <SelectItem value="in_progress">In progress</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button asChild variant="outline" size="sm"><Link href={`/tasks/${task.id}/edit`}><EditIcon className="size-4" />Edit</Link></Button>
                  <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" disabled={busy === task.id} onClick={() => void removeTask(task)}><Trash2Icon className="size-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
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
        if (!task) {
          setError("Task not found")
          return
        }
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

export function TaskDetailContent({ taskId }: { taskId: string }) {
  const router = useRouter()
  const [task, setTask] = React.useState<Task | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let active = true
    setLoading(true)
    fetchTask(taskId)
      .then((nextTask) => {
        if (!active) return
        setTask(nextTask)
        if (!nextTask) setError("Task not found")
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

  async function removeTask() {
    if (!task || !window.confirm(`Delete task "${task.title}"?`)) return
    setBusy(true)
    try {
      await apiFetch(`/api/tasks/${task.id}`, { method: "DELETE" })
      toast.success("Task deleted")
      router.push("/tasks")
      router.refresh()
    } catch (err) {
      toast.error("Task could not delete", { description: err instanceof Error ? err.message : "API request failed" })
    } finally {
      setBusy(false)
    }
  }

  async function markDone() {
    if (!task) return
    setBusy(true)
    try {
      const updated = await apiFetch<Task>(`/api/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ status: "done" }) })
      setTask(updated)
      toast.success("Task completed")
    } catch (err) {
      toast.error("Task could not update", { description: err instanceof Error ? err.message : "API request failed" })
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="p-4 md:p-6"><Card><CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2Icon className="size-4 animate-spin" />Loading task...</CardContent></Card></div>
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Tasks</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Task details</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review, complete, edit, or delete this task.</p>
        </div>
        <Button asChild variant="outline" size="sm"><Link href="/tasks"><ArrowLeftIcon className="size-4" />Back to tasks</Link></Button>
      </div>

      {error ? <Card className="border-destructive/30 bg-destructive/5"><CardContent className="flex gap-2 p-4 text-sm text-destructive"><AlertCircleIcon className="size-4" />{error}</CardContent></Card> : null}
      {!task ? null : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2"><StatusBadge status={task.status} /><PriorityBadge priority={task.priority} />{task.category ? <Badge variant="outline">{task.category}</Badge> : null}</div>
              <CardTitle className="text-2xl">{task.title}</CardTitle>
              <CardDescription>Due {formatDate(task.dueAt)}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="rounded-xl border bg-muted/10 p-4 text-sm leading-6 text-muted-foreground whitespace-pre-wrap">{task.description || "No description added."}</div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={markDone} disabled={busy || task.status === "done"}><CheckCircle2Icon className="size-4" />Mark done</Button>
                <Button asChild variant="outline"><Link href={`/tasks/${task.id}/edit`}><EditIcon className="size-4" />Edit</Link></Button>
                <Button type="button" variant="ghost" className="text-muted-foreground hover:text-destructive" disabled={busy} onClick={() => void removeTask()}><Trash2Icon className="size-4" />Delete</Button>
              </div>
            </CardContent>
          </Card>
          <Card className="self-start">
            <CardHeader><CardTitle>Task summary</CardTitle></CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <Side label="Status" value={statusLabel(task.status)} />
              <Side label="Priority" value={priorityLabel(task.priority)} />
              <Side label="Category" value={task.category || "Not set"} />
              <Side label="Due date" value={formatDate(task.dueAt)} />
              <Side label="Reminder" value={task.reminderEnabled ? formatDate(task.reminderAt) : "Off"} />
              <Side label="Completed" value={formatDate(task.completedAt)} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function Side({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div>
}
