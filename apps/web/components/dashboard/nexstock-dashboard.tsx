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
  SparklesIcon,
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
import { cn } from "@/lib/utils"

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
  quantity: { label: "Stock quantity", color: "var(--chart-1)" },
  lowStock: { label: "Low stock alert", color: "var(--chart-2)" },
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
  return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number.isFinite(value) ? value : 0)
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

  React.useEffect(() => { void loadDashboard() }, [])

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
  const stockedUnits = activeProducts.reduce((sum, product) => sum + numberValue(product.quantity), 0)

  const stockChart = React.useMemo(() => {
    const byCategory = new Map<string, { category: string; quantity: number; lowStock: number }>()
    activeProducts.forEach((product) => {
      const category = product.category || "Uncategorized"
      const current = byCategory.get(category) ?? { category, quantity: 0, lowStock: 0 }
      current.quantity += numberValue(product.quantity)
      if (numberValue(product.quantity) <= numberValue(product.lowStockLevel)) current.lowStock += 1
      byCategory.set(category, current)
    })
    return Array.from(byCategory.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 6)
  }, [activeProducts])

  const operationsChart = React.useMemo(() => {
    const months = new Map<string, { month: string; products: number; suppliers: number; orders: number }>()
    function ensure(month: string) {
      const current = months.get(month) ?? { month, products: 0, suppliers: 0, orders: 0 }
      months.set(month, current)
      return current
    }
    products.forEach((product) => { ensure(monthKey(product.createdAt || product.updatedAt)).products += 1 })
    suppliers.forEach(() => { ensure("Suppliers").suppliers += 1 })
    purchaseOrders.forEach((order) => { ensure(monthKey(order.createdAt)).orders += 1 })
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
    if (outOfStockProducts.length) items.push({ title: `${outOfStockProducts.length} product${outOfStockProducts.length === 1 ? "" : "s"} out of stock`, description: "Review suppliers or create purchase orders before sales are affected.", tone: "warning", href: "/products" })
    if (lowStockProducts.length) items.push({ title: `${lowStockProducts.length} low-stock alert${lowStockProducts.length === 1 ? "" : "s"}`, description: "These products are close to their reorder threshold.", tone: "warning", href: "/products" })
    if (!suppliers.length) items.push({ title: "No suppliers connected yet", description: "Add suppliers so product costs, currencies, and purchase orders are structured.", tone: "default", href: "/suppliers" })
    if (openOrders.length) items.push({ title: `${openOrders.length} open purchase order${openOrders.length === 1 ? "" : "s"}`, description: "Track ordered, partially received, and draft purchasing work.", tone: "default", href: "/purchase-orders" })
    if (!items.length) items.push({ title: "Workspace looks healthy", description: "No urgent stock or purchasing issues were detected from current records.", tone: "success", href: "/dashboard" })
    return items.slice(0, 4)
  }, [lowStockProducts.length, openOrders.length, outOfStockProducts.length, suppliers.length])

  const recentProducts = [...products].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()).slice(0, 5)

  if (loading) {
    return <div className="nexstock-shell flex flex-1 items-center justify-center p-6"><div className="nexstock-card flex items-center gap-3 rounded-2xl px-5 py-4 text-sm text-muted-foreground"><Loader2Icon className="size-5 animate-spin text-primary" />Loading NexStock analytics...</div></div>
  }

  return (
    <div className="nexstock-shell flex flex-1 flex-col gap-5 p-4 pt-0 lg:gap-6 lg:p-6 lg:pt-0">
      {error ? <Card className="border-destructive/30 bg-destructive/5"><CardContent className="flex items-start gap-3 p-4 text-sm text-destructive"><AlertTriangleIcon className="mt-0.5 size-4 shrink-0" /><div><p className="font-medium">Dashboard data could not load completely.</p><p className="mt-1 text-destructive/80">{error}</p></div></CardContent></Card> : null}

      <section className="nexstock-hero nexstock-glow relative overflow-hidden rounded-[2rem] border border-white/10 p-5 shadow-2xl sm:p-6 lg:p-8">
        <div className="absolute -right-20 -top-24 size-80 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute -left-24 bottom-0 size-80 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur"><SparklesIcon className="size-3.5 text-cyan-300" />{organization?.name || "NexStock workspace"}</div>
            <h1 className="mt-5 font-heading text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">Connect. Manage. <span className="nexstock-gradient-text">Grow.</span></h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">A clean operations command center for products, suppliers, purchase orders, and inventory movement across your business.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild className="bg-white text-slate-950 hover:bg-white/90"><Link href="/products/new"><BoxesIcon className="size-4" />Add product</Link></Button>
              <Button asChild variant="outline" className="border-white/20 bg-white/8 text-white hover:bg-white/15 hover:text-white"><Link href="/purchase-orders/new"><ClipboardListIcon className="size-4" />New purchase order</Link></Button>
              <Button variant="ghost" className="text-white/80 hover:bg-white/10 hover:text-white" onClick={() => void loadDashboard()}><RefreshCwIcon className="size-4" />Refresh</Button>
            </div>
          </div>
          <div className="grid min-w-[17rem] gap-3 rounded-3xl border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
            <HeroFact label="Stocked units" value={stockedUnits.toLocaleString()} />
            <HeroFact label="Inventory value" value={money(inventoryValue, baseCurrency)} />
            <HeroFact label="Open POs" value={openOrders.length.toLocaleString()} />
          </div>
        </div>
      </section>

      <section className="grid auto-rows-min gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={BoxesIcon} title="Active products" value={activeProducts.length} detail={`${draftProducts.length} draft · ${archivedProducts.length} archived`} href="/products" accent="blue" />
        <MetricCard icon={DatabaseZapIcon} title="Inventory value" value={money(inventoryValue, baseCurrency)} detail={`${outOfStockProducts.length} out of stock · ${lowStockProducts.length} low stock`} href="/products" accent="cyan" />
        <MetricCard icon={TruckIcon} title="Active suppliers" value={activeSuppliers.length} detail={`${suppliers.length} total supplier records`} href="/suppliers" accent="violet" />
        <MetricCard icon={ClipboardListIcon} title="Purchase orders" value={purchaseOrders.length} detail={`${openOrders.length} open · ${receivedOrders.length} received`} href="/purchase-orders" accent="teal" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <DashboardCard><CardHeader><CardTitle>Inventory by category</CardTitle><CardDescription>Stock quantity and low-stock alerts across your largest product categories.</CardDescription></CardHeader><CardContent><ChartContainer config={inventoryConfig} className="min-h-[280px] w-full"><BarChart data={stockChart} accessibilityLayer><CartesianGrid vertical={false} strokeDasharray="4 4" /><XAxis dataKey="category" tickLine={false} axisLine={false} tickMargin={8} /><YAxis tickLine={false} axisLine={false} tickMargin={8} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="quantity" fill="var(--color-quantity)" radius={8} /><Bar dataKey="lowStock" fill="var(--color-lowStock)" radius={8} /></BarChart></ChartContainer></CardContent></DashboardCard>
        <DashboardCard><CardHeader><CardTitle>Guidance</CardTitle><CardDescription>What needs attention based on current data.</CardDescription></CardHeader><CardContent className="grid gap-3">{guidance.map((item) => <Link key={item.title} href={item.href} className="group rounded-2xl border bg-background/45 p-3 transition-colors hover:bg-background/80"><div className="flex items-start gap-3"><span className={cn("mt-0.5 rounded-xl p-2", item.tone === "success" ? "bg-emerald-500/10 text-emerald-500" : item.tone === "warning" ? "bg-amber-500/10 text-amber-500" : "bg-primary/10 text-primary")}>{item.tone === "success" ? <CheckCircle2Icon className="size-4" /> : item.tone === "warning" ? <AlertTriangleIcon className="size-4" /> : <ArrowRightIcon className="size-4" />}</span><div><p className="text-sm font-medium">{item.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p></div></div></Link>)}</CardContent></DashboardCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <DashboardCard><CardHeader><CardTitle>Workspace activity</CardTitle><CardDescription>Products, suppliers, and purchase order records captured in the workspace.</CardDescription></CardHeader><CardContent><ChartContainer config={statusConfig} className="min-h-[260px] w-full"><AreaChart data={operationsChart} accessibilityLayer><CartesianGrid vertical={false} strokeDasharray="4 4" /><XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} /><YAxis tickLine={false} axisLine={false} tickMargin={8} /><ChartTooltip content={<ChartTooltipContent />} /><Area dataKey="products" type="natural" fill="var(--color-products)" fillOpacity={0.35} stroke="var(--color-products)" /><Area dataKey="suppliers" type="natural" fill="var(--color-suppliers)" fillOpacity={0.25} stroke="var(--color-suppliers)" /><Area dataKey="orders" type="natural" fill="var(--color-orders)" fillOpacity={0.2} stroke="var(--color-orders)" /></AreaChart></ChartContainer></CardContent></DashboardCard>
        <DashboardCard><CardHeader><CardTitle>Purchase order status</CardTitle><CardDescription>{money(purchaseValue, baseCurrency)} in purchase order value.</CardDescription></CardHeader><CardContent><ChartContainer config={orderConfig} className="min-h-[260px] w-full"><PieChart accessibilityLayer><ChartTooltip content={<ChartTooltipContent nameKey="status" />} /><Pie data={orderStatusChart} dataKey="value" nameKey="status" innerRadius={58} outerRadius={88} paddingAngle={4}>{orderStatusChart.map((_, index) => <Cell key={index} fill={`var(--chart-${(index % 5) + 1})`} />)}</Pie></PieChart></ChartContainer></CardContent></DashboardCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <DashboardCard><CardHeader><CardTitle>Recent product records</CardTitle><CardDescription>Latest products updated in your catalog.</CardDescription></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow className="hover:bg-transparent"><TableHead>Product</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Stock</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{recentProducts.length ? recentProducts.map((product) => <TableRow key={product.id} className="hover:bg-muted/35"><TableCell><Link href={`/products/${product.id}`} className="font-medium hover:underline">{product.name}</Link><p className="font-mono text-xs text-muted-foreground">{product.sku || "No SKU"}</p></TableCell><TableCell>{product.category || "Uncategorized"}</TableCell><TableCell className="text-right tabular-nums">{numberValue(product.quantity)}</TableCell><TableCell><ProductBadge product={product} /></TableCell></TableRow>) : <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No products yet.</TableCell></TableRow>}</TableBody></Table></CardContent><CardFooter><Button asChild variant="outline" size="sm"><Link href="/products">View products <ArrowRightIcon className="size-4" /></Link></Button></CardFooter></DashboardCard>
        <DashboardCard><CardHeader><CardTitle>Next operational steps</CardTitle><CardDescription>Recommended setup path for a reliable inventory workspace.</CardDescription></CardHeader><CardContent className="grid gap-3"><SetupStep done={Boolean(products.length)} title="Create or import products" href="/products" /><SetupStep done={Boolean(suppliers.length)} title="Add suppliers" href="/suppliers" /><SetupStep done={Boolean(openOrders.length || receivedOrders.length)} title="Create purchase orders" href="/purchase-orders" /><SetupStep done={Boolean(organization?.baseCurrency)} title="Confirm base currency" href="/organization" /></CardContent></DashboardCard>
      </section>
    </div>
  )
}

