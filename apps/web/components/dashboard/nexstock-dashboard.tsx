"use client"

import * as React from "react"
import Link from "next/link"
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  BoxesIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  DatabaseZapIcon,
  Loader2Icon,
  PackageCheckIcon,
  RefreshCwIcon,
  TruckIcon,
} from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { apiFetch } from "@/lib/api"

type Product = {
  id: string
  name: string
  sku?: string | null
  category?: string | null
  status?: string | null
  quantity?: number | string | null
  lowStockLevel?: number | string | null
  price?: number | string | null
  costPrice?: number | string | null
  currency?: string | null
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
  leadTimeDays?: number | string | null
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

const inventoryConfig = {
  quantity: {
    label: "Stock quantity",
    color: "var(--chart-1)",
  },
  lowStock: {
    label: "Low stock alert",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

const statusConfig = {
  products: { label: "Products", color: "var(--chart-1)" },
  suppliers: { label: "Suppliers", color: "var(--chart-2)" },
  orders: { label: "Purchase orders", color: "var(--chart-3)" },
} satisfies ChartConfig

const orderConfig = {
  orders: { label: "Orders", color: "var(--chart-1)" },
  value: { label: "Value", color: "var(--chart-2)" },
} satisfies ChartConfig

function normalizeList<T>(value: T[] | Paginated<T> | null | undefined): T[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  return value.items ?? value.data ?? []
}

function numberValue(value: unknown) {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number : 0
}

function money(value: number, currency = "USD") {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0)
}

function shortDate(value?: string | null) {
  if (!value) return "Not set"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not set"
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function monthKey(value?: string | null) {
  if (!value) return "Unknown"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Unknown"
  return date.toLocaleDateString(undefined, { month: "short" })
}

export function NexStockDashboard() {
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
        apiFetch<Product[] | Paginated<Product>>("/api/products?limit=100").catch((): Product[] => []),
        apiFetch<Supplier[] | Paginated<Supplier>>("/api/suppliers").catch((): Supplier[] => []),
        apiFetch<PurchaseOrder[] | Paginated<PurchaseOrder>>("/api/purchase-orders").catch((): PurchaseOrder[] => []),
        apiFetch<Organization>("/api/organization").catch(() => null),
      ])

      setProducts(normalizeList<Product>(productResult))
      setSuppliers(normalizeList<Supplier>(supplierResult))
      setPurchaseOrders(normalizeList<PurchaseOrder>(poResult))
      setOrganization(orgResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load dashboard data")
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    void loadDashboard()
  }, [])

  const baseCurrency = organization?.baseCurrency || "USD"
  const activeProducts = products.filter((product) => (product.status || "active") === "active")
  const archivedProducts = products.filter((product) => product.status === "archived")
  const draftProducts = products.filter((product) => product.status === "draft")
  const lowStockProducts = products.filter((product) => {
    const quantity = numberValue(product.quantity)
    const alert = numberValue(product.lowStockLevel)
    return quantity > 0 && quantity <= alert
  })
  const outOfStockProducts = products.filter((product) => numberValue(product.quantity) <= 0)
  const activeSuppliers = suppliers.filter((supplier) => (supplier.status || "active") === "active")
  const openOrders = purchaseOrders.filter((order) => ["draft", "ordered", "partially_received"].includes(order.status || "draft"))
  const receivedOrders = purchaseOrders.filter((order) => order.status === "received")
  const inventoryValue = activeProducts.reduce((sum, product) => sum + numberValue(product.quantity) * numberValue(product.price), 0)
  const purchaseValue = purchaseOrders.reduce((sum, order) => sum + numberValue(order.subtotal), 0)

  const stockChart = React.useMemo(() => {
    const byCategory = new Map<string, { category: string; quantity: number; lowStock: number }>()

    activeProducts.forEach((product) => {
      const category = product.category || "Uncategorized"
      const current = byCategory.get(category) ?? { category, quantity: 0, lowStock: 0 }
      current.quantity += numberValue(product.quantity)
      if (numberValue(product.quantity) <= numberValue(product.lowStockLevel)) current.lowStock += 1
      byCategory.set(category, current)
    })

    return Array.from(byCategory.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 6)
  }, [activeProducts])

  const operationsChart = React.useMemo(() => {
    const months = new Map<string, { month: string; products: number; suppliers: number; orders: number }>()

    function ensure(month: string) {
      const current = months.get(month) ?? { month, products: 0, suppliers: 0, orders: 0 }
      months.set(month, current)
      return current
    }

    products.forEach((product) => {
      ensure(monthKey(product.createdAt || product.updatedAt)).products += 1
    })
    suppliers.forEach((supplier) => {
      ensure("Suppliers").suppliers += 1
    })
    purchaseOrders.forEach((order) => {
      ensure(monthKey(order.createdAt)).orders += 1
    })

    const values = Array.from(months.values()).filter((item) => item.month !== "Unknown")
    return values.length ? values.slice(-6) : [{ month: "Now", products: products.length, suppliers: suppliers.length, orders: purchaseOrders.length }]
  }, [products, suppliers, purchaseOrders])

  const orderStatusChart = React.useMemo(() => {
    const counts = new Map<string, number>()
    purchaseOrders.forEach((order) => {
      const status = order.status || "draft"
      counts.set(status, (counts.get(status) ?? 0) + 1)
    })
    return Array.from(counts.entries()).map(([status, value]) => ({ status, value }))
  }, [purchaseOrders])

  const guidance = React.useMemo(() => {
    const items: Array<{ title: string; description: string; tone: "warning" | "success" | "default"; href: string }> = []

    if (outOfStockProducts.length) {
      items.push({
        title: `${outOfStockProducts.length} product${outOfStockProducts.length === 1 ? "" : "s"} out of stock`,
        description: "Review suppliers or create purchase orders before sales are affected.",
        tone: "warning",
        href: "/products",
      })
    }

    if (lowStockProducts.length) {
      items.push({
        title: `${lowStockProducts.length} low-stock alert${lowStockProducts.length === 1 ? "" : "s"}`,
        description: "These products are close to their reorder threshold.",
        tone: "warning",
        href: "/products",
      })
    }

    if (!suppliers.length) {
      items.push({
        title: "No suppliers connected yet",
        description: "Add suppliers so product costs, currencies, and purchase orders are structured.",
        tone: "default",
        href: "/suppliers",
      })
    }

    if (openOrders.length) {
      items.push({
        title: `${openOrders.length} open purchase order${openOrders.length === 1 ? "" : "s"}`,
        description: "Track ordered, partially received, and draft purchasing work.",
        tone: "default",
        href: "/purchase-orders",
      })
    }

    if (!items.length) {
      items.push({
        title: "Workspace looks healthy",
        description: "No urgent stock or purchasing issues were detected from current records.",
        tone: "success",
        href: "/dashboard",
      })
    }

    return items.slice(0, 4)
  }, [lowStockProducts.length, openOrders.length, outOfStockProducts.length, suppliers.length])

  const recentProducts = [...products]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime())
    .slice(0, 5)

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2Icon className="size-5 animate-spin" />
          Loading NexStock analytics...
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0 lg:gap-6 lg:p-6 lg:pt-0">
      {error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-start gap-3 p-4 text-sm text-destructive">
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">Dashboard data could not load completely.</p>
              <p className="mt-1 text-destructive/80">{error}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{organization?.name || "NexStock workspace"}</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Operations dashboard</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadDashboard()}>
          <RefreshCwIcon className="size-4" />
          Refresh
        </Button>
      </div>

      <section className="grid auto-rows-min gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={BoxesIcon}
          title="Active products"
          value={activeProducts.length}
          detail={`${draftProducts.length} draft · ${archivedProducts.length} archived`}
          href="/products"
        />
        <MetricCard
          icon={DatabaseZapIcon}
          title="Inventory value"
          value={money(inventoryValue, baseCurrency)}
          detail={`${outOfStockProducts.length} out of stock · ${lowStockProducts.length} low stock`}
          href="/products"
        />
        <MetricCard
          icon={TruckIcon}
          title="Active suppliers"
          value={activeSuppliers.length}
          detail={`${suppliers.length} total supplier records`}
          href="/suppliers"
        />
        <MetricCard
          icon={ClipboardListIcon}
          title="Purchase orders"
          value={purchaseOrders.length}
          detail={`${openOrders.length} open · ${receivedOrders.length} received`}
          href="/purchase-orders"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <CardHeader>
            <CardTitle>Inventory by category</CardTitle>
            <CardDescription>Stock quantity and low-stock alerts across your largest product categories.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={inventoryConfig} className="min-h-[280px] w-full">
              <BarChart data={stockChart} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="category" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="quantity" fill="var(--color-quantity)" radius={4} />
                <Bar dataKey="lowStock" fill="var(--color-lowStock)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Guidance</CardTitle>
            <CardDescription>What needs attention based on current data.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {guidance.map((item) => (
              <Link key={item.title} href={item.href} className="rounded-xl border p-3 transition-colors hover:bg-muted/50">
                <div className="flex items-start gap-3">
                  {item.tone === "success" ? (
                    <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                  ) : item.tone === "warning" ? (
                    <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-500" />
                  ) : (
                    <ArrowRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Workspace activity</CardTitle>
            <CardDescription>Products, suppliers, and purchase order records captured in the workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={statusConfig} className="min-h-[260px] w-full">
              <AreaChart data={operationsChart} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area dataKey="products" type="natural" fill="var(--color-products)" fillOpacity={0.35} stroke="var(--color-products)" />
                <Area dataKey="suppliers" type="natural" fill="var(--color-suppliers)" fillOpacity={0.25} stroke="var(--color-suppliers)" />
                <Area dataKey="orders" type="natural" fill="var(--color-orders)" fillOpacity={0.2} stroke="var(--color-orders)" />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Purchase order status</CardTitle>
            <CardDescription>{money(purchaseValue, baseCurrency)} in purchase order value.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={orderConfig} className="min-h-[260px] w-full">
              <PieChart accessibilityLayer>
                <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
                <Pie data={orderStatusChart} dataKey="value" nameKey="status" innerRadius={58} outerRadius={88} paddingAngle={3}>
                  {orderStatusChart.map((_, index) => (
                    <Cell key={index} fill={`var(--chart-${(index % 5) + 1})`} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent product records</CardTitle>
            <CardDescription>Latest products updated in your catalog.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentProducts.length ? (
                  recentProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Link href={`/products/${product.id}`} className="font-medium hover:underline">
                          {product.name}
                        </Link>
                        <p className="font-mono text-xs text-muted-foreground">{product.sku || "No SKU"}</p>
                      </TableCell>
                      <TableCell>{product.category || "Uncategorized"}</TableCell>
                      <TableCell className="text-right">{numberValue(product.quantity)}</TableCell>
                      <TableCell>
                        <ProductBadge product={product} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No products yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" size="sm">
              <Link href="/products">
                View products <ArrowRightIcon className="size-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next operational steps</CardTitle>
            <CardDescription>Recommended setup path for a reliable inventory workspace.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <SetupStep done={Boolean(products.length)} title="Create or import products" href="/products" />
            <SetupStep done={Boolean(suppliers.length)} title="Add suppliers" href="/suppliers" />
            <SetupStep done={Boolean(openOrders.length || receivedOrders.length)} title="Create purchase orders" href="/purchase-orders" />
            <SetupStep done={Boolean(organization?.baseCurrency)} title="Confirm base currency" href="/organization" />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  title,
  value,
  detail,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  value: string | number
  detail: string
  href: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardDescription>{title}</CardDescription>
          <CardTitle className="mt-2 text-2xl font-semibold tracking-tight">{value}</CardTitle>
        </div>
        <span className="rounded-lg bg-muted p-2 text-muted-foreground">
          <Icon className="size-4" />
        </span>
      </CardHeader>
      <CardFooter className="justify-between text-sm text-muted-foreground">
        <span>{detail}</span>
        <Link href={href} className="font-medium text-foreground hover:underline">
          Open
        </Link>
      </CardFooter>
    </Card>
  )
}

function ProductBadge({ product }: { product: Product }) {
  const quantity = numberValue(product.quantity)
  const lowStock = quantity > 0 && quantity <= numberValue(product.lowStockLevel)

  if (product.status === "archived") return <Badge variant="outline">Archived</Badge>
  if (quantity <= 0) return <Badge variant="destructive">Out</Badge>
  if (lowStock) return <Badge variant="secondary">Low</Badge>
  if (product.status === "draft") return <Badge variant="outline">Draft</Badge>
  return <Badge>Active</Badge>
}

function SetupStep({ done, title, href }: { done: boolean; title: string; href: string }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/50">
      <div className="flex items-center gap-3">
        <span className={done ? "text-emerald-500" : "text-muted-foreground"}>
          {done ? <CheckCircle2Icon className="size-4" /> : <PackageCheckIcon className="size-4" />}
        </span>
        <span className="text-sm font-medium">{title}</span>
      </div>
      <ArrowRightIcon className="size-4 text-muted-foreground" />
    </Link>
  )
}
