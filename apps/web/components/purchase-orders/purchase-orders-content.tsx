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
} from "lucide-react"
import { toast } from "sonner"

import { RecordsTable, createSelectColumn, type RecordsTableBulkAction } from "@/components/records/records-table"
import { RecordActionDialog } from "@/components/records/record-action-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch } from "@/lib/api"

type PurchaseOrderStatus = "draft" | "ordered" | "partially_received" | "received" | "cancelled"

type PurchaseOrder = {
  id: string
  poNumber: string
  status: PurchaseOrderStatus
  currency: string
  subtotal: string | number
  expectedAt?: string | null
  orderedAt?: string | null
  receivedAt?: string | null
  createdAt?: string | null
  supplier?: { id: string; supplierCode: string; name: string; currency?: string | null; status?: string | null } | null
  lines?: Array<{ id: string; quantityOrdered: number; quantityReceived?: number | null; lineTotal: string | number; product?: { id: string; name: string; sku?: string | null } | null }>
}

function numberValue(value: unknown) {
  const next = Number(value ?? 0)
  return Number.isFinite(next) ? next : 0
}

function normalizeCurrency(value?: string | null) {
  const code = String(value || "USD").trim().toUpperCase()
  return /^[A-Z]{3}$/.test(code) ? code : "USD"
}

function formatMoney(value: unknown, currency = "USD") {
  return new Intl.NumberFormat("en", { style: "currency", currency: normalizeCurrency(currency), maximumFractionDigits: 2 }).format(numberValue(value))
}

function formatDate(value?: string | null) {
  if (!value) return "Not set"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not set"
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function StatusBadge({ status }: { status: PurchaseOrderStatus }) {
  if (status === "cancelled") return <Badge variant="destructive">Cancelled</Badge>
  if (status === "received") return <Badge>Received</Badge>
  if (status === "ordered") return <Badge variant="secondary">Ordered</Badge>
  if (status === "partially_received") return <Badge variant="outline">Partially received</Badge>
  return <Badge variant="outline">Draft</Badge>
}

function CompactStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex h-8 min-w-0 items-center justify-between gap-2 rounded-md border bg-background px-2.5 sm:justify-start">
      <span className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  )
}

