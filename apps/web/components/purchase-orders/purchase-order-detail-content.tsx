"use client"

import * as React from "react"
import Link from "next/link"
import { ArchiveIcon, ArrowLeftIcon, ChevronDownIcon, ClipboardListIcon, EditIcon, Loader2Icon, MailIcon, PackageCheckIcon, RefreshCwIcon, TruckIcon, WalletCardsIcon, WarehouseIcon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { apiFetch } from "@/lib/api"
import { formatMoney, numberValue } from "@/lib/money"
import { cn } from "@/lib/utils"

type PurchaseOrderStatus = "draft" | "ordered" | "partially_received" | "received" | "cancelled"
type Supplier = { id: string; supplierCode: string; name: string; currency?: string | null; email?: string | null; phone?: string | null; city?: string | null; country?: string | null }
type Product = { id: string; name: string; sku?: string | null; quantity?: number | string | null }
type ProductSupplier = { id: string; supplierId: string; productId: string; supplierSku?: string | null; cost?: string | number | null; currency?: string | null; isPreferred?: boolean | null; lastPurchaseAt?: string | null; supplier?: Supplier | null }
type PurchaseOrderLine = { id: string; productSupplierId?: string | null; supplierSku?: string | null; description?: string | null; quantityOrdered: number; quantityReceived?: number | null; unitCost: string | number; currency: string; lineTotal: string | number; notes?: string | null; product?: Product | null; productSupplier?: ProductSupplier | null }
type PurchaseOrder = { id: string; poNumber: string; status: PurchaseOrderStatus; currency: string; subtotal: string | number; expectedAt?: string | null; orderedAt?: string | null; receivedAt?: string | null; notes?: string | null; createdAt?: string | null; updatedAt?: string | null; supplier?: Supplier | null; lines?: PurchaseOrderLine[] }
type SendDocumentResponse = { ok?: boolean; message?: string; to?: string; subject?: string; providerMessageId?: string | null; generatedDocumentId?: string }
type DocumentTemplate = { id: string; name: string; type: string; kind?: string | null; description?: string | null; subjectTemplate?: string | null; emailTemplate?: string | null; isDefault?: boolean | null; isActive?: boolean | null }

function formatDate(value?: string | null) { if (!value) return "Not set"; const date = new Date(value); return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleString() }
function titleCase(value: string) { return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) }
function cleanValue(value?: string | number | null) { if (value === null || value === undefined || value === "") return "Not set"; return String(value) }
function clean(value: string) { const next = value.trim(); return next || undefined }
function remainingQuantity(line: PurchaseOrderLine) { return Math.max(0, line.quantityOrdered - numberValue(line.quantityReceived)) }
function linkedLineCount(lines: PurchaseOrderLine[]) { return lines.filter((line) => Boolean(line.productSupplierId || line.productSupplier)).length }
function StatusBadge({ status }: { status: PurchaseOrderStatus }) { if (status === "cancelled") return <Badge variant="destructive">Cancelled</Badge>; if (status === "received") return <Badge>Received</Badge>; if (status === "ordered") return <Badge variant="secondary">Ordered</Badge>; if (status === "partially_received") return <Badge variant="outline">Partially received</Badge>; return <Badge variant="outline">Draft</Badge> }

