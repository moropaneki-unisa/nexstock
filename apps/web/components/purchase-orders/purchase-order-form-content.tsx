"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon, Loader2Icon, PlusIcon, SaveIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { apiFetch } from "@/lib/api"
import { getCachedSuppliers } from "@/lib/cached-api"
import { formatMoney, normalizeCurrencyCode, numberValue } from "@/lib/money"

type Supplier = { id: string; supplierCode: string; name: string; currency?: string | null; status?: string | null }
type Product = { id: string; name: string; sku?: string | null; cost?: string | number | null; costPrice?: string | number | null; price?: string | number | null }
type ProductSupplierLink = { id: string; productId: string; supplierId: string; productSupplierId?: string | null; supplierSku?: string | null; cost?: string | number | null; currency?: string | null; isPreferred?: boolean | null; product?: Product | null }
type PurchaseOrderStatus = "draft" | "ordered" | "partially_received" | "received" | "cancelled"
type PurchaseOrderLine = { id: string; productId: string; productSupplierId?: string | null; supplierSku?: string | null; description?: string | null; quantityOrdered: number; unitCost: string | number; notes?: string | null; product?: Product | null }
type PurchaseOrder = { id: string; poNumber: string; supplierId: string; status: PurchaseOrderStatus; expectedAt?: string | null; notes?: string | null; lines?: PurchaseOrderLine[] }
type Paginated<T> = { items?: T[]; data?: T[] }

type LineForm = { productId: string; productSupplierId: string; supplierSku: string; description: string; quantityOrdered: string; unitCost: string; notes: string }
type FormState = { supplierId: string; status: PurchaseOrderStatus; expectedAt: string; notes: string; lines: LineForm[] }

const emptyLine: LineForm = { productId: "", productSupplierId: "", supplierSku: "", description: "", quantityOrdered: "1", unitCost: "0", notes: "" }
const emptyForm: FormState = { supplierId: "", status: "draft", expectedAt: "", notes: "", lines: [{ ...emptyLine }] }
const statuses: PurchaseOrderStatus[] = ["draft", "ordered", "partially_received", "received", "cancelled"]

function normalizeList<T>(value: T[] | Paginated<T> | null | undefined) { if (!value) return []; return Array.isArray(value) ? value : value.items ?? value.data ?? [] }
function normalizeCurrency(value?: string | null) { return normalizeCurrencyCode(value, "ZAR") }
function toDateInput(value?: string | null) { if (!value) return ""; const date = new Date(value); return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10) }
function clean(value: string) { const next = value.trim(); return next || undefined }
function titleCase(value: string) { return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) }
function productLabel(product?: Product | null) { if (!product) return "Unknown product"; return product.sku ? `${product.sku} · ${product.name}` : product.name }

