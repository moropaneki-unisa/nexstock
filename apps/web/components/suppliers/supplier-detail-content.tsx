"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArchiveIcon,
  ArrowLeftIcon,
  Building2Icon,
  ChevronDownIcon,
  EditIcon,
  Loader2Icon,
  MapPinIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  TruckIcon,
  WalletCardsIcon,
} from "lucide-react"
import { toast } from "sonner"

import { RecordActionDialog } from "@/components/records/record-action-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

type SupplierStatus = "active" | "archived"

type Supplier = {
  id: string
  supplierCode: string
  name: string
  supplierType?: string | null
  category?: string | null
  rating?: string | null
  contactName?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
  addressLine1?: string | null
  addressLine2?: string | null
  country?: string | null
  province?: string | null
  city?: string | null
  postalCode?: string | null
  currency?: string | null
  paymentTerms?: string | null
  paymentMethod?: string | null
  taxStatus?: string | null
  taxNumber?: string | null
  shippingTerms?: string | null
  incoterm?: string | null
  accountNumber?: string | null
  leadTimeDays?: number | null
  minimumOrderQty?: number | null
  lastOrderAt?: string | null
  customFields?: Record<string, unknown> | null
  notes?: string | null
  status: SupplierStatus
  _count?: { products?: number | null } | null
  createdAt?: string | null
  updatedAt?: string | null
}

function titleCase(value?: string | null) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatDate(value?: string | null) {
  if (!value) return "Not set"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not set"
  return date.toLocaleString()
}

function cleanValue(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "Not set"
  return String(value)
}

function SupplierStatusBadge({ supplier }: { supplier: Supplier }) {
  if (supplier.status === "archived") return <Badge variant="outline">Archived</Badge>
  if (supplier.rating === "preferred") return <Badge>Preferred</Badge>
  if (supplier.rating === "blocked") return <Badge variant="destructive">Blocked</Badge>
  return <Badge variant="secondary">Active</Badge>
}

