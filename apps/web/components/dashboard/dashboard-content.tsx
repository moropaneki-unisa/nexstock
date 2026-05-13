"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts"
import { AlertTriangleIcon, Loader2Icon, RefreshCwIcon } from "lucide-react"

import { ChartAreaInteractive, type DashboardActivityPoint } from "@/components/chart-area-interactive"
import { DataTable, type schema } from "@/components/data-table"
import { SectionCards, type SectionCardMetrics } from "@/components/section-cards"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { apiFetch } from "@/lib/api"
import type { z } from "zod"

type Product = {
  id: string
  name: string
  sku?: string | null
  category?: string | null
  status?: string | null
  quantity?: number | string | null
  lowStockLevel?: number | string | null
  price?: number | string | null
  createdAt?: string | null
  updatedAt?: string | null
}

type Supplier = {
  id: string
  name: string
  supplierCode?: string | null
  status?: string | null
  currency?: string | null
  rating?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  _count?: { products?: number | null } | null
}

type PurchaseOrder = {
  id: string
  poNumber?: string | null
  status?: string | null
  currency?: string | null
  subtotal?: number | string | null
  createdAt?: string | null
  expectedAt?: string | null
  supplier?: { name?: string | null; supplierCode?: string | null } | null
  lines?: unknown[] | null
}

type Organization = {
  name?: string | null
  plan?: string | null
  baseCurrency?: string | null
}

type Paginated<T> = {
  items?: T[]
  data?: T[]
  pagination?: { total?: number | null } | null
}

const stockChartConfig = {
  quantity: { label: "Stock quantity", color: "var(--chart-1)" },
  alerts: { label: "Alerts", color: "var(--chart-2)" },
} satisfies ChartConfig

const purchaseOrderChartConfig = {
  value: { label: "Purchase orders", color: "var(--chart-1)" },
} satisfies ChartConfig

function normalizeList<T>(value: T[] | Paginated<T> | null | undefined): T[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  return value.items ?? value.data ?? []
}

function numberValue(value: unknown) {
  const next = Number(value ?? 0)
  return Number.isFinite(next) ? next : 0
}

function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0)
}

function formatDate(value?: string | null) {
  if (!value) return "Not set"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not set"
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function dayKey(value?: string | null) {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10)
  return date.toISOString().slice(0, 10)
}

function monthLabel(value?: string | null) {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return "Unknown"
  return date.toLocaleDateString("en-US", { month: "short" })
}

