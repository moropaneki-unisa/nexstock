"use client"

import * as React from "react"
import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"
import {
  ArchiveIcon,
  ArrowRightIcon,
  ClipboardListIcon,
  EditIcon,
  EllipsisVerticalIcon,
  Loader2Icon,
  PackageCheckIcon,
  PlusIcon,
  RefreshCwIcon,
  TruckIcon,
  WalletCardsIcon,
} from "lucide-react"
import { toast } from "sonner"

import { RecordsTable, createSelectColumn, type RecordsTableBulkAction } from "@/components/records/records-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
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

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

function StatusBadge({ status }: { status: PurchaseOrderStatus }) {
  if (status === "cancelled") return <Badge variant="destructive">Cancelled</Badge>
  if (status === "received") return <Badge>Received</Badge>
  if (status === "ordered") return <Badge variant="secondary">Ordered</Badge>
  if (status === "partially_received") return <Badge variant="outline">Partially received</Badge>
  return <Badge variant="outline">Draft</Badge>
}

function PurchaseOrderActions({ order, onCancel }: { order: PurchaseOrder; onCancel: (order: PurchaseOrder) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground data-[state=open]:bg-muted">
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
        <DropdownMenuItem variant="destructive" onClick={() => onCancel(order)} disabled={order.status === "cancelled"}>
          <ArchiveIcon className="size-4" />Cancel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function PurchaseOrdersLoading() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}><CardHeader><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-32" /></CardHeader><CardFooter><Skeleton className="h-4 w-40" /></CardFooter></Card>
        ))}
      </div>
      <div className="px-4 lg:px-6"><Skeleton className="h-[420px] rounded-xl" /></div>
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
    { id: "actions", header: "", cell: ({ row }) => <PurchaseOrderActions order={row.original} onCancel={cancelOrder} />, enableHiding: false },
  ], [])

  const bulkActions = React.useMemo<RecordsTableBulkAction<PurchaseOrder>[]>(() => [{ label: "Cancel selected", variant: "destructive", onClick: bulkCancel }], [])

  if (loading) return <PurchaseOrdersLoading />

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
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

        <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
          <MetricCard title="Total POs" value={orders.length} detail={`${draft} draft`} icon={ClipboardListIcon} />
          <MetricCard title="On order" value={ordered} detail="Ordered or partial" icon={TruckIcon} />
          <MetricCard title="Received" value={received} detail="Completed orders" icon={PackageCheckIcon} />
          <MetricCard title="Total value" value={formatMoney(totalValue, currency)} detail="Visible order subtotal" icon={WalletCardsIcon} />
        </div>

        <RecordsTable data={orders} columns={columns} title="Purchase order directory" description="Purchase orders generated by the API." searchPlaceholder="Search PO number, supplier, status..." getRowId={(row) => row.id} bulkActions={bulkActions} />
      </div>
    </div>
  )
}

function MetricCard({ title, value, detail, icon: Icon }: { title: string; value: string | number; detail: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card className="@container/card">
      <CardHeader><CardDescription>{title}</CardDescription><CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{value}</CardTitle></CardHeader>
      <CardFooter className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{detail}</span><Icon className="size-4 text-muted-foreground" /></CardFooter>
    </Card>
  )
}
