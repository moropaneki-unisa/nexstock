"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, CalendarClock, CheckCircle2, Circle, Clock3, Loader2, Plus, Save, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

type TaskStatus = "todo" | "in_progress" | "blocked" | "done";
type TaskPriority = "low" | "medium" | "high" | "urgent";

type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  category?: string | null;
  dueAt?: string | null;
  reminderEnabled: boolean;
  reminderAt?: string | null;
  reminderSentAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

type TaskResponse = {
  tasks: Task[];
  summary: {
    total: number;
    todo: number;
    inProgress: number;
    blocked: number;
    done: number;
    dueToday: number;
    overdue: number;
  };
};

const statusOptions: Array<{ value: TaskStatus; label: string }> = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
];

const priorityOptions: Array<{ value: TaskPriority; label: string }> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const defaultForm = {
  title: "",
  description: "",
  status: "todo" as TaskStatus,
  priority: "medium" as TaskPriority,
  category: "Launch",
  dueAt: "",
  reminderEnabled: false,
  reminderAt: "",
};

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [summary, setSummary] = useState<TaskResponse["summary"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [form, setForm] = useState(defaultForm);

  async function loadTasks() {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<TaskResponse>("/api/tasks");
      setTasks(result.tasks);
      setSummary(result.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTasks();
  }, []);

  const filteredTasks = useMemo(() => {
    return statusFilter === "all" ? tasks : tasks.filter((task) => task.status === statusFilter);
  }, [tasks, statusFilter]);

  function openCreate() {
    setEditing(null);
    setForm(defaultForm);
    setOpen(true);
  }

  function openEdit(task: Task) {
    setEditing(task);
    setForm({
      title: task.title,
      description: task.description ?? "",
      status: task.status,
      priority: task.priority,
      category: task.category ?? "",
      dueAt: toInputDateTime(task.dueAt),
      reminderEnabled: task.reminderEnabled,
      reminderAt: toInputDateTime(task.reminderAt),
    });
    setOpen(true);
  }

  async function saveTask() {
    if (!form.title.trim()) {
      setError("Task title is required");
      return;
    }

    if (form.reminderEnabled && !form.reminderAt && !form.dueAt) {
      setError("Choose a due date or reminder time before enabling reminders.");
      return;
    }

    setSaving(true);
    setError(null);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      status: form.status,
      priority: form.priority,
      category: form.category.trim() || null,
      dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
      reminderEnabled: form.reminderEnabled,
      reminderAt: form.reminderEnabled && (form.reminderAt || form.dueAt) ? new Date(form.reminderAt || form.dueAt).toISOString() : null,
    };

    try {
      if (editing) {
        await apiFetch(`/api/tasks/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await apiFetch("/api/tasks", { method: "POST", body: JSON.stringify(payload) });
      }
      setOpen(false);
      setEditing(null);
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save task");
    } finally {
      setSaving(false);
    }
  }

  async function quickUpdate(task: Task, status: TaskStatus) {
    setError(null);
    try {
      await apiFetch(`/api/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task");
    }
  }

  async function deleteTask(task: Task) {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    setError(null);
    try {
      await apiFetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task");
    }
  }

  return (
    <PageShell className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Personal task manager"
        title="My tasks"
        description="Create launch, demo, product, and customer tasks. Set due dates and reminders so work does not get missed before go-live."
        actions={<Button type="button" onClick={openCreate} className="rounded-xl shadow-sm"><Plus className="h-4 w-4" />New task</Button>}
      />

      {error && <div className="border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Metric icon={Circle} label="Total" value={summary?.total ?? 0} />
        <Metric icon={Clock3} label="In progress" value={summary?.inProgress ?? 0} />
        <Metric icon={AlertTriangle} label="Blocked" value={summary?.blocked ?? 0} danger />
        <Metric icon={CalendarClock} label="Due today" value={summary?.dueToday ?? 0} />
        <Metric icon={CheckCircle2} label="Done" value={summary?.done ?? 0} success />
      </section>

      <section className="border bg-card/95">
        <div className="flex flex-col gap-4 border-b p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Task board</h2>
            <p className="mt-1 text-sm text-muted-foreground">Manage your own work items. Tasks are private to your account inside the organization.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterButton active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>All</FilterButton>
            {statusOptions.map((option) => <FilterButton key={option.value} active={statusFilter === option.value} onClick={() => setStatusFilter(option.value)}>{option.label}</FilterButton>)}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 p-8 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading tasks...</div>
        ) : filteredTasks.length ? (
          <div className="grid gap-4 p-4 lg:grid-cols-2 xl:grid-cols-3">
            {filteredTasks.map((task) => <TaskCard key={task.id} task={task} onEdit={() => openEdit(task)} onDelete={() => void deleteTask(task)} onComplete={() => void quickUpdate(task, task.status === "done" ? "todo" : "done")} />)}
          </div>
        ) : (
          <div className="p-10 text-center text-sm text-muted-foreground">No tasks found. Create your first launch task.</div>
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Update task" : "Create task"}</DialogTitle>
            <DialogDescription>Add due dates and reminders for launch work, demos, data cleanup, payment testing, and product QA.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <label className="space-y-2">
              <Label>Task title</Label>
              <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Example: Test Paddle checkout end-to-end" />
            </label>

            <label className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Add notes, acceptance criteria, or links..." className="min-h-28" />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <Label>Status</Label>
                <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as TaskStatus }))} className="h-10 w-full border bg-background px-3 text-sm">
                  {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="space-y-2">
                <Label>Priority</Label>
                <select value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as TaskPriority }))} className="h-10 w-full border bg-background px-3 text-sm">
                  {priorityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <Label>Category</Label>
                <Input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} placeholder="Launch, Data, Payment, Demo..." />
              </label>
              <label className="space-y-2">
                <Label>Due date</Label>
                <Input value={form.dueAt} onChange={(event) => setForm((current) => ({ ...current, dueAt: event.target.value, reminderAt: current.reminderAt || event.target.value }))} type="datetime-local" />
              </label>
            </div>

            <div className="border bg-muted/15 p-4">
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" checked={form.reminderEnabled} onChange={(event) => setForm((current) => ({ ...current, reminderEnabled: event.target.checked }))} className="mt-1" />
                <span><span className="font-semibold">Send reminder</span><span className="block text-muted-foreground">The backend stores reminder timing. A scheduler/cron can trigger due reminders through the task reminder service.</span></span>
              </label>
              {form.reminderEnabled && <label className="mt-4 block space-y-2"><Label>Reminder time</Label><Input value={form.reminderAt} onChange={(event) => setForm((current) => ({ ...current, reminderAt: event.target.value }))} type="datetime-local" /></label>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="button" onClick={saveTask} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{editing ? "Save changes" : "Create task"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function Metric({ icon: Icon, label, value, danger, success }: { icon: any; label: string; value: number; danger?: boolean; success?: boolean }) {
  return <div className="border bg-card/95 p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{label}</p><Icon className={cn("h-4 w-4", danger && "text-destructive", success && "text-emerald-600")} /></div><p className="mt-2 text-3xl font-black tracking-[-0.05em]">{value}</p></div>;
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={cn("rounded-xl border px-3 py-2 text-sm font-semibold transition", active ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted/50")}>{children}</button>;
}

function TaskCard({ task, onEdit, onDelete, onComplete }: { task: Task; onEdit: () => void; onDelete: () => void; onComplete: () => void }) {
  const overdue = isOverdue(task);
  return (
    <article className={cn("border bg-background p-4 transition hover:shadow-sm", task.status === "done" && "opacity-75", overdue && "border-destructive/40 bg-destructive/5")}>
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onComplete} className="mt-1 text-muted-foreground transition hover:text-foreground" aria-label="Toggle complete">
          {task.status === "done" ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Circle className="h-5 w-5" />}
        </button>
        <div className="min-w-0 flex-1">
          <h3 className={cn("font-semibold tracking-tight", task.status === "done" && "line-through")}>{task.title}</h3>
          {task.description && <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{task.description}</p>}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onDelete} className="rounded-xl text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant={task.status === "done" ? "default" : task.status === "blocked" ? "destructive" : "secondary"}>{statusLabel(task.status)}</Badge>
        <Badge variant="outline">{task.priority}</Badge>
        {task.category && <Badge variant="outline">{task.category}</Badge>}
        {task.reminderEnabled && <Badge variant="outline" className="gap-1"><Bell className="h-3 w-3" />Reminder</Badge>}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t pt-3 text-xs text-muted-foreground">
        <span>{task.dueAt ? `Due ${formatDate(task.dueAt)}` : "No due date"}</span>
        <button type="button" onClick={onEdit} className="font-semibold text-foreground hover:underline">Edit</button>
      </div>
    </article>
  );
}

function statusLabel(status: TaskStatus) {
  return status.replace("_", " ");
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function toInputDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function isOverdue(task: Task) {
  if (!task.dueAt || task.status === "done") return false;
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return new Date(task.dueAt) < endOfToday && new Date(task.dueAt).toDateString() !== new Date().toDateString();
}
