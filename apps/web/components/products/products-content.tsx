"use client"

import * as React from "react"
import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"
import {
  ArchiveIcon,
  ArrowRightIcon,
  DownloadIcon,
  EditIcon,
  EllipsisVerticalIcon,
  Loader2Icon,
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
import { RecordActionDialog } from "@/components/records/record-action-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
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

function ProductActions({ product, busy, onArchive }: { product: Product; busy?: boolean; onArchive: (product: Product) => void }) {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground data-[state=open]:bg-muted" disabled={busy}>
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
          <DropdownMenuItem variant="destructive" onClick={() => setOpen(true)}>
            <ArchiveIcon className="size-4" />
            Archive
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <RecordActionDialog
        open={open}
        onOpenChange={setOpen}
        busy={busy}
        title="Archive product?"
        description={`This will archive "${product.name}" and remove it from active inventory workflows. You can still keep historical records.`}
        confirmLabel="Archive product"
        onConfirm={() => onArchive(product)}
      />
    </>
  )
}

function ProductsLoading() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
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
      cell: ({ row }) => <ProductActions product={row.original} busy={running} onArchive={archiveProduct} />,
      enableHiding: false,
    },
  ], [running])

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
      confirmTitle: "Archive selected products?",
      confirmDescription: (count) => `This will archive ${count} selected product${count === 1 ? "" : "s"} and remove them from active inventory workflows. Historical records will remain available.`,
      confirmLabel: "Archive products",
      confirmVariant: "destructive",
      onClick: bulkArchive,
    },
  ], [])

  if (loading) return <ProductsLoading />

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-5 md:py-6">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <PlusIcon className="size-4" />
                  New product
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/products/new">
                    <PlusIcon className="size-4" />
                    Add new product
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/imports/new">
                    <UploadIcon className="size-4" />
                    Import products
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

        <div className="grid grid-cols-2 gap-2 px-4 sm:flex sm:flex-wrap lg:px-6">
          <CompactStat label="Total" value={filteredProducts.length} />
          <CompactStat label="Active" value={activeProducts.length} />
          <CompactStat label="Draft" value={draftProducts.length} />
          <CompactStat label="Stock" value={totalStock.toLocaleString()} />
          <CompactStat label="Low" value={lowStockProducts.length} />
          <CompactStat label="Out" value={outOfStockProducts.length} />
          <CompactStat label="Archived" value={archivedProducts.length} />
        </div>

        <RecordsTable
          data={filteredProducts}
          columns={columns}
          title="All products"
          description={`Showing ${filteredProducts.length} of ${products.length} products · ${selectedLayoutName}`}
          searchPlaceholder="Search product name, SKU, category..."
          getRowId={(row) => row.id}
          actions={
            <>
              <Select value={selectedLayoutId} onValueChange={setSelectedLayoutId}>
                <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Filter by layout" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All layouts</SelectItem>
                  <SelectItem value="none">No layout</SelectItem>
                  {layouts.map((layout) => <SelectItem key={layout.id} value={layout.id}>{layout.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedKind} onValueChange={setSelectedKind}>
                <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Filter by kind" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All kinds</SelectItem>
                  {kinds.map((kind) => <SelectItem key={kind} value={kind} className="capitalize">{kind}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                <Link href="/settings/layout">
                  Layout settings
                  <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
            </>
          }
          bulkActions={bulkActions}
        />
      </div>
    </div>
  )
}
