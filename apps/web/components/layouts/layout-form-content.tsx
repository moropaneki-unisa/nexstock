"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon, Loader2Icon, PlusIcon, SaveIcon, Settings2Icon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

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
type FieldType = "text" | "richtext" | "number" | "decimal" | "currency" | "attachment" | "images" | "lookup" | "boolean" | "select" | "date"
type LayoutField = { key: string; label: string; type: FieldType | string; required?: boolean; options?: string[]; defaultValue?: unknown; order?: number; isActive?: boolean }
type Layout = { id: string; name: string; description?: string | null; kind: ProductKind | string; trackInventory: boolean; isDefault?: boolean | null; fields?: LayoutField[] | null }
type Draft = { name: string; description: string; kind: ProductKind; trackInventory: boolean; isDefault: boolean; fields: LayoutField[] }

const LAYOUTS_API = "/api/products/types"
const emptyDraft: Draft = { name: "", description: "", kind: "physical", trackInventory: true, isDefault: false, fields: [] }
const fieldTypes: Array<{ value: FieldType; label: string; description: string }> = [
  { value: "text", label: "Text", description: "Single-line plain text" },
  { value: "richtext", label: "Rich text", description: "Formatted long text" },
  { value: "number", label: "Number", description: "Whole number" },
  { value: "decimal", label: "Decimal", description: "Number with decimals" },
  { value: "currency", label: "Currency", description: "Amount with currency" },
  { value: "attachment", label: "Attachment", description: "Array of files" },
  { value: "images", label: "Images", description: "Array of images" },
  { value: "lookup", label: "Lookup", description: "Object with id and name" },
  { value: "boolean", label: "Boolean", description: "True or false" },
  { value: "select", label: "Select", description: "Option list" },
  { value: "date", label: "Date", description: "Date value" },
]

function numberValue(value: unknown) {
  const next = Number(value ?? 0)
  return Number.isFinite(next) ? next : 0
}

function keyFromLabel(label: string) {
  return label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "field"
}

function uniqueKey(label: string, fields: LayoutField[], currentIndex: number) {
  const base = keyFromLabel(label)
  const existing = new Set(fields.filter((_, index) => index !== currentIndex).map((field) => field.key))
  let key = base
  let index = 2
  while (existing.has(key)) key = `${base}_${index++}`
  return key
}

function usesOptions(type?: string) {
  return type === "select" || type === "lookup"
}

function optionsLabel(type?: string) {
  return type === "lookup" ? "Lookup source/options" : "Options"
}

function optionsPlaceholder(type?: string) {
  return type === "lookup" ? "suppliers, customers, products" : "Small, Medium, Large"
}

function draftFromLayout(layout: Layout): Draft {
  return {
    name: layout.name || "",
    description: layout.description || "",
    kind: (layout.kind as ProductKind) || "physical",
    trackInventory: layout.trackInventory !== false,
    isDefault: Boolean(layout.isDefault),
    fields: [...(layout.fields || [])]
      .filter((field) => field.isActive !== false)
      .sort((a, b) => numberValue(a.order) - numberValue(b.order))
      .map((field, index) => ({
        key: field.key || keyFromLabel(field.label || `Field ${index + 1}`),
        label: field.label || field.key || `Field ${index + 1}`,
        type: field.type || "text",
        required: Boolean(field.required),
        options: field.options || [],
        defaultValue: field.defaultValue,
        order: index,
        isActive: true,
      })),
  }
}

function normalizeFields(fields: LayoutField[]) {
  return fields
    .filter((field) => field.label.trim())
    .map((field, index) => ({
      ...field,
      key: field.key || keyFromLabel(field.label),
      label: field.label.trim(),
      type: field.type || "text",
      options: usesOptions(String(field.type)) ? (field.options || []).map((option) => String(option).trim()).filter(Boolean) : [],
      order: index,
      isActive: true,
    }))
}

