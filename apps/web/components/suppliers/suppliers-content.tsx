"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import {
  ArchiveIcon,
  Building2Icon,
  EditIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  TruckIcon,
  UsersIcon,
  WalletCardsIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  RecordsTable,
  createSelectColumn,
  type RecordsTableBulkAction,
} from "@/components/records/records-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  notes?: string | null
  status: SupplierStatus
  _count?: { products?: number | null } | null
}

type OrganizationSummary = {
  baseCurrency?: string | null
  enabledCurrencies?: string[] | null
}

type SupplierForm = {
  name: string
  supplierType: string
  category: string
  rating: string
  contactName: string
  email: string
  phone: string
  website: string
  country: string
  province: string
  city: string
  currency: string
  paymentTerms: string
  paymentMethod: string
  shippingTerms: string
  leadTimeDays: string
  minimumOrderQty: string
  notes: string
}

const DEFAULT_CURRENCY = "USD"

const supplierTypes = [
  { value: "vendor", label: "Vendor" },
  { value: "manufacturer", label: "Manufacturer" },
  { value: "wholesaler", label: "Wholesaler" },
  { value: "distributor", label: "Distributor" },
  { value: "raw_material", label: "Raw material" },
  { value: "service_provider", label: "Service provider" },
]

const categories = ["General", "Equipment", "Raw materials", "Packaging", "Parts", "Electronics", "Logistics", "Services"]
const ratings = ["unrated", "preferred", "approved", "backup", "probation", "blocked"]
const paymentTerms = ["COD", "Prepaid", "Net 7", "Net 15", "Net 30", "Net 60", "Deposit + balance"]
const paymentMethods = ["Bank transfer", "Card", "Cash", "EFT", "PayPal", "Wise", "Other"]
const shippingTerms = ["Pickup", "Supplier delivery", "Courier", "Freight", "Dropship", "Customer collection"]

const emptyForm: SupplierForm = {
  name: "",
  supplierType: "vendor",
  category: "General",
  rating: "unrated",
  contactName: "",
  email: "",
  phone: "",
  website: "",
  country: "",
  province: "",
  city: "",
  currency: DEFAULT_CURRENCY,
  paymentTerms: "Net 30",
  paymentMethod: "Bank transfer",
  shippingTerms: "Supplier delivery",
  leadTimeDays: "",
  minimumOrderQty: "",
  notes: "",
}

function normalizeCurrency(value?: string | null, fallback = DEFAULT_CURRENCY) {
  const next = String(value || fallback).trim().toUpperCase()
  return /^[A-Z]{3}$/.test(next) ? next : fallback
}

function clean(value: string) {
  const next = value.trim()
  return next || null
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
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function SuppliersLoading() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
            </CardHeader>
            <CardFooter>
              <Skeleton className="h-4 w-40" />
            </CardFooter>
          </Card>
        ))}
      </div>
      <div className="px-4 lg:px-6">
        <Skeleton className="h-[420px] rounded-xl" />
      </div>
    </div>
  )
}

function SupplierStatusBadge({ supplier }: { supplier: Supplier }) {
  if (supplier.status === "archived") return <Badge variant="outline">Archived</Badge>
  if (supplier.rating === "preferred") return <Badge>Preferred</Badge>
  if (supplier.rating === "blocked") return <Badge variant="destructive">Blocked</Badge>
  return <Badge variant="secondary">Active</Badge>
}

