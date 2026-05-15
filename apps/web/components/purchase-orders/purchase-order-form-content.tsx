"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircleIcon, ArrowLeftIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { ModuleFormActions } from "@/components/core/module-form-actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiFetch } from "@/lib/api"
import { getCachedSuppliers } from "@/lib/cached-api"
import { formatMoney, normalizeCurrencyCode, numberValue } from "@/lib/money"

type Supplier = { id: string; supplierCode: string; name: string; currency?: string | null; status?: string | null }
type Product = { id: string; name: string; sku?: string | null; cost?: string | number | null; costPrice?: string | number | null; price?: string | number | null }
type SupplierLink = { id: string; productId: string; supplierSku?: string | null; cost?: string | number | null; currency?: string | null; product?: Product | null }
type Status = "draft" | "ordered" | "partially_received" | "received" | "cancelled"
type OrderLine = { productId: string; productSupplierId?: string | null; supplierSku?: string | null; description?: string | null; quantityOrdered: number; unitCost: string | number; product?: Product | null }
type Order = { id: string; poNumber: string; supplierId: string; status: Status; expectedAt?: string | null; notes?: string | null; lines?: OrderLine[] }
type Page<T> = { items?: T[]; data?: T[] }
type Line = { productId: string; productSupplierId: string; supplierSku: string; description: string; quantityOrdered: string; unitCost: string }
type Form = { supplierId: string; status: Status; expectedAt: string; notes: string; lines: Line[] }

const blankLine: Line = { productId: "", productSupplierId: "", supplierSku: "", description: "", quantityOrdered: "1", unitCost: "0" }
const statuses: Status[] = ["draft", "ordered", "partially_received", "received", "cancelled"]
const asList = <T,>(value: T[] | Page<T> | null | undefined) => !value ? [] : Array.isArray(value) ? value : value.items ?? value.data ?? []
const currencyCode = (value?: string | null) => normalizeCurrencyCode(value, "ZAR")
const dateInput = (value?: string | null) => { if (!value) return ""; const date = new Date(value); return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10) }
const clean = (value: string) => value.trim() || undefined
const titleCase = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
const productLabel = (product?: Product | null) => !product ? "Unknown product" : product.sku ? `${product.sku} · ${product.name}` : product.name

