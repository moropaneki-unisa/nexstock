"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArchiveIcon,
  ArrowLeftIcon,
  Building2Icon,
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

type FieldValue = string | number

type FieldItem = {
  label: string
  value: FieldValue
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

function formatCustomValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "Not set"
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function customFieldItems(fields?: Record<string, unknown> | null): FieldItem[] {
  if (!fields) return []
  return Object.entries(fields).map(([key, value]) => ({
    label: titleCase(key),
    value: formatCustomValue(value),
  }))
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

  if (loading) return <SupplierDetailSkeleton />

  if (!supplier) {
    return (
      <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link href="/suppliers"><ArrowLeftIcon className="size-4" />Back to suppliers</Link>
        </Button>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle>Supplier not found</CardTitle>
            <CardDescription>The supplier record could not be loaded.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const productLinks = supplier._count?.products ?? 0
  const location = [supplier.city, supplier.province, supplier.country].filter(Boolean).join(", ") || "Not set"
  const customFields = customFieldItems(supplier.customFields)

  const supplierInfo: FieldItem[] = [
    { label: "Name", value: supplier.name },
    { label: "Supplier code", value: supplier.supplierCode },
    { label: "Type", value: titleCase(supplier.supplierType || "vendor") },
    { label: "Category", value: cleanValue(supplier.category) },
    { label: "Rating", value: titleCase(supplier.rating || "unrated") },
    { label: "Status", value: titleCase(supplier.status) },
  ]

  const purchasing: FieldItem[] = [
    { label: "Currency", value: cleanValue(supplier.currency) },
    { label: "Payment terms", value: cleanValue(supplier.paymentTerms) },
    { label: "Payment method", value: cleanValue(supplier.paymentMethod) },
    { label: "Tax status", value: titleCase(supplier.taxStatus || "unknown") },
    { label: "Tax number", value: cleanValue(supplier.taxNumber) },
    { label: "Shipping terms", value: cleanValue(supplier.shippingTerms) },
    { label: "Incoterm", value: cleanValue(supplier.incoterm) },
    { label: "Account number", value: cleanValue(supplier.accountNumber) },
    { label: "Lead time", value: supplier.leadTimeDays == null ? "Not set" : `${supplier.leadTimeDays} days` },
    { label: "Minimum order qty", value: cleanValue(supplier.minimumOrderQty) },
    { label: "Last order", value: formatDate(supplier.lastOrderAt) },
  ]

  const contact: FieldItem[] = [
    { label: "Contact person", value: cleanValue(supplier.contactName) },
    { label: "Email", value: cleanValue(supplier.email) },
    { label: "Phone", value: cleanValue(supplier.phone) },
    { label: "Website", value: cleanValue(supplier.website) },
  ]

  const address: FieldItem[] = [
    { label: "Address line 1", value: cleanValue(supplier.addressLine1) },
    { label: "Address line 2", value: cleanValue(supplier.addressLine2) },
    { label: "City", value: cleanValue(supplier.city) },
    { label: "Province", value: cleanValue(supplier.province) },
    { label: "Country", value: cleanValue(supplier.country) },
    { label: "Postal code", value: cleanValue(supplier.postalCode) },
  ]

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2 w-fit">
            <Link href="/suppliers"><ArrowLeftIcon className="size-4" />Suppliers</Link>
          </Button>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="min-w-0 break-words font-heading text-2xl font-semibold tracking-tight">{supplier.name}</h1>
            <SupplierStatusBadge supplier={supplier} />
          </div>
          <p className="mt-1 min-w-0 break-words text-sm text-muted-foreground">
            {supplier.supplierCode} · {titleCase(supplier.supplierType || "vendor")}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          <Button variant="outline" size="sm" onClick={() => void loadSupplier()} disabled={running}>
            <RefreshCwIcon className="size-4" />Refresh
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/suppliers/${supplier.id}/edit`}><EditIcon className="size-4" />Edit</Link>
          </Button>
          {supplier.status === "archived" ? (
            <Button size="sm" onClick={() => setReactivateOpen(true)} disabled={running}>
              {running ? <Loader2Icon className="size-4 animate-spin" /> : <RotateCcwIcon className="size-4" />}
              Reactivate
            </Button>
          ) : (
            <Button size="sm" variant="destructive" onClick={() => setArchiveOpen(true)} disabled={running}>
              {running ? <Loader2Icon className="size-4 animate-spin" /> : <ArchiveIcon className="size-4" />}
              Archive
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-wrap gap-4">
        <MetricCard title="Supplier code" value={supplier.supplierCode} detail="Locked identifier" icon={TruckIcon} mono />
        <MetricCard title="Currency" value={cleanValue(supplier.currency)} detail={cleanValue(supplier.paymentTerms)} icon={WalletCardsIcon} />
        <MetricCard title="Product links" value={productLinks} detail="Linked sourcing records" icon={Building2Icon} />
        <MetricCard title="Location" value={location} detail="Supplier region" icon={MapPinIcon} />
      </div>

      <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start">
        <main className="flex min-w-0 flex-1 flex-col gap-4">
          <SectionCard title="Supplier details" description="Core profile and purchasing setup.">
            <FieldGroup title="Supplier information" fields={supplierInfo} />
            <FieldGroup title="Purchasing settings" fields={purchasing} />
          </SectionCard>

          <SectionCard title="Contact and address" description="Communication and physical address details.">
            <FieldGroup title="Primary contact" fields={contact} />
            <FieldGroup title="Address" fields={address} />
          </SectionCard>

          {customFields.length ? (
            <SectionCard title="Custom fields" description="Additional supplier data.">
              <FieldGroup title="Saved custom fields" fields={customFields} />
            </SectionCard>
          ) : null}

          <SectionCard title="Notes" description="Internal supplier notes and reminders.">
            <p className="min-w-0 whitespace-pre-wrap break-words rounded-xl border bg-muted/10 p-4 text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">
              {supplier.notes || "No notes saved for this supplier."}
            </p>
          </SectionCard>
        </main>

        <aside className="flex w-full shrink-0 flex-col gap-4 xl:sticky xl:top-[calc(var(--header-height)+1rem)] xl:w-80">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Quick facts</CardTitle>
              <CardDescription>At-a-glance purchasing context.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <QuickFact label="Code" value={supplier.supplierCode} mono />
              <QuickFact label="Products" value={String(productLinks)} />
              <QuickFact label="Currency" value={cleanValue(supplier.currency)} />
              <QuickFact label="Lead time" value={supplier.leadTimeDays == null ? "Not set" : `${supplier.leadTimeDays} days`} />
              <QuickFact label="Updated" value={formatDate(supplier.updatedAt)} />
            </CardContent>
          </Card>
        </aside>
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

function SupplierDetailSkeleton() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-4 w-48 max-w-full" />
      </div>
      <div className="flex flex-wrap gap-4">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 flex-1 basis-full rounded-xl sm:basis-[calc(50%-0.5rem)] xl:basis-[calc(25%-0.75rem)]" />)}
      </div>
      <Skeleton className="h-[520px] rounded-xl" />
    </div>
  )
}

function MetricCard({ title, value, detail, icon: Icon, mono }: { title: string; value: string | number; detail: string; icon: React.ComponentType<{ className?: string }>; mono?: boolean }) {
  return (
    <Card className="@container/card min-w-0 flex-1 basis-full bg-gradient-to-t from-primary/5 to-card shadow-xs sm:basis-[calc(50%-0.5rem)] xl:basis-[calc(25%-0.75rem)] dark:bg-card">
      <CardHeader className="min-w-0">
        <CardDescription className="min-w-0 truncate">{title}</CardDescription>
        <CardTitle className={cn("min-w-0 break-words text-2xl font-semibold tabular-nums [overflow-wrap:anywhere] @[250px]/card:text-3xl", mono && "font-mono text-xl")}>{value}</CardTitle>
      </CardHeader>
      <CardFooter className="flex min-w-0 items-center justify-between gap-3 text-sm">
        <span className="min-w-0 break-words text-muted-foreground [overflow-wrap:anywhere]">{detail}</span>
        <Icon className="size-4 shrink-0 text-muted-foreground" />
      </CardFooter>
    </Card>
  )
}

function SectionCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {children}
      </CardContent>
    </Card>
  )
}

function FieldGroup({ title, fields }: { title: string; fields: FieldItem[] }) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
      <div className="flex min-w-0 flex-wrap gap-3">
        {fields.map((field) => <FieldCard key={field.label} {...field} />)}
      </div>
    </section>
  )
}

function FieldCard({ label, value }: FieldItem) {
  return (
    <div className="flex min-h-24 min-w-0 flex-1 basis-full flex-col gap-2 rounded-xl border bg-background p-4 text-sm shadow-xs transition hover:bg-muted/25 sm:basis-[calc(50%-0.375rem)] 2xl:basis-[calc(33.333%-0.5rem)]">
      <p className="min-w-0 break-words text-xs font-medium uppercase tracking-wide text-muted-foreground [overflow-wrap:anywhere]">{label}</p>
      <p className="min-w-0 break-words font-medium leading-5 [overflow-wrap:anywhere]">{value}</p>
    </div>
  )
}

function QuickFact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={cn("min-w-0 break-words text-right font-medium [overflow-wrap:anywhere]", mono && "font-mono text-xs")}>{value}</span>
    </div>
  )
}