function DashboardCard({ children }: { children: React.ReactNode }) { return <Card className="nexstock-card rounded-3xl">{children}</Card> }
function HeroFact({ label, value }: { label: string; value: string | number }) { return <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3 last:border-b-0 last:pb-0"><span className="text-xs font-medium uppercase tracking-[0.18em] text-white/50">{label}</span><span className="font-semibold tabular-nums text-white">{value}</span></div> }
function MetricCard({ icon: Icon, title, value, detail, href, accent }: { icon: React.ComponentType<{ className?: string }>; title: string; value: string | number; detail: string; href: string; accent: "blue" | "cyan" | "violet" | "teal" }) {
  const accentClass = { blue: "from-blue-500/18 to-blue-500/0 text-blue-500", cyan: "from-cyan-400/18 to-cyan-400/0 text-cyan-500", violet: "from-violet-500/18 to-violet-500/0 text-violet-500", teal: "from-emerald-400/18 to-emerald-400/0 text-emerald-500" }[accent]
  return <Card className="nexstock-card group overflow-hidden rounded-3xl transition hover:-translate-y-0.5 hover:shadow-xl"><div className={cn("h-1 bg-gradient-to-r", accent === "blue" ? "from-blue-500 via-cyan-400 to-violet-500" : accent === "cyan" ? "from-cyan-400 via-emerald-400 to-blue-500" : accent === "violet" ? "from-violet-500 via-blue-500 to-cyan-400" : "from-emerald-400 via-cyan-400 to-blue-500")} /><CardHeader className="flex flex-row items-start justify-between space-y-0"><div><CardDescription>{title}</CardDescription><CardTitle className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</CardTitle></div><span className={cn("rounded-2xl bg-gradient-to-br p-3", accentClass)}><Icon className="size-5" /></span></CardHeader><CardFooter className="justify-between text-sm text-muted-foreground"><span>{detail}</span><Link href={href} className="inline-flex items-center gap-1 font-medium text-foreground hover:underline">Open <ArrowRightIcon className="size-3.5 transition group-hover:translate-x-0.5" /></Link></CardFooter></Card>
}
function ProductBadge({ product }: { product: Product }) { const quantity = numberValue(product.quantity); const lowStock = quantity > 0 && quantity <= numberValue(product.lowStockLevel); if (product.status === "archived") return <Badge variant="outline">Archived</Badge>; if (quantity <= 0) return <Badge variant="destructive">Out</Badge>; if (lowStock) return <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-300">Low</Badge>; if (product.status === "draft") return <Badge variant="outline">Draft</Badge>; return <Badge className="bg-emerald-500/12 text-emerald-700 hover:bg-emerald-500/18 dark:text-emerald-300">Active</Badge> }
function SetupStep({ done, title, href }: { done: boolean; title: string; href: string }) { return <Link href={href} className="group flex items-center justify-between gap-3 rounded-2xl border bg-background/45 p-3 transition-colors hover:bg-background/80"><div className="flex items-center gap-3"><span className={cn("rounded-xl p-2", done ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground")}>{done ? <CheckCircle2Icon className="size-4" /> : <PackageCheckIcon className="size-4" />}</span><span className="text-sm font-medium">{title}</span></div><ArrowRightIcon className="size-4 text-muted-foreground transition group-hover:translate-x-0.5" /></Link> }
