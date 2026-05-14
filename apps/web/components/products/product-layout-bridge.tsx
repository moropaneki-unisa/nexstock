"use client"

import * as React from "react"
import Link from "next/link"
import { BoxesIcon, Settings2Icon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch, getApiUrl } from "@/lib/api"

type ProductTypeField = { key: string; label: string; type?: string | null; required?: boolean | null; isActive?: boolean | null; order?: number | null }
type ProductType = { id: string; name: string; description?: string | null; kind?: string | null; trackInventory?: boolean | null; isDefault?: boolean | null; fields?: ProductTypeField[] | null }
type Product = { id: string; productTypeId?: string | null; kind?: string | null; trackInventory?: boolean | null; metadata?: { productTypeId?: string | null; productTypeName?: string | null; kind?: string | null; trackInventory?: boolean | null; customFields?: Record<string, unknown> | null } | null }
type ProductField = { id: string; key?: string | null; label?: string | null; name?: string | null }

function normalizeList<T>(value: unknown): T[] { if (Array.isArray(value)) return value as T[]; if (value && typeof value === "object") { const maybe = value as { items?: T[]; data?: T[] }; return maybe.items ?? maybe.data ?? [] } return [] }
function humanKind(kind?: string | null) { return String(kind || "physical").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) }
function extractProductSaveUrl(input: RequestInfo | URL) { if (typeof input === "string") return input; if (input instanceof URL) return input.toString(); return input.url }

export function ProductLayoutBridge({ productId }: { productId?: string }) {
  const [types, setTypes] = React.useState<ProductType[]>([])
  const [fields, setFields] = React.useState<ProductField[]>([])
  const [selectedTypeId, setSelectedTypeId] = React.useState<string>("")
  const [loading, setLoading] = React.useState(true)
  const selectedTypeRef = React.useRef<ProductType | null>(null)
  const fieldsRef = React.useRef<ProductField[]>([])

  React.useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const [typeResult, fieldResult, productResult] = await Promise.all([
          apiFetch<unknown>("/api/products/types").catch(() => []),
          apiFetch<unknown>("/api/product-fields").catch(() => apiFetch<unknown>("/api/products/fields").catch(() => [])),
          productId ? apiFetch<Product>(`/api/products/${productId}`).catch(() => null) : Promise.resolve(null),
        ])
        if (!active) return
        const nextTypes = normalizeList<ProductType>(typeResult)
        const nextFields = normalizeList<ProductField>(fieldResult)
        const currentTypeId = productResult?.metadata?.productTypeId || productResult?.productTypeId || ""
        const defaultTypeId = nextTypes.find((type) => type.isDefault)?.id || nextTypes[0]?.id || ""
        setTypes(nextTypes)
        setFields(nextFields)
        setSelectedTypeId(currentTypeId || defaultTypeId)
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [productId])

  React.useEffect(() => { selectedTypeRef.current = types.find((type) => type.id === selectedTypeId) || null }, [types, selectedTypeId])
  React.useEffect(() => { fieldsRef.current = fields }, [fields])

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const originalFetch = window.fetch.bind(window)
    const apiBase = getApiUrl()
    window.fetch = async (input, init) => {
      const url = extractProductSaveUrl(input)
      const method = String(init?.method || "GET").toUpperCase()
      const isProductSave = (method === "POST" || method === "PATCH") && (url === `${apiBase}/api/products` || /^https?:\/\/[^/]+\/api\/products\/[^/]+$/.test(url) || url === "/api/products" || /^\/api\/products\/[^/]+$/.test(url)) && !url.includes("/suppliers") && !url.includes("/adjust") && !url.includes("/images") && !url.includes("/types") && !url.includes("/fields")
      if (!isProductSave || !init?.body || init.body instanceof FormData) return originalFetch(input, init)
      try {
        const layout = selectedTypeRef.current
        if (!layout) return originalFetch(input, init)
        const body = typeof init.body === "string" ? JSON.parse(init.body) : null
        if (!body || typeof body !== "object") return originalFetch(input, init)
        const fieldsById = new Map(fieldsRef.current.map((field) => [field.id, field]))
        const customFields: Record<string, unknown> = {}
        for (const item of body.customFieldValues || []) {
          const field = fieldsById.get(item.fieldId)
          const key = field?.key || field?.label || field?.name || item.fieldId
          customFields[key] = item.value
        }
        const patchedBody = { ...body, metadata: { ...(body.metadata || {}), productTypeId: layout.id, productTypeName: layout.name, kind: layout.kind || "physical", trackInventory: layout.trackInventory !== false, customFields } }
        return originalFetch(input, { ...init, body: JSON.stringify(patchedBody) })
      } catch {
        return originalFetch(input, init)
      }
    }
    return () => { window.fetch = originalFetch }
  }, [])

  const selectedType = types.find((type) => type.id === selectedTypeId) || null
  const selectedFields = [...(selectedType?.fields || [])].filter((field) => field.isActive !== false)
  if (loading) return <div className="px-4 pt-4 md:px-6"><Skeleton className="h-28 rounded-xl" /></div>
  if (!types.length) return null

  return (
    <div className="px-4 pt-4 md:px-6">
      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><CardTitle className="flex items-center gap-2"><BoxesIcon className="size-4" />Layout</CardTitle><CardDescription>Choose the layout for this product. The selected layout is saved with the product and shown on the product details page.</CardDescription></div>
          <Button asChild variant="outline" size="sm"><Link href="/layouts"><Settings2Icon className="size-4" />Manage layouts</Link></Button>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[minmax(0,24rem)_1fr] md:items-start">
          <div className="grid gap-2"><Select value={selectedTypeId} onValueChange={setSelectedTypeId}><SelectTrigger><SelectValue placeholder="Choose layout" /></SelectTrigger><SelectContent>{types.map((type) => <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>)}</SelectContent></Select>{selectedType ? <div className="flex flex-wrap gap-2"><Badge variant="outline">{humanKind(selectedType.kind)}</Badge><Badge variant={selectedType.trackInventory === false ? "secondary" : "default"}>{selectedType.trackInventory === false ? "No stock tracking" : "Stock tracked"}</Badge>{selectedType.isDefault ? <Badge variant="secondary">Default</Badge> : null}</div> : null}</div>
          <div className="flex flex-wrap gap-2">{selectedFields.length ? selectedFields.map((field) => <Badge key={field.key} variant="secondary">{field.label || field.key}</Badge>) : <span className="text-sm text-muted-foreground">No layout attributes selected yet.</span>}</div>
        </CardContent>
      </Card>
    </div>
  )
}
