"use client"

import * as React from "react"
import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"
import {
  ArchiveIcon,
  ArrowRightIcon,
  BoxesIcon,
  DownloadIcon,
  EditIcon,
  EllipsisVerticalIcon,
  FilterIcon,
  Loader2Icon,
  PackageIcon,
  PlusIcon,
  RefreshCwIcon,
  TriangleAlertIcon,
  UploadIcon,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch, getAccessToken, getApiUrl } from "@/lib/api"
import { getCachedLayouts } from "@/lib/cached-api"
import { formatMoney, numberValue } from "@/lib/money"

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
  metadata?: {
    productTypeId?: string | null
    productTypeName?: string | null
    kind?: string | null
    trackInventory?: boolean | null
    customFields?: Record<string, unknown> | null
  } | null
  createdAt?: string | null
  updatedAt?: string | null
}

type Layout = {
  id: string
  name: string
  kind?: string | null
  isDefault?: boolean | null
}

type Paginated<T> = {
  items?: T[]
  data?: T[]
  pagination?: { total?: number | null } | null
}

type ImportResult = {
  created?: number
  updated?: number
  skipped?: number
  errors?: Array<string | { row?: number; message?: string }>
  message?: string
}

function normalizeList<T>(value: T[] | Paginated<T> | null | undefined) {
  if (!value) return []
  if (Array.isArray(value)) return value
  return value.items ?? value.data ?? []
}