function SupplierActions({
  supplier,
  onEdit,
  onArchive,
  onReactivate,
}: {
  supplier: Supplier
  onEdit: (supplier: Supplier) => void
  onArchive: (supplier: Supplier) => void
  onReactivate: (supplier: Supplier) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground data-[state=open]:bg-muted">
          <EditIcon className="size-4" />
          <span className="sr-only">Open supplier menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => onEdit(supplier)}>
          <EditIcon className="size-4" />
          Edit supplier
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {supplier.status === "archived" ? (
          <DropdownMenuItem onClick={() => onReactivate(supplier)}>
            <RotateCcwIcon className="size-4" />
            Reactivate
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem variant="destructive" onClick={() => onArchive(supplier)}>
            <ArchiveIcon className="size-4" />
            Archive
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function SuppliersContent() {
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([])
  const [organization, setOrganization] = React.useState<OrganizationSummary | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [running, setRunning] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Supplier | null>(null)
  const [form, setForm] = React.useState<SupplierForm>(emptyForm)

  const enabledCurrencies = React.useMemo(() => {
    const base = normalizeCurrency(organization?.baseCurrency || DEFAULT_CURRENCY)
    return Array.from(new Set([base, ...(organization?.enabledCurrencies || [])].map((code) => normalizeCurrency(code))))
  }, [organization])

  async function loadSuppliers() {
    setLoading(true)
    try {
      const [supplierList, org] = await Promise.all([
        apiFetch<Supplier[]>("/api/suppliers"),
        apiFetch<OrganizationSummary>("/api/organization").catch(() => null),
      ])
      setSuppliers(supplierList)
      setOrganization(org)
    } catch (err) {
      toast.error("Suppliers could not load", {
        description: err instanceof Error ? err.message : "Failed to load suppliers",
      })
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    void loadSuppliers()
  }, [])

  function openCreate() {
    setEditing(null)
    setForm({ ...emptyForm, currency: enabledCurrencies[0] || DEFAULT_CURRENCY })
    setOpen(true)
  }

  function openEdit(supplier: Supplier) {
    setEditing(supplier)
    setForm({
      name: supplier.name || "",
      supplierType: supplier.supplierType || "vendor",
      category: supplier.category || "General",
      rating: supplier.rating || "unrated",
      contactName: supplier.contactName || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      website: supplier.website || "",
      country: supplier.country || "",
      province: supplier.province || "",
      city: supplier.city || "",
      currency: normalizeCurrency(supplier.currency, enabledCurrencies[0] || DEFAULT_CURRENCY),
      paymentTerms: supplier.paymentTerms || "Net 30",
      paymentMethod: supplier.paymentMethod || "Bank transfer",
      shippingTerms: supplier.shippingTerms || "Supplier delivery",
      leadTimeDays: supplier.leadTimeDays == null ? "" : String(supplier.leadTimeDays),
      minimumOrderQty: supplier.minimumOrderQty == null ? "" : String(supplier.minimumOrderQty),
      notes: supplier.notes || "",
    })
    setOpen(true)
  }

  async function saveSupplier() {
    if (!form.name.trim()) {
      toast.error("Supplier name is required")
      return
    }

    const payload = {
      name: form.name.trim(),
      supplierType: clean(form.supplierType),
      category: clean(form.category),
      rating: clean(form.rating),
      contactName: clean(form.contactName),
      email: clean(form.email),
      phone: clean(form.phone),
      website: clean(form.website),
      country: clean(form.country),
      province: clean(form.province),
      city: clean(form.city),
      currency: normalizeCurrency(form.currency, enabledCurrencies[0] || DEFAULT_CURRENCY),
      paymentTerms: clean(form.paymentTerms),
      paymentMethod: clean(form.paymentMethod),
      shippingTerms: clean(form.shippingTerms),
      leadTimeDays: form.leadTimeDays === "" ? undefined : Number(form.leadTimeDays),
      minimumOrderQty: form.minimumOrderQty === "" ? undefined : Number(form.minimumOrderQty),
      notes: clean(form.notes),
    }

    setRunning(true)
    try {
      if (editing) {
        await apiFetch(`/api/suppliers/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        toast.success("Supplier updated", { description: form.name })
      } else {
        await apiFetch("/api/suppliers", { method: "POST", body: JSON.stringify(payload) })
        toast.success("Supplier created", { description: form.name })
      }
      setOpen(false)
      await loadSuppliers()
    } catch (err) {
      toast.error("Could not save supplier", {
        description: err instanceof Error ? err.message : "Save failed",
      })
    } finally {
      setRunning(false)
    }
  }

  async function archiveSupplier(supplier: Supplier) {
    setRunning(true)
    try {
      await apiFetch(`/api/suppliers/${supplier.id}`, { method: "DELETE" })
      toast.success("Supplier archived", { description: supplier.name })
      await loadSuppliers()
    } catch (err) {
      toast.error("Could not archive supplier", {
        description: err instanceof Error ? err.message : "Archive failed",
      })
    } finally {
      setRunning(false)
    }
  }

  async function reactivateSupplier(supplier: Supplier) {
    setRunning(true)
    try {
      await apiFetch(`/api/suppliers/${supplier.id}/reactivate`, { method: "PATCH" })
      toast.success("Supplier reactivated", { description: supplier.name })
      await loadSuppliers()
    } catch (err) {
      toast.error("Could not reactivate supplier", {
        description: err instanceof Error ? err.message : "Reactivate failed",
      })
    } finally {
      setRunning(false)
    }
  }

  async function bulkArchive(rows: Supplier[]) {
    setRunning(true)
    try {
      await Promise.all(rows.map((supplier) => apiFetch(`/api/suppliers/${supplier.id}`, { method: "DELETE" })))
      toast.success("Suppliers archived", { description: `${rows.length} supplier${rows.length === 1 ? "" : "s"} archived.` })
      await loadSuppliers()
    } catch (err) {
      toast.error("Could not archive selected suppliers", {
        description: err instanceof Error ? err.message : "Bulk archive failed",
      })
    } finally {
      setRunning(false)
    }
  }

  const activeSuppliers = suppliers.filter((supplier) => supplier.status === "active")
  const archivedSuppliers = suppliers.filter((supplier) => supplier.status === "archived")
  const preferredSuppliers = suppliers.filter((supplier) => supplier.rating === "preferred")
  const productLinks = suppliers.reduce((sum, supplier) => sum + Number(supplier._count?.products || 0), 0)

  const columns = React.useMemo<ColumnDef<Supplier>[]>(() => [
    createSelectColumn<Supplier>(),
    {
      accessorKey: "name",
      header: "Supplier",
      cell: ({ row }) => (
        <div className="grid gap-1">
          <span className="font-medium">{row.original.name}</span>
          <span className="font-mono text-xs text-muted-foreground">{row.original.supplierCode}</span>
        </div>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "supplierType",
      header: "Type",
      cell: ({ row }) => titleCase(row.original.supplierType || "vendor"),
    },
    {
      id: "contact",
      header: "Contact",
      cell: ({ row }) => (
        <div className="grid gap-1">
          <span className="truncate text-sm">{row.original.email || row.original.phone || row.original.contactName || "No contact"}</span>
          <span className="text-xs text-muted-foreground">{[row.original.city, row.original.country].filter(Boolean).join(", ") || "No location"}</span>
        </div>
      ),
    },
    {
      accessorKey: "currency",
      header: "Currency",
      cell: ({ row }) => <span className="font-medium">{normalizeCurrency(row.original.currency)}</span>,
    },
    {
      accessorKey: "paymentTerms",
      header: "Terms",
      cell: ({ row }) => row.original.paymentTerms || "Not set",
    },
    {
      id: "products",
      header: "Products",
      cell: ({ row }) => <span className="tabular-nums">{row.original._count?.products ?? 0}</span>,
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => <SupplierStatusBadge supplier={row.original} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <SupplierActions
          supplier={row.original}
          onEdit={openEdit}
          onArchive={archiveSupplier}
          onReactivate={reactivateSupplier}
        />
      ),
      enableHiding: false,
    },
  ], [enabledCurrencies])

  const bulkActions = React.useMemo<RecordsTableBulkAction<Supplier>[]>(() => [
    {
      label: "Archive selected",
      variant: "destructive",
      onClick: bulkArchive,
    },
  ], [])

  if (loading) return <SuppliersLoading />

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <div>
            <p className="text-sm text-muted-foreground">Supply operations</p>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">Suppliers</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage supplier records, purchasing terms, currencies, and linked product sources.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void loadSuppliers()} disabled={running || loading}>
              {running ? <Loader2Icon className="size-4 animate-spin" /> : <RefreshCwIcon className="size-4" />}
              Refresh
            </Button>
            <Button size="sm" onClick={openCreate}>
              <PlusIcon className="size-4" />
              New supplier
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
          <SupplierMetricCard title="Total suppliers" value={suppliers.length} detail={`${activeSuppliers.length} active`} icon={TruckIcon} />
          <SupplierMetricCard title="Preferred" value={preferredSuppliers.length} detail="Approved primary sources" icon={Building2Icon} />
          <SupplierMetricCard title="Product links" value={productLinks} detail="Supplier-product sources" icon={WalletCardsIcon} />
          <SupplierMetricCard title="Archived" value={archivedSuppliers.length} detail="Hidden from active purchasing" icon={ArchiveIcon} />
        </div>

        <RecordsTable
          data={suppliers}
          columns={columns}
          title="Supplier directory"
          description={`Supplier codes are generated by the API. Enabled currencies: ${enabledCurrencies.join(", ")}`}
          searchPlaceholder="Search supplier name, code, type, city, email..."
          getRowId={(row) => row.id}
          bulkActions={bulkActions}
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Update supplier" : "Create supplier"}</DialogTitle>
            <DialogDescription>
              {editing ? `Supplier code ${editing.supplierCode} is locked.` : "Supplier code is generated automatically when you save."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            <FormSection title="Classification" description="Keep reporting clean with controlled supplier categories.">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Field label="Supplier name">
                  <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="ABC Equipment Supplies" />
                </Field>
                <SelectField label="Supplier type" value={form.supplierType} onChange={(value) => setForm((current) => ({ ...current, supplierType: value }))} options={supplierTypes} />
                <SelectField label="Category" value={form.category} onChange={(value) => setForm((current) => ({ ...current, category: value }))} options={categories.map((value) => ({ value, label: value }))} />
                <SelectField label="Rating" value={form.rating} onChange={(value) => setForm((current) => ({ ...current, rating: value }))} options={ratings.map((value) => ({ value, label: titleCase(value) }))} />
              </div>
            </FormSection>

            <FormSection title="Contact and location" description="Supplier contact and location information.">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Field label="Contact person"><Input value={form.contactName} onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))} /></Field>
                <Field label="Email"><Input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></Field>
                <Field label="Phone"><Input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></Field>
                <Field label="Website"><Input value={form.website} onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))} /></Field>
                <Field label="Country"><Input value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))} /></Field>
                <Field label="Province"><Input value={form.province} onChange={(event) => setForm((current) => ({ ...current, province: event.target.value }))} /></Field>
                <Field label="City"><Input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} /></Field>
              </div>
            </FormSection>

            <FormSection title="Purchasing" description="Currency, payment, logistics, and order constraints.">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <SelectField label="Currency" value={form.currency} onChange={(value) => setForm((current) => ({ ...current, currency: value }))} options={enabledCurrencies.map((value) => ({ value, label: value }))} />
                <SelectField label="Payment terms" value={form.paymentTerms} onChange={(value) => setForm((current) => ({ ...current, paymentTerms: value }))} options={paymentTerms.map((value) => ({ value, label: value }))} />
                <SelectField label="Payment method" value={form.paymentMethod} onChange={(value) => setForm((current) => ({ ...current, paymentMethod: value }))} options={paymentMethods.map((value) => ({ value, label: value }))} />
                <SelectField label="Shipping terms" value={form.shippingTerms} onChange={(value) => setForm((current) => ({ ...current, shippingTerms: value }))} options={shippingTerms.map((value) => ({ value, label: value }))} />
                <Field label="Lead time days"><Input type="number" min="0" value={form.leadTimeDays} onChange={(event) => setForm((current) => ({ ...current, leadTimeDays: event.target.value }))} /></Field>
                <Field label="Minimum order qty"><Input type="number" min="0" value={form.minimumOrderQty} onChange={(event) => setForm((current) => ({ ...current, minimumOrderQty: event.target.value }))} /></Field>
              </div>
            </FormSection>

            <FormSection title="Notes" description="Contract rules, delivery instructions, or supplier risks.">
              <Textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="min-h-24" />
            </FormSection>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={running}>Cancel</Button>
            <Button type="button" onClick={saveSupplier} disabled={running}>
              {running ? <Loader2Icon className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}
              {editing ? "Save changes" : "Create supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SupplierMetricCard({
  title,
  value,
  detail,
  icon: Icon,
}: {
  title: string
  value: string | number
  detail: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value}
        </CardTitle>
      </CardHeader>
      <CardFooter className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{detail}</span>
        <Icon className="size-4 text-muted-foreground" />
      </CardFooter>
    </Card>
  )
}

function FormSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-muted/10 p-4">
      <div className="mb-4">
        <h3 className="font-medium tracking-tight">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </label>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <Field label={label}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value || option.label} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}
