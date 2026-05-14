"use client"

import * as React from "react"
import Link from "next/link"
import { BoxesIcon, Settings2Icon } from "lucide-react"

import { ProductFormContentFixed } from "@/components/products/product-form-content-fixed"
import { ProductLayoutAssetFields } from "@/components/products/product-layout-asset-fields"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch, getApiUrl } from "@/lib/api"

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

type ApiField = {
  id: string
  key: string
  label: string
  name: string
  type: string
  required: boolean
  isActive: boolean
  order: number
  options: string[]
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

function systemFieldType(type?: string | null) {
  const value = String(type || "text").toLowerCase()
  const supported = ["text", "richtext", "number", "decimal", "currency", "attachment", "images", "lookup", "boolean", "select", "date"]
  return supported.includes(value) ? value : "text"
}

function formRenderType(type?: string | null) {
  const value = systemFieldType(type)
  if (value === "number") return "number"
  if (value === "decimal") return "number"
  if (value === "currency") return "number"
  if (value === "boolean") return "boolean"
  if (value === "select") return "select"
  if (value === "date") return "date"
  return "text"
}

function layoutFields(layout: Layout | null): ApiField[] {
  return [...(layout?.fields || [])]
    .filter((field) => field.isActive !== false)
    .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
    .map((field, index) => ({
      id: field.key,
      key: field.key,
      label: field.label || field.key,
      name: field.label || field.key,
      type: formRenderType(field.type),
      required: Boolean(field.required),
      isActive: true,
      order: index,
      options: field.options || [],
    }))
}

function extractUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return input
  if (input instanceof URL) return input.toString()
  return input.url
}

function parseMaybeJson(value: unknown) {
  if (typeof value !== "string") return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function listValue(value: unknown) {
  const parsed = parseMaybeJson(value)
  if (Array.isArray(parsed)) return parsed
  return []
}

function lookupValue(value: unknown) {
  const parsed = parseMaybeJson(value)
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const item = parsed as Record<string, unknown>
    return { id: String(item.id ?? item.name ?? "").trim(), name: String(item.name ?? item.id ?? "").trim() }
  }
  const text = String(parsed ?? "").trim()
  return text ? { id: text, name: text } : { id: "", name: "" }
}

function normalizeLayoutFieldValue(field: LayoutField, rawValue: unknown, currency: string) {
  const type = systemFieldType(field.type)
  if (rawValue == null || (typeof rawValue === "string" && rawValue.trim() === "")) {
    if (type === "attachment" || type === "images") return []
    if (type === "lookup") return { id: "", name: "" }
    if (type === "currency") return { amount: 0, currency }
    return rawValue
  }

  if (type === "number") {
    const value = Number(rawValue)
    return Number.isFinite(value) ? Math.trunc(value) : 0
  }
  if (type === "decimal") {
    const value = Number(rawValue)
    return Number.isFinite(value) ? value : 0
  }
  if (type === "currency") {
    const parsed = parseMaybeJson(rawValue)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const item = parsed as Record<string, unknown>
      const amount = Number(item.amount ?? item.value ?? 0)
      return { amount: Number.isFinite(amount) ? amount : 0, currency: String(item.currency ?? currency).toUpperCase() }
    }
    const amount = Number(rawValue)
    return { amount: Number.isFinite(amount) ? amount : 0, currency }
  }
  if (type === "attachment" || type === "images") return listValue(rawValue)
  if (type === "lookup") return lookupValue(rawValue)
  if (type === "boolean") return rawValue === true || rawValue === "true"
  return String(rawValue)
}

function stringifyForForm(value: unknown, type?: string | null) {
  if (value == null) return ""
  const fieldType = systemFieldType(type)
  if (fieldType === "currency" && typeof value === "object" && !Array.isArray(value)) {
    const item = value as Record<string, unknown>
    return String(item.amount ?? item.value ?? "")
  }
  if (fieldType === "lookup" && typeof value === "object" && !Array.isArray(value)) {
    const item = value as Record<string, unknown>
    return String(item.name ?? item.id ?? "")
  }
  if (fieldType === "attachment" || fieldType === "images") return Array.isArray(value) ? JSON.stringify(value) : "[]"
  if (typeof value === "object") return JSON.stringify(value, null, 2)
  return String(value)
}

