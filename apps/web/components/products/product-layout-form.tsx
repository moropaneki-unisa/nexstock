"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircleIcon, ArrowLeftIcon, CheckCircle2Icon, ImageIcon, Loader2Icon, PackagePlusIcon, PlusIcon, SaveIcon, Trash2Icon, UploadCloudIcon } from "lucide-react"
import { toast } from "sonner"

import { MoneyInputField } from "@/components/ui/money-input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ButtonGroup, ButtonGroupItem } from "@/components/ui/button-group"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { apiFetch } from "@/lib/api"

type LayoutField = { key: string; label: string; type?: string | null; required?: boolean | null; options?: string[] | null; isActive?: boolean | null; order?: number | null }
type Layout = { id: string; name: string; kind?: string | null; trackInventory?: boolean | null; fields?: LayoutField[] | null }
type ProductMetadata = { productTypeId?: string | null; productTypeName?: string | null; kind?: string | null; trackInventory?: boolean | null; customFields?: Record<string, unknown> | null }
type Product = { id: string; name: string; sku?: string | null; category?: string | null; description?: string | null; status?: string | null; quantity?: number | string | null; lowStockLevel?: number | string | null; price?: number | string | null; priceCurrency?: string | null; images?: string[] | null; metadata?: ProductMetadata | null }
type Organization = { baseCurrency?: string | null }
type AttachmentValue = { name: string; url: string }
type AssetResponse = { url: string; name?: string }
type FormState = { name: string; sku: string; category: string; description: string; status: string; price: string; quantity: string; lowStockLevel: string }

const emptyForm: FormState = { name: "", sku: "", category: "", description: "", status: "active", price: "0", quantity: "0", lowStockLevel: "5" }
const SYSTEM_TYPES = ["text", "richtext", "number", "decimal", "currency", "attachment", "images", "lookup", "boolean", "select", "date"]

function normalizeCurrency(value?: string | null, fallback = "ZAR") { return String(value || fallback).trim().toUpperCase() || fallback }
function numberValue(value: unknown) { const next = Number(value ?? 0); return Number.isFinite(next) ? next : 0 }
function cleanFileName(value?: string, fallback = "attachment") { const raw = String(value || fallback || "attachment").trim().replace(/\s+/g, " "); return raw.replace(/\.[^./\\]+$/, "").trim() || "attachment" }
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value && typeof value === "object" && !Array.isArray(value)) }
function fieldType(field: LayoutField) { const type = String(field.type || "text").toLowerCase(); return SYSTEM_TYPES.includes(type) ? type : "text" }
function activeFields(layout: Layout | null) { return [...(layout?.fields || [])].filter((field) => field.isActive !== false).sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0)) }
function productToForm(product: Product): FormState { return { name: product.name || "", sku: product.sku || "", category: product.category || "", description: product.description || "", status: product.status || "active", price: String(product.price ?? 0), quantity: String(product.quantity ?? 0), lowStockLevel: String(product.lowStockLevel ?? 5) } }
function stringifyFieldValue(field: LayoutField, value: unknown) { const type = fieldType(field); if (value == null) return ""; if (type === "currency" && isRecord(value)) return String(value.amount ?? value.value ?? ""); if (type === "lookup" && isRecord(value)) return String(value.name ?? value.id ?? ""); if (type === "date") return String(value).slice(0, 10); if (typeof value === "object") return JSON.stringify(value); return String(value) }
function normalizeFieldValue(field: LayoutField, value: unknown, currency: string) {
  const type = fieldType(field)
  if (type === "images") return Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : []
  if (type === "attachment") return Array.isArray(value) ? value.filter(isRecord).map((item) => ({ name: cleanFileName(String(item.name || ""), String(item.url || "attachment")), url: String(item.url || "").trim() })).filter((item) => item.url) : []
  if (value == null || (typeof value === "string" && value.trim() === "")) return undefined
  if (type === "number") return Math.trunc(numberValue(value))
  if (type === "decimal") return numberValue(value)
  if (type === "currency") return { amount: numberValue(value), currency }
  if (type === "lookup") { const text = String(value).trim(); return text ? { id: text, name: text } : undefined }
  if (type === "boolean") return value === true || value === "true"
  return String(value).trim()
}

