"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon, EditIcon, Loader2Icon, Settings2Icon, Trash2Icon, TriangleAlertIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch } from "@/lib/api"

type LayoutField = { key: string; label: string; type?: string | null; required?: boolean | null; isActive?: boolean | null; order?: number | null }
type Layout = { id: string; name: string; description?: string | null; kind?: string | null; trackInventory?: boolean | null; isDefault?: boolean | null; fields?: LayoutField[] | null }

const LAYOUTS_API = "/api/products/types"

function kindLabel(kind?: string | null) {
  return String(kind || "physical").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

function numberValue(value: unknown) {
  const next = Number(value ?? 0)
  return Number.isFinite(next) ? next : 0
}

export function LayoutDetailContent({ layoutId }: { layoutId: string }) {
  const router = useRouter()
  const [layout, setLayout] = React.useState<Layout | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [running, setRunning] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function loadLayout() {
    setLoading(true)
    setError(null)
    try {
      setLayout(await apiFetch<Layout>(`${LAYOUTS_API}/${layoutId}`))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load layout"
      setError(message)
      toast.error("Layout could not load", { description: message })
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => { void loadLayout() }, [layoutId])

  async function deleteLayout() {
    if (!layout) return
    if (!window.confirm(`Delete "${layout.name}"? Existing products keep their saved layout metadata.`)) return
    setRunning(true)
    try {
      await apiFetch(`${LAYOUTS_API}/${layout.id}`, { method: "DELETE" })
      toast.success("Layout deleted", { description: layout.name })
      router.push("/settings/layout")
      router.refresh()
    } catch (err) {
      toast.error("Layout could not delete", { description: err instanceof Error ? err.message : "Delete failed" })
    } finally {
      setRunning(false)
    }
  }

  if (loading) return <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6"><Skeleton className="h-12 w-72" /><Skeleton className="h-[520px] rounded-xl" /></div>

  if (!layout || error) {
    return (
      <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Button asChild variant="outline" size="sm" className="w-fit"><Link href="/settings/layout"><ArrowLeftIcon className="size-4" />Back to layout settings</Link></Button>
        <Card className="border-destructive/30 bg-destructive/5"><CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><TriangleAlertIcon className="size-4" />Layout not available</CardTitle><CardDescription>{error || "The layout could not be found."}</CardDescription></CardHeader></Card>
      </div>
    )
  }

  const fields = [...(layout.fields || [])].filter((field) => field.isActive !== false).sort((a, b) => numberValue(a.order) - numberValue(b.order))

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2"><Link href="/settings/layout"><ArrowLeftIcon className="size-4" />Layout Settings</Link></Button>
          <div className="flex flex-wrap items-center gap-2"><h1 className="font-heading text-2xl font-semibold tracking-tight">{layout.name}</h1>{layout.isDefault ? <Badge>Default</Badge> : null}<Badge variant="outline">{kindLabel(layout.kind)}</Badge></div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{layout.description || "Reusable product structure built from layout fields."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm"><Link href={`/settings/layout/${layout.id}/edit`}><EditIcon className="size-4" />Edit</Link></Button>
          <Button type="button" variant="destructive" size="sm" onClick={deleteLayout} disabled={running || Boolean(layout.isDefault)}>{running ? <Loader2Icon className="size-4 animate-spin" /> : <Trash2Icon className="size-4" />}Delete</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <Metric title="Kind" value={kindLabel(layout.kind)} detail="Layout category" />
        <Metric title="Inventory" value={layout.trackInventory === false ? "Not tracked" : "Tracked"} detail="Product stock behavior" />
        <Metric title="Fields" value={fields.length} detail="Fields in this layout" />
        <Metric title="Default" value={layout.isDefault ? "Yes" : "No"} detail="New product default" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings2Icon className="size-4" />Layout fields</CardTitle>
          <CardDescription>Fields assigned to products using this layout.</CardDescription>
        </CardHeader>
        <CardContent>
          {fields.length ? <div className="grid overflow-hidden rounded-xl border md:grid-cols-2 xl:grid-cols-3">{fields.map((field) => <div key={field.key} className="border-b p-4 text-sm transition hover:bg-muted/25 md:border-r"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{field.label || field.key}</p>{field.required ? <Badge>Required</Badge> : <Badge variant="secondary">Optional</Badge>}</div><p className="mt-1 font-mono text-xs text-muted-foreground">{`{{product.customFields.${field.key}}}`}</p><Badge variant="outline" className="mt-3 capitalize">{field.type || "text"}</Badge></div>)}</div> : <div className="rounded-xl border border-dashed p-8 text-center"><p className="font-medium">No fields assigned</p><p className="mt-1 text-sm text-muted-foreground">Edit this layout to add fields.</p><Button asChild className="mt-4" size="sm"><Link href={`/settings/layout/${layout.id}/edit`}>Edit layout</Link></Button></div>}
        </CardContent>
      </Card>
    </div>
  )
}

function Metric({ title, value, detail }: { title: string; value: string | number; detail: string }) {
  return <Card><CardHeader><CardDescription>{title}</CardDescription><CardTitle className="text-2xl font-semibold tabular-nums">{value}</CardTitle></CardHeader><CardFooter className="text-sm text-muted-foreground">{detail}</CardFooter></Card>
}