let restoreFetch: (() => void) | null = null

function installProductFormLayoutFetchPatch(layoutRef: React.MutableRefObject<Layout | null>) {
  if (typeof window === "undefined") return
  if (restoreFetch) restoreFetch()

  const originalFetch = window.fetch.bind(window)
  const apiBase = getApiUrl()

  window.fetch = async (input, init) => {
    const url = extractUrl(input)
    const method = String(init?.method || "GET").toUpperCase()
    const pathname = url.startsWith("http") ? new URL(url).pathname : url

    const asksForProductFields =
      method === "GET" &&
      (pathname === "/api/product-fields" || pathname === "/api/products/fields" || url === `${apiBase}/api/product-fields` || url === `${apiBase}/api/products/fields`)

    if (asksForProductFields) {
      return new Response(JSON.stringify(layoutFields(layoutRef.current)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }

    const isProductRead = method === "GET" && /^\/api\/products\/[^/]+$/.test(pathname) && !pathname.includes("/suppliers")
    if (isProductRead) {
      const response = await originalFetch(input, init)
      const layout = layoutRef.current
      if (!response.ok || !layout) return response
      const product = await response.clone().json().catch(() => null)
      if (!product || typeof product !== "object") return response
      const metadata = product.metadata || {}
      const stored = metadata.customFields || {}
      product.customFieldValues = [...(layout.fields || [])]
        .filter((field) => field.isActive !== false)
        .map((field) => ({ fieldId: field.key, value: stringifyForForm(stored[field.key], field.type) }))
      return new Response(JSON.stringify(product), { status: response.status, headers: { "Content-Type": "application/json" } })
    }

    const isProductSave =
      (method === "POST" || method === "PATCH") &&
      (pathname === "/api/products" || /^\/api\/products\/[^/]+$/.test(pathname)) &&
      !pathname.includes("/suppliers") &&
      !pathname.includes("/adjust") &&
      !pathname.includes("/images") &&
      !pathname.includes("/types") &&
      !pathname.includes("/fields")

    if (!isProductSave || !init?.body || init.body instanceof FormData) return originalFetch(input, init)

    try {
      const layout = layoutRef.current
      const body = typeof init.body === "string" ? JSON.parse(init.body) : null
      if (!layout || !body || typeof body !== "object") return originalFetch(input, init)

      const fields = [...(layout.fields || [])].filter((field) => field.isActive !== false)
      const fieldsByKey = new Map(fields.map((field) => [field.key, field]))
      const currency = String(body.priceCurrency || "ZAR").toUpperCase()
      const customFields: Record<string, unknown> = {}
      for (const item of body.customFieldValues || []) {
        const field = fieldsByKey.get(item?.fieldId)
        if (field) customFields[field.key] = normalizeLayoutFieldValue(field, item.value, currency)
      }

      const patchedBody = {
        ...body,
        productTypeId: layout.id,
        kind: layout.kind || "physical",
        trackInventory: layout.trackInventory !== false,
        customFields,
        customFieldValues: [],
        metadata: {
          ...(body.metadata || {}),
          productTypeId: layout.id,
          productTypeName: layout.name,
          kind: layout.kind || "physical",
          trackInventory: layout.trackInventory !== false,
          customFields,
        },
      }

      return originalFetch(input, { ...init, body: JSON.stringify(patchedBody) })
    } catch {
      return originalFetch(input, init)
    }
  }

  restoreFetch = () => {
    window.fetch = originalFetch
    restoreFetch = null
  }
}

export function ProductFormWithLayout({ productId }: { productId?: string }) {
  const [layouts, setLayouts] = React.useState<Layout[]>([])
  const [selectedLayoutId, setSelectedLayoutId] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [reloadKey, setReloadKey] = React.useState(0)
  const selectedLayoutRef = React.useRef<Layout | null>(null)

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
  selectedLayoutRef.current = selectedLayout

  installProductFormLayoutFetchPatch(selectedLayoutRef)

  function changeLayout(value: string) {
    setSelectedLayoutId(value)
    setReloadKey((current) => current + 1)
  }

  if (loading) return <div className="px-4 pt-4 md:px-6"><Skeleton className="h-28 rounded-xl" /></div>

  const fields = layoutFields(selectedLayout)
  const activeLayoutFields = [...(selectedLayout?.fields || [])].filter((field) => field.isActive !== false)

  return (
    <>
      <style>{`
        .product-form-layout-scope form main > div:nth-of-type(2) [data-slot="card-content"] > [data-slot="card"] > [data-slot="card-content"] {
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 1rem !important;
          align-items: start !important;
          padding: 1rem !important;
        }

        .product-form-layout-scope form main > div:nth-of-type(2) [data-slot="card-content"] > [data-slot="card"] > [data-slot="card-content"] > * {
          min-width: 0 !important;
        }

        .product-form-layout-scope form main > div:nth-of-type(2) [data-slot="card-content"] > [data-slot="card"] > [data-slot="card-content"] input,
        .product-form-layout-scope form main > div:nth-of-type(2) [data-slot="card-content"] > [data-slot="card"] > [data-slot="card-content"] button[role="combobox"] {
          width: 100% !important;
        }

        .product-form-layout-scope form main > div:nth-of-type(3) > [data-slot="card-content"] {
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 1rem !important;
          align-items: start !important;
        }

        .product-form-layout-scope form main > div:nth-of-type(3) > [data-slot="card-content"] > div {
          display: grid !important;
          gap: 1rem !important;
          align-content: start !important;
          min-width: 0 !important;
        }

        .product-form-layout-scope form main > div:nth-of-type(3) > [data-slot="card-content"] input,
        .product-form-layout-scope form main > div:nth-of-type(3) > [data-slot="card-content"] button[role="combobox"] {
          width: 100% !important;
        }

        @media (min-width: 768px) {
          .product-form-layout-scope form main > div:nth-of-type(2) [data-slot="card-content"] > [data-slot="card"] > [data-slot="card-content"] {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .product-form-layout-scope form main > div:nth-of-type(3) > [data-slot="card-content"] {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (min-width: 1280px) {
          .product-form-layout-scope form main > div:nth-of-type(2) [data-slot="card-content"] > [data-slot="card"] > [data-slot="card-content"] {
            grid-template-columns: minmax(14rem, 1.6fr) minmax(8rem, 1fr) minmax(7rem, 0.8fr) minmax(6rem, 0.7fr) minmax(6rem, 0.7fr) minmax(11rem, 1.15fr) auto !important;
            align-items: end !important;
          }
        }
      `}</style>
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
              <Select value={selectedLayoutId} onValueChange={changeLayout}>
                <SelectTrigger><SelectValue placeholder="Choose layout" /></SelectTrigger>
                <SelectContent>{layouts.map((layout) => <SelectItem key={layout.id} value={layout.id}>{layout.name}</SelectItem>)}</SelectContent>
              </Select>
              {selectedLayout ? <div className="flex flex-wrap gap-2"><Badge variant="outline">{normalizeKind(selectedLayout.kind)}</Badge><Badge variant={selectedLayout.trackInventory === false ? "secondary" : "default"}>{selectedLayout.trackInventory === false ? "No stock tracking" : "Stock tracked"}</Badge>{selectedLayout.isDefault ? <Badge variant="secondary">Default</Badge> : null}</div> : null}
            </div>
            <div className="flex flex-wrap gap-2">{fields.length ? fields.map((field) => <Badge key={field.id} variant="secondary">{field.label}</Badge>) : <span className="text-sm text-muted-foreground">No layout fields yet. Add fields in Layout Settings.</span>}</div>
          </CardContent>
        </Card>
      </div>
      <div className="product-form-layout-scope">
        <ProductLayoutAssetFields fields={activeLayoutFields} />
        <ProductFormContentFixed key={`${selectedLayoutId}-${reloadKey}`} productId={productId} />
      </div>
    </>
  )
}