export function PurchaseOrderFormContent({ purchaseOrderId }: { purchaseOrderId?: string }) {
  const router = useRouter()
  const [form, setForm] = React.useState<FormState>(emptyForm)
  const [order, setOrder] = React.useState<PurchaseOrder | null>(null)
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([])
  const [products, setProducts] = React.useState<Product[]>([])
  const [supplierLinks, setSupplierLinks] = React.useState<ProductSupplierLink[]>([])
  const [loading, setLoading] = React.useState(true)
  const [linksLoading, setLinksLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const selectedSupplier = suppliers.find((supplier) => supplier.id === form.supplierId)
  const currency = normalizeCurrency(selectedSupplier?.currency || supplierLinks[0]?.currency)
  const subtotal = form.lines.reduce((sum, line) => sum + numberValue(line.quantityOrdered) * numberValue(line.unitCost), 0)
  const availableProducts = supplierLinks.length ? supplierLinks.map((link) => link.product).filter(Boolean) as Product[] : products

  React.useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [supplierList, productList, existing] = await Promise.all([
          getCachedSuppliers<Supplier[] | Paginated<Supplier>>().catch(() => apiFetch<Supplier[]>("/api/suppliers")),
          apiFetch<Product[] | Paginated<Product>>("/api/products?limit=100"),
          purchaseOrderId ? apiFetch<PurchaseOrder>(`/api/purchase-orders/${purchaseOrderId}`) : Promise.resolve(null),
        ])
        const activeSuppliers = normalizeList<Supplier>(supplierList).filter((supplier) => supplier.status !== "archived")
        setSuppliers(activeSuppliers)
        setProducts(normalizeList<Product>(productList))
        if (existing) {
          setOrder(existing)
          setForm({
            supplierId: existing.supplierId,
            status: existing.status,
            expectedAt: toDateInput(existing.expectedAt),
            notes: existing.notes || "",
            lines: existing.lines?.length ? existing.lines.map((line) => ({ productId: line.productId, productSupplierId: line.productSupplierId || "", supplierSku: line.supplierSku || "", description: line.description || line.product?.name || "", quantityOrdered: String(line.quantityOrdered || 1), unitCost: String(line.unitCost ?? 0), notes: line.notes || "" })) : [{ ...emptyLine }],
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
    void load()
  }, [purchaseOrderId])

  React.useEffect(() => {
    let active = true
    async function loadLinks() {
      if (!form.supplierId) {
        setSupplierLinks([])
        return
      }
      setLinksLoading(true)
      try {
        const links = await apiFetch<ProductSupplierLink[]>(`/api/suppliers/${form.supplierId}/products`).catch(() => [])
        if (active) setSupplierLinks(links)
      } finally {
        if (active) setLinksLoading(false)
      }
    }
    if (!loading && !purchaseOrderId) void loadLinks()
    return () => { active = false }
  }, [form.supplierId, loading, purchaseOrderId])

  function changeSupplier(supplierId: string) {
    setForm((current) => ({ ...current, supplierId, lines: current.lines.map((line) => ({ ...line, productId: "", productSupplierId: "", supplierSku: "", unitCost: "0" })) }))
  }

  function updateLine(index: number, patch: Partial<LineForm>) {
    setForm((current) => ({ ...current, lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line) }))
  }

  function selectProduct(index: number, productId: string) {
    const link = supplierLinks.find((item) => item.productId === productId)
    const product = link?.product || products.find((item) => item.id === productId)
    const fallbackCost = link?.cost ?? product?.cost ?? product?.costPrice ?? product?.price ?? 0
    updateLine(index, { productId, productSupplierId: link?.id || "", supplierSku: link?.supplierSku || "", description: product?.name || "", unitCost: String(fallbackCost) })
  }

  function addLine() { setForm((current) => ({ ...current, lines: [...current.lines, { ...emptyLine }] })) }
  function removeLine(index: number) { setForm((current) => ({ ...current, lines: current.lines.length === 1 ? current.lines : current.lines.filter((_, lineIndex) => lineIndex !== index) })) }

  async function saveOrder() {
    if (!form.supplierId) return toast.error("Choose a supplier")
    const validLines = form.lines.filter((line) => line.productId && numberValue(line.quantityOrdered) > 0)
    if (!validLines.length) return toast.error("Add at least one product line")

    setSaving(true)
    setError(null)
    try {
      if (purchaseOrderId) {
        const result = await apiFetch<PurchaseOrder>(`/api/purchase-orders/${purchaseOrderId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: form.status, expectedAt: form.expectedAt ? new Date(form.expectedAt).toISOString() : null, notes: form.notes }),
        })
        toast.success("Purchase order updated", { description: result.poNumber })
        router.push(`/purchase-orders/${result.id}`)
      } else {
        const result = await apiFetch<PurchaseOrder>("/api/purchase-orders", {
          method: "POST",
          body: JSON.stringify({
            supplierId: form.supplierId,
            expectedAt: form.expectedAt ? new Date(form.expectedAt).toISOString() : undefined,
            notes: clean(form.notes),
            lines: validLines.map((line) => ({ productId: line.productId, productSupplierId: clean(line.productSupplierId), supplierSku: clean(line.supplierSku), description: clean(line.description), quantityOrdered: Number(line.quantityOrdered), unitCost: Number(line.unitCost), notes: clean(line.notes) })),
          }),
        })
        toast.success("Purchase order created", { description: result.poNumber })
        router.push(`/purchase-orders/${result.id}`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Purchase order could not be saved"
      setError(message)
      toast.error("Could not save purchase order", { description: message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6"><Skeleton className="h-12 w-72" /><Skeleton className="h-[640px] rounded-xl" /></div>

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2"><Link href="/purchase-orders"><ArrowLeftIcon className="size-4" />Purchase orders</Link></Button>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{purchaseOrderId ? "Edit purchase order" : "New purchase order"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{order ? `${order.poNumber} · update status, expected date, and notes.` : "Create a purchase order from supplier-linked product costs."}</p>
        </div>
        <Button onClick={saveOrder} disabled={saving} size="sm">{saving ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}{purchaseOrderId ? "Save changes" : "Create purchase order"}</Button>
      </div>

      {error ? <Card className="border-destructive/30 bg-destructive/5"><CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><TriangleAlertIcon className="size-4" />Purchase order error</CardTitle><CardDescription>{error}</CardDescription></CardHeader></Card> : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_20rem]">
        <div className="grid gap-4">
          <Card>
            <CardHeader><CardTitle>Order information</CardTitle><CardDescription>Supplier, status, expected date, and internal notes.</CardDescription></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2"><Label>Supplier</Label><Select value={form.supplierId} onValueChange={changeSupplier} disabled={Boolean(purchaseOrderId)}><SelectTrigger className="w-full"><SelectValue placeholder="Choose supplier" /></SelectTrigger><SelectContent>{suppliers.map((supplier) => <SelectItem key={supplier.id} value={supplier.id}>{supplier.supplierCode} · {supplier.name}</SelectItem>)}</SelectContent></Select></label>
              {purchaseOrderId ? <label className="grid gap-2"><Label>Status</Label><Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value as PurchaseOrderStatus }))}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{statuses.map((status) => <SelectItem key={status} value={status}>{titleCase(status)}</SelectItem>)}</SelectContent></Select></label> : null}
              <label className="grid gap-2"><Label>Expected date</Label><Input type="date" value={form.expectedAt} onChange={(event) => setForm((current) => ({ ...current, expectedAt: event.target.value }))} /></label>
              <label className="grid gap-2 md:col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="min-h-24" /></label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Order lines</CardTitle><CardDescription>{purchaseOrderId ? "Lines are locked after creation by the current API. Create a new PO to change product lines." : linksLoading ? "Loading supplier-linked products..." : supplierLinks.length ? "Products are filtered by the selected supplier link." : "No supplier links found. Showing all products as fallback."}</CardDescription></div>{!purchaseOrderId ? <Button type="button" variant="outline" size="sm" onClick={addLine}><PlusIcon className="size-4" />Add line</Button> : null}</CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-xl border">
                <Table>
                  <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Supplier SKU</TableHead><TableHead>Description</TableHead><TableHead className="w-28">Qty</TableHead><TableHead className="w-32">Unit cost</TableHead><TableHead className="w-32 text-right">Total</TableHead><TableHead className="w-12" /></TableRow></TableHeader>
                  <TableBody>
                    {form.lines.map((line, index) => <TableRow key={index}>
                      <TableCell className="min-w-56"><Select value={line.productId} onValueChange={(value) => selectProduct(index, value)} disabled={Boolean(purchaseOrderId) || linksLoading}><SelectTrigger className="w-full"><SelectValue placeholder={linksLoading ? "Loading..." : "Choose product"} /></SelectTrigger><SelectContent>{availableProducts.map((product) => <SelectItem key={product.id} value={product.id}>{productLabel(product)}</SelectItem>)}</SelectContent></Select></TableCell>
                      <TableCell className="min-w-36"><Input value={line.supplierSku} onChange={(event) => updateLine(index, { supplierSku: event.target.value })} disabled={Boolean(purchaseOrderId)} /></TableCell>
                      <TableCell><Input value={line.description} onChange={(event) => updateLine(index, { description: event.target.value })} disabled={Boolean(purchaseOrderId)} /></TableCell>
                      <TableCell><Input type="number" min="1" value={line.quantityOrdered} onChange={(event) => updateLine(index, { quantityOrdered: event.target.value })} disabled={Boolean(purchaseOrderId)} /></TableCell>
                      <TableCell><Input type="number" min="0" step="0.01" value={line.unitCost} onChange={(event) => updateLine(index, { unitCost: event.target.value })} disabled={Boolean(purchaseOrderId)} /></TableCell>
                      <TableCell className="text-right font-medium">{formatMoney(numberValue(line.quantityOrdered) * numberValue(line.unitCost), currency)}</TableCell>
                      <TableCell>{!purchaseOrderId ? <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(index)} disabled={form.lines.length === 1}><Trash2Icon className="size-4" /></Button> : null}</TableCell>
                    </TableRow>)}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit xl:sticky xl:top-[calc(var(--header-height)+1rem)]">
          <CardHeader><CardTitle>Review</CardTitle><CardDescription>Confirm the purchase order before saving.</CardDescription></CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <ReviewLine label="Supplier" value={selectedSupplier?.name || "Not set"} />
            <ReviewLine label="Currency" value={currency} />
            <ReviewLine label="Linked products" value={linksLoading ? "Loading" : String(supplierLinks.length)} />
            <ReviewLine label="Lines" value={String(form.lines.length)} />
            <ReviewLine label="Subtotal" value={formatMoney(subtotal, currency)} />
            {order ? <ReviewLine label="PO number" value={order.poNumber} mono /> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ReviewLine({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return <div className="flex items-center justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0"><span className="text-muted-foreground">{label}</span><span className={mono ? "font-mono text-xs font-medium" : "font-medium"}>{value}</span></div>
}