export function LayoutFormContent({ layoutId }: { layoutId?: string }) {
  const router = useRouter()
  const editing = Boolean(layoutId)
  const [draft, setDraft] = React.useState<Draft>(emptyDraft)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        if (layoutId) {
          const layout = await apiFetch<Layout>(`${LAYOUTS_API}/${layoutId}`)
          if (active) setDraft(draftFromLayout(layout))
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not load layout"
        setError(message)
        toast.error("Layout could not load", { description: message })
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [layoutId])

  function addField() {
    setDraft((current) => ({ ...current, fields: [...current.fields, { key: "", label: "", type: "text", required: false, options: [], order: current.fields.length, isActive: true }] }))
  }

  function updateField(index: number, patch: Partial<LayoutField>) {
    setDraft((current) => {
      const fields = current.fields.map((field, fieldIndex) => {
        if (fieldIndex !== index) return field
        const next = { ...field, ...patch }
        if (patch.label !== undefined && (!field.key || field.key === keyFromLabel(field.label))) next.key = uniqueKey(patch.label, current.fields, index)
        if (patch.type !== undefined && !usesOptions(String(patch.type))) next.options = []
        return next
      })
      return { ...current, fields }
    })
  }

  function removeField(index: number) {
    setDraft((current) => ({ ...current, fields: current.fields.filter((_, fieldIndex) => fieldIndex !== index).map((field, order) => ({ ...field, order })) }))
  }

  async function saveLayout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!draft.name.trim()) return setError("Layout name is required.")

    const fields = normalizeFields(draft.fields)
    const payload = { name: draft.name.trim(), description: draft.description.trim() || undefined, kind: draft.kind, trackInventory: draft.kind === "service" || draft.kind === "digital" ? false : draft.trackInventory, isDefault: draft.isDefault, fields }

    setSaving(true)
    try {
      const saved = editing ? await apiFetch<Layout>(`${LAYOUTS_API}/${layoutId}`, { method: "PATCH", body: JSON.stringify(payload) }) : await apiFetch<Layout>(LAYOUTS_API, { method: "POST", body: JSON.stringify(payload) })
      toast.success(editing ? "Layout updated" : "Layout created", { description: saved.name })
      router.push(`/settings/layout/${saved.id}`)
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save layout"
      setError(message)
      toast.error("Layout could not save", { description: message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6"><Skeleton className="h-12 w-72" /><Skeleton className="h-[620px] rounded-xl" /></div>

  const fieldCount = normalizeFields(draft.fields).length

  return (
    <form onSubmit={saveLayout} className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Layout Settings</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{editing ? "Edit layout" : "Create layout"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create product-specific fields directly inside this layout.</p>
        </div>
        <Button asChild variant="outline" size="sm"><Link href={editing ? `/settings/layout/${layoutId}` : "/settings/layout"}><ArrowLeftIcon className="size-4" />Back</Link></Button>
      </div>

      {error ? <Card className="border-destructive/30 bg-destructive/5"><CardContent className="p-4 text-sm text-destructive">{error}</CardContent></Card> : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_20rem]">
        <main className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Settings2Icon className="size-4" />Layout details</CardTitle>
              <CardDescription>Name the layout and decide how products using it behave.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="Layout name" required><Input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Smartphone, Car, T-shirt, Service..." /></Field>
              <Field label="Kind"><Select value={draft.kind} onValueChange={(value: ProductKind) => setDraft((current) => ({ ...current, kind: value, trackInventory: value === "service" || value === "digital" ? false : current.trackInventory }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="physical">Physical product</SelectItem><SelectItem value="service">Service</SelectItem><SelectItem value="digital">Digital product</SelectItem><SelectItem value="bundle">Bundle</SelectItem></SelectContent></Select></Field>
              <div className="md:col-span-2"><Field label="Description"><Textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Describe when this layout should be used." /></Field></div>
              <label className="flex items-center gap-3 rounded-xl border p-3 text-sm"><Checkbox checked={draft.trackInventory} disabled={draft.kind === "service" || draft.kind === "digital"} onCheckedChange={(checked) => setDraft((current) => ({ ...current, trackInventory: Boolean(checked) }))} /><span><span className="font-medium">Track inventory</span><span className="block text-xs text-muted-foreground">Disable for services and most digital items.</span></span></label>
              <label className="flex items-center gap-3 rounded-xl border p-3 text-sm"><Checkbox checked={draft.isDefault} onCheckedChange={(checked) => setDraft((current) => ({ ...current, isDefault: Boolean(checked) }))} /><span><span className="font-medium">Default layout</span><span className="block text-xs text-muted-foreground">Used as the first option for new products.</span></span></label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div><CardTitle>Layout fields</CardTitle><CardDescription>Add fields for this layout. Attachment and Images are saved as arrays. Lookup is saved as an object with id and name.</CardDescription></div>
              <Button type="button" variant="outline" size="sm" onClick={addField}><PlusIcon className="size-4" />Add field</Button>
            </CardHeader>
            <CardContent className="grid gap-3">
              {draft.fields.length ? draft.fields.map((field, index) => <div key={index} className="rounded-xl border p-4"><div className="grid gap-3 md:grid-cols-[1fr_0.85fr_0.6fr_auto]"><Field label="Field label"><Input value={field.label} onChange={(event) => updateField(index, { label: event.target.value })} placeholder="VIN, IMEI, Warranty docs..." /></Field><Field label="Type"><Select value={String(field.type || "text")} onValueChange={(value: FieldType) => updateField(index, { type: value, options: usesOptions(value) ? field.options || [] : [] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{fieldTypes.map((type) => <SelectItem key={type.value} value={type.value}><span className="flex flex-col"><span>{type.label}</span><span className="text-xs text-muted-foreground">{type.description}</span></span></SelectItem>)}</SelectContent></Select></Field><label className="mt-6 flex items-center gap-3 rounded-xl border p-3 text-sm"><Checkbox checked={Boolean(field.required)} onCheckedChange={(checked) => updateField(index, { required: Boolean(checked) })} /><span>Required</span></label><Button type="button" variant="ghost" size="icon" className="mt-6 text-muted-foreground hover:text-destructive" onClick={() => removeField(index)}><Trash2Icon className="size-4" /></Button></div>{usesOptions(String(field.type)) ? <div className="mt-3"><Field label={optionsLabel(String(field.type))}><Input value={(field.options || []).join(", ")} onChange={(event) => updateField(index, { options: event.target.value.split(",").map((option) => option.trim()).filter(Boolean) })} placeholder={optionsPlaceholder(String(field.type))} /></Field><p className="mt-1 text-xs text-muted-foreground">{field.type === "lookup" ? "Use this to define allowed lookup modules/sources for now." : "Separate options with commas."}</p></div> : null}<p className="mt-3 font-mono text-xs text-muted-foreground">{`{{product.customFields.${field.key || keyFromLabel(field.label)}}}`}</p></div>) : <div className="rounded-xl border border-dashed p-8 text-center"><p className="font-medium">No fields yet</p><p className="mt-1 text-sm text-muted-foreground">Add fields that only apply to products using this layout.</p><Button type="button" className="mt-4" size="sm" onClick={addField}><PlusIcon className="size-4" />Add first field</Button></div>}
            </CardContent>
          </Card>
        </main>

        <aside className="grid gap-4 self-start xl:sticky xl:top-20">
          <Card>
            <CardHeader><CardTitle>Layout summary</CardTitle></CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <Side label="Name" value={draft.name || "Missing"} />
              <Side label="Kind" value={draft.kind} />
              <Side label="Inventory" value={draft.trackInventory ? "Tracked" : "Not tracked"} />
              <Side label="Fields" value={`${fieldCount}`} />
            </CardContent>
            <CardFooter><Button type="submit" className="w-full" disabled={saving}>{saving ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}{saving ? "Saving..." : "Save layout"}</Button></CardFooter>
          </Card>
        </aside>
      </div>
    </form>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) { return <div className="grid gap-2"><Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}{required ? <span className="ml-1 text-destructive">*</span> : null}</Label>{children}</div> }
function Side({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium capitalize">{value}</span></div> }
