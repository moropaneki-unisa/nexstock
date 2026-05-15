"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  EditIcon,
  Loader2Icon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
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

function statusLabel(status: TaskStatus) {
  return status === "in_progress" ? "In progress" : status === "todo" ? "To do" : status[0].toUpperCase() + status.slice(1)
}

function priorityLabel(priority: TaskPriority) {
  return priority[0].toUpperCase() + priority.slice(1)
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

function StatusBadge({ status }: { status: TaskStatus }) {
  const variant = status === "done" ? "default" : status === "blocked" ? "destructive" : "secondary"
  return <Badge variant={variant}>{statusLabel(status)}</Badge>
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const variant = priority === "urgent" || priority === "high" ? "destructive" : priority === "medium" ? "secondary" : "outline"
  return <Badge variant={variant}>{priorityLabel(priority)}</Badge>
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[12rem] text-right font-medium">{value}</span>
    </div>
  )
}

async function fetchTask(taskId: string) {
  return apiFetch<Task>(`/api/tasks/${taskId}`)
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
    setError(null)

    fetchTask(taskId)
      .then((nextTask) => {
        if (!active) return
        setTask(nextTask)
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
    return (
      <div className="flex flex-1 items-center gap-2 p-4 text-sm text-muted-foreground md:p-6">
        <Loader2Icon className="size-4 animate-spin" />
        Loading task...
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="ghost" size="sm" className="w-fit px-0 text-muted-foreground hover:text-foreground">
          <Link href="/tasks"><ArrowLeftIcon className="size-4" />Back to tasks</Link>
        </Button>
        {task ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={markDone} disabled={busy || task.status === "done"}>
              <CheckCircle2Icon className="size-4" />Mark done
            </Button>
            <Button asChild variant="outline">
              <Link href={`/tasks/${task.id}/edit`}><EditIcon className="size-4" />Edit</Link>
            </Button>
            <Button type="button" variant="ghost" className="text-muted-foreground hover:text-destructive" disabled={busy} onClick={() => void removeTask()}>
              <Trash2Icon className="size-4" />Delete
            </Button>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircleIcon className="size-4" />
          {error}
        </div>
      ) : null}

      {!task ? null : (
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <main className="min-w-0 space-y-8">
            <section className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
                {isOverdue(task) ? <Badge variant="destructive">Overdue</Badge> : null}
                {task.category ? <Badge variant="outline">{task.category}</Badge> : null}
              </div>
              <div className="space-y-2">
                <h1 className="max-w-4xl text-3xl font-semibold tracking-tight md:text-4xl">{task.title}</h1>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarClockIcon className="size-4" />
                  Due {formatDate(task.dueAt)}
                </p>
              </div>
            </section>

            <Separator />

            <section className="max-w-4xl space-y-3">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Description</h2>
              <div className="whitespace-pre-wrap text-base leading-7 text-foreground/90">
                {task.description || <span className="text-muted-foreground">No description added.</span>}
              </div>
            </section>
          </main>

          <aside className="self-start rounded-xl border bg-muted/10 p-4 xl:sticky xl:top-20">
            <div className="mb-2">
              <h2 className="font-medium">Task info</h2>
              <p className="text-sm text-muted-foreground">Status, reminder, and timeline.</p>
            </div>
            <Separator />
            <DetailRow label="Status" value={statusLabel(task.status)} />
            <Separator />
            <DetailRow label="Priority" value={priorityLabel(task.priority)} />
            <Separator />
            <DetailRow label="Category" value={task.category || "Not set"} />
            <Separator />
            <DetailRow label="Due date" value={formatDate(task.dueAt)} />
            <Separator />
            <DetailRow label="Reminder" value={task.reminderEnabled ? formatDate(task.reminderAt) : "Off"} />
            <Separator />
            <DetailRow label="Completed" value={formatDate(task.completedAt)} />
            <Separator />
            <DetailRow label="Updated" value={formatDate(task.updatedAt)} />
          </aside>
        </div>
      )}
    </div>
  )
}