export function PurchaseOrderDetailContent({ purchaseOrderId }: { purchaseOrderId: string }) {
  const [order, setOrder] = React.useState<PurchaseOrder | null>(null)
  const [templates, setTemplates] = React.useState<DocumentTemplate[]>([])
  const [loading, setLoading] = React.useState(true)
  const [templatesLoading, setTemplatesLoading] = React.useState(false)
  const [running, setRunning] = React.useState(false)
  const [receiveOpen, setReceiveOpen] = React.useState(false)
  const [receiveNotes, setReceiveNotes] = React.useState("")
  const [receiveLines, setReceiveLines] = React.useState<Record<string, string>>({})
  const [sendOpen, setSendOpen] = React.useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = React.useState("default")
  const [sendTo, setSendTo] = React.useState("")
  const [sendSubject, setSendSubject] = React.useState("")
  const [sendMessage, setSendMessage] = React.useState("")
  const [detailsOpen, setDetailsOpen] = React.useState(true)
  const [linesOpen, setLinesOpen] = React.useState(true)
  const [supplierOpen, setSupplierOpen] = React.useState(true)
  const [notesOpen, setNotesOpen] = React.useState(true)

  async function loadOrder() {
    setLoading(true)
    try { setOrder(await apiFetch<PurchaseOrder>(`/api/purchase-orders/${purchaseOrderId}`)) }
    catch (err) { toast.error("Purchase order could not load", { description: err instanceof Error ? err.message : "Load failed" }) }
    finally { setLoading(false) }
  }

  async function loadTemplates() {
    setTemplatesLoading(true)
    try {
      const result = await apiFetch<DocumentTemplate[]>("/api/document-templates")
      const activePurchaseOrderTemplates = result
        .filter((template) => template.isActive !== false && template.type === "purchase_orders")
        .sort((a, b) => Number(Boolean(b.isDefault)) - Number(Boolean(a.isDefault)) || a.name.localeCompare(b.name))
      setTemplates(activePurchaseOrderTemplates)
      setSelectedTemplateId((current) => current !== "default" && activePurchaseOrderTemplates.some((template) => template.id === current) ? current : activePurchaseOrderTemplates.find((template) => template.isDefault)?.id || "default")
    } catch (err) {
      setTemplates([])
      toast.error("Templates could not load", { description: err instanceof Error ? err.message : "Template load failed" })
    } finally {
      setTemplatesLoading(false)
    }
  }

  React.useEffect(() => { void loadOrder() }, [purchaseOrderId])

  function openReceiveDialog() {
    if (!order) return
    const next: Record<string, string> = {}
    for (const line of order.lines ?? []) next[line.id] = remainingQuantity(line) ? String(remainingQuantity(line)) : "0"
    setReceiveLines(next)
    setReceiveNotes(`Received against ${order.poNumber}`)
    setReceiveOpen(true)
  }

  function openSendDialog() {
    if (!order) return
    const fallbackTo = order.supplier?.email || ""
    setSendTo(fallbackTo)
    setSendSubject("")
    setSendMessage("")
    setSendOpen(true)
    void loadTemplates()
    if (!fallbackTo) toast.warning("Supplier email is missing", { description: "Enter the recipient email manually before sending." })
  }

  async function sendDocument() {
    if (!order) return
    if (!sendTo.trim()) return toast.error("Recipient email is required")
    setRunning(true)
    try {
      const response = await apiFetch<SendDocumentResponse>(`/api/purchase-orders/${order.id}/send-document`, {
        method: "POST",
        body: JSON.stringify({
          templateId: selectedTemplateId === "default" ? undefined : selectedTemplateId,
          to: sendTo.trim(),
          subject: clean(sendSubject),
          message: clean(sendMessage),
        }),
      })
      toast.success(response.message || "Purchase order email sent", { description: [response.to, response.providerMessageId ? `Resend ID: ${response.providerMessageId}` : null].filter(Boolean).join(" · ") })
      setSendOpen(false)
      await loadOrder()
    } catch (err) { toast.error("Could not send purchase order email", { description: err instanceof Error ? err.message : "Send failed" }) }
    finally { setRunning(false) }
  }

  async function receiveOrder() {
    if (!order) return
    const lines = (order.lines ?? []).map((line) => ({ lineId: line.id, quantityReceived: Math.max(0, Math.floor(numberValue(receiveLines[line.id]))) }))
    const hasReceived = lines.some((line) => line.quantityReceived > 0)
    if (!hasReceived) return toast.error("Enter received quantity for at least one line")
    setRunning(true)
    try {
      const response = await apiFetch<PurchaseOrder>(`/api/purchase-orders/${order.id}/receive`, { method: "POST", body: JSON.stringify({ lines, notes: receiveNotes.trim() || undefined }) })
      toast.success("Purchase order received", { description: `${response.poNumber} is now ${titleCase(response.status)}. Stock and supplier costs were updated.` })
      setReceiveOpen(false)
      await loadOrder()
    } catch (err) { toast.error("Could not receive purchase order", { description: err instanceof Error ? err.message : "Receive failed" }) }
    finally { setRunning(false) }
  }

  async function cancelOrder() {
    if (!order) return
    setRunning(true)
    try { const response = await apiFetch<PurchaseOrder>(`/api/purchase-orders/${order.id}`, { method: "DELETE" }); toast.success("Purchase order cancelled", { description: response.poNumber }); await loadOrder() }
    catch (err) { toast.error("Could not cancel purchase order", { description: err instanceof Error ? err.message : "Cancel failed" }) }
    finally { setRunning(false) }
  }

  if (loading) return <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6"><Skeleton className="h-12 w-72" /><Skeleton className="h-[640px] rounded-xl" /></div>
  if (!order) return <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6"><Button asChild variant="outline" size="sm" className="w-fit"><Link href="/purchase-orders"><ArrowLeftIcon className="size-4" />Back to purchase orders</Link></Button><Card className="border-destructive/30 bg-destructive/5"><CardHeader><CardTitle>Purchase order not found</CardTitle><CardDescription>The purchase order record could not be loaded.</CardDescription></CardHeader></Card></div>

  const lines = order.lines ?? []
  const lineCount = lines.length
  const receivedQty = lines.reduce((sum, line) => sum + numberValue(line.quantityReceived), 0)
  const orderedQty = lines.reduce((sum, line) => sum + numberValue(line.quantityOrdered), 0)
  const linkedLines = linkedLineCount(lines)
  const canReceive = order.status !== "cancelled" && order.status !== "received" && lines.some((line) => numberValue(line.quantityReceived) < line.quantityOrdered)
  const canSend = order.status !== "cancelled"
  const selectedTemplate = selectedTemplateId === "default" ? null : templates.find((template) => template.id === selectedTemplateId)

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2"><Link href="/purchase-orders"><ArrowLeftIcon className="size-4" />Purchase orders</Link></Button>
          <div className="flex flex-wrap items-center gap-2"><h1 className="font-heading text-2xl font-semibold tracking-tight">{order.poNumber}</h1><StatusBadge status={order.status} /></div>
          <p className="mt-1 text-sm text-muted-foreground">{order.supplier?.name || "No supplier"} · {formatMoney(order.subtotal, order.currency)}</p>
        </div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => void loadOrder()} disabled={running}><RefreshCwIcon className="size-4" />Refresh</Button><Button size="sm" onClick={openSendDialog} disabled={!canSend || running}><MailIcon className="size-4" />Send email</Button><Button size="sm" onClick={openReceiveDialog} disabled={!canReceive || running}><WarehouseIcon className="size-4" />Receive stock</Button><Button asChild size="sm" variant="outline"><Link href={`/purchase-orders/${order.id}/edit`}><EditIcon className="size-4" />Edit</Link></Button><Button size="sm" variant="destructive" onClick={cancelOrder} disabled={running || order.status === "cancelled"}>{running ? <Loader2Icon className="size-4 animate-spin" /> : <ArchiveIcon className="size-4" />}Cancel</Button></div>
      </div>

      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
        <MetricCard title="Subtotal" value={formatMoney(order.subtotal, order.currency)} detail={order.currency} icon={WalletCardsIcon} />
        <MetricCard title="Lines" value={lineCount} detail={`${orderedQty} units ordered`} icon={ClipboardListIcon} />
        <MetricCard title="Received" value={receivedQty} detail={`${Math.max(0, orderedQty - receivedQty)} units remaining`} icon={PackageCheckIcon} />
        <MetricCard title="Supplier links" value={`${linkedLines}/${lineCount}`} detail="Lines connected to supplier cost" icon={TruckIcon} mono />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_20rem]">
        <div className="grid gap-4">
          <DetailSection title="Purchase order details" description="Status, timeline, and order metadata." open={detailsOpen} onOpenChange={setDetailsOpen} badge="8 fields"><FieldGrid fields={[["PO number", order.poNumber], ["Status", titleCase(order.status)], ["Currency", order.currency], ["Subtotal", formatMoney(order.subtotal, order.currency)], ["Expected", formatDate(order.expectedAt)], ["Ordered", formatDate(order.orderedAt)], ["Received", formatDate(order.receivedAt)], ["Created", formatDate(order.createdAt)]]} /></DetailSection>
          <DetailSection title="Order lines" description="Products, supplier SKU, linked supplier cost, received quantities, and totals." open={linesOpen} onOpenChange={setLinesOpen} badge={`${lineCount} lines`}><LinesTable lines={lines} currency={order.currency} /></DetailSection>
          <DetailSection title="Supplier" description="Supplier linked to this purchase order." open={supplierOpen} onOpenChange={setSupplierOpen} badge={order.supplier?.supplierCode || "None"}><FieldGrid fields={[["Supplier", cleanValue(order.supplier?.name)], ["Supplier code", cleanValue(order.supplier?.supplierCode)], ["Email", cleanValue(order.supplier?.email)], ["Phone", cleanValue(order.supplier?.phone)], ["City", cleanValue(order.supplier?.city)], ["Country", cleanValue(order.supplier?.country)]]} /></DetailSection>
          <DetailSection title="Notes" description="Internal purchase order notes." open={notesOpen} onOpenChange={setNotesOpen} badge={order.notes ? "Saved" : "Empty"}><p className="whitespace-pre-wrap rounded-xl border bg-muted/10 p-4 text-sm leading-6 text-muted-foreground">{order.notes || "No notes saved for this purchase order."}</p></DetailSection>
        </div>
        <Card className="h-fit xl:sticky xl:top-[calc(var(--header-height)+1rem)]"><CardHeader><CardTitle>Quick facts</CardTitle><CardDescription>At-a-glance purchasing context.</CardDescription></CardHeader><CardContent className="grid gap-3 text-sm"><QuickFact label="PO" value={order.poNumber} mono /><QuickFact label="Status" value={titleCase(order.status)} /><QuickFact label="Supplier" value={order.supplier?.name || "Not set"} /><QuickFact label="Linked lines" value={`${linkedLines}/${lineCount}`} /><QuickFact label="Expected" value={formatDate(order.expectedAt)} /><QuickFact label="Updated" value={formatDate(order.updatedAt)} /></CardContent></Card>
      </div>

      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>Send purchase order email</DialogTitle><DialogDescription>Select a saved purchase order template, then optionally override subject or message for this send only.</DialogDescription></DialogHeader>
          <div className="grid gap-4">
            <label className="grid gap-2"><Label>Template</Label><Select value={selectedTemplateId} onValueChange={setSelectedTemplateId} disabled={templatesLoading}><SelectTrigger className="w-full"><SelectValue placeholder={templatesLoading ? "Loading templates..." : "Choose template"} /></SelectTrigger><SelectContent><SelectItem value="default">System default template</SelectItem>{templates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}{template.isDefault ? " · Default" : ""}{template.kind ? ` · ${template.kind.toUpperCase()}` : ""}</SelectItem>)}</SelectContent></Select>{selectedTemplate ? <p className="text-xs text-muted-foreground">{selectedTemplate.description || selectedTemplate.subjectTemplate || "Saved template selected."}</p> : <p className="text-xs text-muted-foreground">Uses the default active purchase order template from Settings &gt; Templates when available.</p>}</label>
            <label className="grid gap-2"><Label>To</Label><Input type="email" value={sendTo} onChange={(event) => setSendTo(event.target.value)} placeholder="supplier@example.com" /></label>
            <label className="grid gap-2"><Label>Subject override</Label><Input value={sendSubject} onChange={(event) => setSendSubject(event.target.value)} placeholder="Leave blank to use the selected template subject" /></label>
            <label className="grid gap-2"><Label>Message override</Label><Textarea value={sendMessage} onChange={(event) => setSendMessage(event.target.value)} className="min-h-36" placeholder="Leave blank to use the selected template email message" /></label>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setSendOpen(false)} disabled={running}>Cancel</Button><Button type="button" onClick={sendDocument} disabled={running}>{running ? <Loader2Icon className="size-4 animate-spin" /> : <MailIcon className="size-4" />}Send email</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader><DialogTitle>Receive stock</DialogTitle><DialogDescription>Enter quantities received now. Product stock, purchase order status, and linked supplier costs will update automatically.</DialogDescription></DialogHeader>
          <div className="grid gap-4">
            <div className="overflow-hidden rounded-xl border"><Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Supplier SKU</TableHead><TableHead className="text-right">Ordered</TableHead><TableHead className="text-right">Received</TableHead><TableHead className="text-right">Remaining</TableHead><TableHead className="text-right">Unit cost</TableHead><TableHead className="w-36 text-right">Receive now</TableHead></TableRow></TableHeader><TableBody>{lines.map((line) => { const already = numberValue(line.quantityReceived); const remaining = remainingQuantity(line); return <TableRow key={line.id}><TableCell><div className="grid gap-1"><span className="font-medium">{line.product?.name || line.description || "Product"}</span><span className="font-mono text-xs text-muted-foreground">{line.product?.sku || "-"}</span>{line.productSupplier?.isPreferred ? <Badge variant="secondary" className="w-fit">Preferred supplier</Badge> : null}</div></TableCell><TableCell className="font-mono text-xs">{line.supplierSku || line.productSupplier?.supplierSku || "-"}</TableCell><TableCell className="text-right">{line.quantityOrdered}</TableCell><TableCell className="text-right">{already}</TableCell><TableCell className="text-right">{remaining}</TableCell><TableCell className="text-right">{formatMoney(line.unitCost, line.currency || order.currency)}</TableCell><TableCell><Input type="number" min="0" max={remaining} value={receiveLines[line.id] ?? "0"} onChange={(event) => setReceiveLines((current) => ({ ...current, [line.id]: event.target.value }))} className="text-right" /></TableCell></TableRow> })}</TableBody></Table></div>
            <label className="grid gap-2"><Label>Receiving notes</Label><Textarea value={receiveNotes} onChange={(event) => setReceiveNotes(event.target.value)} className="min-h-24" /></label>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setReceiveOpen(false)} disabled={running}>Cancel</Button><Button type="button" onClick={receiveOrder} disabled={running}>{running ? <Loader2Icon className="size-4 animate-spin" /> : <WarehouseIcon className="size-4" />}Receive stock</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MetricCard({ title, value, detail, icon: Icon, mono }: { title: string; value: string | number; detail: string; icon: React.ComponentType<{ className?: string }>; mono?: boolean }) { return <Card className="@container/card"><CardHeader><CardDescription>{title}</CardDescription><CardTitle className={cn("text-2xl font-semibold tabular-nums @[250px]/card:text-3xl", mono && "font-mono text-xl")}>{value}</CardTitle></CardHeader><CardFooter className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{detail}</span><Icon className="size-4 text-muted-foreground" /></CardFooter></Card> }
