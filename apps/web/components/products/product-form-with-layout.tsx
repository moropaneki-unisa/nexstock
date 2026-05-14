"use client"

import * as React from "react"
import Link from "next/link"
import { BoxesIcon, Settings2Icon } from "lucide-react"

import { ProductLayoutForm } from "@/components/products/product-layout-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch } from "@/lib/api"

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

export function ProductFormWithLayout({ productId }: { productId?: string }) {
  const [layouts, setLayouts] = React.useState<Layout[]>([])
  const [selectedLayoutId, setSelectedLayoutId] = React.useState("")
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      try {
        const [layoutResult, productResult] = await Promise.all([
          apiFetch<unknown>("/api/products/types").catch(() => []),
          productId ? apiFetch<Product>(`/api/products/${productId}`).catch(() => null) : Promise.resolve(null),
        ])
        if (!active) return
        const nextLayouts = normalizeList<Layout>(layoutResult)
        const existingLayoutId = productResult?.metadata?.productTypeId || productResult?.productTypeId || ""
        const defaultLayoutId = nextLayouts.find((layout) => layout.isDefault)?.id || nextLayouts[0]?.id || ""
        setLayouts(nextLayouts)
        setSelectedLayoutId(existingLayoutId || defaultLayoutId)
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
  }

  if (loading) return <div className="px-4 pt-4 md:px-6"><Skeleton className="h-28 rounded-xl" /></div>

  return (
    <>
      <div className="px-4 pt-4 md:px-6">
        <Card>
          <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><BoxesIcon className="size-4" />Layout</CardTitle>
              <CardDescription>Choose the layout for this product. The fields below will follow the selected layout.</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm"><Link href="/settings/layout"><Settings2Icon className="size-4" />Manage layouts</Link></Button>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-[minmax(0,24rem)_1fr] md:items-start">
            <div className="grid gap-2">
              <Select value={selectedLayoutId} onValueChange={changeLayout} disabled={Boolean(productId)}>
                <SelectTrigger><SelectValue placeholder="Choose layout" /></SelectTrigger>
                <SelectContent>{layouts.map((layout) => <SelectItem key={layout.id} value={layout.id}>{layout.name}</SelectItem>)}</SelectContent>
              </Select>
              {selectedLayout ? <div className="flex flex-wrap gap-2"><Badge variant="outline">{normalizeKind(selectedLayout.kind)}</Badge><Badge variant={selectedLayout.trackInventory === false ? "secondary" : "default"}>{selectedLayout.trackInventory === false ? "No stock tracking" : "Stock tracked"}</Badge>{selectedLayout.isDefault ? <Badge variant="secondary">Default</Badge> : null}</div> : null}
              {productId ? <p className="text-xs text-muted-foreground">Layout is locked while editing so existing saved values stay consistent.</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">{fields.length ? fields.map((field) => <Badge key={field.key} variant="secondary">{field.label}</Badge>) : <span className="text-sm text-muted-foreground">No layout fields yet. Add fields in Layout Settings.</span>}</div>
          </CardContent>
        </Card>
      </div>
      <ProductLayoutForm key={`${selectedLayoutId}-${productId || "new"}`} productId={productId} layout={selectedLayout} />
    </>
  )
}