export function PurchaseOrderFormContent({ purchaseOrderId }: { purchaseOrderId?: string }) {
  const router = useRouter()
  const editing = Boolean(purchaseOrderId)
  const [form, setForm] = React.useState<Form>({ supplierId: "", status: "draft", expectedAt: "", notes: "", lines: [{ ...blankLine }] })
  const [order, setOrder] = React.useState<Order | null>(null)
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([])
  const [products, setProducts] = React.useState<Product[]>([])
  const [links, setLinks] = React.useState<SupplierLink[]>([])
  const [loading, setLoading] = React.useState(true)
  const [linksLoading, setLinksLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const selectedSupplier = suppliers.find((supplier) => supplier.id === form.supplierId)
  const currency = currencyCode(selectedSupplier?.currency || links[0]?.currency)
  const subtotal = form.lines.reduce((sum, line) => sum + numberValue(line.quantityOrdered) * numberValue(line.unitCost), 0)
  const productOptions = links.length ? links.map((link) => link.product).filter(Boolean) as Product[] : products

  React.useEffect(() => { void loadForm() }, [purchaseOrderId])

  async function loadForm() {
    setLoading(true)
    setError(null)
    try {
      const [supplierResult, productResult, existing] = await Promise.all([
        getCachedSuppliers<Supplier[] | Page<Supplier>>().catch(() => apiFetch<Supplier[]>("/api/suppliers")),
        apiFetch<Product[] | Page<Product>>("/api/products?limit=100"),
        purchaseOrderId ? apiFetch<Order>(`/api/purchase-orders/${purchaseOrderId}`) : Promise.resolve(null),
      ])
      const activeSuppliers = asList(supplierResult).filter((supplier) => supplier.status !== "archived")
      setSuppliers(activeSuppliers)
      setProducts(asList(productResult))
      if (existing) {
        setOrder(existing)
        setForm({
          supplierId: existing.supplierId,
          status: existing.status,
          expectedAt: dateInput(existing.expectedAt),
          notes: existing.notes || "",
          lines: existing.lines?.length ? existing.lines.map((line) => ({
            productId: line.productId,
            productSupplierId: line.productSupplierId || "",
            supplierSku: line.supplierSku || "",
            description: line.description || line.product?.name || "",
            quantityOrdered: String(line.quantityOrdered || 1),
            unitCost: String(line.unitCost ?? 0),
          })) : [{ ...blankLine }],
        })
      } else {
        setForm((current) => ({ ...current, supplierId: activeSuppliers[0]?.id || "" }))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Purchase order form could not load"
      setError(message)
      toast.error("Purchase order form could not load", { description: message })
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    let active = true
    async function loadLinks() {
      if (!form.supplierId) { setLinks([]); return }
      setLinksLoading(true)
      try {
        const result = await apiFetch<SupplierLink[]>(`/api/suppliers/${form.supplierId}/products`).catch(() => [])
        if (active) setLinks(result)
      } finally {
        if (active) setLinksLoading(false)
      }
    }
    if (!loading && !editing) void loadLinks()
    return () => { active = false }
  }, [form.supplierId, loading, editing])

  function cancelPath() { return editing && order ? `/purchase-orders/${order.id}` : "/purchase-orders" }
  function updateLine(index: number, patch: Partial<Line>) { setForm((current) => ({ ...current, lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line) })) }
  function addLine() { setForm((current) => ({ ...current, lines: [...current.lines, { ...blankLine }] })) }
  function removeLine(index: number) { setForm((current) => ({ ...current, lines: current.lines.length === 1 ? current.lines : current.lines.filter((_, lineIndex) => lineIndex !== index) })) }
  function changeSupplier(supplierId: string) { setForm((current) => ({ ...current, supplierId, lines: current.lines.map((line) => ({ ...line, productId: "", productSupplierId: "", supplierSku: "", unitCost: "0" })) })) }
  function selectProduct(index: number, productId: string) {
    const link = links.find((item) => item.productId === productId)
    const product = link?.product || products.find((item) => item.id === productId)
    updateLine(index, {
      productId,
      productSupplierId: link?.id || "",
      supplierSku: link?.supplierSku || "",
      description: product?.name || "",
      unitCost: String(link?.cost ?? product?.cost ?? product?.costPrice ?? product?.price ?? 0),
    })
  }

  async function saveOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!form.supplierId) return setError("Choose a supplier before saving.")
    const validLines = form.lines.filter((line) => line.productId && numberValue(line.quantityOrdered) > 0)
    if (!editing && !validLines.length) return setError("Add at least one product line before saving.")
    setSaving(true)
    try {
      const payload = editing
        ? { status: form.status, expectedAt: form.expectedAt ? new Date(form.expectedAt).toISOString() : null, notes: form.notes }
        : { supplierId: form.supplierId, expectedAt: form.expectedAt ? new Date(form.expectedAt).toISOString() : undefined, notes: clean(form.notes), lines: validLines.map((line) => ({ productId: line.productId, productSupplierId: clean(line.productSupplierId), supplierSku: clean(line.supplierSku), description: clean(line.description), quantityOrdered: Number(line.quantityOrdered), unitCost: Number(line.unitCost) })) }
      const saved = purchaseOrderId
        ? await apiFetch<Order>(`/api/purchase-orders/${purchaseOrderId}`, { method: "PATCH", body: JSON.stringify(payload) })
        : await apiFetch<Order>("/api/purchase-orders", { method: "POST", body: JSON.stringify(payload) })
      toast.success(editing ? "Purchase order updated" : "Purchase order created", { description: saved.poNumber })
      router.push(`/purchase-orders/${saved.id}`)
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Purchase order could not be saved"
      setError(message)
      toast.error("Could not save purchase order", { description: message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6"><Skeleton className="h-12 w-72" /><Skeleton className="h-[620px] rounded-xl" /></div>

  return (
    <form onSubmit={saveOrder} className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2"><Link href="/purchase-orders"><ArrowLeftIcon className="size-4" />Purchase orders</Link></Button>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{editing ? "Edit purchase order" : "New purchase order"}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{order ? `${order.poNumber} · update status, expected date, and notes.` : "Choose a supplier, add product lines, and review totals before creating the order."}</p>
        </div>
        <ModuleFormActions saving={saving} editing={editing} createLabel="Create purchase order" updateLabel="Save changes" onCancel={() => router.push(cancelPath())} className="flex flex-col gap-2 sm:flex-row lg:pt-7" />
      </div>

      {error ? <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><div className="flex gap-2"><AlertCircleIcon className="mt-0.5 size-4 shrink-0" />{error}</div></div> : null}

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="min-w-0 overflow-hidden py-0">
          <CardHeader className="border-b px-4 py-4"><CardTitle>Purchase order details</CardTitle><CardDescription>Set the supplier, expected date, and normal text notes for this order.</CardDescription></CardHeader>
          <CardContent className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
            <Field label="Supplier" required><Select value={form.supplierId || "none"} onValueChange={(value) => changeSupplier(value === "none" ? "" : value)} disabled={editing}><SelectTrigger className="w-full"><SelectValue placeholder="Choose supplier" /></SelectTrigger><SelectContent><SelectItem value="none">Choose supplier</SelectItem>{suppliers.map((supplier) => <SelectItem key={supplier.id} value={supplier.id}>{supplier.supplierCode} · {supplier.name}</SelectItem>)}</SelectContent></Select></Field>
            {editing ? <Field label="Status"><Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value as Status }))}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{statuses.map((status) => <SelectItem key={status} value={status}>{titleCase(status)}</SelectItem>)}</SelectContent></Select></Field> : null}
            <Field label="Expected date"><Input type="date" value={form.expectedAt} onChange={(event) => setForm((current) => ({ ...current, expectedAt: event.target.value }))} /></Field>
            <Field label="Notes"><Input value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional internal notes" /></Field>
          </CardContent>
          <Separator />
          <CardHeader className="px-4 py-4 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Order lines</CardTitle><CardDescription>{editing ? "Lines are locked by the current API." : linksLoading ? "Loading supplier-linked products..." : links.length ? "Products are filtered by the selected supplier link." : "No supplier links found. Showing all products as fallback."}</CardDescription></div>{!editing ? <Button type="button" variant="outline" size="sm" onClick={addLine} className="w-full sm:w-auto"><PlusIcon className="size-4" />Add line</Button> : null}</CardHeader>
          <CardContent className="grid gap-3 p-4 md:hidden">{form.lines.map((line, index) => <LineCard key={index} index={index} line={line} currency={currency} editing={editing} linksLoading={linksLoading} products={productOptions} canRemove={form.lines.length > 1} onProductChange={selectProduct} onUpdate={updateLine} onRemove={removeLine} />)}</CardContent>
          <CardContent className="hidden p-0 md:block"><div className="overflow-x-auto"><Table className="min-w-[980px]"><TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Supplier SKU</TableHead><TableHead>Description</TableHead><TableHead className="w-28">Qty</TableHead><TableHead className="w-36">Unit cost</TableHead><TableHead className="w-36 text-right">Total</TableHead><TableHead className="w-12" /></TableRow></TableHeader><TableBody>{form.lines.map((line, index) => <LineRow key={index} index={index} line={line} currency={currency} editing={editing} linksLoading={linksLoading} products={productOptions} canRemove={form.lines.length > 1} onProductChange={selectProduct} onUpdate={updateLine} onRemove={removeLine} />)}</TableBody></Table></div></CardContent>
        </Card>
        <aside className="h-fit rounded-xl border bg-card p-4 xl:sticky xl:top-[calc(var(--header-height)+1rem)]"><h2 className="font-semibold">Review</h2><p className="mt-1 text-sm text-muted-foreground">Confirm supplier, lines, and subtotal before saving.</p><Separator className="my-4" /><ReviewLine label="Supplier" value={selectedSupplier?.name || "Not set"} /><ReviewLine label="Currency" value={currency} /><ReviewLine label="Supplier links" value={linksLoading ? "Loading" : String(links.length)} /><ReviewLine label="Lines" value={String(form.lines.length)} /><ReviewLine label="Subtotal" value={formatMoney(subtotal, currency)} />{order ? <ReviewLine label="PO number" value={order.poNumber} mono /> : null}</aside>
      </div>
    </form>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) { return <label className="grid min-w-0 gap-2"><Label>{label}{required ? <span className="text-destructive"> *</span> : null}</Label>{children}</label> }
