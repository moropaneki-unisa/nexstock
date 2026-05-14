"use client"

import * as React from "react"
import Link from "next/link"
import { CarIcon, Loader2Icon, PlusIcon, SaveIcon, Settings2Icon, SmartphoneIcon, Trash2Icon, WrenchIcon, XIcon } from "lucide-react"
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
type FieldType = "text" | "number" | "boolean" | "select" | "date" | "json"
type ProductTypeField = {
  id?: string
  key: string
  label: string
  type: FieldType | string
  required?: boolean
  options?: string[]
  placeholder?: string | null
  helpText?: string | null
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
  fields: ProductTypeField[]
}

const blankDraft: DraftType = { name: "", description: "", kind: "physical", trackInventory: true, isDefault: false, fields: [] }
const fieldTypes: FieldType[] = ["text", "number", "boolean", "select", "date", "json"]
const kindLabels: Record<string, string> = { physical: "Physical product", service: "Service", digital: "Digital product", bundle: "Bundle" }

function rowId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `field-${Date.now()}-${Math.random()}`
}

function fieldKey(label: string) {
  return label
    .trim()
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .replace(/\s+(.)/g, (_, char) => char.toUpperCase())
    .replace(/^./, (char) => char.toLowerCase())
}

function typeToDraft(type: ProductType): DraftType {
  return {
    id: type.id,
    name: type.name,
    description: type.description || "",
    kind: (type.kind as ProductKind) || "physical",
    trackInventory: Boolean(type.trackInventory),
    isDefault: Boolean(type.isDefault),
    fields: [...(type.fields || [])].map((field, index) => ({
      ...field,
      key: field.key || fieldKey(field.label),
      type: (field.type || "text") as FieldType,
      order: field.order ?? index,
      isActive: field.isActive !== false,
      options: field.options || [],
    })),
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
  const [draft, setDraft] = React.useState<DraftType>(blankDraft)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function loadTypes() {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<ProductType[]>("/api/product-types")
      setTypes(data)
      if (!selectedId && data[0]) {
        setSelectedId(data[0].id)
        setDraft(typeToDraft(data[0]))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load product types"
      setError(message)
      toast.error("Product types could not load", { description: message })
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => { void loadTypes() }, [])

  function startNew() {
    setSelectedId(null)
    setDraft({ ...blankDraft, fields: [] })
  }

  function selectType(type: ProductType) {
    setSelectedId(type.id)
    setDraft(typeToDraft(type))
  }

  function updateField(index: number, patch: Partial<ProductTypeField>) {
    setDraft((current) => ({
      ...current,
      fields: current.fields.map((field, itemIndex) => itemIndex === index ? { ...field, ...patch } : field),
    }))
  }

  function addField() {
    setDraft((current) => ({
      ...current,
      fields: [...current.fields, { id: rowId(), key: "", label: "", type: "text", required: false, options: [], order: current.fields.length, isActive: true }],
    }))
  }

  function removeField(index: number) {
    setDraft((current) => ({ ...current, fields: current.fields.filter((_, itemIndex) => itemIndex !== index).map((field, order) => ({ ...field, order })) }))
  }

  async function saveType(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!draft.name.trim()) return setError("Product type name is required")

    const fields = draft.fields
      .map((field, index) => ({
        ...field,
        label: field.label.trim(),
        key: field.key.trim() || fieldKey(field.label),
        order: index,
        options: field.type === "select" ? (field.options || []).filter(Boolean) : [],
        isActive: true,
      }))
      .filter((field) => field.label && field.key)

    setSaving(true)
    try {
      const payload = { ...draft, fields }
      const saved = draft.id
        ? await apiFetch<ProductType>(`/api/product-types/${draft.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        : await apiFetch<ProductType>("/api/product-types", { method: "POST", body: JSON.stringify(payload) })
      toast.success(draft.id ? "Product type updated" : "Product type created", { description: saved.name })
      setSelectedId(saved.id)
      setDraft(typeToDraft(saved))
      await loadTypes()
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
    if (!window.confirm(`Delete "${draft.name}"? Existing products keep their saved field values.`)) return
    setSaving(true)
    try {
      await apiFetch(`/api/product-types/${draft.id}`, { method: "DELETE" })
      toast.success("Product type deleted")
      setSelectedId(null)
      setDraft({ ...blankDraft, fields: [] })
      await loadTypes()
    } catch (err) {
      toast.error("Could not delete product type", { description: err instanceof Error ? err.message : "Delete failed" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex flex-col gap-4 p-4 md:p-6"><Skeleton className="h-12 w-72" /><Skeleton className="h-[620px] rounded-xl" /></div>

  const DraftIcon = iconFor(draft)

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Products & Services</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Product Types</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create layouts for cars, smartphones, services, clothing, spare parts, and more.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm"><Link href="/products">Back to products</Link></Button>
          <Button type="button" size="sm" onClick={startNew}><PlusIcon className="size-4" />New type</Button>
        </div>
      </div>

      {error ? <Card className="border-destructive/30 bg-destructive/5"><CardContent className="p-4 text-sm text-destructive">{error}</CardContent></Card> : null}

      <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <aside className="grid gap-2 self-start">
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
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </aside>

        <form onSubmit={saveType} className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><DraftIcon className="size-4" />{draft.id ? "Edit product type" : "New product type"}</CardTitle>
              <CardDescription>Product types define which fields appear on the item create/edit form.</CardDescription>
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
              <div><CardTitle>Layout fields</CardTitle><CardDescription>Add fields that only apply to this type.</CardDescription></div>
              <Button type="button" variant="outline" size="sm" onClick={addField}><PlusIcon className="size-4" />Add field</Button>
            </CardHeader>
            <CardContent className="grid gap-3">
              {draft.fields.length ? draft.fields.map((field, index) => (
                <div key={field.id || index} className="grid gap-3 rounded-xl border p-3 md:grid-cols-[1fr_0.8fr_0.8fr_auto] md:items-end">
                  <Field label="Label"><Input value={field.label} onChange={(event) => updateField(index, { label: event.target.value, key: field.key || fieldKey(event.target.value) })} placeholder="VIN, IMEI, Size..." /></Field>
                  <Field label="Key"><Input value={field.key} onChange={(event) => updateField(index, { key: fieldKey(event.target.value) })} placeholder="vin" /></Field>
                  <Field label="Type"><Select value={field.type} onValueChange={(value: FieldType) => updateField(index, { type: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{fieldTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select></Field>
                  <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => removeField(index)}><Trash2Icon className="size-4" /></Button>
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={Boolean(field.required)} onCheckedChange={(checked) => updateField(index, { required: Boolean(checked) })} />Required</label>
                  {field.type === "select" ? <div className="md:col-span-3"><Field label="Options, comma separated"><Input value={(field.options || []).join(", ")} onChange={(event) => updateField(index, { options: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} placeholder="Petrol, Diesel, Electric" /></Field></div> : null}
                </div>
              )) : <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No fields yet. Add fields like VIN, IMEI, Size, Billing unit, or Mileage.</div>}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            {draft.id ? <Button type="button" variant="outline" className="text-destructive" onClick={deleteType} disabled={saving || draft.isDefault}><XIcon className="size-4" />Delete</Button> : null}
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
