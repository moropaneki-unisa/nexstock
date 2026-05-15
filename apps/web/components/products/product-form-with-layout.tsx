"use client"

import * as React from "react"
import Link from "next/link"
import { AlertCircleIcon, BoxesIcon, Settings2Icon } from "lucide-react"

import { ProductLayoutForm } from "@/components/products/product-layout-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch } from "@/lib/api"
import { getCachedLayouts, getCachedSelectedLayoutId, setCachedSelectedLayoutId } from "@/lib/cached-api"

type LayoutField = {
  key: string
  label: string
  type?: string | null
  required?: boolean | null
  options?: string[] | null
  isActive?: boolean | null
  order?: number | null
}

type Layout = {
  id: string
  name: string
  description?: string | null
  kind?: string | null
  trackInventory?: boolean | null
  isDefault?: boolean | null
  fields?: LayoutField[] | null
}

type Product = {
  id: string
  productTypeId?: string | null
  metadata?: {
    productTypeId?: string | null
    customFields?: Record<string, unknown> | null
  } | null
}

function normalizeList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === "object") {
    const maybe = value as { items?: T[]; data?: T[] }
    return maybe.items ?? maybe.data ?? []
  }
  return []
}

function normalizeKind(kind?: string | null) {
  return String(kind || "physical").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

function activeFields(layout: Layout | null) {
  return [...(layout?.fields || [])]
    .filter((field) => field.isActive !== false)
    .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
}

function LayoutSelectorSkeleton() {
  return (
    <div className="px-4 pt-4 md:px-6">
      <div className="rounded-xl border bg-background p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid gap-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,20rem)_1fr]">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  )
}

function LayoutBlockedState({ error }: { error?: string | null }) {
  return (
    <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex gap-3">
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="grid gap-2">
            <p className="font-medium text-destructive">Product layout is required</p>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {error || "Create at least one product layout before creating products. Product fields, stock behavior, and custom fields are driven by layouts."}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild size="sm"><Link href="/settings/layout"><Settings2Icon className="size-4" />Create layout</Link></Button>
              <Button asChild variant="outline" size="sm"><Link href="/products">Back to products</Link></Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ProductFormWithLayout({ productId }: { productId?: string }) {
  const [layouts, setLayouts] = React.useState<Layout[]>([])
  const [selectedLayoutId, setSelectedLayoutId] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [layoutResult, productResult] = await Promise.all([
          getCachedLayouts<unknown>().catch((err) => {
            throw err
          }),
          productId ? apiFetch<Product>(`/api/products/${productId}`).catch(() => null) : Promise.resolve(null),
        ])
        if (!active) return
        const nextLayouts = normalizeList<Layout>(layoutResult)
        const existingLayoutId = productResult?.metadata?.productTypeId || productResult?.productTypeId || ""
        const cachedLayoutId = getCachedSelectedLayoutId()
        const cachedLayoutStillExists = cachedLayoutId && nextLayouts.some((layout) => layout.id === cachedLayoutId)
        const defaultLayoutId = nextLayouts.find((layout) => layout.isDefault)?.id || nextLayouts[0]?.id || ""
        setLayouts(nextLayouts)
        setSelectedLayoutId(existingLayoutId || (cachedLayoutStillExists ? cachedLayoutId : defaultLayoutId))
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : "Could not load product layouts")
        setLayouts([])
        setSelectedLayoutId("")
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => { active = false }
  }, [productId])

  const selectedLayout = layouts.find((layout) => layout.id === selectedLayoutId) || null
  const fields = activeFields(selectedLayout)

  function changeLayout(value: string) {
    setSelectedLayoutId(value)
    setCachedSelectedLayoutId(value)
  }

  if (loading) return <LayoutSelectorSkeleton />
  if (!layouts.length) return <LayoutBlockedState error={error} />

  return (
    <>
      <div className="px-4 pt-4 md:px-6">
        <Card className="gap-0">
          <CardHeader className="gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2"><BoxesIcon className="size-4" />Product layout</CardTitle>
              <CardDescription>Choose the product structure. Fields, stock behavior, and custom values follow this layout.</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm" className="w-full sm:w-auto"><Link href="/settings/layout"><Settings2Icon className="size-4" />Manage layouts</Link></Button>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-[minmax(0,20rem)_1fr] md:items-start">
            <div className="grid gap-2">
              <Select value={selectedLayoutId} onValueChange={changeLayout} disabled={Boolean(productId)}>
                <SelectTrigger><SelectValue placeholder="Choose layout" /></SelectTrigger>
                <SelectContent>{layouts.map((layout) => <SelectItem key={layout.id} value={layout.id}>{layout.name}</SelectItem>)}</SelectContent>
              </Select>
              {selectedLayout ? (
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{normalizeKind(selectedLayout.kind)}</Badge>
                  <Badge variant={selectedLayout.trackInventory === false ? "secondary" : "default"}>{selectedLayout.trackInventory === false ? "No stock tracking" : "Stock tracked"}</Badge>
                  {selectedLayout.isDefault ? <Badge variant="secondary">Default</Badge> : null}
                </div>
              ) : null}
              {productId ? <p className="text-xs text-muted-foreground">Layout is locked while editing so saved values stay consistent.</p> : null}
            </div>
            <div className="min-w-0 rounded-lg border bg-muted/20 p-3">
              <div className="flex flex-wrap gap-2">
                {fields.length ? fields.map((field) => <Badge key={field.key} variant="secondary">{field.label}</Badge>) : <span className="text-sm text-muted-foreground">No layout fields yet. Add fields in Layout Settings.</span>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <ProductLayoutForm key={`${selectedLayoutId}-${productId || "new"}`} productId={productId} layout={selectedLayout} />
    </>
  )
}
