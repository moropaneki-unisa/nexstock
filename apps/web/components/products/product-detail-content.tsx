"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArchiveIcon, ArrowLeftIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, DatabaseZapIcon, EditIcon, FileTextIcon, HistoryIcon, ImageIcon, Loader2Icon, RefreshCwIcon, TriangleAlertIcon, WarehouseIcon } from "lucide-react"
import { toast } from "sonner"

import { ProductSuppliersSection } from "@/components/products/product-suppliers-section"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

type InventoryLog = { id: string; type: string; quantityBefore: number; quantityAfter: number; delta: number; reason?: string | null; source?: string | null; createdAt: string }
type CustomFieldValue = { fieldId: string; value: unknown; field?: { key?: string | null; label?: string | null; type?: string | null } | null }
type Product = { id: string; name: string; sku?: string | null; category?: string | null; description?: string | null; status?: string | null; quantity?: number | string | null; lowStockLevel?: number | string | null; price?: number | string | null; priceCurrency?: string | null; cost?: number | string | null; costPrice?: number | string | null; costCurrency?: string | null; convertedCost?: number | string | null; currency?: string | null; images?: string[] | null; customFieldValues?: CustomFieldValue[] | null; inventoryLogs?: InventoryLog[] | null; createdAt?: string | null; updatedAt?: string | null }
type OrganizationSummary = { baseCurrency?: string | null }
type ProductDataField = { id: string; label: string; value: string; type?: string | null; mono?: boolean; multiline?: boolean }

function numberValue(value: unknown) { const next = Number(value ?? 0); return Number.isFinite(next) ? next : 0 }
function normalizeCurrency(value?: string | null, fallback = "USD") { const next = String(value || fallback).trim().toUpperCase(); return next || fallback }
function formatMoney(value: unknown, currency = "USD") { return new Intl.NumberFormat("en", { style: "currency", currency: normalizeCurrency(currency), maximumFractionDigits: 2 }).format(numberValue(value)) }
function formatDate(value?: string | null) { if (!value) return "Not set"; const date = new Date(value); return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleString() }
function cleanText(value?: string | null) { if (!value) return ""; return value.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/[ \t]+/g, " ").replace(/\n\s+/g, "\n").replace(/\n{3,}/g, "\n\n").trim() }
function truncateText(value: string, maxLength: number) { return value.length <= maxLength ? value : `${value.slice(0, maxLength).trim()}...` }
function formatCustomValue(value: unknown) { if (value === null || value === undefined || value === "") return "-"; if (typeof value === "object") return truncateText(JSON.stringify(value, null, 2), 400); return truncateText(cleanText(String(value)) || String(value), 400) }
function productState(product: Product) { const quantity = numberValue(product.quantity); const lowStockLevel = numberValue(product.lowStockLevel); if (product.status === "archived") return "archived"; if (product.status === "draft") return "draft"; if (quantity <= 0) return "out"; if (lowStockLevel > 0 && quantity <= lowStockLevel) return "low"; return "active" }
function ProductBadge({ product }: { product: Product }) { const state = productState(product); if (state === "archived") return <Badge variant="outline">Archived</Badge>; if (state === "draft") return <Badge variant="secondary">Draft</Badge>; if (state === "out") return <Badge variant="destructive">Out of stock</Badge>; if (state === "low") return <Badge variant="destructive">Low stock</Badge>; return <Badge>Active</Badge> }

