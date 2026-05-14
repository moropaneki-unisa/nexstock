"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon, DatabaseZapIcon, Loader2Icon, SaveIcon, Settings2Icon } from "lucide-react"
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
type ProductAttribute = { id: string; key: string; label?: string | null; name?: string | null; type?: string | null; required?: boolean | null; options?: string[] | null; defaultValue?: unknown; order?: number | null; isActive?: boolean | null; visible?: boolean | null }
type LayoutField = { key: string; label: string; type: string; required?: boolean; options?: string[]; defaultValue?: unknown; order?: number; isActive?: boolean }
type Layout = { id: string; name: string; description?: string | null; kind: ProductKind | string; trackInventory: boolean; isDefault?: boolean | null; fields?: LayoutField[] | null }
type Draft = { name: string; description: string; kind: ProductKind; trackInventory: boolean; isDefault: boolean; selectedKeys: string[] }

const LAYOUTS_API = "/api/products/types"
const ATTRIBUTES_API = "/api/product-fields"
const emptyDraft: Draft = { name: "", description: "", kind: "physical", trackInventory: true, isDefault: false, selectedKeys: [] }

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

function attributeLabel(attribute: ProductAttribute) {
  return attribute.label || attribute.name || attribute.key
}

function fieldFromAttribute(attribute: ProductAttribute, order: number): LayoutField {
  return { key: attribute.key, label: attributeLabel(attribute), type: attribute.type || "text", required: Boolean(attribute.required), options: attribute.options || [], defaultValue: attribute.defaultValue, order, isActive: true }
}

function draftFromLayout(layout: Layout): Draft {
  return {
    name: layout.name || "",
    description: layout.description || "",
    kind: (layout.kind as ProductKind) || "physical",
    trackInventory: layout.trackInventory !== false,
    isDefault: Boolean(layout.isDefault),
    selectedKeys: (layout.fields || []).filter((field) => field.isActive !== false).sort((a, b) => numberValue(a.order) - numberValue(b.order)).map((field) => field.key),
  }
}

export function LayoutFormContent({ layoutId }: { layoutId?: string }) {
  const router = useRouter()
  const editing = Boolean(layoutId)
  const [attributes, setAttributes] = React.useState<ProductAttribute[]>([])
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
        const [attributeResult, layoutResult] = await Promise.all([
          apiFetch<unknown>(ATTRIBUTES_API).catch(() => apiFetch<unknown>("/api/products/fields").catch(() => [])),
          layoutId ? apiFetch<Layout>(`${LAYOUTS_API}/${layoutId}`) : Promise.resolve(null),
        ])
        if (!active) return
        setAttributes(normalizeList<ProductAttribute>(attributeResult).filter((field) => field.isActive !== false && field.visible !== false).sort((a, b) => numberValue(a.order) - numberValue(b.order)))
        if (layoutResult) setDraft(draftFromLayout(layoutResult))
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

  function toggleAttribute(key: string, checked: boolean) {
    setDraft((current) => {
      const selected = new Set(current.selectedKeys)
      if (checked) selected.add(key)
      else selected.delete(key)
      return { ...current, selectedKeys: attributes.filter((attribute) => selected.has(attribute.key)).map((attribute) => attribute.key) }
    })
  }

  async function saveLayout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!draft.name.trim()) return setError("Layout name is required.")

    const selected = new Set(draft.selectedKeys)
    const fields = attributes.filter((attribute) => selected.has(attribute.key)).map((attribute, index) => fieldFromAttribute(attribute, index))
    const payload = { name: draft.name.trim(), description: draft.description.trim() || undefined, kind: draft.kind, trackInventory: draft.kind === "service" || draft.kind === "digital" ? false : draft.trackInventory, isDefault: draft.isDefault, fields }

    setSaving(true)
    try {
      const saved = editing ? await apiFetch<Layout>(`${LAYOUTS_API}/${layoutId}`, { method: "PATCH", body: JSON.stringify(payload) }) : await apiFetch<Layout>(LAYOUTS_API, { method: "POST", body: JSON.stringify(payload) })
      toast.success(editing ? "Layout updated" : "Layout created", { description: saved.name })
      router.push(`/layouts/${saved.id}`)
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

  const selectedCount = draft.selectedKeys.length

  return (
    <form onSubmit={saveLayout} className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Layouts</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{editing ? "Edit layout" : "Create layout"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Layouts are reusable product structures built from Product Attributes.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm"><Link href={editing ? `/layouts/${layoutId}` : "/layouts"}><ArrowLeftIcon className="size-4" />Back</Link></Button>
          <Button asChild variant="outline" size="sm"><Link href="/products/fields"><DatabaseZapIcon className="size-4" />Product attributes</Link></Button>
        </div>
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
              <div><CardTitle className="flex items-center gap-2"><DatabaseZapIcon className="size-4" />Layout attributes</CardTitle><CardDescription>Select which Product Attributes belong to this layout.</CardDescription></div>
              <Badge variant="secondary">{selectedCount} selected</Badge>
            </CardHeader>
            <CardContent>
              {attributes.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{attributes.map((attribute) => {
                const checked = draft.selectedKeys.includes(attribute.key)
                return <label key={attribute.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition hover:bg-muted/50 ${checked ? "border-primary bg-primary/5" : "bg-background"}`}><Checkbox checked={checked} onCheckedChange={(value) => toggleAttribute(attribute.key, Boolean(value))} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{attributeLabel(attribute)}</span><span className="mt-1 block truncate font-mono text-xs text-muted-foreground">{`{{product.customFields.${attribute.key}}}`}</span><span className="mt-2 flex flex-wrap gap-1"><Badge variant="outline" className="capitalize">{attribute.type || "text"}</Badge>{attribute.required ? <Badge>Required</Badge> : <Badge variant="secondary">Optional</Badge>}</span></span></label>
              })}</div> : <div className="rounded-xl border border-dashed p-8 text-center"><p className="font-medium">No product attributes yet</p><p className="mt-1 text-sm text-muted-foreground">Create Product Attributes first, then add them to this layout.</p><Button asChild className="mt-4" size="sm"><Link href="/products/fields">Create attributes</Link></Button></div>}
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
              <Side label="Attributes" value={`${selectedCount}`} />
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