export function DashboardContent() {
  const [products, setProducts] = React.useState<Product[]>([])
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([])
  const [purchaseOrders, setPurchaseOrders] = React.useState<PurchaseOrder[]>([])
  const [organization, setOrganization] = React.useState<Organization | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  async function loadDashboard() {
    setLoading(true)
    setError(null)

    try {
      const [productResult, supplierResult, poResult, orgResult] = await Promise.all([
        apiFetch<Product[] | Paginated<Product>>("/api/products?limit=100").catch((): Product[] | Paginated<Product> => []),
        apiFetch<Supplier[]>("/api/suppliers").catch((): Supplier[] => []),
        apiFetch<PurchaseOrder[]>("/api/purchase-orders").catch((): PurchaseOrder[] => []),
        apiFetch<Organization>("/api/organization").catch((): null => null),
      ])

      setProducts(normalizeList(productResult))
      setSuppliers(normalizeList(supplierResult))
      setPurchaseOrders(normalizeList(poResult))
      setOrganization(orgResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load dashboard data")
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    void Promise.resolve().then(loadDashboard)
  }, [])

  const baseCurrency = organization?.baseCurrency || "USD"
  const activeProducts = products.filter((product) => (product.status || "active") === "active")
  const activeSuppliers = suppliers.filter((supplier) => (supplier.status || "active") === "active")
  const openPurchaseOrders = purchaseOrders.filter((order) => ["draft", "ordered", "partially_received"].includes(order.status || "draft"))
  const lowStockProducts = products.filter((product) => {
    const quantity = numberValue(product.quantity)
    const lowStockLevel = numberValue(product.lowStockLevel)
    return quantity > 0 && quantity <= lowStockLevel
  })
  const outOfStockProducts = products.filter((product) => numberValue(product.quantity) <= 0)
  const inventoryValue = activeProducts.reduce((sum, product) => sum + numberValue(product.quantity) * numberValue(product.price), 0)

  const metrics: SectionCardMetrics = {
    inventoryValue: formatMoney(inventoryValue, baseCurrency),
    activeProducts: activeProducts.length,
    activeSuppliers: activeSuppliers.length,
    openPurchaseOrders: openPurchaseOrders.length,
    lowStockProducts: lowStockProducts.length,
    outOfStockProducts: outOfStockProducts.length,
    totalProducts: products.length,
    totalSuppliers: suppliers.length,
    totalPurchaseOrders: purchaseOrders.length,
  }

  const activityData: DashboardActivityPoint[] = React.useMemo(() => {
    const byDay = new Map<string, DashboardActivityPoint>()

    function ensure(date: string) {
      const current = byDay.get(date) ?? { date, products: 0, orders: 0 }
      byDay.set(date, current)
      return current
    }

    products.forEach((product) => {
      ensure(dayKey(product.createdAt || product.updatedAt)).products += 1
    })

    purchaseOrders.forEach((order) => {
      ensure(dayKey(order.createdAt)).orders += 1
    })

    const result = Array.from(byDay.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    return result.length ? result : [{ date: new Date().toISOString().slice(0, 10), products: products.length, orders: purchaseOrders.length }]
  }, [products, purchaseOrders])

  const stockByCategory = React.useMemo(() => {
    const byCategory = new Map<string, { category: string; quantity: number; alerts: number }>()

    products.forEach((product) => {
      const category = product.category || "Uncategorized"
      const current = byCategory.get(category) ?? { category, quantity: 0, alerts: 0 }
      const quantity = numberValue(product.quantity)
      current.quantity += quantity
      if (quantity <= numberValue(product.lowStockLevel)) current.alerts += 1
      byCategory.set(category, current)
    })

    return Array.from(byCategory.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 7)
  }, [products])

  const purchaseOrderStatus = React.useMemo(() => {
    const byStatus = new Map<string, number>()
    purchaseOrders.forEach((order) => {
      const status = order.status || "draft"
      byStatus.set(status, (byStatus.get(status) ?? 0) + 1)
    })
    return Array.from(byStatus.entries()).map(([status, value]) => ({ status, value }))
  }, [purchaseOrders])

  const tableData: z.infer<typeof schema>[] = React.useMemo(() => {
    const rows: z.infer<typeof schema>[] = []

    products.slice(0, 8).forEach((product, index) => {
      const quantity = numberValue(product.quantity)
      const lowStock = quantity > 0 && quantity <= numberValue(product.lowStockLevel)
      rows.push({
        id: index + 1,
        header: product.name,
        type: "Product",
        status: product.status === "archived" ? "Archived" : quantity <= 0 ? "Out of stock" : lowStock ? "Low stock" : "Active",
        target: String(quantity),
        limit: String(numberValue(product.lowStockLevel)),
        reviewer: product.sku || "No SKU",
      })
    })

    suppliers.slice(0, 4).forEach((supplier, index) => {
      rows.push({
        id: rows.length + index + 1,
        header: supplier.name,
        type: "Supplier",
        status: supplier.status === "archived" ? "Archived" : "Active",
        target: String(supplier._count?.products ?? 0),
        limit: supplier.currency || baseCurrency,
        reviewer: supplier.supplierCode || "No code",
      })
    })

    purchaseOrders.slice(0, 4).forEach((order, index) => {
      rows.push({
        id: rows.length + index + 1,
        header: order.poNumber || "Purchase order",
        type: "Purchase Order",
        status: order.status || "draft",
        target: formatMoney(numberValue(order.subtotal), order.currency || baseCurrency),
        limit: formatDate(order.expectedAt),
        reviewer: order.supplier?.name || "No supplier",
      })
    })

    return rows
  }, [baseCurrency, products, purchaseOrders, suppliers])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2Icon className="size-5 animate-spin" />
          Loading dashboard data...
        </div>
      </div>
    )
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        {error ? (
          <div className="px-4 lg:px-6">
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="flex items-start gap-3 p-4 text-sm text-destructive">
                <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
                <div>
                  <p className="font-medium">Dashboard data could not load completely.</p>
                  <p className="mt-1 text-destructive/80">{error}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        <div className="flex items-center justify-between px-4 lg:px-6">
          <div>
            <p className="text-sm text-muted-foreground">{organization?.name || "NexStock workspace"}</p>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">Dashboard</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadDashboard()}>
            <RefreshCwIcon className="size-4" />
            Refresh
          </Button>
        </div>

        <SectionCards metrics={metrics} />

        <div className="px-4 lg:px-6">
          <ChartAreaInteractive
            data={activityData}
            title="Workspace Activity"
            description="Products and purchase orders created over time"
          />
        </div>

        <div className="grid gap-4 px-4 lg:grid-cols-2 lg:px-6">
          <Card>
            <CardHeader>
              <CardTitle>Stock by category</CardTitle>
              <CardDescription>Quantity and stock alerts by product category.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={stockChartConfig} className="aspect-auto h-[260px] w-full">
                <BarChart data={stockByCategory} accessibilityLayer>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="category" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="quantity" fill="var(--color-quantity)" radius={4} />
                  <Bar dataKey="alerts" fill="var(--color-alerts)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Purchase order status</CardTitle>
              <CardDescription>Draft, ordered, received, and cancelled order distribution.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={purchaseOrderChartConfig} className="aspect-auto h-[260px] w-full">
                <PieChart accessibilityLayer>
                  <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
                  <Pie data={purchaseOrderStatus} dataKey="value" nameKey="status" innerRadius={58} outerRadius={88} paddingAngle={3}>
                    {purchaseOrderStatus.map((_, index) => (
                      <Cell key={index} fill={`var(--chart-${(index % 5) + 1})`} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <DataTable data={tableData} />
      </div>
    </div>
  )
}
