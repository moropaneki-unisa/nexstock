"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArchiveIcon,
  ArrowLeftIcon,
  BoxesIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EditIcon,
  ExternalLinkIcon,
  FileTextIcon,
  HistoryIcon,
  ImageIcon,
  Loader2Icon,
  RefreshCwIcon,
  TriangleAlertIcon,
  WarehouseIcon,
} from "lucide-react"
import { toast } from "sonner"

import { ProductSuppliersSection } from "@/components/products/product-suppliers-section"
import { RecordActionDialog } from "@/components/records/record-action-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { apiFetch } from "@/lib/api"
import { formatMoney, normalizeCurrencyCode, numberValue } from "@/lib/money"
import { cn } from "@/lib/utils"

type InventoryLog = { id: string; type: string; quantityBefore: number; quantityAfter: number; delta: number; reason?: string | null; source?: string | null; createdAt: string }
type ProductMetadata = { productTypeId?: string | null; productTypeName?: string | null; kind?: string | null; trackInventory?: boolean | null; customFields?: Record<string, unknown> | null }
type Product = { id: string; name: string; sku?: string | null; category?: string | null; description?: string | null; status?: string | null; quantity?: number | string | null; lowStockLevel?: number | string | null; price?: number | string | null; priceCurrency?: string | null; cost?: number | string | null; costPrice?: number | string | null; costCurrency?: string | null; convertedCost?: number | string | null; currency?: string | null; images?: string[] | null; inventoryLogs?: InventoryLog[] | null; productTypeId?: string | null; kind?: string | null; trackInventory?: boolean | null; customFields?: Record<string, unknown> | null; metadata?: ProductMetadata | null; createdAt?: string | null; updatedAt?: string | null }
type OrganizationSummary = { baseCurrency?: string | null }
type LayoutField = { id?: string; key: string; label: string; type?: string | null; required?: boolean | null; options?: string[] | null; order?: number | null; isActive?: boolean | null }
type ProductLayout = { id: string; name: string; kind?: string | null; trackInventory?: boolean | null; fields?: LayoutField[] | null }
type ProductDataField = { id: string; label: string; value: string; type?: string | null; mono?: boolean; multiline?: boolean; kind?: "text" | "images" | "attachments" | "lookup" | "boolean" | "currency"; raw?: unknown }
type AttachmentValue = { name: string; url: string }

function normalizeCurrency(value?: string | null, fallback = "ZAR") { return normalizeCurrencyCode(value, fallback) }
function formatDate(value?: string | null) { if (!value) return "Not set"; const date = new Date(value); return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleString() }
function cleanText(value?: string | null) { if (!value) return ""; return value.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/[ \t]+/g, " ").replace(/\n\s+/g, "\n").replace(/\n{3,}/g, "\n\n").trim() }
function truncateText(value: string, maxLength: number) { return value.length <= maxLength ? value : `${value.slice(0, maxLength).trim()}...` }
function productState(product: Product) { const quantity = numberValue(product.quantity); const lowStockLevel = numberValue(product.lowStockLevel); if (product.status === "archived") return "archived"; if (product.status === "draft") return "draft"; if (quantity <= 0) return "out"; if (lowStockLevel > 0 && quantity <= lowStockLevel) return "low"; return "active" }
function productKindLabel(value?: string | null) { return cleanText(value || "physical").replace(/_/g, " ").replace(/([A-Z])/g, " $1").replace(/\b\w/g, (char) => char.toUpperCase()).trim() }
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value && typeof value === "object" && !Array.isArray(value)) }
function isAttachment(value: unknown): value is AttachmentValue { return isRecord(value) && typeof value.url === "string" && typeof value.name === "string" }
function fileNameFromUrl(value: string) { try { const last = new URL(value).pathname.split("/").filter(Boolean).pop() || value; return decodeURIComponent(last).replace(/\.[^/.]+$/, "") } catch { return value.replace(/\.[^/.]+$/, "") } }
function formatCustomValue(value: unknown) { if (value === null || value === undefined || value === "") return "-"; if (typeof value === "object") return truncateText(JSON.stringify(value, null, 2), 400); return truncateText(cleanText(String(value)) || String(value), 400) }
function formatLayoutValue(field: LayoutField, value: unknown, fallbackCurrency: string): ProductDataField {
  const type = String(field.type || "text").toLowerCase()
  if (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) return { id: field.key, label: field.label || productKindLabel(field.key), value: "-", type }
  if (type === "currency" && isRecord(value)) {
    const amount = value.amount ?? value.value ?? 0
    const currency = normalizeCurrency(String(value.currency || fallbackCurrency), fallbackCurrency)
    return { id: field.key, label: field.label, value: formatMoney(amount, currency), type, kind: "currency", raw: value }
  }
  if (type === "images" && Array.isArray(value)) {
    const images = value.map((item) => String(item || "").trim()).filter(Boolean)
    return { id: field.key, label: field.label, value: `${images.length} image${images.length === 1 ? "" : "s"}`, type, kind: "images", raw: images }
  }
  if (type === "attachment" && Array.isArray(value)) {
    const attachments = value.filter(isAttachment)
    return { id: field.key, label: field.label, value: `${attachments.length} file${attachments.length === 1 ? "" : "s"}`, type, kind: "attachments", raw: attachments }
  }
  if (type === "lookup" && isRecord(value)) {
    const name = String(value.name || value.id || "-")
    return { id: field.key, label: field.label, value: name, type, kind: "lookup", raw: value }
  }
  if (type === "boolean") {
    const bool = value === true || value === "true"
    return { id: field.key, label: field.label, value: bool ? "Yes" : "No", type, kind: "boolean", raw: bool }
  }
  if (type === "date") return { id: field.key, label: field.label, value: formatDate(String(value)), type }
  if (type === "number") return { id: field.key, label: field.label, value: Number(value).toLocaleString(), type }
  if (type === "decimal") return { id: field.key, label: field.label, value: String(numberValue(value)), type }
  return { id: field.key, label: field.label || productKindLabel(field.key), value: formatCustomValue(value), type, multiline: type === "richtext" }
}
function ProductBadge({ product }: { product: Product }) { const state = productState(product); if (state === "archived") return <Badge variant="outline">Archived</Badge>; if (state === "draft") return <Badge variant="secondary">Draft</Badge>; if (state === "out") return <Badge variant="destructive">Out of stock</Badge>; if (state === "low") return <Badge variant="destructive">Low stock</Badge>; return <Badge>Active</Badge> }

