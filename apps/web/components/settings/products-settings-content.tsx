"use client"

import * as React from "react"
import Link from "next/link"
import { BoxesIcon, EditIcon, Loader2Icon, PlusIcon, RefreshCwIcon, Settings2Icon, Trash2Icon, TriangleAlertIcon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch } from "@/lib/api"

type LayoutField = { key: string; label: string; type?: string | null; isActive?: boolean | null }
type Layout = { id: string; name: string; description?: string | null; kind?: string | null; trackInventory?: boolean | null; isDefault?: boolean | null; fields?: LayoutField[] | null }

const LAYOUTS_API = "/api/products/types"

function normalizeList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === "object") {
    const maybe = value as { items?: T[]; data?: T[] }
    return maybe.items ?? maybe.data ?? []
  }
  return []
}

function kindLabel(kind?: string | null) {
  return String(kind || "physical").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

export function ProductsSettingsContent() {
  const [layouts, setLayouts] = React.useState<Layout[]>([])
  const [loading, setLoading] = React.useState(true)
  const [running, setRunning] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function loadLayouts() {
    setLoading(true)
    setError(null)
    try {
      const result = await apiFetch<unknown>(LAYOUTS_API)
      setLayouts(normalizeList<Layout>(result))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load product layouts"
      setError(message)
      toast.error("Product layouts could not load", { description: message })
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => { void loadLayouts() }, [])

  async function deleteLayout(layout: Layout) {
    if (!window.confirm(`Delete "${layout.name}"? Existing products keep their saved layout metadata.`)) return
    setRunning(true)
    try {
      await apiFetch(`${LAYOUTS_API}/${layout.id}`, { method: "DELETE" })
      toast.success("Layout deleted", { description: layout.name })
      await loadLayouts()
    } catch (err) {
      toast.error("Layout could not delete", { description: err instanceof Error ? err.message : "Delete failed" })
    } finally {
      setRunning(false)
    }
  }

  if (loading) return <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6"><Skeleton className="h-12 w-72" /><Skeleton className="h-[520px] rounded-xl" /></div>

  const defaultLayout = layouts.find((layout) => layout.isDefault)
  const stockLayouts = layouts.filter((layout) => layout.trackInventory !== false)
  const serviceLayouts = layouts.filter((layout) => layout.kind === "service" || layout.trackInventory === false)

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Settings</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Product Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Configure product layouts. Each layout has its own fields.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm"><Link href="/settings">Back to settings</Link></Button>
          <Button variant="outline" size="sm" onClick={() => void loadLayouts()} disabled={running}><RefreshCwIcon className="size-4" />Refresh</Button>
          <Button asChild size="sm"><Link href="/settings/products/layouts/new"><PlusIcon className="size-4" />New layout</Link></Button>
        </div>
      </div>

      {error ? <Card className="border-destructive/30 bg-destructive/5"><CardContent className="flex items-center gap-2 p-4 text-sm text-destructive"><TriangleAlertIcon className="size-4" />{error}</CardContent></Card> : null}

      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <Metric title="Layouts" value={layouts.length} detail="Product structures" />
        <Metric title="Stock layouts" value={stockLayouts.length} detail="Inventory tracked" />
        <Metric title="Service/no-stock" value={serviceLayouts.length} detail="No stock tracking" />
        <Metric title="Default" value={defaultLayout?.name || "Not set"} detail="First option for products" />
      </div>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><BoxesIcon className="size-4" />Layout actions</CardTitle>
            <CardDescription>Layouts define their own fields for product categories like cars, smartphones, clothing, or services.</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm"><Link href="/settings/products/layouts/new"><PlusIcon className="size-4" />Create layout</Link></Button>
        </CardHeader>
        <CardContent>
          {layouts.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {layouts.map((layout) => {
              const fields = (layout.fields || []).filter((field) => field.isActive !== false)
              return (
                <Card key={layout.id} className="gap-0 overflow-hidden">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base">{layout.name}</CardTitle>
                        <CardDescription className="mt-1 line-clamp-2">{layout.description || "No description"}</CardDescription>
                      </div>
                      {layout.isDefault ? <Badge>Default</Badge> : null}
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-3 text-sm">
                    <div className="flex flex-wrap gap-2"><Badge variant="outline">{kindLabel(layout.kind)}</Badge><Badge variant={layout.trackInventory === false ? "secondary" : "default"}>{layout.trackInventory === false ? "No stock" : "Stock"}</Badge><Badge variant="secondary">{fields.length} fields</Badge></div>
                    <div className="flex min-h-8 flex-wrap gap-1">{fields.slice(0, 5).map((field) => <Badge key={field.key} variant="outline" className="text-xs">{field.label || field.key}</Badge>)}{fields.length > 5 ? <Badge variant="secondary" className="text-xs">+{fields.length - 5}</Badge> : null}</div>
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2 border-t bg-muted/20 p-3">
                    <Button asChild variant="outline" size="sm"><Link href={`/settings/products/layouts/${layout.id}`}>View</Link></Button>
                    <Button asChild variant="outline" size="sm"><Link href={`/settings/products/layouts/${layout.id}/edit`}><EditIcon className="size-4" />Edit</Link></Button>
                    <Button type="button" variant="outline" size="sm" className="text-destructive" disabled={running || Boolean(layout.isDefault)} onClick={() => void deleteLayout(layout)}><Trash2Icon className="size-4" />Delete</Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div> : <div className="rounded-xl border border-dashed p-8 text-center"><p className="font-medium">No product layouts yet</p><p className="mt-1 text-sm text-muted-foreground">Create your first product layout from settings, then assign it to products.</p><Button asChild className="mt-4" size="sm"><Link href="/settings/products/layouts/new"><PlusIcon className="size-4" />Create layout</Link></Button></div>}
        </CardContent>
      </Card>

      <Card className="border-dashed bg-muted/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings2Icon className="size-4" />Product settings workflow</CardTitle>
          <CardDescription>Create layouts with their own fields. Products can then select a layout while keeping the main product form clean.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}

function Metric({ title, value, detail }: { title: string; value: string | number; detail: string }) {
  return <Card><CardHeader><CardDescription>{title}</CardDescription><CardTitle className="text-2xl font-semibold tabular-nums">{value}</CardTitle></CardHeader><CardFooter className="text-sm text-muted-foreground">{detail}</CardFooter></Card>
}
