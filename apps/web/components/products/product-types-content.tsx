"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeftIcon,
  CarIcon,
  DatabaseZapIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
  SaveIcon,
  Settings2Icon,
  SmartphoneIcon,
  Trash2Icon,
  WrenchIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { apiFetch } from "@/lib/api"

type ProductKind = "physical" | "service" | "digital" | "bundle"
type ProductAttribute = {
  id: string
  key: string
  label?: string | null
  name?: string | null
  type?: string | null
  required?: boolean | null
  options?: string[] | null
  defaultValue?: unknown
  order?: number | null
  isActive?: boolean | null
  visible?: boolean | null
}
type ProductTypeField = {
  id?: string
  key: string
  label: string
  type: string
  required?: boolean
  options?: string[]
  defaultValue?: unknown
  order?: number
  isActive?: boolean
}
type ProductType = {
  id: string
  name: string
  description?: string | null
  kind: ProductKind | string
  trackInventory: boolean
  isDefault?: boolean | null
  sortOrder?: number | null
  fields?: ProductTypeField[]
}
type DraftType = {
  id?: string
  name: string
  description: string
  kind: ProductKind
  trackInventory: boolean
  isDefault: boolean
  selectedKeys: string[]
}

const blankDraft: DraftType = { name: "", description: "", kind: "physical", trackInventory: true, isDefault: false, selectedKeys: [] }
const kindLabels: Record<string, string> = { physical: "Physical product", service: "Service", digital: "Digital product", bundle: "Bundle" }

function normalizeList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === "object") {
    const maybe = value as { items?: T[]; data?: T[] }
    return maybe.items ?? maybe.data ?? []
  }
  return []
}

function numberValue(value: unknown) {
  const next = Number(value ?? 0)
  return Number.isFinite(next) ? next : 0
}

function typeToDraft(type: ProductType): DraftType {
  return {
    id: type.id,
    name: type.name,
    description: type.description || "",
    kind: (type.kind as ProductKind) || "physical",
    trackInventory: Boolean(type.trackInventory),
    isDefault: Boolean(type.isDefault),
    selectedKeys: (type.fields || []).filter((field) => field.isActive !== false).sort((a, b) => numberValue(a.order) - numberValue(b.order)).map((field) => field.key),
  }
}

function attributeLabel(attribute: ProductAttribute) {
  return attribute.label || attribute.name || attribute.key
}

function fieldFromAttribute(attribute: ProductAttribute, order: number): ProductTypeField {
  return {
    key: attribute.key,
    label: attributeLabel(attribute),
    type: attribute.type || "text",
    required: Boolean(attribute.required),
    options: attribute.options || [],
    defaultValue: attribute.defaultValue,
    order,
    isActive: true,
  }
}

function iconFor(type: DraftType | ProductType | null) {
  const name = `${type?.name || ""} ${type?.kind || ""}`.toLowerCase()
  if (name.includes("phone") || name.includes("smart")) return SmartphoneIcon
  if (name.includes("car") || name.includes("vehicle")) return CarIcon
  if (name.includes("service")) return WrenchIcon
  return Settings2Icon
}