export function ProductDetailContent({ productId }: { productId: string }) {
  const router = useRouter()
  const [product, setProduct] = React.useState<Product | null>(null)
  const [layout, setLayout] = React.useState<ProductLayout | null>(null)
  const [organization, setOrganization] = React.useState<OrganizationSummary | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [running, setRunning] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null)
  const [layoutOpen, setLayoutOpen] = React.useState(true)
  const [logsOpen, setLogsOpen] = React.useState(true)
  const [adjustOpen, setAdjustOpen] = React.useState(false)
  const [archiveOpen, setArchiveOpen] = React.useState(false)
  const [delta, setDelta] = React.useState("")
  const [reason, setReason] = React.useState("")
  const [adjustError, setAdjustError] = React.useState<string | null>(null)

  async function loadProduct() {
    setLoading(true); setError(null)
    try {
      const [result, org] = await Promise.all([apiFetch<Product>(`/api/products/${productId}`), apiFetch<OrganizationSummary>("/api/organization").catch(() => null)])
      const productLayoutId = result.metadata?.productTypeId || result.productTypeId
      const nextLayout = productLayoutId ? await apiFetch<ProductLayout>(`/api/products/types/${productLayoutId}`).catch(() => null) : null
      setProduct(result); setOrganization(org); setLayout(nextLayout)
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

  if (loading) return <div className="grid min-w-0 gap-4 p-4 md:p-6"><Skeleton className="h-12 w-72 max-w-full" /><Skeleton className="h-[680px] rounded-xl" /></div>
  if (!product || error) return <div className="grid min-w-0 gap-4 p-4 md:p-6"><Button asChild variant="outline" size="sm" className="w-fit"><Link href="/products"><ArrowLeftIcon className="size-4" />Back to products</Link></Button><div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5"><h2 className="flex items-center gap-2 font-semibold text-destructive"><TriangleAlertIcon className="size-4" />Product not available</h2><p className="mt-1 text-sm text-muted-foreground">{error || "The product could not be found."}</p></div></div>

  const baseCurrency = normalizeCurrency(organization?.baseCurrency || product.currency || product.priceCurrency || "ZAR")
  const priceCurrency = normalizeCurrency(product.priceCurrency || product.currency || baseCurrency)
  const costCurrency = normalizeCurrency(product.costCurrency || product.currency || priceCurrency)
  const costValue = product.cost ?? product.costPrice
  const images = product.images ?? []
  const primaryImage = selectedImage || images[0]
  const currentImageIndex = Math.max(0, images.findIndex((image) => image === primaryImage))
  const cleanDescription = cleanText(product.description)
  const productMetadata = product.metadata || {}
  const layoutName = productMetadata.productTypeName || layout?.name || "General product"
  const layoutKind = productMetadata.kind || layout?.kind || product.kind || "physical"
  const layoutTrackInventory = productMetadata.trackInventory ?? layout?.trackInventory ?? product.trackInventory ?? true
  const layoutCustomFields = product.customFields || productMetadata.customFields || {}
  const activeLayoutFields = [...(layout?.fields || [])].filter((field) => field.isActive !== false).sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))

  function showPreviousImage() { if (images.length < 2) return; setSelectedImage(images[(currentImageIndex - 1 + images.length) % images.length]) }
  function showNextImage() { if (images.length < 2) return; setSelectedImage(images[(currentImageIndex + 1) % images.length]) }

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
    { id: "createdAt", label: "Created", value: formatDate(product.createdAt) },
    { id: "updatedAt", label: "Updated", value: formatDate(product.updatedAt) },
  ]
  const layoutFields: ProductDataField[] = [
    { id: "layout-name", label: "Product layout", value: layoutName },
    { id: "layout-kind", label: "Item kind", value: productKindLabel(layoutKind) },
    { id: "layout-inventory", label: "Inventory tracking", value: layoutTrackInventory ? "Tracked" : "Not tracked" },
    { id: "layout-type-id", label: "Product type ID", value: productMetadata.productTypeId || product.productTypeId || "Not assigned", mono: true },
  ]
  const layoutAttributeFields: ProductDataField[] = activeLayoutFields.length
    ? activeLayoutFields.map((field) => formatLayoutValue(field, layoutCustomFields[field.key], baseCurrency))
    : Object.entries(layoutCustomFields).map(([key, value]) => ({ id: `layout-${key}`, label: productKindLabel(key), value: formatCustomValue(value), multiline: typeof value === "object" }))

  return (
    <div className="grid min-w-0 gap-5 p-4 md:p-6">
      <header className="grid min-w-0 gap-3 border-b pb-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2"><Link href="/products"><ArrowLeftIcon className="size-4" />Products</Link></Button>
          <div className="flex min-w-0 flex-wrap items-center gap-2"><h1 className="min-w-0 break-words font-heading text-2xl font-semibold tracking-tight">{cleanText(product.name) || "Product"}</h1><ProductBadge product={product} /><Badge variant="outline">{layoutName}</Badge></div>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Readable product profile with identity, pricing, layout values, suppliers, and stock movement.</p>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2 lg:justify-end"><Button variant="outline" size="sm" onClick={() => void loadProduct()} disabled={running}><RefreshCwIcon className="size-4" />Refresh</Button><Button variant="outline" size="sm" onClick={() => setAdjustOpen(true)} disabled={running}><WarehouseIcon className="size-4" />Adjust stock</Button><Button asChild size="sm" variant="outline"><Link href={`/products/${product.id}/edit`}><EditIcon className="size-4" />Edit</Link></Button><Button size="sm" variant="destructive" onClick={() => setArchiveOpen(true)} disabled={running}>{running ? <Loader2Icon className="size-4 animate-spin" /> : <ArchiveIcon className="size-4" />}Archive</Button></div>
      </header>

      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <main className="grid min-w-0 gap-6">
          <section className="grid min-w-0 gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <ProductImagePanel productName={cleanText(product.name)} images={images} primaryImage={primaryImage} currentImageIndex={currentImageIndex} onPrevious={showPreviousImage} onNext={showNextImage} />
            <DetailSection icon={<FileTextIcon className="size-4" />} title="Product details" description="Core fields stored on this product record."><FieldList fields={defaultFields} /></DetailSection>
          </section>

          <Collapsible open={layoutOpen} onOpenChange={setLayoutOpen}>
            <DetailSection
              icon={<BoxesIcon className="size-4" />}
              title="Product layout"
              description="Assigned product layout and layout-specific values."
              action={<CollapsibleTrigger asChild><Button type="button" variant="ghost" size="sm"><Badge variant="secondary">{layoutAttributeFields.length} values</Badge><ChevronDownIcon className={cn("size-4 transition-transform", layoutOpen && "rotate-180")} /></Button></CollapsibleTrigger>}
            >
              <CollapsibleContent className="grid gap-4"><FieldList fields={layoutFields} />{layoutAttributeFields.length ? <FieldList fields={layoutAttributeFields} /> : <EmptyLine>No layout-specific values have been saved for this product yet.</EmptyLine>}</CollapsibleContent>
            </DetailSection>
          </Collapsible>

          <section className="min-w-0"><ProductSuppliersSection productId={product.id} baseCurrency={baseCurrency} /></section>

          <Collapsible open={logsOpen} onOpenChange={setLogsOpen}>
            <DetailSection
              icon={<HistoryIcon className="size-4" />}
              title="Inventory movement"
              description="Stock adjustments with before/after quantity and reason."
              action={<CollapsibleTrigger asChild><Button type="button" variant="ghost" size="sm"><Badge variant="secondary">{product.inventoryLogs?.length ?? 0} logs</Badge><ChevronDownIcon className={cn("size-4 transition-transform", logsOpen && "rotate-180")} /></Button></CollapsibleTrigger>}
            >
              <CollapsibleContent className="grid gap-3">{product.inventoryLogs?.length ? product.inventoryLogs.map((log) => <InventoryLogRow key={log.id} log={log} />) : <EmptyLine>No inventory movement yet.</EmptyLine>}</CollapsibleContent>
            </DetailSection>
          </Collapsible>
        </main>

        <aside className="min-w-0 xl:sticky xl:top-[calc(var(--header-height)+1rem)]">
          <FloatingSummary product={product} layoutName={layoutName} layoutKind={layoutKind} layoutTrackInventory={layoutTrackInventory} baseCurrency={baseCurrency} priceCurrency={priceCurrency} />
        </aside>
      </div>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}><DialogContent><DialogHeader><DialogTitle>Adjust stock</DialogTitle><DialogDescription>Current stock is {numberValue(product.quantity).toLocaleString()} units. Add stock with a positive number or reduce stock with a negative number.</DialogDescription></DialogHeader><div className="grid gap-4">{adjustError ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{adjustError}</div> : null}<div className="grid gap-2"><Label htmlFor="delta">Adjustment quantity</Label><Input id="delta" value={delta} onChange={(event) => setDelta(event.target.value)} type="number" step="1" placeholder="Example: 10 or -3" /></div><div className="grid gap-2"><Label htmlFor="reason">Reason</Label><Textarea id="reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Stock count correction, supplier delivery, damaged goods..." className="min-h-24" /></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => setAdjustOpen(false)} disabled={running}>Cancel</Button><Button type="button" onClick={submitStockAdjustment} disabled={running}>{running ? <Loader2Icon className="size-4 animate-spin" /> : <WarehouseIcon className="size-4" />}Save adjustment</Button></DialogFooter></DialogContent></Dialog>
      <RecordActionDialog open={archiveOpen} onOpenChange={setArchiveOpen} busy={running} title="Archive product?" description={`This will archive "${cleanText(product.name) || "this product"}" and remove it from active inventory workflows. Historical data remains available.`} confirmLabel="Archive product" onConfirm={() => void archiveProduct()} />
    </div>
  )
}

