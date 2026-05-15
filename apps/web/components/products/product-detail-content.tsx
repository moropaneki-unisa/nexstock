"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArchiveIcon,
  ArrowLeftIcon,
  BoxesIcon,
  ChevronDownIcon,
  EditIcon,
  ExternalLinkIcon,
  FileTextIcon,
  HistoryIcon,
  ImageIcon,
  InfoIcon,
  Loader2Icon,
  PackageIcon,
  RefreshCwIcon,
  TriangleAlertIcon,
  WarehouseIcon,
} from "lucide-react"
import { toast } from "sonner"

import { ProductSuppliersSection } from "@/components/products/product-suppliers-section"
import { RecordActionDialog } from "@/components/records/record-action-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { apiFetch } from "@/lib/api"
import { formatMoney, normalizeCurrencyCode, numberValue } from "@/lib/money"
import { cn } from "@/lib/utils"

type InventoryLog = { id: string; type: string; quantityBefore: number; quantityAfter: number; delta: number; reason?: string | null; source?: string | null; createdAt: string }
type ProductMetadata = { productTypeId?: string | null; productTypeName?: string | null; kind?: string | null; trackInventory?: boolean | null; customFields?: Record<string, unknown> | null }
type Product = { id: string; name: string; sku?: string | null; category?: string | null; description?: string | null; status?: string | null; quantity?: number | string | null; lowStockLevel?: number | string | null; price?: number | string | null; priceCurrency?: string | null; cost?: number | string | null; costPrice?: number | string | null; costCurrency?: string | null; convertedCost?: number | string | null; currency?: string | null; images?: string[] | null; inventoryLogs?: InventoryLog[] | null; productTypeId?: string | null; kind?: string | null; trackInventory?: boolean | null; customFields?: Record<string, unknown> | null; metadata?: ProductMetadata | null; createdAt?: string | null; updatedAt?: string | null }
type OrganizationSummary = { baseCurrency?: string | null }
type LayoutField = { id?: string; key: string; label: string; type?: string | null; order?: number | null; isActive?: boolean | null }
type ProductLayout = { id: string; name: string; kind?: string | null; trackInventory?: boolean | null; fields?: LayoutField[] | null }
type ProductDataField = { id: string; label: string; value: string; type?: string | null; mono?: boolean; multiline?: boolean; kind?: "images" | "attachments" | "lookup" | "boolean" | "currency"; raw?: unknown }
type AttachmentValue = { name: string; url: string }

