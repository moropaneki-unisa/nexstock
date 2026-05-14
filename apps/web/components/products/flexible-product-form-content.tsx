"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircleIcon, ArrowLeftIcon, BoxesIcon, CarIcon, CheckCircle2Icon, CodeIcon, Loader2Icon, PackageIcon, SaveIcon, Settings2Icon, SmartphoneIcon, WrenchIcon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { apiFetch } from "@/lib/api"

type ProductKind = "physical" | "service" | "digital" | "bundle"
type ProductTypeField = {
  id: string
  key: string
  label: string
  type: "text" | "number" | "boolean" | "select" | "date" | "json" | string
  required?: boolean | null
  options?: string[] | null
  placeholder?: string | null
  helpText?: string | null
  order?: number | null
}
type ProductType = {
  id: string
  name: string
  description?: string | null
  kind: ProductKind | string
  trackInventory: boolean
  isDefault?: boolean | null
  fields?: ProductTypeField[]
}
type Product = {
  id: string
  name: string
  sku?: string | null
  category?: string | null
  description?: string | null
  price?: number | string | null
  priceCurrency?: string | null
  quantity?: number | string | null
  lowStockLevel?: number | string | null
  images?: string[] | null
  metadata?: Record<string, unknown> | null
}
type Organization = { baseCurrency?: string | null }

type FormState = {
  name: string
  category: string
  description: string
  price: string
  quantity: string
  lowStockLevel: string
}

const emptyForm: FormState = { name: "", category: "", description: "", price: "0", quantity: "0", lowStockLevel: "5" }
const kindLabels: Record<string, string> = { physical: "Physical", service: "Service", digital: "Digital", bundle: "Bundle" }

function numberValue(value: unknown) {
  const next = Number(value ?? 0)
  return Number.isFinite(next) ? next : 0
}

function normalizeList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === "object") {
    const maybe = value as { items?: T[]; data?: T[] }
    return maybe.items ?? maybe.data ?? []
  }
  return []
}

function metadataObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function customFieldsFromMetadata(product?: Product | null) {
  const metadata = metadataObject(product?.metadata)
  const fields = metadataObject(metadata.customFields)
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, typeof value === "object" ? JSON.stringify(value, null, 2) : String(value ?? "")]))
}

function productToForm(product?: Product | null): FormState {
  return {
    name: product?.name || "",
    category: product?.category || "",
    description: product?.description || "",
    price: String(product?.price ?? 0),
    quantity: String(product?.quantity ?? 0),
    lowStockLevel: String(product?.lowStockLevel ?? 5),
  }
}

function parseFieldValue(field: ProductTypeField, raw: string) {
  if (raw == null || String(raw).trim() === "") return undefined
  if (field.type === "number") {
    const value = Number(raw)
    return Number.isFinite(value) ? value : undefined
  }
  if (field.type === "boolean") return raw === "true"
  if (field.type === "json") {
    try { return JSON.parse(raw) } catch { return raw }
  }
  return raw
}

function iconForType(type?: ProductType | null) {
  const name = `${type?.name || ""} ${type?.kind || ""}`.toLowerCase()
  if (name.includes("phone") || name.includes("smart")) return SmartphoneIcon
  if (name.includes("car") || name.includes("vehicle")) return CarIcon
  if (name.includes("service")) return WrenchIcon
  if (name.includes("digital")) return CodeIcon
  return PackageIcon
}