function DetailSection({ icon, title, description, action, children }: { icon: React.ReactNode; title: string; description?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <section className="grid min-w-0 gap-4 border-b pb-6 last:border-b-0"><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><h2 className="flex min-w-0 items-center gap-2 font-semibold">{icon}<span className="min-w-0 break-words">{title}</span></h2>{description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}</div>{action ? <div className="shrink-0">{action}</div> : null}</div>{children}</section>
}
function ProductImagePanel({ productName, images, primaryImage, currentImageIndex, onPrevious, onNext }: { productName: string; images: string[]; primaryImage?: string; currentImageIndex: number; onPrevious: () => void; onNext: () => void }) {
  return <section className="min-w-0"><div className="relative aspect-square overflow-hidden rounded-xl border bg-muted">{primaryImage ? <img src={primaryImage} alt={productName || "Product image"} className="block h-full w-full object-cover" /> : <div className="flex h-full flex-col items-center justify-center text-muted-foreground"><ImageIcon className="size-10" /><p className="mt-3 text-sm font-medium">No image</p></div>}{images.length ? <div className="absolute bottom-3 right-3"><ButtonGroup className="rounded-lg bg-background/90 shadow-sm backdrop-blur"><Button type="button" variant="outline" size="icon" onClick={onPrevious} disabled={images.length < 2} aria-label="Previous product image" className="size-8"><ChevronLeftIcon className="size-4" /></Button><ButtonGroupText className="h-8 min-w-16 justify-center px-2 text-xs font-medium tabular-nums">{currentImageIndex + 1} / {images.length}</ButtonGroupText><Button type="button" variant="outline" size="icon" onClick={onNext} disabled={images.length < 2} aria-label="Next product image" className="size-8"><ChevronRightIcon className="size-4" /></Button></ButtonGroup></div> : null}</div></section>
}
function FloatingSummary({ product, layoutName, layoutKind, layoutTrackInventory, baseCurrency, priceCurrency }: { product: Product; layoutName: string; layoutKind: string; layoutTrackInventory: boolean; baseCurrency: string; priceCurrency: string }) {
  return <div className="grid min-w-0 gap-3 rounded-xl border bg-background/95 p-4 shadow-sm backdrop-blur"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Summary</p><h2 className="mt-1 break-words font-semibold">{cleanText(product.name) || "Product"}</h2></div><Separator /><SummaryLine label="SKU" value={product.sku || "No SKU"} mono /><SummaryLine label="Status" value={productState(product).replace("out", "Out of stock")} /><SummaryLine label="Layout" value={layoutName} /><SummaryLine label="Kind" value={productKindLabel(layoutKind)} /><SummaryLine label="Inventory" value={layoutTrackInventory ? "Tracked" : "Not tracked"} /><SummaryLine label={`Price (${priceCurrency})`} value={formatMoney(product.price, priceCurrency)} /><SummaryLine label="Base currency" value={baseCurrency} /><SummaryLine label="Stock" value={`${numberValue(product.quantity).toLocaleString()} units`} /><SummaryLine label="Updated" value={formatDate(product.updatedAt)} /></div>
}
function SummaryLine({ label, value, mono }: { label: string; value: string; mono?: boolean }) { return <div className="grid min-w-0 gap-1 text-sm"><span className="text-xs text-muted-foreground">{label}</span><span className={cn("min-w-0 break-words font-medium", mono && "font-mono text-xs")}>{value}</span></div> }
function FieldList({ fields }: { fields: ProductDataField[] }) { return <dl className="grid min-w-0 gap-x-6 gap-y-4 sm:grid-cols-2">{fields.map((field) => <div key={field.id} className={cn("min-w-0 border-t pt-3", field.multiline && "sm:col-span-2")}><dt className="flex min-w-0 flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"><span>{field.label}</span>{field.type ? <Badge variant="outline">{field.type}</Badge> : null}</dt><dd className="min-w-0"><FieldValue field={field} /></dd></div>)}</dl> }
function FieldValue({ field }: { field: ProductDataField }) {
  if (field.kind === "images" && Array.isArray(field.raw)) return <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{field.raw.map((url) => <a key={String(url)} href={String(url)} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-lg border bg-muted"><img src={String(url)} alt={field.label} className="aspect-square w-full object-cover transition group-hover:scale-105" /></a>)}</div>
  if (field.kind === "attachments" && Array.isArray(field.raw)) return <div className="mt-3 grid gap-2">{field.raw.map((item) => isAttachment(item) ? <a key={`${item.name}-${item.url}`} href={item.url} target="_blank" rel="noreferrer" className="flex min-w-0 items-center justify-between gap-3 rounded-lg border bg-background p-2 font-medium hover:bg-muted/40"><span className="min-w-0 truncate">{item.name || fileNameFromUrl(item.url)}</span><ExternalLinkIcon className="size-4 shrink-0 text-muted-foreground" /></a> : null)}</div>
  if (field.kind === "boolean") return <div className="mt-2"><Badge variant={field.raw ? "default" : "secondary"}>{field.value}</Badge></div>
  if (field.kind === "lookup" && isRecord(field.raw)) return <p className="mt-2 break-words font-medium">{String(field.raw.name || field.raw.id || field.value)}</p>
  return <p className={cn("mt-2 min-w-0 max-w-full overflow-hidden break-words font-medium", field.mono && "font-mono", field.multiline && "max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted/20 p-3 leading-6")}>{field.value}</p>
}
function EmptyLine({ children }: { children: React.ReactNode }) { return <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">{children}</div> }
function InventoryLogRow({ log }: { log: InventoryLog }) { return <div className="rounded-xl border p-4 text-sm"><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><p className="font-medium capitalize">{log.type.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-muted-foreground">{log.quantityBefore} to {log.quantityAfter} · {log.reason ?? "No reason"}</p></div><Badge variant={log.delta < 0 ? "destructive" : "secondary"}>{log.delta > 0 ? `+${log.delta}` : log.delta}</Badge></div><p className="mt-2 text-xs text-muted-foreground">{formatDate(log.createdAt)}{log.source ? ` · ${log.source}` : ""}</p></div> }