export function SupplierDetailContent({ supplierId }: { supplierId: string }) {
  const [supplier, setSupplier] = React.useState<Supplier | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [running, setRunning] = React.useState(false)
  const [archiveOpen, setArchiveOpen] = React.useState(false)
  const [reactivateOpen, setReactivateOpen] = React.useState(false)
  const [detailsOpen, setDetailsOpen] = React.useState(true)
  const [contactOpen, setContactOpen] = React.useState(true)
  const [notesOpen, setNotesOpen] = React.useState(true)

  async function loadSupplier() {
    setLoading(true)
    try {
      const result = await apiFetch<Supplier>(`/api/suppliers/${supplierId}`)
      setSupplier(result)
    } catch (err) {
      toast.error("Supplier could not load", {
        description: err instanceof Error ? err.message : "Load failed",
      })
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    void loadSupplier()
  }, [supplierId])

  async function archiveSupplier() {
    if (!supplier) return
    setRunning(true)
    try {
      await apiFetch(`/api/suppliers/${supplier.id}`, { method: "DELETE" })
      toast.success("Supplier archived", { description: supplier.name })
      setArchiveOpen(false)
      await loadSupplier()
    } catch (err) {
      toast.error("Could not archive supplier", {
        description: err instanceof Error ? err.message : "Archive failed",
      })
    } finally {
      setRunning(false)
    }
  }

  async function reactivateSupplier() {
    if (!supplier) return
    setRunning(true)
    try {
      await apiFetch(`/api/suppliers/${supplier.id}/reactivate`, { method: "PATCH" })
      toast.success("Supplier reactivated", { description: supplier.name })
      setReactivateOpen(false)
      await loadSupplier()
    } catch (err) {
      toast.error("Could not reactivate supplier", {
        description: err instanceof Error ? err.message : "Reactivate failed",
      })
    } finally {
      setRunning(false)
    }
  }

  if (loading) {
    return (
      <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-[640px] rounded-xl" />
      </div>
    )
  }

  if (!supplier) {
    return (
      <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Button asChild variant="outline" size="sm" className="w-fit"><Link href="/suppliers"><ArrowLeftIcon className="size-4" />Back to suppliers</Link></Button>
        <Card className="border-destructive/30 bg-destructive/5"><CardHeader><CardTitle>Supplier not found</CardTitle><CardDescription>The supplier record could not be loaded.</CardDescription></CardHeader></Card>
      </div>
    )
  }

  const productLinks = supplier._count?.products ?? 0

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2"><Link href="/suppliers"><ArrowLeftIcon className="size-4" />Suppliers</Link></Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">{supplier.name}</h1>
            <SupplierStatusBadge supplier={supplier} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{supplier.supplierCode} · {titleCase(supplier.supplierType || "vendor")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadSupplier()} disabled={running}><RefreshCwIcon className="size-4" />Refresh</Button>
          <Button asChild size="sm" variant="outline"><Link href={`/suppliers/${supplier.id}/edit`}><EditIcon className="size-4" />Edit</Link></Button>
          {supplier.status === "archived" ? (
            <Button size="sm" onClick={() => setReactivateOpen(true)} disabled={running}>{running ? <Loader2Icon className="size-4 animate-spin" /> : <RotateCcwIcon className="size-4" />}Reactivate</Button>
          ) : (
            <Button size="sm" variant="destructive" onClick={() => setArchiveOpen(true)} disabled={running}>{running ? <Loader2Icon className="size-4 animate-spin" /> : <ArchiveIcon className="size-4" />}Archive</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
        <MetricCard title="Supplier code" value={supplier.supplierCode} detail="Locked identifier" icon={TruckIcon} mono />
        <MetricCard title="Currency" value={cleanValue(supplier.currency)} detail={cleanValue(supplier.paymentTerms)} icon={WalletCardsIcon} />
        <MetricCard title="Product links" value={productLinks} detail="Linked sourcing records" icon={Building2Icon} />
        <MetricCard title="Location" value={supplier.city || supplier.country || "Not set"} detail={[supplier.province, supplier.country].filter(Boolean).join(", ") || "No location"} icon={MapPinIcon} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_20rem]">
        <div className="grid gap-4">
          <DetailSection title="Supplier details" description="Core fields and purchasing settings for this supplier." open={detailsOpen} onOpenChange={setDetailsOpen} badge="17 fields">
            <FieldGrid fields={[["Name", supplier.name], ["Supplier code", supplier.supplierCode], ["Type", titleCase(supplier.supplierType || "vendor")], ["Category", cleanValue(supplier.category)], ["Rating", titleCase(supplier.rating || "unrated")], ["Status", titleCase(supplier.status)], ["Currency", cleanValue(supplier.currency)], ["Payment terms", cleanValue(supplier.paymentTerms)], ["Payment method", cleanValue(supplier.paymentMethod)], ["Tax status", titleCase(supplier.taxStatus || "unknown")], ["Tax number", cleanValue(supplier.taxNumber)], ["Shipping terms", cleanValue(supplier.shippingTerms)], ["Incoterm", cleanValue(supplier.incoterm)], ["Account number", cleanValue(supplier.accountNumber)], ["Lead time", supplier.leadTimeDays == null ? "Not set" : `${supplier.leadTimeDays} days`], ["Minimum order qty", cleanValue(supplier.minimumOrderQty)], ["Last order", formatDate(supplier.lastOrderAt)]]} />
          </DetailSection>

          <DetailSection title="Contact and address" description="Communication and supplier location details." open={contactOpen} onOpenChange={setContactOpen} badge="10 fields">
            <FieldGrid fields={[["Contact person", cleanValue(supplier.contactName)], ["Email", cleanValue(supplier.email)], ["Phone", cleanValue(supplier.phone)], ["Website", cleanValue(supplier.website)], ["Address line 1", cleanValue(supplier.addressLine1)], ["Address line 2", cleanValue(supplier.addressLine2)], ["City", cleanValue(supplier.city)], ["Province", cleanValue(supplier.province)], ["Country", cleanValue(supplier.country)], ["Postal code", cleanValue(supplier.postalCode)]]} />
          </DetailSection>

          <DetailSection title="Notes" description="Internal supplier notes and reminders." open={notesOpen} onOpenChange={setNotesOpen} badge={supplier.notes ? "Saved" : "Empty"}>
            <p className="whitespace-pre-wrap rounded-xl border bg-muted/10 p-4 text-sm leading-6 text-muted-foreground">
              {supplier.notes || "No notes saved for this supplier."}
            </p>
          </DetailSection>
        </div>

        <Card className="h-fit xl:sticky xl:top-[calc(var(--header-height)+1rem)]">
          <CardHeader><CardTitle>Quick facts</CardTitle><CardDescription>At-a-glance purchasing context.</CardDescription></CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <QuickFact label="Code" value={supplier.supplierCode} mono />
            <QuickFact label="Products" value={String(productLinks)} />
            <QuickFact label="Currency" value={cleanValue(supplier.currency)} />
            <QuickFact label="Lead time" value={supplier.leadTimeDays == null ? "Not set" : `${supplier.leadTimeDays} days`} />
            <QuickFact label="Updated" value={formatDate(supplier.updatedAt)} />
          </CardContent>
        </Card>
      </div>

      <RecordActionDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        busy={running}
        title="Archive supplier?"
        description={`This will archive "${supplier.name}" and remove it from active supplier workflows. Existing purchase history remains available.`}
        confirmLabel="Archive supplier"
        onConfirm={() => void archiveSupplier()}
      />
      <RecordActionDialog
        open={reactivateOpen}
        onOpenChange={setReactivateOpen}
        busy={running}
        variant="default"
        title="Reactivate supplier?"
        description={`This will make "${supplier.name}" available again for purchasing workflows.`}
        confirmLabel="Reactivate supplier"
        onConfirm={() => void reactivateSupplier()}
      />
    </div>
  )
}

