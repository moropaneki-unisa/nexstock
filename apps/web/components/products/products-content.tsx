"use client"

import * as React from "react"
import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"
import {
  ArchiveIcon,
  ArrowRightIcon,
  BoxesIcon,
  EditIcon,
  EllipsisVerticalIcon,
  Loader2Icon,
  PackageIcon,
  PlusIcon,
  RefreshCwIcon,
  Settings2Icon,
  TriangleAlertIcon,
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

type ProductMetadata = {
  productTypeName?: string | null
  kind?: string | null
  trackInventory?: boolean | null
  customFields?: Record<string, unknown> | null
}

type Product = {
  id: string
  name: string
  sku?: string | null
  category?: string | null
  status?: "active" | "draft" | "archived" | string | null
  quantity?: number | string | null
  lowStockLevel?: number | string | null
  price?: number | string | null
  costPrice?: number | string | null
  currency?: string | null
  priceCurrency?: string | null
  metadata?: ProductMetadata | null
  createdAt?: string | null
  updatedAt?: string | null
}

type Paginated<T> = {
  items?: T[]
  data?: T[]
  pagination?: { total?: number | null } | null
}

function normalizeProducts(value: Product[] | Paginated<Product> | null | undefined) {
  if (!value) return []
  if (Array.isArray(value)) return value
  return value.items ?? value.data ?? []
}

function numberValue(value: unknown) {
  const next = Number(value ?? 0)
  return Number.isFinite(next) ? next : 0
}

function formatMoney(value: unknown, currency = "USD") {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(numberValue(value))
}

function formatDate(value?: string | null) {
  if (!value) return "Not set"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not set"
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function tracksInventory(product: Product) {
  return product.metadata?.trackInventory !== false
}

function productKind(product: Product) {
  return product.metadata?.kind || "physical"
}

function productTypeName(product: Product) {
  return product.metadata?.productTypeName || "General product"
}

function getProductState(product: Product) {
  if (product.status === "archived") return "archived"
  if (product.status === "draft") return "draft"
  if (!tracksInventory(product)) return "active"

  const quantity = numberValue(product.quantity)
  const lowStockLevel = numberValue(product.lowStockLevel)
  if (quantity <= 0) return "out"
  if (lowStockLevel > 0 && quantity <= lowStockLevel) return "low"
  return "active"
}

function ProductStatusBadge({ product }: { product: Product }) {
  const state = getProductState(product)

  if (state === "archived") return <Badge variant="outline">Archived</Badge>
  if (state === "draft") return <Badge variant="secondary">Draft</Badge>
  if (!tracksInventory(product)) return <Badge variant="outline">No stock tracking</Badge>
  if (state === "out") return <Badge variant="destructive">Out of stock</Badge>
  if (state === "low") return <Badge variant="secondary">Low stock</Badge>
  return <Badge>Active</Badge>
}

function ProductActions({ product, onArchive }: { product: Product; onArchive: (product: Product) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground data-[state=open]:bg-muted">
          <EllipsisVerticalIcon className="size-4" />
          <span className="sr-only">Open product menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem asChild>
          <Link href={`/products/${product.id}`}>
            <ArrowRightIcon className="size-4" />
            View
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/products/${product.id}/edit`}>
            <EditIcon className="size-4" />
            Edit
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => onArchive(product)}>
          <ArchiveIcon className="size-4" />
          Archive
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ProductsLoading() {
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

export function ProductsContent() {
  const [products, setProducts] = React.useState<Product[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [running, setRunning] = React.useState(false)

  async function loadProducts() {
    setLoading(true)
    setError(null)

    try {
      const result = await apiFetch<Product[] | Paginated<Product>>("/api/products?limit=100")
      setProducts(normalizeProducts(result))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load products and services"
      setError(message)
      toast.error("Products & services could not load", { description: message })
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    void loadProducts()
  }, [])

  async function archiveProduct(product: Product) {
    setRunning(true)
    try {
      await apiFetch(`/api/products/${product.id}`, { method: "DELETE" })
      toast.success("Item archived", { description: product.name })
      await loadProducts()
    } catch (err) {
      toast.error("Could not archive item", {
        description: err instanceof Error ? err.message : "Archive failed",
      })
    } finally {
      setRunning(false)
    }
  }

  async function bulkArchive(rows: Product[]) {
    if (!rows.length) return
    setRunning(true)
    try {
      await Promise.all(rows.map((product) => apiFetch(`/api/products/${product.id}`, { method: "DELETE" })))
      toast.success("Items archived", { description: `${rows.length} item${rows.length === 1 ? "" : "s"} archived.` })
      await loadProducts()
    } catch (err) {
      toast.error("Could not archive selected items", {
        description: err instanceof Error ? err.message : "Bulk archive failed",
      })
    } finally {
      setRunning(false)
    }
  }

  async function bulkUpdateStatus(rows: Product[], status: "active" | "draft") {
    if (!rows.length) return
    setRunning(true)
    try {
      await Promise.all(rows.map((product) => apiFetch(`/api/products/${product.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      })))
      toast.success("Items updated", { description: `${rows.length} item${rows.length === 1 ? "" : "s"} set to ${status}.` })
      await loadProducts()
    } catch (err) {
      toast.error("Could not update selected items", {
        description: err instanceof Error ? err.message : "Bulk update failed",
      })
    } finally {
      setRunning(false)
    }
  }

  const activeProducts = products.filter((product) => getProductState(product) === "active")
  const draftProducts = products.filter((product) => getProductState(product) === "draft")
  const lowStockProducts = products.filter((product) => getProductState(product) === "low")
  const outOfStockProducts = products.filter((product) => getProductState(product) === "out")
  const archivedProducts = products.filter((product) => getProductState(product) === "archived")
  const serviceProducts = products.filter((product) => productKind(product) === "service" || !tracksInventory(product))
  const totalStock = products.filter(tracksInventory).reduce((sum, product) => sum + numberValue(product.quantity), 0)

  const columns = React.useMemo<ColumnDef<Product>[]>(() => [
    createSelectColumn<Product>(),
    {
      accessorKey: "name",
      header: "Item",
      cell: ({ row }) => (
        <div className="grid gap-1">
          <Link href={`/products/${row.original.id}`} className="font-medium hover:underline">
            {row.original.name}
          </Link>
          <span className="font-mono text-xs text-muted-foreground">{row.original.sku || "No SKU"}</span>
        </div>
      ),
      enableHiding: false,
    },
    {
      id: "productType",
      header: "Type",
      cell: ({ row }) => <div className="grid gap-1"><span>{productTypeName(row.original)}</span><span className="text-xs text-muted-foreground capitalize">{productKind(row.original)}</span></div>,
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => row.original.category || "Uncategorized",
    },
    {
      accessorKey: "quantity",
      header: "Stock",
      cell: ({ row }) => tracksInventory(row.original) ? (
        <div className="text-right tabular-nums">
          <span className="font-medium">{numberValue(row.original.quantity).toLocaleString()}</span>
          <span className="ml-1 text-xs text-muted-foreground">/ alert {numberValue(row.original.lowStockLevel).toLocaleString()}</span>
        </div>
      ) : <span className="text-muted-foreground">Not tracked</span>,
    },
    {
      accessorKey: "price",
      header: "Selling price",
      cell: ({ row }) => <div className="font-medium tabular-nums">{formatMoney(row.original.price, row.original.currency || row.original.priceCurrency || "USD")}</div>,
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => <ProductStatusBadge product={row.original} />,
    },
    {
      accessorKey: "updatedAt",
      header: "Updated",
      cell: ({ row }) => formatDate(row.original.updatedAt || row.original.createdAt),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <ProductActions product={row.original} onArchive={archiveProduct} />,
      enableHiding: false,
    },
  ], [])

  const bulkActions = React.useMemo<RecordsTableBulkAction<Product>[]>(() => [
    {
      label: "Set active",
      onClick: (rows) => bulkUpdateStatus(rows, "active"),
    },
    {
      label: "Set draft",
      onClick: (rows) => bulkUpdateStatus(rows, "draft"),
    },
    {
      label: "Archive selected",
      variant: "destructive",
      onClick: bulkArchive,
    },
  ], [])

  if (loading) return <ProductsLoading />

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <div>
            <p className="text-sm text-muted-foreground">Catalog</p>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">Products & Services</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage physical stock items, services, digital products, bundles, cars, smartphones, clothing, and custom item layouts.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm"><Link href="/products/types"><Settings2Icon className="size-4" />Product types</Link></Button>
            <Button variant="outline" size="sm" onClick={() => void loadProducts()} disabled={running || loading}>
              {running ? <Loader2Icon className="size-4 animate-spin" /> : <RefreshCwIcon className="size-4" />}
              Refresh
            </Button>
            <Button asChild size="sm">
              <Link href="/products/new">
                <PlusIcon className="size-4" />
                New item
              </Link>
            </Button>
          </div>
        </div>

        {error ? (
          <div className="px-4 lg:px-6">
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <TriangleAlertIcon className="size-4" />
                  Products & services could not load completely
                </CardTitle>
                <CardDescription>{error}</CardDescription>
              </CardHeader>
            </Card>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
          <ProductMetricCard title="Total items" value={products.length} detail={`${activeProducts.length} active · ${draftProducts.length} draft`} icon={BoxesIcon} />
          <ProductMetricCard title="Tracked stock" value={totalStock.toLocaleString()} detail="Quantity from inventory items only" icon={PackageIcon} />
          <ProductMetricCard title="Services / no stock" value={serviceProducts.length} detail="Non-inventory sellable items" icon={Settings2Icon} />
          <ProductMetricCard title="Low stock" value={lowStockProducts.length} detail={`${outOfStockProducts.length} out of stock · ${archivedProducts.length} archived`} icon={TriangleAlertIcon} />
        </div>

        <RecordsTable
          data={products}
          columns={columns}
          title="All products & services"
          description="Manage sellable items, stock-tracked products, non-stock services, prices, categories, and product layouts."
          searchPlaceholder="Search item name, SKU, category, product type..."
          getRowId={(row) => row.id}
          actions={
            <Button asChild variant="outline" size="sm">
              <Link href="/products/types">
                Product types
                <ArrowRightIcon className="size-4" />
              </Link>
            </Button>
          }
          bulkActions={bulkActions}
        />
      </div>
    </div>
  )
}

function ProductMetricCard({
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