export function ProductDetailContent({ productId }: { productId: string }) {
  const router = useRouter()
  const [product, setProduct] = React.useState<Product | null>(null)
  const [organization, setOrganization] = React.useState<OrganizationSummary | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [running, setRunning] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null)
  const [attributesOpen, setAttributesOpen] = React.useState(true)
  const [logsOpen, setLogsOpen] = React.useState(true)
  const [adjustOpen, setAdjustOpen] = React.useState(false)
  const [delta, setDelta] = React.useState("")
  const [reason, setReason] = React.useState("")
  const [adjustError, setAdjustError] = React.useState<string | null>(null)

  async function loadProduct() {
    setLoading(true); setError(null)
    try {
      const [result, org] = await Promise.all([apiFetch<Product>(`/api/products/${productId}`), apiFetch<OrganizationSummary>("/api/organization").catch(() => null)])
      setProduct(result); setOrganization(org)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load product"; setError(message); toast.error("Product could not load", { description: message })
    } finally { setLoading(false) }
  }

  React.useEffect(() => { void loadProduct() }, [productId])
  React.useEffect(() => { const images = product?.images ?? []; if (!images.length) { setSelectedImage(null); return } setSelectedImage((current) => (current && images.includes(current) ? current : images[0])) }, [product?.images])

  async function archiveProduct() {
    if (!product) return
    setRunning(true)
    try { await apiFetch(`/api/products/${product.id}`, { method: "DELETE" }); toast.success("Product archived", { description: product.name }); router.push("/products") }
    catch (err) { toast.error("Could not archive product", { description: err instanceof Error ? err.message : "Archive failed" }) }
    finally { setRunning(false) }
  }

  async function submitStockAdjustment() {
    if (!product) return
    const numericDelta = Number(delta); setAdjustError(null)
    if (!Number.isInteger(numericDelta) || numericDelta === 0) return setAdjustError("Enter a whole number above or below zero. Example: 10 or -3.")
    if (numberValue(product.quantity) + numericDelta < 0) return setAdjustError("Stock cannot go below zero.")
    setRunning(true)
    try {
      await apiFetch(`/api/products/${product.id}/adjust`, { method: "POST", body: JSON.stringify({ delta: numericDelta, reason: reason.trim() || "Manual stock adjustment", source: "app" }) })
      setDelta(""); setReason(""); setAdjustOpen(false); toast.success("Stock adjusted"); await loadProduct()
    } catch (err) { setAdjustError(err instanceof Error ? err.message : "Failed to adjust stock") }
    finally { setRunning(false) }
  }

  if (loading) return <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6"><Skeleton className="h-12 w-72" /><Skeleton className="h-[680px] rounded-xl" /></div>
  if (!product || error) return <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6"><Button asChild variant="outline" size="sm" className="w-fit"><Link href="/products"><ArrowLeftIcon className="size-4" />Back to products</Link></Button><Card className="border-destructive/30 bg-destructive/5"><CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><TriangleAlertIcon className="size-4" />Product not available</CardTitle><CardDescription>{error || "The product could not be found."}</CardDescription></CardHeader></Card></div>

  const baseCurrency = normalizeCurrency(organization?.baseCurrency || product.currency || product.priceCurrency || "USD")
  const priceCurrency = normalizeCurrency(product.priceCurrency || product.currency || baseCurrency)
  const costCurrency = normalizeCurrency(product.costCurrency || product.currency || priceCurrency)
  const costValue = product.cost ?? product.costPrice
  const images = product.images ?? []
  const primaryImage = selectedImage || images[0]
  const currentImageIndex = Math.max(0, images.findIndex((image) => image === primaryImage))
  const cleanDescription = cleanText(product.description)

  function showPreviousImage() {
    if (images.length < 2) return
    const previousIndex = (currentImageIndex - 1 + images.length) % images.length
    setSelectedImage(images[previousIndex])
  }

  function showNextImage() {
    if (images.length < 2) return
    const nextIndex = (currentImageIndex + 1) % images.length
    setSelectedImage(images[nextIndex])
  }

  const defaultFields: ProductDataField[] = [
    { id: "name", label: "Product name", value: cleanText(product.name) || "-" },
    { id: "sku", label: "SKU", value: product.sku || "-", mono: true },
    { id: "status", label: "Status", value: productState(product).replace("out", "Out of stock") },
    { id: "category", label: "Category", value: cleanText(product.category) || "Uncategorized" },
    { id: "description", label: "Description", value: cleanDescription || "No description", multiline: true },
    { id: "price", label: `Selling price (${priceCurrency})`, value: formatMoney(product.price, priceCurrency) },
    { id: "cost", label: `Supplier/fallback cost (${costCurrency})`, value: costValue == null ? "Not set" : formatMoney(costValue, costCurrency) },
    { id: "convertedCost", label: `Converted cost (${baseCurrency})`, value: product.convertedCost == null ? "Not set" : formatMoney(product.convertedCost, baseCurrency) },
    { id: "quantity", label: "Current stock", value: `${numberValue(product.quantity).toLocaleString()} units` },
    { id: "lowStockLevel", label: "Low-stock level", value: `${numberValue(product.lowStockLevel).toLocaleString()} units` },
    { id: "images", label: "Images", value: `${images.length} image${images.length === 1 ? "" : "s"}` },
    { id: "createdAt", label: "Created", value: formatDate(product.createdAt) },
    { id: "updatedAt", label: "Updated", value: formatDate(product.updatedAt) },
  ]
  const customAttributes: ProductDataField[] = (product.customFieldValues ?? []).map((item) => ({ id: item.fieldId, label: item.field?.label ?? item.field?.key ?? item.fieldId, value: formatCustomValue(item.value), type: item.field?.type, multiline: item.field?.type === "json" }))

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2"><Link href="/products"><ArrowLeftIcon className="size-4" />Products</Link></Button>
          <div className="flex flex-wrap items-center gap-2"><h1 className="font-heading text-2xl font-semibold tracking-tight">{cleanText(product.name) || "Product"}</h1><ProductBadge product={product} /></div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Review identity, images, pricing, inventory, attributes, suppliers, and stock movement from one profile.</p>
        </div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => void loadProduct()} disabled={running}><RefreshCwIcon className="size-4" />Refresh</Button><Button variant="outline" size="sm" onClick={() => setAdjustOpen(true)} disabled={running}><WarehouseIcon className="size-4" />Adjust stock</Button><Button asChild size="sm" variant="outline"><Link href={`/products/${product.id}/edit`}><EditIcon className="size-4" />Edit</Link></Button><Button size="sm" variant="destructive" onClick={archiveProduct} disabled={running}>{running ? <Loader2Icon className="size-4 animate-spin" /> : <ArchiveIcon className="size-4" />}Archive</Button></div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="SKU" value={product.sku || "No SKU"} detail="Product code" mono />
        <SummaryCard title="Stock on hand" value={numberValue(product.quantity).toLocaleString()} detail={`Alert: ${numberValue(product.lowStockLevel).toLocaleString()} units`} />
        <SummaryCard title={`Selling price (${priceCurrency})`} value={formatMoney(product.price, priceCurrency)} detail={`Base currency: ${baseCurrency}`} />
        <SummaryCard title="Status" value={productState(product).replace("out", "Out of stock")} detail={product.status || "active"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[20rem_1fr]">
        <div className="grid gap-4 self-start">
          <Card className="gap-0 overflow-hidden py-0">
            <div className="relative aspect-square overflow-hidden bg-muted">
              {primaryImage ? <img src={primaryImage} alt={cleanText(product.name) || "Product image"} className="block h-full w-full object-cover" /> : <div className="flex h-full flex-col items-center justify-center text-muted-foreground"><ImageIcon className="size-10" /><p className="mt-3 text-sm font-medium">No image</p></div>}
              <div className="absolute left-3 top-3"><ProductBadge product={product} /></div>
              {images.length ? <div className="absolute bottom-3 right-3 opacity-55 transition-opacity duration-200 hover:opacity-100 focus-within:opacity-100"><ButtonGroup className="rounded-lg bg-background/80 shadow-sm backdrop-blur"><Button type="button" variant="outline" size="icon" onClick={showPreviousImage} disabled={images.length < 2} aria-label="Previous product image" className="size-8 border-black bg-black text-white hover:bg-black/90 hover:text-white disabled:border-black/40 disabled:bg-black/40 disabled:text-white/70"><ChevronLeftIcon className="size-4" /></Button><ButtonGroupText className="h-8 min-w-16 justify-center border-y bg-background/90 px-2 text-xs tabular-nums">{currentImageIndex + 1} / {images.length}</ButtonGroupText><Button type="button" variant="outline" size="icon" onClick={showNextImage} disabled={images.length < 2} aria-label="Next product image" className="size-8 border-black bg-black text-white hover:bg-black/90 hover:text-white disabled:border-black/40 disabled:bg-black/40 disabled:text-white/70"><ChevronRightIcon className="size-4" /></Button></ButtonGroup></div> : null}
            </div>
          </Card>

          <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileTextIcon className="size-4" />Quick facts</CardTitle></CardHeader><CardContent className="grid gap-3 text-sm"><SideFact label="SKU" value={product.sku || "No SKU"} mono /><SideFact label="Category" value={cleanText(product.category) || "Uncategorized"} /><SideFact label="Images" value={String(images.length)} /><SideFact label="Base currency" value={baseCurrency} /><SideFact label="Updated" value={formatDate(product.updatedAt)} /></CardContent></Card>
        </div>

        <div className="grid gap-4">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileTextIcon className="size-4" />Product details</CardTitle><CardDescription>Core fields stored on every product record.</CardDescription></CardHeader><CardContent><FieldGrid fields={defaultFields} /></CardContent></Card>
          <Collapsible open={attributesOpen} onOpenChange={setAttributesOpen}><Card><CollapsibleTrigger asChild><button type="button" className="flex w-full items-start justify-between gap-4 p-4 text-left transition hover:bg-muted/40"><div><CardTitle className="flex items-center gap-2"><DatabaseZapIcon className="size-4" />Attributes</CardTitle><CardDescription className="mt-1">Custom business attributes for this product.</CardDescription></div><div className="flex items-center gap-2"><Badge variant="secondary">{customAttributes.length} custom</Badge><ChevronDownIcon className={cn("size-4 text-muted-foreground transition-transform", attributesOpen && "rotate-180")} /></div></button></CollapsibleTrigger><CollapsibleContent><CardContent className="pt-0">{customAttributes.length ? <FieldGrid fields={customAttributes} /> : <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">No custom attributes have been saved for this product yet.</div>}</CardContent></CollapsibleContent></Card></Collapsible>
          <ProductSuppliersSection productId={product.id} baseCurrency={baseCurrency} />
          <Collapsible open={logsOpen} onOpenChange={setLogsOpen}><Card><CollapsibleTrigger asChild><button type="button" className="flex w-full items-start justify-between gap-4 p-4 text-left transition hover:bg-muted/40"><div><CardTitle className="flex items-center gap-2"><HistoryIcon className="size-4" />Inventory movement</CardTitle><CardDescription className="mt-1">Every stock adjustment is recorded with before/after quantity and reason.</CardDescription></div><div className="flex items-center gap-2"><Badge variant="secondary">{product.inventoryLogs?.length ?? 0} logs</Badge><ChevronDownIcon className={cn("size-4 text-muted-foreground transition-transform", logsOpen && "rotate-180")} /></div></button></CollapsibleTrigger><CollapsibleContent><CardContent className="grid gap-3 pt-0">{product.inventoryLogs?.length ? product.inventoryLogs.map((log) => <InventoryLogRow key={log.id} log={log} />) : <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">No inventory movement yet.</div>}</CardContent></CollapsibleContent></Card></Collapsible>
        </div>
      </div>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}><DialogContent><DialogHeader><DialogTitle>Adjust stock</DialogTitle><DialogDescription>Current stock is {numberValue(product.quantity).toLocaleString()} units. Add stock with a positive number or reduce stock with a negative number.</DialogDescription></DialogHeader><div className="grid gap-4">{adjustError ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{adjustError}</div> : null}<div className="grid gap-2"><Label htmlFor="delta">Adjustment quantity</Label><Input id="delta" value={delta} onChange={(event) => setDelta(event.target.value)} type="number" step="1" placeholder="Example: 10 or -3" /></div><div className="grid gap-2"><Label htmlFor="reason">Reason</Label><Textarea id="reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Stock count correction, supplier delivery, damaged goods..." className="min-h-24" /></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => setAdjustOpen(false)} disabled={running}>Cancel</Button><Button type="button" onClick={submitStockAdjustment} disabled={running}>{running ? <Loader2Icon className="size-4 animate-spin" /> : <WarehouseIcon className="size-4" />}Save adjustment</Button></DialogFooter></DialogContent></Dialog>
    </div>
  )
}

