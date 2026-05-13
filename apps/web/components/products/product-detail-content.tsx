"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArchiveIcon, ArrowLeftIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ClipboardListIcon, DatabaseZapIcon, EditIcon, ImageIcon, Loader2Icon, PackageIcon, RefreshCwIcon, RotateCcwIcon, TriangleAlertIcon } from "lucide-react"
import { toast } from "sonner"

import { ProductSuppliersSection } from "@/components/products/product-suppliers-section"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

type CustomValue = { fieldId?: string | null; field?: { label?: string | null; name?: string | null; key?: string | null } | null; label?: string | null; name?: string | null; key?: string | null; value: unknown }
type MovementLog = { id?: string; type?: string | null; reason?: string | null; beforeQuantity?: number | string | null; afterQuantity?: number | string | null; delta?: number | string | null; createdAt?: string | null; createdBy?: string | null }
type Product = { id: string; name: string; sku?: string | null; category?: string | null; description?: string | null; status?: string | null; quantity?: number | string | null; lowStockLevel?: number | string | null; price?: number | string | null; priceCurrency?: string | null; cost?: number | string | null; costPrice?: number | string | null; costCurrency?: string | null; convertedCost?: number | string | null; currency?: string | null; images?: string[] | null; customFieldValues?: CustomValue[] | null; inventoryLogs?: MovementLog[] | null; createdAt?: string | null; updatedAt?: string | null }

type SectionKey = "details" | "attributes" | "inventory"

function numberValue(value: unknown) { const next = Number(value ?? 0); return Number.isFinite(next) ? next : 0 }
function currency(product: Product) { return String(product.priceCurrency || product.currency || "USD").toUpperCase() }
function formatMoney(value: unknown, code = "USD") { return new Intl.NumberFormat("en", { style: "currency", currency: code, maximumFractionDigits: 2 }).format(numberValue(value)) }
function formatDate(value?: string | null) { if (!value) return "Not set"; const date = new Date(value); return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleString() }
function productState(product: Product) { const qty = numberValue(product.quantity); const low = numberValue(product.lowStockLevel); if (product.status === "archived") return "archived"; if (product.status === "draft") return "draft"; if (qty <= 0) return "out"; if (low > 0 && qty <= low) return "low"; return "active" }
function labelValue(value: unknown) { if (value === null || value === undefined || value === "") return "Not set"; if (typeof value === "object") return JSON.stringify(value); return String(value) }

