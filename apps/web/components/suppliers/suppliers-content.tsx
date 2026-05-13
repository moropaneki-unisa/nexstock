"use client"

import * as React from "react"
import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"
import {
  ArchiveIcon,
  ArrowRightIcon,
  Building2Icon,
  EditIcon,
  EllipsisVerticalIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  TruckIcon,
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
  onArchive,
  onReactivate,
}: {
  supplier: Supplier
  onArchive: (supplier: Supplier) => void
  onReactivate: (supplier: Supplier) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground data-[state=open]:bg-muted">
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
          onArchive={archiveSupplier}
          onReactivate={reactivateSupplier}
        />
      ),
      enableHiding: false,
    },
  ], [])

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
            <Button asChild size="sm">
              <Link href="/suppliers/new">
                <PlusIcon className="size-4" />
                New supplier
              </Link>
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
