"use client"

import * as React from "react"
import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"
import {
  ArchiveIcon,
  ArrowRightIcon,
  EditIcon,
  EllipsisVerticalIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
  RotateCcwIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  RecordsTable,
  createSelectColumn,
  type RecordsTableBulkAction,
} from "@/components/records/records-table"
import { RecordActionDialog } from "@/components/records/record-action-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
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
  country?: string | null
  city?: string | null
  currency?: string | null
  paymentTerms?: string | null
  leadTimeDays?: number | null
  minimumOrderQty?: number | null
  status: SupplierStatus
  _count?: { products?: number | null } | null
}

type OrganizationSummary = {
  baseCurrency?: string | null
  enabledCurrencies?: string[] | null
}

const DEFAULT_CURRENCY = "USD"

function normalizeCurrency(value?: string | null, fallback = DEFAULT_CURRENCY) {
  const next = String(value || fallback).trim().toUpperCase()
  return /^[A-Z]{3}$/.test(next) ? next : fallback
}

function titleCase(value?: string | null) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function SuppliersLoading() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-5 md:py-6">
      <div className="grid grid-cols-2 gap-2 px-4 sm:flex sm:flex-wrap lg:px-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-8 min-w-28 rounded-md" />
        ))}
      </div>
      <div className="px-4 lg:px-6">
        <Skeleton className="h-[46rem] rounded-xl" />
      </div>
    </div>
  )
}

function CompactStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex h-8 min-w-0 items-center justify-between gap-2 rounded-md border bg-background px-2.5 sm:justify-start">
      <span className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
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
  busy,
  onArchive,
  onReactivate,
}: {
  supplier: Supplier
  busy?: boolean
  onArchive: (supplier: Supplier) => void
  onReactivate: (supplier: Supplier) => void
}) {
  const [archiveOpen, setArchiveOpen] = React.useState(false)
  const [reactivateOpen, setReactivateOpen] = React.useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground data-[state=open]:bg-muted" disabled={busy}>
            <EllipsisVerticalIcon className="size-4" />
            <span className="sr-only">Open supplier menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild>
            <Link href={`/suppliers/${supplier.id}`}>
              <ArrowRightIcon className="size-4" />
              View
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/suppliers/${supplier.id}/edit`}>
              <EditIcon className="size-4" />
              Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {supplier.status === "archived" ? (
            <DropdownMenuItem onClick={() => setReactivateOpen(true)}>
              <RotateCcwIcon className="size-4" />
              Reactivate
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem variant="destructive" onClick={() => setArchiveOpen(true)}>
              <ArchiveIcon className="size-4" />
              Archive
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <RecordActionDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        busy={busy}
        title="Archive supplier?"
        description={`This will archive "${supplier.name}" and remove it from active supplier workflows. Existing purchase history remains available.`}
        confirmLabel="Archive supplier"
        onConfirm={() => onArchive(supplier)}
      />
      <RecordActionDialog
        open={reactivateOpen}
        onOpenChange={setReactivateOpen}
        busy={busy}
        variant="default"
        title="Reactivate supplier?"
        description={`This will make "${supplier.name}" available again for purchasing workflows.`}
        confirmLabel="Reactivate supplier"
        onConfirm={() => onReactivate(supplier)}
      />
    </>
  )
}

export function SuppliersContent() {
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([])
  const [organization, setOrganization] = React.useState<OrganizationSummary | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [running, setRunning] = React.useState(false)

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
          <Link href={`/suppliers/${row.original.id}`} className="font-medium hover:underline">
            {row.original.name}
          </Link>
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
          busy={running}
          onArchive={archiveSupplier}
          onReactivate={reactivateSupplier}
        />
      ),
      enableHiding: false,
    },
  ], [running])

  const bulkActions = React.useMemo<RecordsTableBulkAction<Supplier>[]>(() => [
    {
      label: "Archive selected",
      variant: "destructive",
      confirmTitle: "Archive selected suppliers?",
      confirmDescription: (count) => `This will archive ${count} selected supplier${count === 1 ? "" : "s"} and remove them from active purchasing workflows. Existing history remains available.`,
      confirmLabel: "Archive suppliers",
      confirmVariant: "destructive",
      onClick: bulkArchive,
    },
  ], [])

  if (loading) return <SuppliersLoading />

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-5 md:py-6">
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
            <Button asChild size="sm">
              <Link href="/suppliers/new">
                <PlusIcon className="size-4" />
                New supplier
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 px-4 sm:flex sm:flex-wrap lg:px-6">
          <CompactStat label="Total" value={suppliers.length} />
          <CompactStat label="Active" value={activeSuppliers.length} />
          <CompactStat label="Preferred" value={preferredSuppliers.length} />
          <CompactStat label="Product links" value={productLinks} />
          <CompactStat label="Archived" value={archivedSuppliers.length} />
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
    </div>
  )
}