export function ProductDetailContent({ productId }: { productId: string }) {
  const router = useRouter()
  const [product, setProduct] = React.useState<Product | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [running, setRunning] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [imageIndex, setImageIndex] = React.useState(0)
  const [openSections, setOpenSections] = React.useState<Record<SectionKey, boolean>>({ details: true, attributes: false, inventory: false })

  async function loadProduct() {
    setLoading(true)
    setError(null)
    try {
      const result = await apiFetch<Product>(`/api/products/${productId}`)
      setProduct(result)
      setImageIndex(0)
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
    try {
      await apiFetch(`/api/products/${product.id}`, { method: "DELETE" })
      toast.success("Product archived", { description: product.name })
      router.push("/products")
    } catch (err) {
      toast.error("Could not archive product", { description: err instanceof Error ? err.message : "Archive failed" })
    } finally {
      setRunning(false)
    }
  }

  if (loading) return <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6"><Skeleton className="h-12 w-72" /><Skeleton className="h-[720px] rounded-xl" /></div>

  if (!product || error) {
    return <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6"><Button asChild variant="outline" size="sm" className="w-fit"><Link href="/products"><ArrowLeftIcon className="size-4" />Back to products</Link></Button><Card className="border-destructive/30 bg-destructive/5"><CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><TriangleAlertIcon className="size-4" />Product not available</CardTitle><CardDescription>{error || "The product could not be found."}</CardDescription></CardHeader></Card></div>
  }

  const state = productState(product)
  const images = product.images?.filter(Boolean) ?? []
  const activeImage = images[imageIndex]
  const customFields = product.customFieldValues ?? []
  const inventoryLogs = product.inventoryLogs ?? []
  const baseCurrency = currency(product)

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2"><Link href="/products"><ArrowLeftIcon className="size-4" />Products</Link></Button>
          <div className="flex flex-wrap items-center gap-2"><h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">{product.name}</h1><ProductBadge state={state} /></div>
          <p className="mt-1 text-sm text-muted-foreground">Review identity, images, pricing, inventory, attributes, suppliers, and stock movement.</p>
        </div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => void loadProduct()} disabled={running}><RefreshCwIcon className="size-4" />Refresh</Button><Button asChild size="sm" variant="outline"><Link href={`/products/${product.id}/edit`}><EditIcon className="size-4" />Edit</Link></Button><Button size="sm" variant="destructive" onClick={archiveProduct} disabled={running}>{running ? <Loader2Icon className="size-4 animate-spin" /> : <ArchiveIcon className="size-4" />}Archive</Button></div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(18rem,0.72fr)_minmax(0,1.28fr)]">
        <aside className="grid h-fit gap-4 xl:sticky xl:top-20">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <SummaryCard title="SKU" value={product.sku || "No SKU"} detail="Product code" />
            <SummaryCard title="Stock on hand" value={numberValue(product.quantity).toLocaleString()} detail={`Alert: ${numberValue(product.lowStockLevel).toLocaleString()} units`} />
          </div>

          <Card className="overflow-hidden p-0">
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
              {activeImage ? <img src={activeImage} alt={product.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground"><ImageIcon className="size-10" /><span className="text-sm">No image</span></div>}
              {state === "low" || state === "out" ? <Badge variant={state === "out" ? "destructive" : "secondary"} className="absolute left-3 top-3 bg-background/80 text-foreground backdrop-blur">{state === "out" ? "Out of stock" : "Low stock"}</Badge> : null}
              {images.length > 1 ? <div className="absolute bottom-3 right-3 flex items-center overflow-hidden rounded-full border bg-background/75 text-sm shadow-sm backdrop-blur transition-opacity opacity-70 hover:opacity-100"><Button type="button" variant="ghost" size="icon" className="size-8 rounded-none" onClick={() => setImageIndex((current) => (current - 1 + images.length) % images.length)}><ChevronLeftIcon className="size-4" /></Button><span className="px-3 font-medium tabular-nums">{imageIndex + 1} / {images.length}</span><Button type="button" variant="ghost" size="icon" className="size-8 rounded-none" onClick={() => setImageIndex((current) => (current + 1) % images.length)}><ChevronRightIcon className="size-4" /></Button></div> : null}
            </div>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ClipboardListIcon className="size-4" />Quick facts</CardTitle></CardHeader>
            <CardContent className="grid gap-3 text-sm"><Fact label="SKU" value={product.sku || "Not set"} mono /><Fact label="Category" value={product.category || "Uncategorized"} /><Fact label="Selling price" value={formatMoney(product.price, baseCurrency)} /><Fact label="Current stock" value={`${numberValue(product.quantity).toLocaleString()} units`} /><Fact label="Images" value={`${images.length} image${images.length === 1 ? "" : "s"}`} /></CardContent>
          </Card>
        </aside>

        <main className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <SummaryCard title="Selling price" value={formatMoney(product.price, baseCurrency)} detail={`${baseCurrency} selling currency`} />
            <SummaryCard title="Fallback cost" value={formatMoney(product.cost ?? product.costPrice, product.costCurrency || baseCurrency)} detail="Used when no preferred supplier cost is available" />
            <SummaryCard title="Updated" value={formatDate(product.updatedAt)} detail={`Created ${formatDate(product.createdAt)}`} />
          </div>

          <CollapsibleSection icon={PackageIcon} title="Product details" description="Core fields stored for this product." count="Core" open={openSections.details} onOpenChange={() => setOpenSections((current) => ({ ...current, details: !current.details }))}>
            <div className="grid gap-0 overflow-hidden rounded-xl border md:grid-cols-2"><Detail label="Product name" value={product.name} /><Detail label="Status" value={product.status || state} /><Detail label="Description" value={product.description || "No description added."} wide /><Detail label="Supplier/fallback cost" value={formatMoney(product.cost ?? product.costPrice, product.costCurrency || baseCurrency)} /><Detail label="Current stock" value={`${numberValue(product.quantity).toLocaleString()} units`} /></div>
          </CollapsibleSection>

          <CollapsibleSection icon={DatabaseZapIcon} title="Attributes" description="Custom business attributes for this product." count={`${customFields.length} custom`} open={openSections.attributes} onOpenChange={() => setOpenSections((current) => ({ ...current, attributes: !current.attributes }))}>
            {customFields.length ? <div className="grid gap-0 overflow-hidden rounded-xl border md:grid-cols-2">{customFields.map((item, index) => <Detail key={`${item.fieldId || index}`} label={item.label || item.name || item.key || item.field?.label || item.field?.name || item.field?.key || `Attribute ${index + 1}`} value={labelValue(item.value)} />)}</div> : <EmptyState title="No custom attributes" description="Custom product fields will appear here once configured." />}
          </CollapsibleSection>

          <ProductSuppliersSection productId={product.id} baseCurrency={baseCurrency} />

          <CollapsibleSection icon={RotateCcwIcon} title="Inventory movement" description="Every stock adjustment is recorded with before/after quantity and reason." count={`${inventoryLogs.length} logs`} open={openSections.inventory} onOpenChange={() => setOpenSections((current) => ({ ...current, inventory: !current.inventory }))}>
            {inventoryLogs.length ? <div className="divide-y rounded-xl border">{inventoryLogs.map((log, index) => <div key={log.id || index} className="grid gap-1 p-4 text-sm"><div className="flex items-center justify-between gap-4"><p className="font-medium">{log.type || "Manual"}</p><Badge variant="outline">{numberValue(log.delta) > 0 ? `+${numberValue(log.delta)}` : numberValue(log.delta)}</Badge></div><p className="text-muted-foreground">{log.beforeQuantity ?? "-"} to {log.afterQuantity ?? "-"} · {log.reason || "No reason supplied"}</p><p className="text-xs text-muted-foreground">{formatDate(log.createdAt)} {log.createdBy ? `· ${log.createdBy}` : ""}</p></div>)}</div> : <EmptyState title="No movement logs" description="Stock movements will appear here after inventory is adjusted." />}
          </CollapsibleSection>
        </main>
      </div>
    </div>
  )
}