function ProductSelect({ value, index, products, editing, linksLoading, onProductChange }: { value: string; index: number; products: Product[]; editing: boolean; linksLoading: boolean; onProductChange: (index: number, productId: string) => void }) { return <Select value={value || "none"} onValueChange={(value) => onProductChange(index, value === "none" ? "" : value)} disabled={editing || linksLoading}><SelectTrigger className="w-full"><SelectValue placeholder={linksLoading ? "Loading..." : "Choose product"} /></SelectTrigger><SelectContent><SelectItem value="none">Choose product</SelectItem>{products.map((product) => <SelectItem key={product.id} value={product.id}>{productLabel(product)}</SelectItem>)}</SelectContent></Select> }
function LineCard({ index, line, currency, editing, linksLoading, products, canRemove, onProductChange, onUpdate, onRemove }: { index: number; line: Line; currency: string; editing: boolean; linksLoading: boolean; products: Product[]; canRemove: boolean; onProductChange: (index: number, productId: string) => void; onUpdate: (index: number, patch: Partial<Line>) => void; onRemove: (index: number) => void }) { return <div className="grid gap-3 rounded-lg border p-3"><div className="flex items-center justify-between"><p className="text-sm font-medium">Line {index + 1}</p>{!editing ? <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => onRemove(index)} disabled={!canRemove}><Trash2Icon className="size-4" /></Button> : null}</div><Field label="Product"><ProductSelect value={line.productId} index={index} products={products} editing={editing} linksLoading={linksLoading} onProductChange={onProductChange} /></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="Supplier SKU"><Input value={line.supplierSku} onChange={(event) => onUpdate(index, { supplierSku: event.target.value })} disabled={editing} /></Field><Field label="Description"><Input value={line.description} onChange={(event) => onUpdate(index, { description: event.target.value })} disabled={editing} /></Field><Field label="Qty"><Input type="number" min="1" value={line.quantityOrdered} onChange={(event) => onUpdate(index, { quantityOrdered: event.target.value })} disabled={editing} /></Field><Field label="Unit cost"><Input type="number" min="0" step="0.01" value={line.unitCost} onChange={(event) => onUpdate(index, { unitCost: event.target.value })} disabled={editing} /></Field></div><div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm"><span className="text-muted-foreground">Line total</span><span className="font-medium">{formatMoney(numberValue(line.quantityOrdered) * numberValue(line.unitCost), currency)}</span></div></div> }
function LineRow(props: React.ComponentProps<typeof LineCard>) { const line = props.line; return <TableRow><TableCell className="min-w-64"><ProductSelect value={line.productId} index={props.index} products={props.products} editing={props.editing} linksLoading={props.linksLoading} onProductChange={props.onProductChange} /></TableCell><TableCell className="min-w-36"><Input value={line.supplierSku} onChange={(event) => props.onUpdate(props.index, { supplierSku: event.target.value })} disabled={props.editing} /></TableCell><TableCell className="min-w-56"><Input value={line.description} onChange={(event) => props.onUpdate(props.index, { description: event.target.value })} disabled={props.editing} /></TableCell><TableCell><Input type="number" min="1" value={line.quantityOrdered} onChange={(event) => props.onUpdate(props.index, { quantityOrdered: event.target.value })} disabled={props.editing} /></TableCell><TableCell><Input type="number" min="0" step="0.01" value={line.unitCost} onChange={(event) => props.onUpdate(props.index, { unitCost: event.target.value })} disabled={props.editing} /></TableCell><TableCell className="text-right font-medium">{formatMoney(numberValue(line.quantityOrdered) * numberValue(line.unitCost), props.currency)}</TableCell><TableCell>{!props.editing ? <Button type="button" variant="ghost" size="icon" onClick={() => props.onRemove(props.index)} disabled={!props.canRemove}><Trash2Icon className="size-4" /></Button> : null}</TableCell></TableRow> }
function ReviewLine({ label, value, mono }: { label: string; value: string; mono?: boolean }) { return <div className="flex items-center justify-between gap-3 border-b py-3 text-sm first:pt-0 last:border-b-0"><span className="text-muted-foreground">{label}</span><span className={mono ? "font-mono text-xs font-medium" : "font-medium"}>{value}</span></div> }
