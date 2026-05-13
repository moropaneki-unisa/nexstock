"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  CircleDollarSignIcon,
  DatabaseZapIcon,
  ImageIcon,
  Loader2Icon,
  PackagePlusIcon,
  PlusIcon,
  SaveIcon,
  StarIcon,
  Trash2Icon,
  TruckIcon,
  UploadCloudIcon,
  WarehouseIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

type Product = {
  id: string
  name: string
  sku?: string | null
  category?: string | null
  description?: string | null
  status?: string | null
  quantity?: number | string | null
  lowStockLevel?: number | string | null
  price?: number | string | null
  priceCurrency?: string | null
  cost?: number | string | null
  costPrice?: number | string | null
  costCurrency?: string | null
  convertedCost?: number | string | null
  currency?: string | null
  images?: string[] | null
  customFieldValues?: Array<{ fieldId: string; value: unknown }> | null
}

type Organization = {
  baseCurrency?: string | null
  exchangeRates?: Array<{ code: string; rateToBase: number }> | null
}

type Supplier = {
  id: string
  supplierCode?: string | null
  name: string
  currency?: string | null
  leadTimeDays?: number | null
  minimumOrderQty?: number | null
  status?: string | null
}

type ProductField = {
  id: string
  label?: string | null
  name?: string | null
  key?: string | null
  type?: string | null
  required?: boolean | null
  isActive?: boolean | null
  order?: number | null
  options?: string[] | null
}

type ProductSupplierLink = {
  id: string
  supplierId: string
  supplierSku?: string | null
  cost?: string | number | null
  currency?: string | null
  minimumOrderQty?: number | null
  leadTimeDays?: number | null
  isPreferred?: boolean | null
  notes?: string | null
  supplier?: Supplier | null
}

type SupplierRow = {
  rowId: string
  linkId?: string
  supplierId: string
  supplierSku: string
  cost: string
  currency: string
  minimumOrderQty: string
  leadTimeDays: string
  isPreferred: boolean
  notes: string
}

type ProductFormState = {
  name: string
  sku: string
  category: string
  description: string
  status: string
  quantity: string
  lowStockLevel: string
  price: string
}

const emptyForm: ProductFormState = {
  name: "",
  sku: "",
  category: "",
  description: "",
  status: "active",
  quantity: "0",
  lowStockLevel: "5",
  price: "0",
}

function rowId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `row-${Date.now()}-${Math.random()}`
}

function normalizeCurrency(value?: string | null, fallback = "USD") {
  const next = String(value || fallback).trim().toUpperCase()
  return next || fallback
}

function numberValue(value: unknown) {
  const next = Number(value ?? 0)
  return Number.isFinite(next) ? next : 0
}

function formatMoney(value: unknown, currency = "USD") {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: normalizeCurrency(currency),
    maximumFractionDigits: 2,
  }).format(numberValue(value))
}

function calculateMargin(price: number, cost?: number) {
  if (!price || !cost) return "-"
  return `${Math.round(((price - cost) / price) * 100)}%`
}

function rateFor(code: string, baseCurrency: string, rates: Array<{ code: string; rateToBase: number }>) {
  const normalized = normalizeCurrency(code, baseCurrency)
  if (normalized === baseCurrency) return 1
  return rates.find((item) => normalizeCurrency(item.code) === normalized)?.rateToBase ?? 1
}

function emptySupplier(currency: string): SupplierRow {
  return {
    rowId: rowId(),
    supplierId: "",
    supplierSku: "",
    cost: "",
    currency,
    minimumOrderQty: "",
    leadTimeDays: "",
    isPreferred: false,
    notes: "",
  }
}

function productToForm(product: Product): ProductFormState {
  return {
    name: product.name || "",
    sku: product.sku || "",
    category: product.category || "",
    description: product.description || "",
    status: product.status || "active",
    quantity: String(product.quantity ?? 0),
    lowStockLevel: String(product.lowStockLevel ?? 5),
    price: String(product.price ?? 0),
  }
}