function normalizeCurrency(value?: string | null, fallback = "ZAR") { return normalizeCurrencyCode(value, fallback) }
function formatDate(value?: string | null) { if (!value) return "Not set"; const date = new Date(value); return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleDateString() }
function cleanText(value?: string | null) { if (!value) return ""; return value.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/[ \t]+/g, " ").replace(/\n\s+/g, "\n").replace(/\n{3,}/g, "\n\n").trim() }
function truncateText(value: string, maxLength: number) { return value.length <= maxLength ? value : `${value.slice(0, maxLength).trim()}...` }
function productState(product: Product) { const quantity = numberValue(product.quantity); const lowStockLevel = numberValue(product.lowStockLevel); if (product.status === "archived") return "archived"; if (product.status === "draft") return "draft"; if (quantity <= 0) return "out"; if (lowStockLevel > 0 && quantity <= lowStockLevel) return "low"; return "active" }
function productKindLabel(value?: string | null) { return cleanText(value || "physical").replace(/_/g, " ").replace(/([A-Z])/g, " $1").replace(/\b\w/g, (char) => char.toUpperCase()).trim() }
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value && typeof value === "object" && !Array.isArray(value)) }
function isAttachment(value: unknown): value is AttachmentValue { return isRecord(value) && typeof value.url === "string" && typeof value.name === "string" }
function fileNameFromUrl(value: string) { try { const last = new URL(value).pathname.split("/").filter(Boolean).pop() || value; return decodeURIComponent(last).replace(/\.[^/.]+$/, "") } catch { return value.replace(/\.[^/.]+$/, "") } }
function formatCustomValue(value: unknown) { if (value === null || value === undefined || value === "") return "-"; if (typeof value === "object") return truncateText(JSON.stringify(value, null, 2), 220); return truncateText(cleanText(String(value)) || String(value), 220) }
function formatLayoutValue(field: LayoutField, value: unknown, fallbackCurrency: string): ProductDataField {
  const type = String(field.type || "text").toLowerCase()
  if (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) return { id: field.key, label: field.label || productKindLabel(field.key), value: "-", type }
  if (type === "currency" && isRecord(value)) return { id: field.key, label: field.label, value: formatMoney(value.amount ?? value.value ?? 0, normalizeCurrency(String(value.currency || fallbackCurrency), fallbackCurrency)), type, kind: "currency", raw: value }
  if (type === "images" && Array.isArray(value)) { const images = value.map((item) => String(item || "").trim()).filter(Boolean); return { id: field.key, label: field.label, value: `${images.length} image${images.length === 1 ? "" : "s"}`, type, kind: "images", raw: images } }
  if (type === "attachment" && Array.isArray(value)) { const attachments = value.filter(isAttachment); return { id: field.key, label: field.label, value: `${attachments.length} file${attachments.length === 1 ? "" : "s"}`, type, kind: "attachments", raw: attachments } }
  if (type === "lookup" && isRecord(value)) return { id: field.key, label: field.label, value: String(value.name || value.id || "-"), type, kind: "lookup", raw: value }
  if (type === "boolean") { const bool = value === true || value === "true"; return { id: field.key, label: field.label, value: bool ? "Yes" : "No", type, kind: "boolean", raw: bool } }
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
  const [adjustOpen, setAdjustOpen] = React.useState(false)
  const [archiveOpen, setArchiveOpen] = React.useState(false)
  const [delta, setDelta] = React.useState("")
  const [reason, setReason] = React.useState("")
  const [adjustError, setAdjustError] = React.useState<string | null>(null)

  async function loadProduct() {
    setLoading(true)
    setError(null)
    try {
      const [result, org] = await Promise.all([apiFetch<Product>(`/api/products/${productId}`), apiFetch<OrganizationSummary>("/api/organization").catch(() => null)])
      const productLayoutId = result.metadata?.productTypeId || result.productTypeId
      const nextLayout = productLayoutId ? await apiFetch<ProductLayout>(`/api/products/types/${productLayoutId}`).catch(() => null) : null
      setProduct(result)
      setOrganization(org)
      setLayout(nextLayout)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load product"
      setError(message)
      toast.error("Product could not load", { description: message })
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => { void loadProduct() }, [productId])

  async function archiveProduct() {
    if (!product) return
    setRunning(true)
    try { await apiFetch(`/api/products/${product.id}`, { method: "DELETE" }); toast.success("Product archived", { description: product.name }); router.push("/products") }
    catch (err) { toast.error("Could not archive product", { description: err instanceof Error ? err.message : "Archive failed" }) }
    finally { setRunning(false) }
  }

  async function submitStockAdjustment() {
    if (!product) return
    const numericDelta = Number(delta)
    setAdjustError(null)
    if (!Number.isInteger(numericDelta) || numericDelta === 0) return setAdjustError("Enter a whole number above or below zero. Example: 10 or -3.")
    if (numberValue(product.quantity) + numericDelta < 0) return setAdjustError("Stock cannot go below zero.")
    setRunning(true)
    try {
      await apiFetch(`/api/products/${product.id}/adjust`, { method: "POST", body: JSON.stringify({ delta: numericDelta, reason: reason.trim() || "Manual stock adjustment", source: "app" }) })
      setDelta("")
      setReason("")
      setAdjustOpen(false)
      toast.success("Stock adjusted")
      await loadProduct()
    } catch (err) { setAdjustError(err instanceof Error ? err.message : "Failed to adjust stock") }
    finally { setRunning(false) }
  }

  if (loading) return <div className="grid min-w-0 gap-4 p-4 md:p-6"><Skeleton className="h-12 w-72 max-w-full" /><Skeleton className="h-[700px]" /></div>
  if (!product || error) return <div className="grid min-w-0 gap-4 p-4 md:p-6"><Button asChild variant="outline" size="sm" className="w-fit"><Link href="/products"><ArrowLeftIcon className="size-4" />Back to products</Link></Button><div className="border border-destructive/30 bg-destructive/5 p-5"><h2 className="flex items-center gap-2 font-semibold text-destructive"><TriangleAlertIcon className="size-4" />Product not available</h2><p className="mt-1 text-sm text-muted-foreground">{error || "The product could not be found."}</p></div></div>

  const baseCurrency = normalizeCurrency(organization?.baseCurrency || product.currency || product.priceCurrency || "ZAR")
  const priceCurrency = normalizeCurrency(product.priceCurrency || product.currency || baseCurrency)
  const costCurrency = normalizeCurrency(product.costCurrency || product.currency || priceCurrency)
  const costValue = product.cost ?? product.costPrice
  const images = product.images ?? []
  const activeImage = selectedImage && images.includes(selectedImage) ? selectedImage : images[0]
  const cleanDescription = cleanText(product.description)
  const productMetadata = product.metadata || {}
  const layoutName = productMetadata.productTypeName || layout?.name || "General product"
  const layoutKind = productMetadata.kind || layout?.kind || product.kind || "physical"
  const layoutTrackInventory = productMetadata.trackInventory ?? layout?.trackInventory ?? product.trackInventory ?? true
  const layoutCustomFields = product.customFields || productMetadata.customFields || {}
  const activeLayoutFields = [...(layout?.fields || [])].filter((field) => field.isActive !== false).sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
  const layoutAttributeFields: ProductDataField[] = activeLayoutFields.length
    ? activeLayoutFields.map((field) => formatLayoutValue(field, layoutCustomFields[field.key], baseCurrency))
    : Object.entries(layoutCustomFields).map(([key, value]) => ({ id: `layout-${key}`, label: productKindLabel(key), value: formatCustomValue(value), multiline: typeof value === "object" }))
  const sku = product.sku || "-"
  const stock = numberValue(product.quantity)
  const lowStock = numberValue(product.lowStockLevel)
  const toOrder = Math.max(0, lowStock - stock)

  return (
    <div className="min-w-0 bg-background p-4 md:p-6">
      <div className="mx-auto grid max-w-7xl gap-6">
        <header className="grid min-w-0 gap-4 border-b pb-5">
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-muted-foreground"><Link href="/products" className="hover:text-foreground">Product</Link><span>/</span><span className="text-foreground">Product Detail</span></div>
          <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="flex min-w-0 flex-wrap items-center gap-3"><h1 className="break-words text-3xl font-bold tracking-tight uppercase">{cleanText(product.name) || "Product"}</h1><Badge variant="outline" className="px-3 py-1">Code: {sku}</Badge><ProductBadge product={product} /></div>
            <div className="flex min-w-0 flex-wrap gap-2 md:justify-end"><Button variant="ghost" size="sm" onClick={() => void loadProduct()} disabled={running}><RefreshCwIcon className="size-4" />Refresh</Button><Button asChild variant="outline"><Link href={`/products/${product.id}/edit`}><EditIcon className="size-4" />Edit</Link></Button><Button onClick={() => setAdjustOpen(true)} disabled={running}><WarehouseIcon className="size-4" />Update Quantity</Button><Button variant="destructive" onClick={() => setArchiveOpen(true)} disabled={running}>{running ? <Loader2Icon className="size-4 animate-spin" /> : <ArchiveIcon className="size-4" />}Archive</Button></div>
          </div>
        </header>

        <section className="grid min-w-0 gap-4 border p-4 md:grid-cols-[minmax(16rem,0.36fr)_minmax(0,0.64fr)] md:p-6">
          <ProductGallery productName={cleanText(product.name) || "Product"} images={images} activeImage={activeImage} sku={sku} category={cleanText(product.category) || "Uncategorized"} layoutName={layoutName} onSelect={setSelectedImage} />
          <div className="grid min-w-0 content-start gap-4">
            <div className="grid gap-4 sm:grid-cols-3"><StockBox label="On hand" value={stock.toLocaleString()} /><StockBox label="Low stock level" value={lowStock.toLocaleString()} /><StockBox label="To be ordered" value={toOrder.toLocaleString()} /></div>
            <QuickFacts price={formatMoney(product.price, priceCurrency)} cost={costValue == null ? "Not set" : formatMoney(costValue, costCurrency)} category={cleanText(product.category) || "Uncategorized"} updated={formatDate(product.updatedAt)} />
          </div>
        </section>

        <main className="grid min-w-0 gap-4">
          <section className="grid min-w-0 gap-4 border p-4">
            <div className="flex min-w-0 items-center gap-3">
              <InfoIcon className="size-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <h2 className="font-semibold">Basic information</h2>
                <p className="mt-1 text-sm text-muted-foreground">Name, SKU, category, layout and product classification.</p>
              </div>
            </div>
            <InfoGrid><InfoPair label="Product name" value={cleanText(product.name) || "-"} /><InfoPair label="Location" value="Default warehouse" /><InfoPair label="Vendor" value={layoutName} /><InfoPair label="Code" value={sku} mono /><InfoPair label="SKU" value={sku} mono /><InfoPair label="Images" value={`${images.length} picture${images.length === 1 ? "" : "s"}`} /><InfoPair label="Category" value={cleanText(product.category) || "Uncategorized"} /><InfoPair label="Kind" value={productKindLabel(layoutKind)} /></InfoGrid>
          </section>

          <DropdownSection defaultOpen icon={<span className="text-xl leading-none">$</span>} title="Sale information" summary="Pricing, cost, profit and currency information.">
            <InfoGrid><InfoPair label="Price" value={formatMoney(product.price, priceCurrency)} /><InfoPair label="Cost" value={costValue == null ? "Not set" : formatMoney(costValue, costCurrency)} /><InfoPair label="Profit" value={costValue == null ? "Not set" : formatMoney(numberValue(product.price) - numberValue(costValue), priceCurrency)} /><InfoPair label="Currency" value={priceCurrency} /><InfoPair label="Base currency" value={baseCurrency} /><InfoPair label="Converted cost" value={product.convertedCost == null ? "Not set" : formatMoney(product.convertedCost, baseCurrency)} /></InfoGrid>
          </DropdownSection>

          <DropdownSection defaultOpen icon={<PackageIcon className="size-5" />} title="Inventory" summary="Quantity tracking, low stock settings and last movement." action={<Button variant="ghost" size="sm" onClick={() => setAdjustOpen(true)}><HistoryIcon className="size-4" />Update Quantity</Button>}>
            <InfoGrid><InfoPair label="Quantity" value={stock.toLocaleString()} /><InfoPair label="Unit" value="Item" /><InfoPair label="Tracking" value={layoutTrackInventory ? "Tracked" : "Not tracked"} /><InfoPair label="Low stock" value={lowStock.toLocaleString()} /><InfoPair label="To order" value={toOrder.toLocaleString()} /><InfoPair label="Updated" value={formatDate(product.updatedAt)} /></InfoGrid>
          </DropdownSection>

          <DropdownSection icon={<BoxesIcon className="size-5" />} title="Layout fields" summary={`${layoutAttributeFields.length} custom field${layoutAttributeFields.length === 1 ? "" : "s"} from the product layout.`}>
            <div className="min-w-0 border">{layoutAttributeFields.length ? layoutAttributeFields.map((field, index) => <PlanRow key={field.id} title={field.label} subtitle={field.value} status={field.type || (index === 0 ? "Primary" : "Field")} progress={100} />) : <PlanRow title="No layout fields" subtitle="No layout-specific values saved" status="Empty" progress={10} />}</div>
          </DropdownSection>

          <DropdownSection icon={<FileTextIcon className="size-5" />} title="Notes and description" summary="Long product description is kept inside a controlled area so it does not break the layout.">
            <div className="max-h-56 overflow-y-auto border bg-muted/20 p-4 text-sm leading-6 whitespace-pre-wrap text-muted-foreground">{cleanDescription || "No description added."}</div>
          </DropdownSection>

          <DropdownSection defaultOpen icon={<WarehouseIcon className="size-5" />} title="Suppliers" summary="Supplier pricing and supplier-specific product details.">
            <ProductSuppliersSection productId={product.id} baseCurrency={baseCurrency} />
          </DropdownSection>

          <DropdownSection icon={<HistoryIcon className="size-5" />} title="Inventory movement history" summary={`${product.inventoryLogs?.length ?? 0} stock movement${(product.inventoryLogs?.length ?? 0) === 1 ? "" : "s"} recorded.`}>
            <div className="grid gap-3">{product.inventoryLogs?.length ? product.inventoryLogs.map((log) => <InventoryLogRow key={log.id} log={log} />) : <div className="border border-dashed p-6 text-center text-sm text-muted-foreground">No inventory movement yet.</div>}</div>
          </DropdownSection>
        </main>
      </div>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}><DialogContent><DialogHeader><DialogTitle>Adjust stock</DialogTitle><DialogDescription>Current stock is {stock.toLocaleString()} units. Add stock with a positive number or reduce stock with a negative number.</DialogDescription></DialogHeader><div className="grid gap-4">{adjustError ? <div className="border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{adjustError}</div> : null}<div className="grid gap-2"><Label htmlFor="delta">Adjustment quantity</Label><Input id="delta" value={delta} onChange={(event) => setDelta(event.target.value)} type="number" step="1" placeholder="Example: 10 or -3" /></div><div className="grid gap-2"><Label htmlFor="reason">Reason</Label><Textarea id="reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Stock count correction, supplier delivery, damaged goods..." className="min-h-24" /></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => setAdjustOpen(false)} disabled={running}>Cancel</Button><Button type="button" onClick={submitStockAdjustment} disabled={running}>{running ? <Loader2Icon className="size-4 animate-spin" /> : <WarehouseIcon className="size-4" />}Save adjustment</Button></DialogFooter></DialogContent></Dialog>
      <RecordActionDialog open={archiveOpen} onOpenChange={setArchiveOpen} busy={running} title="Archive product?" description={`This will archive "${cleanText(product.name) || "this product"}" and remove it from active inventory workflows. Historical data remains available.`} confirmLabel="Archive product" onConfirm={() => void archiveProduct()} />
    </div>
  )
}

function ProductGallery({ productName, images, activeImage, sku, category, layoutName, onSelect }: { productName: string; images: string[]; activeImage?: string; sku: string; category: string; layoutName: string; onSelect: (image: string) => void }) {
  return <div className="grid min-w-0 gap-4 border p-5"><div className="flex aspect-square min-h-72 items-center justify-center overflow-hidden bg-muted/40">{activeImage ? <img src={activeImage} alt={productName} className="h-full w-full object-cover" /> : <div className="grid place-items-center gap-3 text-center text-muted-foreground"><ImageIcon className="size-24 opacity-30" /><div><p className="font-medium text-foreground">No product image</p><p className="text-sm">Upload product pictures from the edit page.</p></div></div>}</div><div className="grid gap-3 border p-4"><div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold">Product media</h2><Badge variant="outline">{images.length} image{images.length === 1 ? "" : "s"}</Badge></div>{images.length ? <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-4 xl:grid-cols-5">{images.map((image, index) => <button key={`${image}-${index}`} type="button" onClick={() => onSelect(image)} className={cn("aspect-square overflow-hidden border bg-muted ring-offset-background transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", activeImage === image && "ring-2 ring-primary")}><img src={image} alt={`${productName} picture ${index + 1}`} className="h-full w-full object-cover" /></button>)}</div> : null}<div className="grid gap-2 border-t pt-3 text-sm"><MediaLine label="SKU" value={sku} mono /><MediaLine label="Category" value={category} /><MediaLine label="Layout" value={layoutName} /></div></div></div>
}
function DropdownSection({ icon, title, summary, action, defaultOpen = false, children }: { icon: React.ReactNode; title: string; summary?: string; action?: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode }) { const [open, setOpen] = React.useState(defaultOpen); return <Collapsible open={open} onOpenChange={setOpen} className="border"><div className="flex min-w-0 items-center justify-between gap-3 p-4"><CollapsibleTrigger asChild><button type="button" className="flex min-w-0 flex-1 items-start gap-3 text-left"><span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span><span className="min-w-0"><span className="block font-semibold">{title}</span>{summary ? <span className="mt-1 block text-sm text-muted-foreground">{summary}</span> : null}</span><ChevronDownIcon className={cn("ml-auto mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} /></button></CollapsibleTrigger>{action ? <div className="shrink-0">{action}</div> : null}</div><CollapsibleContent><div className="border-t p-4">{children}</div></CollapsibleContent></Collapsible> }
function QuickFacts({ price, cost, category, updated }: { price: string; cost: string; category: string; updated: string }) { return <div className="grid gap-3 border p-4 sm:grid-cols-2"><MediaLine label="Price" value={price} /><MediaLine label="Cost" value={cost} /><MediaLine label="Category" value={category} /><MediaLine label="Updated" value={updated} /></div> }
function MediaLine({ label, value, mono }: { label: string; value: string; mono?: boolean }) { return <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3"><span className="font-medium text-muted-foreground">{label}</span><span className={cn("min-w-0 break-words", mono && "font-mono text-xs")}>{value}</span></div> }
function StockBox({ label, value }: { label: string; value: string }) { return <div className="border p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-3 text-2xl font-bold">{value}</p></div> }
function InfoGrid({ children }: { children: React.ReactNode }) { return <div className="grid min-w-0 gap-x-10 gap-y-4 sm:grid-cols-2">{children}</div> }
function InfoPair({ label, value, mono }: { label: string; value: string; mono?: boolean }) { return <div className="grid min-w-0 grid-cols-[6.5rem_minmax(0,1fr)] gap-3 text-sm"><span className="font-semibold">{label}</span><span className={cn("min-w-0 break-words text-muted-foreground", mono && "font-mono text-xs")}>{value}</span></div> }
function PlanRow({ title, subtitle, status, progress }: { title: string; subtitle: string; status: string; progress: number }) { return <div className="grid min-w-0 gap-4 border-b p-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_7rem_8rem] sm:items-center"><div className="flex min-w-0 items-center gap-3"><BoxesIcon className="size-5 shrink-0 text-muted-foreground" /><div className="min-w-0"><p className="truncate font-medium">{title}</p><p className="truncate text-xs text-muted-foreground">{subtitle}</p></div></div><Badge variant="outline" className="w-fit">{status}</Badge><div className="h-1.5 overflow-hidden bg-muted"><div className="h-full bg-foreground" style={{ width: `${progress}%` }} /></div></div> }
function InventoryLogRow({ log }: { log: InventoryLog }) { return <div className="grid gap-2 border p-4 text-sm"><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><p className="font-medium capitalize">{log.type.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-muted-foreground">{log.quantityBefore} to {log.quantityAfter} · {log.reason ?? "No reason"}</p></div><Badge variant={log.delta < 0 ? "destructive" : "secondary"}>{log.delta > 0 ? `+${log.delta}` : log.delta}</Badge></div><p className="text-xs text-muted-foreground">{formatDate(log.createdAt)}{log.source ? ` · ${log.source}` : ""}</p></div> }
function FieldValue({ field, compact = false }: { field: ProductDataField; compact?: boolean }) {
  if (field.kind === "images" && Array.isArray(field.raw)) return <div className="grid grid-cols-3 gap-2">{field.raw.map((url) => <a key={String(url)} href={String(url)} target="_blank" rel="noreferrer" className="group overflow-hidden border bg-muted"><img src={String(url)} alt={field.label} className="aspect-square w-full object-cover transition group-hover:scale-105" /></a>)}</div>
  if (field.kind === "attachments" && Array.isArray(field.raw)) return <div className="grid gap-2">{field.raw.map((item) => isAttachment(item) ? <a key={`${item.name}-${item.url}`} href={item.url} target="_blank" rel="noreferrer" className="flex min-w-0 items-center justify-between gap-3 border bg-background p-2 font-medium hover:bg-muted/40"><span className="min-w-0 truncate">{item.name || fileNameFromUrl(item.url)}</span><ExternalLinkIcon className="size-4 shrink-0 text-muted-foreground" /></a> : null)}</div>
  if (field.kind === "boolean") return <Badge variant={field.raw ? "default" : "secondary"}>{field.value}</Badge>
  return <p className={cn("min-w-0 max-w-full break-words", field.mono && "font-mono", field.multiline && "max-h-32 overflow-y-auto whitespace-pre-wrap bg-muted/20 p-3 leading-6", compact && "text-sm")}>{field.value}</p>
}