export function ProductTypesContent() {
  const [types, setTypes] = React.useState<ProductType[]>([])
  const [attributes, setAttributes] = React.useState<ProductAttribute[]>([])
  const [draft, setDraft] = React.useState<DraftType>(blankDraft)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [typeResult, attributeResult] = await Promise.all([
        apiFetch<ProductType[]>("/api/product-types"),
        apiFetch<unknown>("/api/product-fields"),
      ])
      const nextTypes = normalizeList<ProductType>(typeResult)
      const nextAttributes = normalizeList<ProductAttribute>(attributeResult).filter((field) => field.isActive !== false && field.visible !== false)
      setTypes(nextTypes)
      setAttributes(nextAttributes)
      if (!selectedId && nextTypes[0]) {
        setSelectedId(nextTypes[0].id)
        setDraft(typeToDraft(nextTypes[0]))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load product types"
      setError(message)
      toast.error("Product types could not load", { description: message })
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => { void load() }, [])

  function startNew() {
    setSelectedId(null)
    setDraft({ ...blankDraft, selectedKeys: [] })
  }

  function selectType(type: ProductType) {
    setSelectedId(type.id)
    setDraft(typeToDraft(type))
  }

  function toggleAttribute(key: string, checked: boolean) {
    setDraft((current) => {
      const selected = new Set(current.selectedKeys)
      if (checked) selected.add(key)
      else selected.delete(key)
      return { ...current, selectedKeys: attributes.filter((attribute) => selected.has(attribute.key)).map((attribute) => attribute.key) }
    })
  }

  async function saveType(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!draft.name.trim()) return setError("Product type name is required")

    const selected = new Set(draft.selectedKeys)
    const fields = attributes.filter((attribute) => selected.has(attribute.key)).map((attribute, index) => fieldFromAttribute(attribute, index))

    setSaving(true)
    try {
      const payload = {
        name: draft.name.trim(),
        description: draft.description.trim() || undefined,
        kind: draft.kind,
        trackInventory: draft.kind === "service" || draft.kind === "digital" ? false : draft.trackInventory,
        isDefault: draft.isDefault,
        fields,
      }
      const saved = draft.id
        ? await apiFetch<ProductType>(`/api/product-types/${draft.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        : await apiFetch<ProductType>("/api/product-types", { method: "POST", body: JSON.stringify(payload) })
      toast.success(draft.id ? "Product type updated" : "Product type created", { description: saved.name })
      setSelectedId(saved.id)
      setDraft(typeToDraft(saved))
      await load()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save product type"
      setError(message)
      toast.error("Product type could not save", { description: message })
    } finally {
      setSaving(false)
    }
  }

  async function deleteType() {
    if (!draft.id) return
    if (!window.confirm(`Delete "${draft.name}"? Existing products keep their saved attribute values.`)) return
    setSaving(true)
    try {
      await apiFetch(`/api/product-types/${draft.id}`, { method: "DELETE" })
      toast.success("Product type deleted")
      setSelectedId(null)
      setDraft({ ...blankDraft, selectedKeys: [] })
      await load()
    } catch (err) {
      toast.error("Could not delete product type", { description: err instanceof Error ? err.message : "Delete failed" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex flex-col gap-4 p-4 md:p-6"><Skeleton className="h-12 w-72" /><Skeleton className="h-[620px] rounded-xl" /></div>

  const DraftIcon = iconFor(draft)
  const selectedAttributes = attributes.filter((attribute) => draft.selectedKeys.includes(attribute.key))

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Products</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Product Types</h1>
          <p className="mt-1 text-sm text-muted-foreground">Group existing Product Attributes into layouts for cars, smartphones, services, clothing, spare parts, and more.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm"><Link href="/products"><ArrowLeftIcon className="size-4" />Back to products</Link></Button>
          <Button asChild variant="outline" size="sm"><Link href="/products/fields"><DatabaseZapIcon className="size-4" />Product attributes</Link></Button>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={saving}><RefreshCwIcon className="size-4" />Refresh</Button>
          <Button type="button" size="sm" onClick={startNew}><PlusIcon className="size-4" />New type</Button>
        </div>
      </div>

      {error ? <Card className="border-destructive/30 bg-destructive/5"><CardContent className="p-4 text-sm text-destructive">{error}</CardContent></Card> : null}

      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <Metric title="Product types" value={types.length} detail="Active layouts" />
        <Metric title="Attributes" value={attributes.length} detail="Reusable product attributes" />
        <Metric title="Selected" value={selectedAttributes.length} detail="In current layout" />
        <Metric title="Default" value={types.find((type) => type.isDefault)?.name || "Not set"} detail="Used for new items" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <Card className="self-start">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings2Icon className="size-4" />Layouts</CardTitle>
            <CardDescription>Select a product type to edit its layout.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {types.map((type) => {
              const Icon = iconFor(type)
              return (
                <button key={type.id} type="button" onClick={() => selectType(type)} className={`rounded-xl border p-3 text-left transition hover:bg-muted/60 ${selectedId === type.id ? "border-primary bg-primary/5" : "bg-background"}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-muted"><Icon className="size-4" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{type.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{kindLabels[type.kind] || type.kind}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {type.isDefault ? <Badge>Default</Badge> : null}
                        <Badge variant="outline">{type.trackInventory ? "Stock" : "No stock"}</Badge>
                        <Badge variant="secondary">{type.fields?.length || 0} attributes</Badge>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </CardContent>
        </Card>

        <form onSubmit={saveType} className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><DraftIcon className="size-4" />{draft.id ? "Edit product type" : "New product type"}</CardTitle>
              <CardDescription>Product types now use your existing Product Attributes as their layout fields.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="Name" required><Input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Smartphone, Car, T-shirt, Service..." /></Field>
              <Field label="Kind"><Select value={draft.kind} onValueChange={(value: ProductKind) => setDraft((current) => ({ ...current, kind: value, trackInventory: value === "service" || value === "digital" ? false : current.trackInventory }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="physical">Physical product</SelectItem><SelectItem value="service">Service</SelectItem><SelectItem value="digital">Digital product</SelectItem><SelectItem value="bundle">Bundle</SelectItem></SelectContent></Select></Field>
              <div className="md:col-span-2"><Field label="Description"><Textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} /></Field></div>
              <label className="flex items-center gap-3 rounded-xl border p-3 text-sm"><Checkbox checked={draft.trackInventory} disabled={draft.kind === "service" || draft.kind === "digital"} onCheckedChange={(checked) => setDraft((current) => ({ ...current, trackInventory: Boolean(checked) }))} /><span><span className="font-medium">Track inventory</span><span className="block text-xs text-muted-foreground">Disable for services and most digital items.</span></span></label>
              <label className="flex items-center gap-3 rounded-xl border p-3 text-sm"><Checkbox checked={draft.isDefault} onCheckedChange={(checked) => setDraft((current) => ({ ...current, isDefault: Boolean(checked) }))} /><span><span className="font-medium">Default type</span><span className="block text-xs text-muted-foreground">Used when creating new items.</span></span></label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div><CardTitle className="flex items-center gap-2"><DatabaseZapIcon className="size-4" />Attributes in this layout</CardTitle><CardDescription>Choose from Product Attributes. To create new attributes, use the Product Attributes page.</CardDescription></div>
              <Button asChild type="button" variant="outline" size="sm"><Link href="/products/fields"><PlusIcon className="size-4" />Manage attributes</Link></Button>
            </CardHeader>
            <CardContent>
              {attributes.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {attributes.map((attribute) => {
                  const checked = draft.selectedKeys.includes(attribute.key)
                  return (
                    <label key={attribute.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition hover:bg-muted/50 ${checked ? "border-primary bg-primary/5" : "bg-background"}`}>
                      <Checkbox checked={checked} onCheckedChange={(value) => toggleAttribute(attribute.key, Boolean(value))} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{attributeLabel(attribute)}</span>
                        <span className="mt-1 block truncate font-mono text-xs text-muted-foreground">{`{{product.customFields.${attribute.key}}}`}</span>
                        <span className="mt-2 flex flex-wrap gap-1">
                          <Badge variant="outline" className="capitalize">{attribute.type || "text"}</Badge>
                          {attribute.required ? <Badge>Required</Badge> : <Badge variant="secondary">Optional</Badge>}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div> : <div className="rounded-xl border border-dashed p-8 text-center"><p className="font-medium">No product attributes yet</p><p className="mt-1 text-sm text-muted-foreground">Create attributes like IMEI, VIN, Size, Colour, Billing unit, or Mileage first.</p><Button asChild className="mt-4" size="sm"><Link href="/products/fields"><PlusIcon className="size-4" />Create attributes</Link></Button></div>}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            {draft.id ? <Button type="button" variant="outline" className="text-destructive" onClick={deleteType} disabled={saving || draft.isDefault}><Trash2Icon className="size-4" />Delete</Button> : null}
            <Button type="submit" disabled={saving}>{saving ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}{saving ? "Saving..." : "Save product type"}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <div className="grid gap-2"><Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}{required ? <span className="ml-1 text-destructive">*</span> : null}</Label>{children}</div>
}

function Metric({ title, value, detail }: { title: string; value: string | number; detail: string }) {
  return <Card><CardHeader><CardDescription>{title}</CardDescription><CardTitle className="text-2xl font-semibold tabular-nums">{value}</CardTitle></CardHeader><CardFooter className="text-sm text-muted-foreground">{detail}</CardFooter></Card>
}