async function uploadAsset(file: File, type: "images" | "attachment") {
  const body = new FormData()
  body.append("file", file)
  return apiFetch<AssetResponse>(type === "images" ? "/api/products/asset-image" : "/api/products/asset-attachment", { method: "POST", body })
}

export function ProductLayoutForm({ productId, layout }: { productId?: string; layout: Layout | null }) {
  const router = useRouter()
  const editing = Boolean(productId)
  const [form, setForm] = React.useState<FormState>(emptyForm)
  const [baseCurrency, setBaseCurrency] = React.useState("ZAR")
  const [productImages, setProductImages] = React.useState<string[]>([])
  const [customValues, setCustomValues] = React.useState<Record<string, unknown>>({})
  const [loading, setLoading] = React.useState(Boolean(productId))
  const [saving, setSaving] = React.useState(false)
  const [uploadingKey, setUploadingKey] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const fields = React.useMemo(() => activeFields(layout), [layout])

  React.useEffect(() => {
    let active = true
    async function load() {
      setLoading(Boolean(productId))
      setError(null)
      try {
        const [org, product] = await Promise.all([
          apiFetch<Organization>("/api/organization").catch(() => null),
          productId ? apiFetch<Product>(`/api/products/${productId}`) : Promise.resolve(null),
        ])
        if (!active) return
        const currency = normalizeCurrency(org?.baseCurrency || product?.priceCurrency || "ZAR")
        setBaseCurrency(currency)
        if (product) {
          setForm(productToForm(product))
          setProductImages(product.images || [])
          const stored = product.metadata?.customFields || {}
          const nextValues: Record<string, unknown> = {}
          for (const field of fields) nextValues[field.key] = fieldType(field) === "images" || fieldType(field) === "attachment" ? stored[field.key] || [] : stringifyFieldValue(field, stored[field.key])
          setCustomValues(nextValues)
        } else {
          const nextValues: Record<string, unknown> = {}
          for (const field of fields) nextValues[field.key] = fieldType(field) === "images" || fieldType(field) === "attachment" ? [] : ""
          setCustomValues(nextValues)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not load product form"
        setError(message)
        toast.error("Product form could not load", { description: message })
      } finally { if (active) setLoading(false) }
    }
    void load()
    return () => { active = false }
  }, [productId, fields])

  function updateForm(key: keyof FormState, value: string) { setForm((current) => ({ ...current, [key]: value })) }
  function updateCustom(key: string, value: unknown) { setCustomValues((current) => ({ ...current, [key]: value })) }

  async function uploadProductImages(files: FileList | null) {
    if (!files?.length) return
    setUploadingKey("product-images")
    try {
      const urls: string[] = []
      for (const file of Array.from(files)) urls.push((await uploadAsset(file, "images")).url)
      setProductImages((current) => [...current, ...urls.filter(Boolean)])
      toast.success("Images uploaded")
    } catch (err) { toast.error("Upload failed", { description: err instanceof Error ? err.message : "Could not upload image" }) }
    finally { setUploadingKey(null) }
  }

  async function uploadLayoutFiles(field: LayoutField, files: FileList | null) {
    if (!files?.length) return
    const type = fieldType(field) === "images" ? "images" : "attachment"
    setUploadingKey(field.key)
    try {
      const uploaded: unknown[] = []
      for (const file of Array.from(files)) {
        const asset = await uploadAsset(file, type)
        if (!asset.url) continue
        uploaded.push(type === "images" ? asset.url : { name: cleanFileName(asset.name, file.name), url: asset.url })
      }
      const current = Array.isArray(customValues[field.key]) ? customValues[field.key] as unknown[] : []
      updateCustom(field.key, [...current, ...uploaded])
      toast.success(type === "images" ? "Images uploaded" : "Files uploaded")
    } catch (err) { toast.error("Upload failed", { description: err instanceof Error ? err.message : "Could not upload file" }) }
    finally { setUploadingKey(null) }
  }

  function removeLayoutAsset(field: LayoutField, index: number) {
    const current = Array.isArray(customValues[field.key]) ? customValues[field.key] as unknown[] : []
    updateCustom(field.key, current.filter((_, itemIndex) => itemIndex !== index))
  }

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!layout) return setError("Choose a layout before saving.")
    if (!form.name.trim()) return setError("Product name is required.")
    const customFields: Record<string, unknown> = {}
    for (const field of fields) {
      const value = normalizeFieldValue(field, customValues[field.key], baseCurrency)
      const empty = value === undefined || value === null || (Array.isArray(value) && value.length === 0)
      if (field.required && empty) return setError(`${field.label || field.key} is required.`)
      if (!empty) customFields[field.key] = value
    }
    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim() || undefined,
      category: form.category.trim() || undefined,
      description: form.description.trim() || undefined,
      status: form.status,
      price: numberValue(form.price),
      priceCurrency: baseCurrency,
      lowStockLevel: Math.trunc(numberValue(form.lowStockLevel)),
      images: productImages,
      productTypeId: layout.id,
      kind: layout.kind || "physical",
      trackInventory: layout.trackInventory !== false,
      customFields,
      metadata: { productTypeId: layout.id, productTypeName: layout.name, kind: layout.kind || "physical", trackInventory: layout.trackInventory !== false, customFields },
      ...(editing ? {} : { quantity: Math.trunc(numberValue(form.quantity)) }),
    }
    setSaving(true)
    try {
      const saved = editing && productId ? await apiFetch<Product>(`/api/products/${productId}`, { method: "PATCH", body: JSON.stringify(payload) }) : await apiFetch<Product>("/api/products", { method: "POST", body: JSON.stringify(payload) })
      toast.success(editing ? "Product updated" : "Product created", { description: saved.name || form.name })
      router.push(`/products/${saved.id}`)
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save product"
      setError(message)
      toast.error("Product could not save", { description: message })
    } finally { setSaving(false) }
  }

  if (loading) return <div className="p-4 md:p-6"><Card><CardContent className="p-6 text-sm text-muted-foreground">Loading product form...</CardContent></Card></div>

  return (
    <form onSubmit={saveProduct} className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm text-muted-foreground">Products</p><h1 className="font-heading text-2xl font-semibold tracking-tight">{editing ? "Edit product" : "Create product"}</h1><p className="mt-1 text-sm text-muted-foreground">Layout fields are saved inside the selected layout metadata.</p></div>
        <Button asChild variant="outline" size="sm"><Link href={editing && productId ? `/products/${productId}` : "/products"}><ArrowLeftIcon className="size-4" />Back</Link></Button>
      </div>

      {error ? <Card className="border-destructive/30 bg-destructive/5"><CardContent className="flex gap-2 p-4 text-sm text-destructive"><AlertCircleIcon className="size-4" />{error}</CardContent></Card> : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <main className="grid gap-4">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><PackagePlusIcon className="size-4" />Basic product details</CardTitle><CardDescription>Core fields stored on every product.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><Field label="Product name" required><Input value={form.name} onChange={(event) => updateForm("name", event.target.value)} /></Field><Field label="SKU"><Input value={form.sku} onChange={(event) => updateForm("sku", event.target.value)} placeholder="Leave blank to auto-generate" /></Field><Field label="Category"><Input value={form.category} onChange={(event) => updateForm("category", event.target.value)} /></Field><Field label="Status"><Select value={form.status} onValueChange={(value) => updateForm("status", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent></Select></Field><div className="md:col-span-2"><Field label="Description"><Textarea value={form.description} onChange={(event) => updateForm("description", event.target.value)} className="min-h-28" /></Field></div></CardContent></Card>

          <Card><CardHeader><CardTitle>Selling price and stock</CardTitle><CardDescription>Selling currency follows the organization base currency.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><MoneyInputField label="Selling price" required currency={baseCurrency} value={form.price} onChange={(event) => updateForm("price", event.target.value)} min="0" step="0.01" />{editing ? <ReadOnly label="Current stock" value="Use Adjust stock on product detail" /> : <Field label="Initial quantity" required><Input type="number" min="0" value={form.quantity} onChange={(event) => updateForm("quantity", event.target.value)} /></Field>}<Field label="Low-stock alert" required><Input type="number" min="0" value={form.lowStockLevel} onChange={(event) => updateForm("lowStockLevel", event.target.value)} /></Field></CardContent></Card>

          <Card><CardHeader><CardTitle className="flex items-center gap-2"><ImageIcon className="size-4" />Product images</CardTitle><CardDescription>These are the main product gallery images.</CardDescription></CardHeader><CardContent className="grid gap-4"><label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 p-6 text-center hover:bg-muted/40"><UploadCloudIcon className="mb-2 size-6" /><span className="text-sm font-medium">{uploadingKey === "product-images" ? "Uploading..." : "Upload product images"}</span><Input type="file" accept="image/*" multiple className="hidden" disabled={Boolean(uploadingKey)} onChange={(event) => void uploadProductImages(event.target.files)} /></label>{productImages.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{productImages.map((image, index) => <div key={`${image}-${index}`} className="relative overflow-hidden rounded-xl border"><img src={image} alt={`Product image ${index + 1}`} className="h-40 w-full object-cover" /><Button type="button" size="icon" variant="secondary" className="absolute right-2 top-2 size-8" onClick={() => setProductImages((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2Icon className="size-4" /></Button></div>)}</div> : null}</CardContent></Card>

          <Card><CardHeader><CardTitle>{layout?.name || "Layout"} fields</CardTitle><CardDescription>Fields belong to the selected layout and values save under product metadata.</CardDescription></CardHeader><CardContent>{fields.length ? <div className="grid gap-4 md:grid-cols-2">{fields.map((field) => <LayoutFieldInput key={field.key} field={field} value={customValues[field.key]} currency={baseCurrency} uploading={uploadingKey === field.key} onChange={(value) => updateCustom(field.key, value)} onUpload={(files) => void uploadLayoutFiles(field, files)} onRemove={(index) => removeLayoutAsset(field, index)} />)}</div> : <EmptyState title="No layout fields" description="Add fields in Settings > Layout." />}</CardContent></Card>

          <div className="flex justify-end"><ButtonGroup><ButtonGroupItem><Button type="button" variant="outline" onClick={() => router.push(editing && productId ? `/products/${productId}` : "/products")} disabled={saving}>Cancel</Button></ButtonGroupItem><ButtonGroupItem><Button type="submit" disabled={saving || Boolean(uploadingKey)}>{saving ? <Loader2Icon className="size-4 animate-spin" /> : editing ? <SaveIcon className="size-4" /> : <PackagePlusIcon className="size-4" />}{saving ? "Saving..." : editing ? "Update product" : "Create product"}</Button></ButtonGroupItem></ButtonGroup></div>
        </main>
        <aside className="grid gap-4 self-start xl:sticky xl:top-20"><Card><CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2Icon className="size-4" />Summary</CardTitle></CardHeader><CardContent className="grid gap-3 text-sm"><Side label="Layout" value={layout?.name || "Not selected"} /><Side label="Kind" value={layout?.kind || "physical"} /><Side label="Inventory" value={layout?.trackInventory === false ? "Not tracked" : "Tracked"} /><Side label="Currency" value={baseCurrency} /><Side label="Fields" value={String(fields.length)} /><Side label="Images" value={String(productImages.length)} /></CardContent></Card></aside>
      </div>
    </form>
  )
}

function LayoutFieldInput({ field, value, currency, uploading, onChange, onUpload, onRemove }: { field: LayoutField; value: unknown; currency: string; uploading: boolean; onChange: (value: unknown) => void; onUpload: (files: FileList | null) => void; onRemove: (index: number) => void }) {
  const type = fieldType(field)
  const label = field.label || field.key
  if (type === "richtext") return <div className="md:col-span-2"><Field label={label} required={Boolean(field.required)}><Textarea value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} className="min-h-32" /></Field></div>
  if (type === "number") return <Field label={label} required={Boolean(field.required)}><Input type="number" step="1" value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} /></Field>
  if (type === "decimal") return <Field label={label} required={Boolean(field.required)}><Input type="number" step="0.01" value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} /></Field>
  if (type === "currency") return <MoneyInputField label={label} required={Boolean(field.required)} currency={currency} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} min="0" step="0.01" />
  if (type === "boolean") return <Field label={label} required={Boolean(field.required)}><div className="flex h-9 items-center gap-3 rounded-md border px-3"><Switch checked={value === true || value === "true"} onCheckedChange={(checked) => onChange(checked ? "true" : "false")} /><span className="text-sm text-muted-foreground">{value === true || value === "true" ? "Yes" : "No"}</span></div></Field>
  if (type === "select") return <Field label={label} required={Boolean(field.required)}><Select value={String(value || "")} onValueChange={onChange}><SelectTrigger><SelectValue placeholder="Choose option" /></SelectTrigger><SelectContent>{(field.options || []).map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></Field>
  if (type === "date") return <Field label={label} required={Boolean(field.required)}><Input type="date" value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} /></Field>
  if (type === "lookup") return <Field label={label} required={Boolean(field.required)}><Input value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} placeholder="Search/select will be added next" /></Field>
  if (type === "images" || type === "attachment") return <div className="md:col-span-2"><AssetField label={label} required={Boolean(field.required)} type={type} value={Array.isArray(value) ? value : []} uploading={uploading} onUpload={onUpload} onRemove={onRemove} /></div>
  return <Field label={label} required={Boolean(field.required)}><Input value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} /></Field>
}

function AssetField({ label, required, type, value, uploading, onUpload, onRemove }: { label: string; required?: boolean; type: "images" | "attachment"; value: unknown[]; uploading: boolean; onUpload: (files: FileList | null) => void; onRemove: (index: number) => void }) {
  return <Field label={label} required={required}><div className="grid gap-3"><label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 p-5 text-center hover:bg-muted/40"><UploadCloudIcon className="mb-2 size-5" /><span className="text-sm font-medium">{uploading ? "Uploading..." : type === "images" ? "Upload images" : "Upload attachments"}</span><span className="mt-1 text-xs text-muted-foreground">{type === "images" ? "Saved as [imageUrls]" : "Saved as [{ name, url }]"}</span><Input type="file" className="hidden" accept={type === "images" ? "image/*" : undefined} multiple disabled={uploading} onChange={(event) => onUpload(event.target.files)} /></label>{value.length ? <div className="grid gap-2">{value.map((item, index) => <div key={index} className="flex items-center justify-between gap-3 rounded-lg border bg-background p-2 text-sm"><div className="min-w-0 flex items-center gap-2">{type === "images" ? <img src={String(item)} alt="Uploaded image" className="size-10 rounded-md object-cover" /> : null}<span className="truncate font-medium">{type === "images" ? String(item) : isRecord(item) ? String(item.name || item.url) : String(item)}</span></div><Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => onRemove(index)}><Trash2Icon className="size-4" /></Button></div>)}</div> : null}</div></Field>
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) { return <div className="grid gap-2"><Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}{required ? <span className="ml-1 text-destructive">*</span> : null}</Label>{children}</div> }
function ReadOnly({ label, value }: { label: string; value: string }) { return <div className="grid gap-2"><Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</Label><Input value={value} readOnly disabled className="opacity-100" /></div> }
function Side({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div> }
function EmptyState({ title, description }: { title: string; description: string }) { return <div className="rounded-xl border border-dashed bg-muted/10 p-8 text-center"><p className="font-medium">{title}</p><p className="mt-1 text-sm text-muted-foreground">{description}</p></div> }