function SummaryCard({ title, value, detail, mono }: { title: string; value: string; detail: string; mono?: boolean }) {
  return <Card className="h-full gap-0 overflow-hidden py-0"><CardHeader className="min-h-28 justify-between px-6 py-5"><CardDescription>{title}</CardDescription><CardTitle className={cn("text-2xl font-semibold tabular-nums", mono && "font-mono text-lg")}>{value}</CardTitle></CardHeader><CardFooter className="mt-auto border-t bg-muted px-6 py-4 text-sm font-medium text-muted-foreground">{detail}</CardFooter></Card>
}

function FieldGrid({ fields }: { fields: ProductDataField[] }) { return <div className="grid overflow-hidden rounded-xl border md:grid-cols-2">{fields.map((field) => <div key={field.id} className="border-b p-4 text-sm transition hover:bg-muted/25 md:border-r even:md:border-r-0"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{field.label}</p>{field.type ? <Badge variant="outline">{field.type}</Badge> : null}</div><p className={cn("mt-2 break-words font-medium", field.mono && "font-mono", field.multiline && "whitespace-pre-wrap leading-6")}>{field.value}</p></div>)}</div> }
function SideFact({ label, value, mono }: { label: string; value: string; mono?: boolean }) { return <div className="flex items-center justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0"><span className="text-muted-foreground">{label}</span><span className={cn("truncate font-medium", mono && "font-mono text-xs")}>{value}</span></div> }
function InventoryLogRow({ log }: { log: InventoryLog }) { return <div className="rounded-xl border p-4 text-sm"><div className="flex items-start justify-between gap-3"><div><p className="font-medium capitalize">{log.type.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-muted-foreground">{log.quantityBefore} to {log.quantityAfter} · {log.reason ?? "No reason"}</p></div><Badge variant={log.delta < 0 ? "destructive" : "secondary"}>{log.delta > 0 ? `+${log.delta}` : log.delta}</Badge></div><p className="mt-2 text-xs text-muted-foreground">{formatDate(log.createdAt)}{log.source ? ` · ${log.source}` : ""}</p></div> }
