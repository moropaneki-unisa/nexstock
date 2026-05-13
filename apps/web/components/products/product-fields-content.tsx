"use client"

import * as React from "react"
import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"
import {
  ArrowLeftIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  RecordsTable,
  createSelectColumn,
  type RecordsTableBulkAction,
} from "@/components/records/records-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch } from "@/lib/api"

type ProductField = {
  id: string
  name: string
  key?: string | null
  type?: string | null
  required?: boolean | null
  visible?: boolean | null
  createdAt?: string | null
}

type FieldForm = {
  name: string
  key: string
  type: string
  required: string
  visible: string
}

const emptyForm: FieldForm = {
  name: "",
  key: "",
  type: "text",
  required: "false",
  visible: "true",
}

function normalizeFields(value: unknown): ProductField[] {
  if (Array.isArray(value)) return value as ProductField[]
  if (value && typeof value === "object") {
    const maybe = value as { items?: ProductField[]; data?: ProductField[] }
    return maybe.items ?? maybe.data ?? []
  }
  return []
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

function formatDate(value?: string | null) {
  if (!value) return "Not set"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not set"
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function ProductFieldsContent() {
  const [fields, setFields] = React.useState<ProductField[]>([])
  const [form, setForm] = React.useState<FieldForm>(emptyForm)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [running, setRunning] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function loadFields() {
    setLoading(true)
    setError(null)

    try {
      const result = await apiFetch<unknown>("/api/products/fields")
      setFields(normalizeFields(result))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load product fields"
      setError(message)
      toast.error("Product fields could not load", { description: message })
      setFields([])
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    void loadFields()
  }, [])

  function updateField(key: keyof FieldForm, value: string) {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "name" && !current.key ? { key: slugify(value) } : {}),
    }))
  }

  async function createField(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!form.name.trim()) {
      setError("Field name is required.")
      return
    }

    setSaving(true)
    try {
      await apiFetch("/api/products/fields", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          key: form.key.trim() || slugify(form.name),
          type: form.type,
          required: form.required === "true",
          visible: form.visible === "true",
        }),
      })
      toast.success("Product field created", { description: form.name })
      setForm(emptyForm)
      await loadFields()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create product field"
      setError(message)
      toast.error("Product field could not save", { description: message })
    } finally {
      setSaving(false)
    }
  }

  async function deleteField(field: ProductField) {
    setRunning(true)
    try {
      await apiFetch(`/api/products/fields/${field.id}`, { method: "DELETE" })
      toast.success("Product field deleted", { description: field.name })
      await loadFields()
    } catch (err) {
      toast.error("Could not delete product field", {
        description: err instanceof Error ? err.message : "Delete failed",
      })
    } finally {
      setRunning(false)
    }
  }

  async function bulkDelete(rows: ProductField[]) {
    if (!rows.length) return
    setRunning(true)
    try {
      await Promise.all(rows.map((field) => apiFetch(`/api/products/fields/${field.id}`, { method: "DELETE" })))
      toast.success("Product fields deleted", { description: `${rows.length} field${rows.length === 1 ? "" : "s"} deleted.` })
      await loadFields()
    } catch (err) {
      toast.error("Could not delete selected fields", {
        description: err instanceof Error ? err.message : "Bulk delete failed",
      })
    } finally {
      setRunning(false)
    }
  }

  const columns = React.useMemo<ColumnDef<ProductField>[]>(() => [
    createSelectColumn<ProductField>(),
    {
      accessorKey: "name",
      header: "Field",
      cell: ({ row }) => (
        <div className="grid gap-1">
          <span className="font-medium">{row.original.name}</span>
          <span className="font-mono text-xs text-muted-foreground">{row.original.key || "No key"}</span>
        </div>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => <Badge variant="outline">{row.original.type || "text"}</Badge>,
    },
    {
      accessorKey: "required",
      header: "Required",
      cell: ({ row }) => row.original.required ? <Badge>Required</Badge> : <Badge variant="secondary">Optional</Badge>,
    },
    {
      accessorKey: "visible",
      header: "Visible",
      cell: ({ row }) => row.original.visible === false ? <Badge variant="secondary">Hidden</Badge> : <Badge>Visible</Badge>,
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" disabled={running} onClick={() => void deleteField(row.original)}>
          <Trash2Icon className="size-4" />
          <span className="sr-only">Delete field</span>
        </Button>
      ),
      enableHiding: false,
    },
  ], [running])

  const bulkActions = React.useMemo<RecordsTableBulkAction<ProductField>[]>(() => [
    {
      label: "Delete selected",
      variant: "destructive",
      onClick: bulkDelete,
    },
  ], [])

  if (loading) {
    return (
      <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-[520px] rounded-xl" />
      </div>
    )
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Products</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Product fields</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/products">
              <ArrowLeftIcon className="size-4" />
              Back to products
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => void loadFields()} disabled={running || loading}>
            {running ? <Loader2Icon className="size-4 animate-spin" /> : <RefreshCwIcon className="size-4" />}
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <TriangleAlertIcon className="size-4" />
              Product fields issue
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
        <Card className="self-start">
          <form onSubmit={createField}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SlidersHorizontalIcon className="size-4" />
                Add field
              </CardTitle>
              <CardDescription>Create reusable product attributes for future product forms.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="field-name">Field name</Label>
                <Input id="field-name" value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Material" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="field-key">Field key</Label>
                <Input id="field-key" value={form.key} onChange={(event) => updateField("key", event.target.value)} placeholder="material" />
              </div>
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(value) => updateField("type", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="select">Select</SelectItem>
                    <SelectItem value="boolean">Boolean</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Required</Label>
                <Select value={form.required} onValueChange={(value) => updateField("required", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Required" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Optional</SelectItem>
                    <SelectItem value="true">Required</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Visibility</Label>
                <Select value={form.visible} onValueChange={(value) => updateField("visible", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Visible</SelectItem>
                    <SelectItem value="false">Hidden</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? <Loader2Icon className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}
                Create field
              </Button>
            </CardFooter>
          </form>
        </Card>

        <RecordsTable
          data={fields}
          columns={columns}
          title="Product attribute fields"
          description="Manage reusable custom fields for the product catalog."
          searchPlaceholder="Search fields..."
          getRowId={(row) => row.id}
          bulkActions={bulkActions}
        />
      </div>
    </div>
  )
}