function normalizeProducts(value: Product[] | Paginated<Product> | null | undefined) {
  return normalizeList<Product>(value)
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

function getProductState(product: Product) {
  const quantity = numberValue(product.quantity)
  const lowStockLevel = numberValue(product.lowStockLevel)

  if (product.status === "archived") return "archived"
  if (product.status === "draft") return "draft"
  if (product.metadata?.trackInventory === false) return "active"
  if (quantity <= 0) return "out"
  if (lowStockLevel > 0 && quantity <= lowStockLevel) return "low"
  return "active"
}

function productLayoutId(product: Product) {
  return product.metadata?.productTypeId || ""
}

function productLayoutName(product: Product) {
  return product.metadata?.productTypeName || "No layout"
}

function importSummary(result: ImportResult) {
  const parts = [
    typeof result.created === "number" ? `${result.created} created` : null,
    typeof result.updated === "number" ? `${result.updated} updated` : null,
    typeof result.skipped === "number" ? `${result.skipped} skipped` : null,
  ].filter(Boolean)

  return parts.length ? parts.join(" · ") : result.message || "Import completed"
}

function ProductStatusBadge({ product }: { product: Product }) {
  const state = getProductState(product)

  if (state === "archived") return <Badge variant="outline">Archived</Badge>
  if (state === "draft") return <Badge variant="secondary">Draft</Badge>
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
  const [layouts, setLayouts] = React.useState<Layout[]>([])
  const [selectedLayoutId, setSelectedLayoutId] = React.useState("all")
  const [selectedKind, setSelectedKind] = React.useState("all")
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [running, setRunning] = React.useState(false)
  const [importing, setImporting] = React.useState(false)
  const [exporting, setExporting] = React.useState<"csv" | "xlsx" | null>(null)
  const importInputRef = React.useRef<HTMLInputElement | null>(null)

  async function loadProducts() {
    setLoading(true)
    setError(null)

    try {
      const [productResult, layoutResult] = await Promise.all([
        apiFetch<Product[] | Paginated<Product>>("/api/products?limit=100"),
        getCachedLayouts<Layout[] | Paginated<Layout>>().catch(() => []),
      ])
      setProducts(normalizeProducts(productResult))
      setLayouts(normalizeList<Layout>(layoutResult).filter((layout) => layout?.id))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load products"
      setError(message)
      toast.error("Products could not load", { description: message })
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
      toast.success("Product archived", { description: product.name })
      await loadProducts()
    } catch (err) {
      toast.error("Could not archive product", {
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
      toast.success("Products archived", { description: `${rows.length} product${rows.length === 1 ? "" : "s"} archived.` })
      await loadProducts()
    } catch (err) {
      toast.error("Could not archive selected products", {
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
      toast.success("Products updated", { description: `${rows.length} product${rows.length === 1 ? "" : "s"} set to ${status}.` })
      await loadProducts()
    } catch (err) {
      toast.error("Could not update selected products", {
        description: err instanceof Error ? err.message : "Bulk update failed",
      })
    } finally {
      setRunning(false)
    }
  }

  async function exportProducts(format: "csv" | "xlsx") {
    setExporting(format)
    try {
      const token = getAccessToken()
      const response = await fetch(`${getApiUrl()}/api/products/export?format=${format}`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      if (!response.ok) throw new Error("Export failed")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      const disposition = response.headers.get("content-disposition") || ""
      const match = disposition.match(/filename="?([^";]+)"?/i)
      link.href = url
      link.download = match?.[1] || `nexstock-products.${format}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success(`Products exported as ${format.toUpperCase()}`)
    } catch (err) {
      toast.error("Could not export products", { description: err instanceof Error ? err.message : "Export failed" })
    } finally {
      setExporting(null)
    }
  }

  async function importProducts(file: File) {
    setImporting(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const result = await apiFetch<ImportResult>("/api/products/import", {
        method: "POST",
        body: formData,
      })

      const errors = result.errors ?? []
      if (errors.length) {
        toast.warning("Products imported with warnings", {
          description: `${importSummary(result)} · ${errors.length} row issue${errors.length === 1 ? "" : "s"}`,
        })
      } else {
        toast.success("Products imported", { description: importSummary(result) })
      }
      await loadProducts()
    } catch (err) {
      toast.error("Could not import products", { description: err instanceof Error ? err.message : "Import failed" })
    } finally {
      setImporting(false)
      if (importInputRef.current) importInputRef.current.value = ""
    }
  }

  const kinds = React.useMemo(() => Array.from(new Set(products.map((product) => product.metadata?.kind).filter(Boolean) as string[])).sort(), [products])
  const filteredProducts = React.useMemo(() => {
    return products.filter((product) => {
      const layoutMatches = selectedLayoutId === "all" || (selectedLayoutId === "none" ? !productLayoutId(product) : productLayoutId(product) === selectedLayoutId)
      const kindMatches = selectedKind === "all" || product.metadata?.kind === selectedKind
      return layoutMatches && kindMatches
    })
  }, [products, selectedLayoutId, selectedKind])

  const activeProducts = filteredProducts.filter((product) => getProductState(product) === "active")
  const draftProducts = filteredProducts.filter((product) => getProductState(product) === "draft")
  const lowStockProducts = filteredProducts.filter((product) => getProductState(product) === "low")
  const outOfStockProducts = filteredProducts.filter((product) => getProductState(product) === "out")
  const archivedProducts = filteredProducts.filter((product) => getProductState(product) === "archived")
  const totalStock = filteredProducts.reduce((sum, product) => sum + numberValue(product.quantity), 0)
  const selectedLayoutName = selectedLayoutId === "all" ? "All layouts" : selectedLayoutId === "none" ? "No layout" : layouts.find((layout) => layout.id === selectedLayoutId)?.name || "Selected layout"

  const columns = React.useMemo<ColumnDef<Product>[]>(() => [
    createSelectColumn<Product>(),
    {
      accessorKey: "name",
      header: "Product",
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
      id: "layout",
      header: "Layout",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary">{productLayoutName(row.original)}</Badge>
          {row.original.metadata?.kind ? <Badge variant="outline" className="capitalize">{row.original.metadata.kind}</Badge> : null}
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => row.original.category || "Uncategorized",
    },
    {
      accessorKey: "quantity",
      header: () => <div className="text-left">Stock</div>,
      cell: ({ row }) => (
        <div className="flex min-w-[7.5rem] items-baseline justify-start gap-1 tabular-nums">
          {row.original.metadata?.trackInventory === false ? (
            <span className="text-muted-foreground">Not tracked</span>
          ) : (
            <>
              <span className="font-medium">{numberValue(row.original.quantity).toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">/ alert {numberValue(row.original.lowStockLevel).toLocaleString()}</span>
            </>
          )}
        </div>
      ),
    },
    {
      accessorKey: "price",
      header: "Selling price",
      cell: ({ row }) => <div className="font-medium tabular-nums">{formatMoney(row.original.price, row.original.priceCurrency || row.original.currency || "ZAR")}</div>,
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
            <h1 className="font-heading text-2xl font-semibold tracking-tight">Products</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={importInputRef}
              type="file"
              accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void importProducts(file)
              }}
            />
            <Button variant="outline" size="sm" onClick={() => importInputRef.current?.click()} disabled={running || loading || importing}>
              {importing ? <Loader2Icon className="size-4 animate-spin" /> : <UploadIcon className="size-4" />}
              Import
            </Button>
            <Button variant="outline" size="sm" onClick={() => void exportProducts("csv")} disabled={running || loading || exporting !== null}>
              {exporting === "csv" ? <Loader2Icon className="size-4 animate-spin" /> : <DownloadIcon className="size-4" />}
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => void exportProducts("xlsx")} disabled={running || loading || exporting !== null}>
              {exporting === "xlsx" ? <Loader2Icon className="size-4 animate-spin" /> : <DownloadIcon className="size-4" />}
              XLSX
            </Button>
            <Button variant="outline" size="sm" onClick={() => void loadProducts()} disabled={running || loading}>
              {running ? <Loader2Icon className="size-4 animate-spin" /> : <RefreshCwIcon className="size-4" />}
              Refresh
            </Button>
            <Button asChild size="sm">
              <Link href="/products/new">
                <PlusIcon className="size-4" />
                New product
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
                  Products could not load completely
                </CardTitle>
                <CardDescription>{error}</CardDescription>
              </CardHeader>
            </Card>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
          <ProductMetricCard title="Total products" value={filteredProducts.length} detail={`${activeProducts.length} active · ${draftProducts.length} draft`} icon={BoxesIcon} />
          <ProductMetricCard title="Stock on hand" value={totalStock.toLocaleString()} detail="Quantity in current filter" icon={PackageIcon} />
          <ProductMetricCard title="Low stock" value={lowStockProducts.length} detail={`${outOfStockProducts.length} out of stock`} icon={TriangleAlertIcon} />
          <ProductMetricCard title="Archived" value={archivedProducts.length} detail="Hidden from active operations" icon={ArchiveIcon} />
        </div>

        <div className="mx-4 flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-xs lg:mx-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium"><FilterIcon className="size-4" />Product filters</p>
            <p className="text-xs text-muted-foreground">Showing {filteredProducts.length} of {products.length} products · {selectedLayoutName}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Select value={selectedLayoutId} onValueChange={setSelectedLayoutId}>
              <SelectTrigger className="min-w-48"><SelectValue placeholder="Filter by layout" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All layouts</SelectItem>
                <SelectItem value="none">No layout</SelectItem>
                {layouts.map((layout) => <SelectItem key={layout.id} value={layout.id}>{layout.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedKind} onValueChange={setSelectedKind}>
              <SelectTrigger className="min-w-40"><SelectValue placeholder="Filter by kind" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All kinds</SelectItem>
                {kinds.map((kind) => <SelectItem key={kind} value={kind} className="capitalize">{kind}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <RecordsTable
          data={filteredProducts}
          columns={columns}
          title="All products"
          description="Manage product records, stock status, prices, categories, and product actions."
          searchPlaceholder="Search product name, SKU, category..."
          getRowId={(row) => row.id}
          actions={
            <Button asChild variant="outline" size="sm">
              <Link href="/settings/layout">
                Layout settings
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