function MetricCard({ title, value, detail, icon: Icon, mono }: { title: string; value: string | number; detail: string; icon: React.ComponentType<{ className?: string }>; mono?: boolean }) {
  return (
    <Card className="@container/card">
      <CardHeader><CardDescription>{title}</CardDescription><CardTitle className={cn("text-2xl font-semibold tabular-nums @[250px]/card:text-3xl", mono && "font-mono text-xl")}>{value}</CardTitle></CardHeader>
      <CardFooter className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{detail}</span><Icon className="size-4 text-muted-foreground" /></CardFooter>
    </Card>
  )
}

function DetailSection({ title, description, badge, open, onOpenChange, children }: { title: string; description: string; badge: string; open: boolean; onOpenChange: (open: boolean) => void; children: React.ReactNode }) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <Card>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex w-full items-start justify-between gap-4 p-4 text-left transition hover:bg-muted/40">
            <div><CardTitle>{title}</CardTitle><CardDescription className="mt-1">{description}</CardDescription></div>
            <div className="flex items-center gap-2"><Badge variant="secondary">{badge}</Badge><ChevronDownIcon className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} /></div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent><CardContent className="pt-0">{children}</CardContent></CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

function FieldGrid({ fields }: { fields: Array<[string, string | number]> }) {
  return <div className="grid overflow-hidden rounded-xl border md:grid-cols-2">{fields.map(([label, value]) => <div key={label} className="border-b p-4 text-sm transition hover:bg-muted/25 md:border-r even:md:border-r-0"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-2 break-words font-medium">{value}</p></div>)}</div>
}

function QuickFact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return <div className="flex items-center justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0"><span className="text-muted-foreground">{label}</span><span className={cn("truncate font-medium", mono && "font-mono text-xs")}>{value}</span></div>
}