export function FlexibleProductFormContent({ productId }: { productId?: string }) {
  const router = useRouter()
  const editing = Boolean(productId)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [product, setProduct] = React.useState<Product | null>(null)
  const [types, setTypes] = React.useState<ProductType[]>([])
  const [selectedTypeId, setSelectedTypeId] = React.useState("")
  const [baseCurrency, setBaseCurrency] = React.useState("ZAR")
  const [form, setForm] = React.useState<FormState>(emptyForm)
  const [customValues, setCustomValues] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [productResult, typeResult, orgResult] = await Promise.all([
          productId ? apiFetch<Product>(`/api/products/${productId}`) : Promise.resolve(null),
          apiFetch<ProductType[]>("/api/product-types"),
          apiFetch<Organization>("/api/organization").catch(() => null),
        ])
        if (!active) return
        const nextTypes = normalizeList<ProductType>(typeResult)
        const metadata = metadataObject(productResult?.metadata)
        const productTypeId = String(metadata.productTypeId || "")
        const selected = productTypeId || nextTypes.find((type) => type.isDefault)?.id || nextTypes[0]?.id || ""
        setProduct(productResult)
        setTypes(nextTypes)
        setSelectedTypeId(selected)
        setBaseCurrency(orgResult?.baseCurrency || productResult?.priceCurrency || "ZAR")
        setForm(productToForm(productResult))
        setCustomValues(customFieldsFromMetadata(productResult))
      } catch (err) {
        const message = err instanceof Error ? err.message : "Product form could not load"
        setError(message)
        toast.error("Product form could not load", { description: message })
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [productId])

  const selectedType = types.find((type) => type.id === selectedTypeId) || null
  const TypeIcon = iconForType(selectedType)
  const fields = [...(selectedType?.fields || [])].sort((a, b) => numberValue(a.order) - numberValue(b.order))
  const trackInventory = Boolean(selectedType?.trackInventory)
  const kind = selectedType?.kind || "physical"

  function updateForm(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function updateType(typeId: string) {
    setSelectedTypeId(typeId)
    const type = types.find((item) => item.id === typeId)
    if (type && !type.trackInventory) {
      setForm((current) => ({ ...current, quantity: "0", lowStockLevel: "0" }))
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!form.name.trim()) return setError("Name is required")
    if (!selectedType) return setError("Choose a product type")

    const missing = fields.find((field) => field.required && !String(customValues[field.key] ?? "").trim())
    if (missing) return setError(`${missing.label} is required`)

    const customFields: Record<string, unknown> = {}
    for (const field of fields) {
      const parsed = parseFieldValue(field, customValues[field.key] || "")
      if (parsed !== undefined) customFields[field.key] = parsed
    }

    const existingMetadata = metadataObject(product?.metadata)
    const payload = {
      name: form.name.trim(),
      category: form.category.trim() || undefined,
      description: form.description.trim() || undefined,
      price: numberValue(form.price),
      priceCurrency: baseCurrency,
      quantity: trackInventory ? numberValue(form.quantity) : 0,
      lowStockLevel: trackInventory ? numberValue(form.lowStockLevel) : 0,
      metadata: {
        ...existingMetadata,
        productTypeId: selectedType.id,
        productTypeName: selectedType.name,
        kind,
        trackInventory,
        customFields,
      },
    }

    setSaving(true)
    try {
      const saved = editing && productId
        ? await apiFetch<Product>(`/api/products/${productId}`, { method: "PATCH", body: JSON.stringify(payload) })
        : await apiFetch<Product>("/api/products", { method: "POST", body: JSON.stringify(payload) })
      toast.success(editing ? "Item updated" : "Item created", { description: saved.name || form.name })
      router.push(`/products/${saved.id}`)
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Product could not save"
      setError(message)
      toast.error("Product could not save", { description: message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6"><Skeleton className="h-12 w-72" /><Skeleton className="h-[680px] rounded-xl" /></div>

  return (
    <form onSubmit={save} className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Products & Services</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{editing ? "Edit item" : "Create item"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Choose a layout such as smartphone, car, service, or create your own product type.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm"><Link href={editing && product ? `/products/${product.id}` : "/products"}><ArrowLeftIcon className="size-4" />Back</Link></Button>
          <Button asChild variant="outline" size="sm"><Link href="/products/types"><Settings2Icon className="size-4" />Product types</Link></Button>
        </div>
      </div>

      {error ? <Card className="border-destructive/30 bg-destructive/5"><CardContent className="flex items-start gap-2 p-4 text-sm text-destructive"><AlertCircleIcon className="mt-0.5 size-4 shrink-0" />{error}</CardContent></Card> : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <main className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BoxesIcon className="size-4" />Item layout</CardTitle>
              <CardDescription>The selected product type controls custom fields and whether inventory is tracked.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <div className="grid gap-2">
                <Label>Product type</Label>
                <Select value={selectedTypeId} onValueChange={updateType}>
                  <SelectTrigger><SelectValue placeholder="Choose product type" /></SelectTrigger>
                  <SelectContent>
                    {types.map((type) => <SelectItem key={type.id} value={type.id}>{type.name} · {kindLabels[type.kind] || type.kind}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="h-9 px-3"><TypeIcon className="mr-1 size-4" />{kindLabels[kind] || kind}</Badge>
                <Badge variant={trackInventory ? "default" : "outline"} className="h-9 px-3">{trackInventory ? "Inventory tracked" : "No stock tracking"}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Common details</CardTitle><CardDescription>These fields apply to every item type.</CardDescription></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="Name" required><Input value={form.name} onChange={(event) => updateForm("name", event.target.value)} placeholder="Example: iPhone 15 Pro, Toyota Hilux, Repair labour" /></Field>
              <Field label="Category"><Input value={form.category} onChange={(event) => updateForm("category", event.target.value)} placeholder="Phones, Cars, Services..." /></Field>
              <Field label="Selling price" required><Input type="number" min="0" step="0.01" value={form.price} onChange={(event) => updateForm("price", event.target.value)} /></Field>
              <Field label="Currency"><Input value={baseCurrency} readOnly className="bg-muted/40" /></Field>
              <div className="md:col-span-2"><Field label="Description"><Textarea value={form.description} onChange={(event) => updateForm("description", event.target.value)} className="min-h-28" /></Field></div>
            </CardContent>
          </Card>

          {trackInventory ? (
            <Card>
              <CardHeader><CardTitle>Inventory</CardTitle><CardDescription>Only inventory-tracked item types affect stock and low-stock alerts.</CardDescription></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <Field label={editing ? "Current quantity" : "Initial quantity"}><Input type="number" min="0" value={form.quantity} onChange={(event) => updateForm("quantity", event.target.value)} /></Field>
                <Field label="Low-stock alert"><Input type="number" min="0" value={form.lowStockLevel} onChange={(event) => updateForm("lowStockLevel", event.target.value)} /></Field>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader><CardTitle>{selectedType?.name || "Layout"} fields</CardTitle><CardDescription>Fields are configurable in Product Types settings.</CardDescription></CardHeader>
            <CardContent>{fields.length ? <div className="grid gap-4 md:grid-cols-2">{fields.map((field) => <Field key={field.key} label={field.label} required={Boolean(field.required)}><AttributeInput field={field} value={customValues[field.key] || ""} onChange={(value) => setCustomValues((current) => ({ ...current, [field.key]: value }))} /></Field>)}</div> : <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">This product type has no custom fields yet.</div>}</CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push(editing && product ? `/products/${product.id}` : "/products")}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}{saving ? "Saving..." : editing ? "Update item" : "Create item"}</Button>
          </div>
        </main>

        <aside className="grid gap-4 self-start xl:sticky xl:top-20">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2Icon className="size-4" />Summary</CardTitle></CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <Summary label="Type" value={selectedType?.name || "Not selected"} />
              <Summary label="Kind" value={kindLabels[kind] || String(kind)} />
              <Summary label="Inventory" value={trackInventory ? "Tracked" : "Not tracked"} />
              <Summary label="Custom fields" value={String(fields.length)} />
            </CardContent>
          </Card>
        </aside>
      </div>
    </form>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <div className="grid gap-2"><Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}{required ? <span className="ml-1 text-destructive">*</span> : null}</Label>{children}</div>
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div>
}

function AttributeInput({ field, value, onChange }: { field: ProductTypeField; value: string; onChange: (value: string) => void }) {
  if (field.type === "boolean") {
    return <label className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm"><Checkbox checked={value === "true"} onCheckedChange={(checked) => onChange(checked ? "true" : "false")} /> Yes</label>
  }
  if (field.type === "select") {
    return <Select value={value || "none"} onValueChange={(next) => onChange(next === "none" ? "" : next)}><SelectTrigger><SelectValue placeholder={field.placeholder || "Choose option"} /></SelectTrigger><SelectContent><SelectItem value="none">Not set</SelectItem>{(field.options || []).map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>
  }
  if (field.type === "json") return <Textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder || "{}"} className="min-h-24 font-mono text-xs" />
  return <Input type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"} value={value} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder || undefined} />
}