function DetailSection({ title, description, badge, open, onOpenChange, children }: { title: string; description: string; badge: string; open: boolean; onOpenChange: (open: boolean) => void; children: React.ReactNode }) { return <Collapsible open={open} onOpenChange={onOpenChange}><Card><CollapsibleTrigger asChild><button type="button" className="flex w-full items-start justify-between gap-4 p-4 text-left transition hover:bg-muted/40"><div><CardTitle>{title}</CardTitle><CardDescription className="mt-1">{description}</CardDescription></div><div className="flex items-center gap-2"><Badge variant="secondary">{badge}</Badge><ChevronDownIcon className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} /></div></button></CollapsibleTrigger><CollapsibleContent><CardContent className="pt-0">{children}</CardContent></CollapsibleContent></Card></Collapsible> }
function FieldGrid({ fields }: { fields: Array<[string, string | number]> }) { return <div className="grid overflow-hidden rounded-xl border md:grid-cols-2">{fields.map(([label, value]) => <div key={label} className="border-b p-4 text-sm transition hover:bg-muted/25 md:border-r even:md:border-r-0"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-2 break-words font-medium">{value}</p></div>)}</div> }
function LinesTable({ lines, currency }: { lines: PurchaseOrderLine[]; currency: string }) { return <div className="overflow-hidden rounded-xl border"><Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Supplier SKU</TableHead><TableHead>Supplier link</TableHead><TableHead className="text-right">Ordered</TableHead><TableHead className="text-right">Received</TableHead><TableHead className="text-right">Remaining</TableHead><TableHead className="text-right">Unit cost</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>{lines.map((line) => { const received = numberValue(line.quantityReceived); const linkCurrency = line.productSupplier?.currency || line.currency || currency; return <TableRow key={line.id}><TableCell><div className="grid gap-1"><span className="font-medium">{line.product?.name || line.description || "Product"}</span><span className="font-mono text-xs text-muted-foreground">{line.product?.sku || "-"}</span></div></TableCell><TableCell className="font-mono text-xs">{line.supplierSku || line.productSupplier?.supplierSku || "-"}</TableCell><TableCell><div className="flex flex-wrap items-center gap-1">{line.productSupplierId || line.productSupplier ? <Badge variant={line.productSupplier?.isPreferred ? "default" : "secondary"}>{line.productSupplier?.isPreferred ? "Preferred" : "Linked"}</Badge> : <Badge variant="outline">Manual</Badge>}{line.productSupplier?.cost ? <Badge variant="outline">{formatMoney(line.productSupplier.cost, linkCurrency)}</Badge> : null}</div></TableCell><TableCell className="text-right">{line.quantityOrdered}</TableCell><TableCell className="text-right">{received}</TableCell><TableCell className="text-right">{Math.max(0, line.quantityOrdered - received)}</TableCell><TableCell className="text-right">{formatMoney(line.unitCost, line.currency || currency)}</TableCell><TableCell className="text-right font-medium">{formatMoney(line.lineTotal, line.currency || currency)}</TableCell></TableRow> })}</TableBody></Table></div> }
function QuickFact({ label, value, mono }: { label: string; value: string; mono?: boolean }) { return <div className="flex items-center justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0"><span className="text-muted-foreground">{label}</span><span className={cn("truncate font-medium", mono && "font-mono text-xs")}>{value}</span></div> }