function ProductBadge({ state }: { state: string }) { if (state === "archived") return <Badge variant="outline">Archived</Badge>; if (state === "draft") return <Badge variant="secondary">Draft</Badge>; if (state === "out") return <Badge variant="destructive">Out of stock</Badge>; if (state === "low") return <Badge variant="secondary">Low stock</Badge>; return <Badge>Active</Badge> }
function SummaryCard({ title, value, detail }: { title: string; value: string; detail: string }) { return <Card className="overflow-hidden"><CardHeader><CardDescription>{title}</CardDescription><CardTitle className="text-2xl font-semibold tabular-nums">{value}</CardTitle></CardHeader><CardContent className="border-t bg-muted/30 py-3 text-sm text-muted-foreground">{detail}</CardContent></Card> }
function CollapsibleSection({ icon: Icon, title, description, count, open, onOpenChange, children }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string; count: string; open: boolean; onOpenChange: () => void; children: React.ReactNode }) { return <Card className="overflow-hidden"><button type="button" onClick={onOpenChange} className="flex w-full items-start justify-between gap-4 p-4 text-left transition hover:bg-muted/40"><div><CardTitle className="flex items-center gap-2 text-lg"><Icon className="size-4" />{title}</CardTitle><CardDescription className="mt-1">{description}</CardDescription></div><div className="flex shrink-0 items-center gap-2"><Badge variant="secondary">{count}</Badge><ChevronDownIcon className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} /></div></button>{open ? <CardContent className="border-t p-4">{children}</CardContent> : null}</Card> }
function Detail({ label, value, wide }: { label: string; value: string; wide?: boolean }) { return <div className={cn("grid gap-1 border-b p-4 md:border-r [&:nth-child(2n)]:md:border-r-0", wide && "md:col-span-2 md:border-r-0")}><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className="text-sm font-medium">{value}</p></div> }
function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) { return <div className="flex items-center justify-between gap-4 border-b pb-3 last:border-b-0 last:pb-0"><span className="text-muted-foreground">{label}</span><span className={cn("text-right font-medium", mono && "font-mono text-xs")}>{value}</span></div> }
function EmptyState({ title, description }: { title: string; description: string }) { return <div className="rounded-xl border border-dashed bg-muted/10 p-8 text-center"><p className="font-medium">{title}</p><p className="mt-1 text-sm text-muted-foreground">{description}</p></div> }