function PurchaseOrderActions({ order, busy, onCancel }: { order: PurchaseOrder; busy?: boolean; onCancel: (order: PurchaseOrder) => void }) {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground data-[state=open]:bg-muted" disabled={busy}>
            <EllipsisVerticalIcon className="size-4" />
            <span className="sr-only">Open purchase order menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild>
            <Link href={`/purchase-orders/${order.id}`}><ArrowRightIcon className="size-4" />View</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/purchase-orders/${order.id}/edit`}><EditIcon className="size-4" />Edit</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setOpen(true)} disabled={order.status === "cancelled"}>
            <ArchiveIcon className="size-4" />Cancel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <RecordActionDialog
        open={open}
        onOpenChange={setOpen}
        busy={busy}
        title="Cancel purchase order?"
        description={`This will cancel purchase order ${order.poNumber}. It should only be used when the order is no longer expected or should not be received.`}
        confirmLabel="Cancel order"
        onConfirm={() => onCancel(order)}
      />
    </>
  )
}

function PurchaseOrdersLoading() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-5 md:py-6">
      <div className="grid grid-cols-2 gap-2 px-4 sm:flex sm:flex-wrap lg:px-6">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-8 min-w-28 rounded-md" />)}
      </div>
      <div className="px-4 lg:px-6"><Skeleton className="h-[46rem] rounded-xl" /></div>
    </div>
  )
}

export function PurchaseOrdersContent() {
  const [orders, setOrders] = React.useState<PurchaseOrder[]>([])
  const [loading, setLoading] = React.useState(true)
  const [running, setRunning] = React.useState(false)

  async function loadOrders() {
    setLoading(true)
    try {
      setOrders(await apiFetch<PurchaseOrder[]>("/api/purchase-orders"))
    } catch (err) {
      toast.error("Purchase orders could not load", { description: err instanceof Error ? err.message : "Load failed" })
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => { void loadOrders() }, [])

  async function cancelOrder(order: PurchaseOrder) {
    setRunning(true)
    try {
      await apiFetch(`/api/purchase-orders/${order.id}`, { method: "DELETE" })
      toast.success("Purchase order cancelled", { description: order.poNumber })
      await loadOrders()
    } catch (err) {
      toast.error("Could not cancel purchase order", { description: err instanceof Error ? err.message : "Cancel failed" })
    } finally {
      setRunning(false)
    }
  }

  async function bulkCancel(rows: PurchaseOrder[]) {
    setRunning(true)
    try {
      await Promise.all(rows.filter((row) => row.status !== "cancelled").map((order) => apiFetch(`/api/purchase-orders/${order.id}`, { method: "DELETE" })))
      toast.success("Purchase orders cancelled", { description: `${rows.length} selected.` })
      await loadOrders()
    } catch (err) {
      toast.error("Could not cancel selected purchase orders", { description: err instanceof Error ? err.message : "Bulk cancel failed" })
    } finally {
      setRunning(false)
    }
  }

  const draft = orders.filter((order) => order.status === "draft").length
  const ordered = orders.filter((order) => order.status === "ordered" || order.status === "partially_received").length
  const received = orders.filter((order) => order.status === "received").length
  const cancelled = orders.filter((order) => order.status === "cancelled").length
  const totalValue = orders.reduce((sum, order) => sum + numberValue(order.subtotal), 0)
  const currency = normalizeCurrency(orders[0]?.currency)

  const columns = React.useMemo<ColumnDef<PurchaseOrder>[]>(() => [
    createSelectColumn<PurchaseOrder>(),
    {
      accessorKey: "poNumber",
      header: "PO number",
      cell: ({ row }) => <Link href={`/purchase-orders/${row.original.id}`} className="font-mono font-medium hover:underline">{row.original.poNumber}</Link>,
      enableHiding: false,
    },
    {
      id: "supplier",
      header: "Supplier",
      cell: ({ row }) => (
        <div className="grid gap-1">
          <span className="font-medium">{row.original.supplier?.name || "No supplier"}</span>
          <span className="font-mono text-xs text-muted-foreground">{row.original.supplier?.supplierCode || "-"}</span>
        </div>
      ),
    },
    { id: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { id: "lines", header: "Lines", cell: ({ row }) => <span className="tabular-nums">{row.original.lines?.length ?? 0}</span> },
    { id: "subtotal", header: "Subtotal", cell: ({ row }) => <span className="font-medium">{formatMoney(row.original.subtotal, row.original.currency)}</span> },
    { id: "expectedAt", header: "Expected", cell: ({ row }) => formatDate(row.original.expectedAt) },
    { id: "createdAt", header: "Created", cell: ({ row }) => formatDate(row.original.createdAt) },
    { id: "actions", header: "", cell: ({ row }) => <PurchaseOrderActions order={row.original} busy={running} onCancel={cancelOrder} />, enableHiding: false },
  ], [running])

  const bulkActions = React.useMemo<RecordsTableBulkAction<PurchaseOrder>[]>(() => [{ label: "Cancel selected", variant: "destructive", onClick: bulkCancel }], [])

  if (loading) return <PurchaseOrdersLoading />

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-5 md:py-6">
        <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <div>
            <p className="text-sm text-muted-foreground">Purchasing</p>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">Purchase orders</h1>
            <p className="mt-1 text-sm text-muted-foreground">Create, track, receive, and cancel supplier purchase orders.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void loadOrders()} disabled={running || loading}>{running ? <Loader2Icon className="size-4 animate-spin" /> : <RefreshCwIcon className="size-4" />}Refresh</Button>
            <Button asChild size="sm"><Link href="/purchase-orders/new"><PlusIcon className="size-4" />New purchase order</Link></Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 px-4 sm:flex sm:flex-wrap lg:px-6">
          <CompactStat label="Total" value={orders.length} />
          <CompactStat label="Draft" value={draft} />
          <CompactStat label="On order" value={ordered} />
          <CompactStat label="Received" value={received} />
          <CompactStat label="Cancelled" value={cancelled} />
          <CompactStat label="Value" value={formatMoney(totalValue, currency)} />
        </div>

        <RecordsTable data={orders} columns={columns} title="Purchase order directory" description="Purchase orders generated by the API." searchPlaceholder="Search PO number, supplier, status..." getRowId={(row) => row.id} bulkActions={bulkActions} />
      </div>
    </div>
  )
}