function normalizeFields(value: unknown): ProductField[] {
  if (Array.isArray(value)) return value as ProductField[]
  if (value && typeof value === "object") {
    const maybe = value as { items?: ProductField[]; data?: ProductField[] }
    return maybe.items ?? maybe.data ?? []
  }
  return []
}

function normalizeSuppliers(value: unknown): Supplier[] {
  if (Array.isArray(value)) return value as Supplier[]
  if (value && typeof value === "object") {
    const maybe = value as { items?: Supplier[]; data?: Supplier[] }
    return maybe.items ?? maybe.data ?? []
  }
  return []
}

function parseFieldValue(field: ProductField, raw?: string) {
  if (raw === undefined || raw === null || String(raw).trim() === "") return undefined
  if (field.type === "number") {
    const value = Number(raw)
    return Number.isNaN(value) ? undefined : value
  }
  if (field.type === "boolean") return raw === "true"
  if (field.type === "json") {
    try {
      return JSON.parse(raw)
    } catch {
      return raw
    }
  }
  return raw
}

function hasDuplicateSupplier(rows: SupplierRow[]) {
  const ids = rows.map((row) => row.supplierId).filter(Boolean)
  return new Set(ids).size !== ids.length
}

export function ProductFormContent({ productId }: { productId?: string }) {
  const router = useRouter()
  const editing = Boolean(productId)
  const [product, setProduct] = React.useState<Product | null>(null)
  const [form, setForm] = React.useState<ProductFormState>(emptyForm)
  const [baseCurrency, setBaseCurrency] = React.useState("USD")
  const [exchangeRates, setExchangeRates] = React.useState<Array<{ code: string; rateToBase: number }>>([])
  const [fields, setFields] = React.useState<ProductField[]>([])
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([])
  const [supplierRows, setSupplierRows] = React.useState<SupplierRow[]>([])
  const [removedLinkIds, setRemovedLinkIds] = React.useState<string[]>([])
  const [images, setImages] = React.useState<string[]>([])
  const [imageUrl, setImageUrl] = React.useState("")
  const [customValues, setCustomValues] = React.useState<Record<string, string>>({})
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [productResult, orgResult, fieldResult, supplierResult, linkResult] = await Promise.all([
          productId ? apiFetch<Product>(`/api/products/${productId}`) : Promise.resolve(null),
          apiFetch<Organization>("/api/organization").catch(() => null),
          apiFetch<unknown>("/api/product-fields").catch(() => apiFetch<unknown>("/api/products/fields").catch(() => [])),
          apiFetch<unknown>("/api/suppliers").catch(() => []),
          productId ? apiFetch<ProductSupplierLink[]>(`/api/products/${productId}/suppliers`).catch(() => []) : Promise.resolve([]),
        ])

        if (!active) return

        const nextBaseCurrency = normalizeCurrency(orgResult?.baseCurrency || productResult?.currency || productResult?.priceCurrency || "USD")
        setBaseCurrency(nextBaseCurrency)
        setExchangeRates(orgResult?.exchangeRates ?? [])

        const nextFields = normalizeFields(fieldResult)
          .filter((field) => field.isActive !== false)
          .sort((a, b) => numberValue(a.order) - numberValue(b.order))
        setFields(nextFields)

        const nextSuppliers = normalizeSuppliers(supplierResult).filter((supplier) => supplier.status !== "archived")
        setSuppliers(nextSuppliers)

        if (productResult) {
          setProduct(productResult)
          setForm(productToForm(productResult))
          setImages(productResult.images ?? [])
          const values: Record<string, string> = {}
          for (const item of productResult.customFieldValues ?? []) {
            values[item.fieldId] = typeof item.value === "object" ? JSON.stringify(item.value, null, 2) : String(item.value ?? "")
          }
          setCustomValues(values)
        }

        const links = Array.isArray(linkResult) ? linkResult : []
        setSupplierRows(
          links.map((link) => ({
            rowId: link.id,
            linkId: link.id,
            supplierId: link.supplierId,
            supplierSku: link.supplierSku ?? "",
            cost: link.cost == null ? "" : String(link.cost),
            currency: normalizeCurrency(link.supplier?.currency || link.currency || nextBaseCurrency),
            minimumOrderQty: link.minimumOrderQty == null ? "" : String(link.minimumOrderQty),
            leadTimeDays: link.leadTimeDays == null ? "" : String(link.leadTimeDays),
            isPreferred: Boolean(link.isPreferred),
            notes: link.notes ?? "",
          }))
        )
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not load product form"
        setError(message)
        toast.error("Product form could not load", { description: message })
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [productId])

  const price = numberValue(form.price)
  const linkedRows = supplierRows.filter((row) => row.supplierId)
  const preferredRow = supplierRows.find((row) => row.isPreferred && row.supplierId) ?? linkedRows[0]
  const preferredSupplier = preferredRow ? suppliers.find((supplier) => supplier.id === preferredRow.supplierId) : undefined
  const preferredCost = preferredRow?.cost === "" || !preferredRow ? undefined : numberValue(preferredRow.cost)
  const costCurrency = preferredRow?.supplierId ? preferredRow.currency : undefined
  const exchangeRateToBase = costCurrency ? rateFor(costCurrency, baseCurrency, exchangeRates) : undefined
  const convertedCost = preferredCost === undefined || exchangeRateToBase === undefined ? undefined : Number((preferredCost * exchangeRateToBase).toFixed(2))
  const margin = calculateMargin(price, convertedCost)

  function updateField(key: keyof ProductFormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function addSupplierRow() {
    setSupplierRows((current) => [...current, { ...emptySupplier(baseCurrency), isPreferred: current.length === 0 }])
  }

  function updateSupplierRow(rowId: string, patch: Partial<SupplierRow>) {
    setSupplierRows((current) => current.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row)))
  }

  function selectSupplier(rowId: string, supplierId: string) {
    const supplier = suppliers.find((item) => item.id === supplierId)
    setSupplierRows((current) =>
      current.map((row) =>
        row.rowId === rowId
          ? {
              ...row,
              supplierId,
              currency: normalizeCurrency(supplier?.currency || baseCurrency),
              minimumOrderQty: row.minimumOrderQty || (supplier?.minimumOrderQty == null ? "" : String(supplier.minimumOrderQty)),
              leadTimeDays: row.leadTimeDays || (supplier?.leadTimeDays == null ? "" : String(supplier.leadTimeDays)),
            }
          : row
      )
    )
  }

  function makePreferred(rowId: string) {
    setSupplierRows((current) => current.map((row) => ({ ...row, isPreferred: row.rowId === rowId })))
  }

  function removeSupplierRow(rowId: string) {
    setSupplierRows((current) => {
      const row = current.find((item) => item.rowId === rowId)
      if (row?.linkId) setRemovedLinkIds((ids) => [...ids, row.linkId!])
      const remaining = current.filter((item) => item.rowId !== rowId)
      if (row?.isPreferred && remaining.length) remaining[0] = { ...remaining[0], isPreferred: true }
      return remaining
    })
  }

  async function uploadImage(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    setError(null)
    try {
      const uploaded: string[] = []
      for (const file of Array.from(files)) {
        const body = new FormData()
        body.append("file", file)
        const result = await apiFetch<{ url: string }>("/api/products/images", { method: "POST", body })
        uploaded.push(result.url)
      }
      setImages((current) => [...current, ...uploaded])
      toast.success("Images uploaded", { description: `${uploaded.length} image${uploaded.length === 1 ? "" : "s"} added.` })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to upload image"
      setError(message)
      toast.error("Image upload failed", { description: message })
    } finally {
      setUploading(false)
    }
  }

  function addImageUrl() {
    const url = imageUrl.trim()
    if (!url) return
    try {
      new URL(url)
    } catch {
      setError("Enter a valid image URL")
      return
    }
    setImages((current) => [...current, url])
    setImageUrl("")
  }

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!form.name.trim()) return setError("Product name is required.")
    if (hasDuplicateSupplier(supplierRows)) return setError("Each supplier can only be linked to this product once.")
    if (!Number.isFinite(price) || price < 0) return setError("Selling price must be zero or more.")
    if (!editing && numberValue(form.quantity) < 0) return setError("Initial quantity cannot be below zero.")

    const missingField = fields.find((field) => field.required && !String(customValues[field.id] ?? "").trim())
    if (missingField) return setError(`Product attribute "${missingField.label || missingField.name || missingField.key}" is required.`)

    const customFieldValues = fields
      .map((field) => {
        const value = parseFieldValue(field, customValues[field.id])
        return value === undefined ? null : { fieldId: field.id, value }
      })
      .filter(Boolean)

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim() || undefined,
      category: form.category.trim() || undefined,
      description: form.description.trim() || undefined,
      status: form.status,
      price,
      priceCurrency: baseCurrency,
      cost: preferredCost,
      costCurrency,
      exchangeRateToBase,
      convertedCost,
      lowStockLevel: numberValue(form.lowStockLevel),
      images,
      customFieldValues,
      ...(editing ? {} : { quantity: numberValue(form.quantity) }),
    }

    setSaving(true)
    try {
      const saved = editing && productId
        ? await apiFetch<Product>(`/api/products/${productId}`, { method: "PATCH", body: JSON.stringify(payload) })
        : await apiFetch<Product>("/api/products", { method: "POST", body: JSON.stringify(payload) })

      await saveProductSuppliers(saved.id)
      toast.success(editing ? "Product updated" : "Product created", { description: saved.name || form.name })
      router.push(`/products/${saved.id}`)
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save product"
      setError(message)
      toast.error("Product could not save", { description: message })
    } finally {
      setSaving(false)
    }
  }

  async function saveProductSuppliers(savedProductId: string) {
    for (const linkId of removedLinkIds) {
      await apiFetch(`/api/products/${savedProductId}/suppliers/${linkId}`, { method: "DELETE" })
    }

    const validRows = supplierRows.filter((row) => row.supplierId)
    const preferredId = validRows.find((row) => row.isPreferred)?.rowId ?? validRows[0]?.rowId

    for (const row of validRows) {
      const payload = {
        supplierId: row.supplierId,
        supplierSku: row.supplierSku.trim() || undefined,
        cost: row.cost === "" ? undefined : numberValue(row.cost),
        currency: row.currency,
        minimumOrderQty: row.minimumOrderQty === "" ? undefined : numberValue(row.minimumOrderQty),
        leadTimeDays: row.leadTimeDays === "" ? undefined : numberValue(row.leadTimeDays),
        isPreferred: row.rowId === preferredId,
        notes: row.notes.trim() || undefined,
      }

      if (row.linkId) await apiFetch(`/api/products/${savedProductId}/suppliers/${row.linkId}`, { method: "PATCH", body: JSON.stringify(payload) })
      else await apiFetch(`/api/products/${savedProductId}/suppliers`, { method: "POST", body: JSON.stringify(payload) })
    }
  }

  if (loading) {
    return (
      <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-[760px] rounded-xl" />
      </div>
    )
  }

  return (
    <form onSubmit={saveProduct} className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Products</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{editing ? "Edit product" : "Create product"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Supplier cost comes before selling price, so margin is calculated before save.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={editing && product ? `/products/${product.id}` : "/products"}>
              <ArrowLeftIcon className="size-4" />
              {editing ? "Back to product" : "Back to products"}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/products/fields">Product fields</Link>
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-start gap-2 p-4 text-sm text-destructive">
            <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <main className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><PackagePlusIcon className="size-4" />Basic product details</CardTitle>
              <CardDescription>Core identity used in catalog, imports, integrations, and search.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="grid gap-4">
                {editing && product?.sku ? <ReadOnly label="Generated SKU" value={product.sku} /> : null}
                <Field label="Product name" required>
                  <Input value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Example: Office chair" />
                </Field>
                <Field label="SKU">
                  <Input value={form.sku} onChange={(event) => updateField("sku", event.target.value)} placeholder="Leave blank to auto-generate" />
                </Field>
                <Field label="Category">
                  <Input value={form.category} onChange={(event) => updateField("category", event.target.value)} placeholder="Furniture, Parts, Raw materials..." />
                </Field>
                <Field label="Status">
                  <Select value={form.status} onValueChange={(value) => updateField("status", value)}>
                    <SelectTrigger><SelectValue placeholder="Choose status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Description">
                <Textarea value={form.description} onChange={(event) => updateField("description", event.target.value)} className="min-h-48" placeholder="Short useful description for team members, imports, and integrations." />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><TruckIcon className="size-4" />Supplier cost source</CardTitle>
                <CardDescription>Capture supplier cost before selling price. One preferred supplier becomes the official cost source.</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addSupplierRow}>
                <PlusIcon className="size-4" />Add supplier
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Metric label="Preferred supplier" value={preferredSupplier?.supplierCode || preferredSupplier?.name || "Not set"} />
                <Metric label="Supplier cost" value={preferredCost === undefined ? "Not set" : formatMoney(preferredCost, costCurrency || baseCurrency)} />
                <Metric label="Converted cost" value={convertedCost === undefined ? "Not set" : formatMoney(convertedCost, baseCurrency)} />
                <Metric label="Margin preview" value={margin} />
              </div>
              {supplierRows.length ? (
                <div className="grid gap-3">
                  {supplierRows.map((row) => (
                    <SupplierRowEditor
                      key={row.rowId}
                      row={row}
                      suppliers={suppliers}
                      baseCurrency={baseCurrency}
                      exchangeRates={exchangeRates}
                      price={price}
                      onSelectSupplier={selectSupplier}
                      onUpdate={updateSupplierRow}
                      onPreferred={makePreferred}
                      onRemove={removeSupplierRow}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState title="No suppliers linked" description="Add a supplier to capture cost price before setting the selling price." />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CircleDollarSignIcon className="size-4" />Selling price and stock</CardTitle>
              <CardDescription>Selling price inherits the organization base currency. Cost is inherited from the preferred supplier.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-4">
                <ReadOnly label="Preferred converted cost" value={convertedCost === undefined ? "Set supplier cost first" : formatMoney(convertedCost, baseCurrency)} />
                <Field label="Selling price" required>
                  <Input type="number" min="0" step="0.01" value={form.price} onChange={(event) => updateField("price", event.target.value)} />
                </Field>
                <ReadOnly label="Selling currency" value={`${baseCurrency} (base currency)`} />
              </div>
              <div className="grid gap-4">
                {editing ? <ReadOnly label="Current stock" value={`${numberValue(product?.quantity).toLocaleString()} units`} /> : (
                  <Field label="Initial quantity" required>
                    <Input type="number" min="0" value={form.quantity} onChange={(event) => updateField("quantity", event.target.value)} />
                  </Field>
                )}
                <Field label="Low-stock alert" required>
                  <Input type="number" min="0" value={form.lowStockLevel} onChange={(event) => updateField("lowStockLevel", event.target.value)} />
                </Field>
                <ReadOnly label="Margin" value={margin} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ImageIcon className="size-4" />Images</CardTitle>
              <CardDescription>First image is used as the primary display image.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 p-8 text-center transition hover:bg-muted/45">
                {uploading ? <Loader2Icon className="mb-3 size-8 animate-spin" /> : <UploadCloudIcon className="mb-3 size-8" />}
                <span className="text-sm font-medium">Upload product images</span>
                <span className="mt-1 text-xs text-muted-foreground">Use clear square images when possible.</span>
                <Input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={(event) => void uploadImage(event.target.files)} />
              </label>
              <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                <Input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://example.com/product.jpg" />
                <Button type="button" variant="outline" onClick={addImageUrl}>Add image URL</Button>
              </div>
              {images.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {images.map((image, index) => (
                    <div key={`${image}-${index}`} className="group relative overflow-hidden rounded-xl border bg-background">
                      <img src={image} alt={`Product image ${index + 1}`} className="h-44 w-full object-cover" />
                      <Badge className="absolute left-2 top-2 bg-background/90 text-foreground hover:bg-background/90">{index === 0 ? "Primary" : `Image ${index + 1}`}</Badge>
                      <Button type="button" size="icon" variant="secondary" className="absolute right-2 top-2 size-8" onClick={() => setImages((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                        <Trash2Icon className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : <EmptyState title="No images added" description="Upload files or paste an image URL." />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><DatabaseZapIcon className="size-4" />Product attributes</CardTitle>
              <CardDescription>Custom fields keep the system flexible without cluttering the core product fields.</CardDescription>
            </CardHeader>
            <CardContent>
              {fields.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {fields.map((field) => (
                    <Field key={field.id} label={field.label || field.name || field.key || "Field"} required={Boolean(field.required)}>
                      <AttributeInput field={field} value={customValues[field.id] ?? ""} onChange={(value) => setCustomValues((current) => ({ ...current, [field.id]: value }))} />
                    </Field>
                  ))}
                </div>
              ) : <EmptyState title="No custom attributes" description="Create product fields from the Product fields page when needed." />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CheckCircle2Icon className="size-4" />Review and save</CardTitle>
              <CardDescription>Confirm supplier cost, converted cost, selling price, and stock before saving.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-0 overflow-hidden rounded-xl border md:grid-cols-2">
              <div className="divide-y md:border-r">
                <Review label="Product name" value={form.name || "Missing"} />
                <Review label="Category" value={form.category || "Uncategorized"} />
                <Review label="Suppliers" value={`${linkedRows.length}`} />
                <Review label="Images" value={`${images.length}`} />
              </div>
              <div className="divide-y">
                <Review label="Preferred supplier" value={preferredSupplier ? `${preferredSupplier.supplierCode || ""} ${preferredSupplier.name}`.trim() : "Not set"} />
                <Review label="Converted cost" value={convertedCost === undefined ? "Not set" : formatMoney(convertedCost, baseCurrency)} />
                <Review label="Selling price" value={formatMoney(price, baseCurrency)} />
                <Review label="Margin" value={margin} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardFooter className="justify-between gap-3">
              <Button type="button" variant="outline" onClick={() => router.push(editing && product ? `/products/${product.id}` : "/products")} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || uploading}>
                {saving ? <Loader2Icon className="size-4 animate-spin" /> : editing ? <SaveIcon className="size-4" /> : <PackagePlusIcon className="size-4" />}
                {saving ? "Saving..." : editing ? "Update product" : "Create product"}
              </Button>
            </CardFooter>
          </Card>
        </main>

        <aside className="grid gap-4 self-start xl:sticky xl:top-20">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><WarehouseIcon className="size-4" />Cost summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <Side label="Preferred supplier" value={preferredSupplier?.supplierCode || preferredSupplier?.name || "Not set"} />
              <Side label="Cost currency" value={costCurrency || "Not set"} />
              <Side label={`Converted cost (${baseCurrency})`} value={convertedCost === undefined ? "-" : formatMoney(convertedCost, baseCurrency)} />
              <Side label="Selling currency" value={baseCurrency} />
              <Side label="Margin" value={margin} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CheckCircle2Icon className="size-4" />Readiness</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <Ready label="Basic details" ready={Boolean(form.name.trim())} />
              <Ready label="Supplier cost source" ready={!linkedRows.length || Boolean(preferredSupplier)} />
              <Ready label="Selling price" ready={price >= 0} />
              <Ready label="Inventory" ready={editing ? numberValue(form.lowStockLevel) >= 0 : numberValue(form.quantity) >= 0 && numberValue(form.lowStockLevel) >= 0} />
            </CardContent>
          </Card>
        </aside>
      </div>
    </form>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}{required ? <span className="ml-1 text-destructive">*</span> : null}</Label>
      {children}
    </div>
  )
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  )
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

function Side({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

function Ready({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0">
      <span className="flex items-center gap-2">
        {ready ? <CheckCircle2Icon className="size-4 text-emerald-600" /> : <AlertCircleIcon className="size-4 text-amber-600" />}
        {label}
      </span>
      <Badge variant={ready ? "default" : "secondary"}>{ready ? "Ready" : "Needed"}</Badge>
    </div>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-muted/10 p-8 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function SupplierRowEditor({
  row,
  suppliers,
  baseCurrency,
  exchangeRates,
  price,
  onSelectSupplier,
  onUpdate,
  onPreferred,
  onRemove,
}: {
  row: SupplierRow
  suppliers: Supplier[]
  baseCurrency: string
  exchangeRates: Array<{ code: string; rateToBase: number }>
  price: number
  onSelectSupplier: (rowId: string, supplierId: string) => void
  onUpdate: (rowId: string, patch: Partial<SupplierRow>) => void
  onPreferred: (rowId: string) => void
  onRemove: (rowId: string) => void
}) {
  const converted = row.cost === "" ? undefined : Number((numberValue(row.cost) * rateFor(row.currency, baseCurrency, exchangeRates)).toFixed(2))

  return (
    <Card size="sm">
      <CardContent className="grid gap-4 pt-0 lg:grid-cols-[1.1fr_0.8fr_0.65fr_0.55fr_0.5fr_0.85fr_auto] lg:items-end">
        <Field label="Supplier">
          <Select value={row.supplierId || "none"} onValueChange={(value) => onSelectSupplier(row.rowId, value === "none" ? "" : value)}>
            <SelectTrigger><SelectValue placeholder="Choose supplier" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Choose supplier</SelectItem>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>{supplier.supplierCode ? `${supplier.supplierCode} · ` : ""}{supplier.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Supplier SKU"><Input value={row.supplierSku} onChange={(event) => onUpdate(row.rowId, { supplierSku: event.target.value })} /></Field>
        <Field label="Cost"><Input type="number" min="0" step="0.01" value={row.cost} onChange={(event) => onUpdate(row.rowId, { cost: event.target.value })} /></Field>
        <Field label="Currency"><ReadOnly label="" value={row.supplierId ? row.currency : "-"} /></Field>
        <Field label="MOQ"><Input type="number" min="0" value={row.minimumOrderQty} onChange={(event) => onUpdate(row.rowId, { minimumOrderQty: event.target.value })} /></Field>
        <div className="grid gap-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Converted</p>
          <p className="text-sm font-medium">{converted === undefined ? "-" : formatMoney(converted, baseCurrency)}</p>
          <p className="text-xs text-muted-foreground">Margin {converted === undefined ? "-" : calculateMargin(price, converted)}</p>
        </div>
        <div className="flex gap-1">
          <Button type="button" size="icon" variant={row.isPreferred ? "default" : "outline"} onClick={() => onPreferred(row.rowId)} title="Mark preferred">
            <StarIcon className="size-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => onRemove(row.rowId)} title="Remove supplier">
            <Trash2Icon className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function AttributeInput({ field, value, onChange }: { field: ProductField; value: string; onChange: (value: string) => void }) {
  if (field.type === "select") {
    return (
      <Select value={value || "none"} onValueChange={(next) => onChange(next === "none" ? "" : next)}>
        <SelectTrigger><SelectValue placeholder={`Select ${(field.label || field.name || "field").toLowerCase()}`} /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Select {(field.label || field.name || "field").toLowerCase()}</SelectItem>
          {(field.options ?? []).map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
        </SelectContent>
      </Select>
    )
  }

  if (field.type === "boolean") {
    return (
      <Select value={value || "none"} onValueChange={(next) => onChange(next === "none" ? "" : next)}>
        <SelectTrigger><SelectValue placeholder="Select true or false" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Select true or false</SelectItem>
          <SelectItem value="true">True</SelectItem>
          <SelectItem value="false">False</SelectItem>
        </SelectContent>
      </Select>
    )
  }

  if (field.type === "json") return <Textarea value={value} onChange={(event) => onChange(event.target.value)} className="min-h-24 font-mono" />

  return <Input type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"} value={value} onChange={(event) => onChange(event.target.value)} />
}
