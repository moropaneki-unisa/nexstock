"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArchiveIcon,
  ArrowLeftIcon,
  EditIcon,
  Loader2Icon,
  PackageIcon,
  RefreshCwIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { toast } from "sonner"

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
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch } from "@/lib/api"

type Product = {
  id: string
  name: string
  sku?: string | null
  category?: string | null
  description?: string | null
  status?: string | null
  quantity?: number | string | null
  lowStockLevel?: number | string | null
  price?: number | string | null
  costPrice?: number | string | null
  currency?: string | null
  createdAt?: string | null
  updatedAt?: string | null
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

function productState(product: Product) {
  const quantity = numberValue(product.quantity)
  const lowStockLevel = numberValue(product.lowStockLevel)
  if (product.status === "archived") return "archived"
  if (product.status === "draft") return "draft"
  if (quantity <= 0) return "out"
  if (lowStockLevel > 0 && quantity <= lowStockLevel) return "low"
  return "active"
}

function ProductBadge({ product }: { product: Product }) {
  const state = productState(product)
  if (state === "archived") return <Badge variant="outline">Archived</Badge>
  if (state === "draft") return <Badge variant="secondary">Draft</Badge>
  if (state === "out") return <Badge variant="destructive">Out of stock</Badge>
  if (state === "low") return <Badge variant="secondary">Low stock</Badge>
  return <Badge>Active</Badge>
}

export function ProductDetailContent({ productId }: { productId: string }) {
  const router = useRouter()
  const [product, setProduct] = React.useState<Product | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [running, setRunning] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function loadProduct() {
    setLoading(true)
    setError(null)
    try {
      const result = await apiFetch<Product>(`/api/products/${productId}`)
      setProduct(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load product"
      setError(message)
      toast.error("Product could not load", { description: message })
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    void loadProduct()
  }, [productId])

  async function archiveProduct() {
    if (!product) return
    setRunning(true)
    try {
      await apiFetch(`/api/products/${product.id}`, { method: "DELETE" })
      toast.success("Product archived", { description: product.name })
      router.push("/products")
    } catch (err) {
      toast.error("Could not archive product", {
        description: err instanceof Error ? err.message : "Archive failed",
      })
    } finally {
      setRunning(false)
    }
  }

  if (loading) {
    return (
      <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-[520px] rounded-xl" />
      </div>
    )
  }

  if (!product || error) {
    return (
      <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link href="/products">
            <ArrowLeftIcon className="size-4" />
            Back to products
          </Link>
        </Button>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <TriangleAlertIcon className="size-4" />
              Product not available
            </CardTitle>
            <CardDescription>{error || "The product could not be found."}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link href="/products">
              <ArrowLeftIcon className="size-4" />
              Products
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">{product.name}</h1>
            <ProductBadge product={product} />
          </div>
          <p className="mt-1 font-mono text-sm text-muted-foreground">{product.sku || "No SKU"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadProduct()} disabled={running}>
            <RefreshCwIcon className="size-4" />
            Refresh
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/products/${product.id}/edit`}>
              <EditIcon className="size-4" />
              Edit
            </Link>
          </Button>
          <Button size="sm" variant="destructive" onClick={archiveProduct} disabled={running}>
            {running ? <Loader2Icon className="size-4 animate-spin" /> : <ArchiveIcon className="size-4" />}
            Archive
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Stock on hand" value={numberValue(product.quantity).toLocaleString()} detail={`Low stock alert: ${numberValue(product.lowStockLevel).toLocaleString()}`} />
        <SummaryCard title="Selling price" value={formatMoney(product.price, product.currency || "USD")} detail={`Currency: ${product.currency || "USD"}`} />
        <SummaryCard title="Fallback cost" value={formatMoney(product.costPrice, product.currency || "USD")} detail="Supplier cost links come next" />
        <SummaryCard title="Category" value={product.category || "Uncategorized"} detail={`Updated ${formatDate(product.updatedAt || product.createdAt)}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <Card>
          <CardHeader>
            <CardTitle>Product details</CardTitle>
            <CardDescription>Core catalog information used across stock and purchasing workflows.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Detail label="Name" value={product.name} />
            <Detail label="SKU" value={product.sku || "No SKU"} />
            <Detail label="Category" value={product.category || "Uncategorized"} />
            <Detail label="Description" value={product.description || "No description added."} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Guidance</CardTitle>
            <CardDescription>Operational recommendations for this product.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            {productState(product) === "out" ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive">This product is out of stock. Connect suppliers and create a purchase order.</p>
            ) : productState(product) === "low" ? (
              <p className="rounded-lg border bg-muted/40 p-3">This product is below the low-stock threshold. Review supplier lead times.</p>
            ) : (
              <p className="rounded-lg border bg-muted/40 p-3">This product currently has no urgent stock warning.</p>
            )}
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link href={`/products/${product.id}/edit`}>
                <EditIcon className="size-4" />
                Update product
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

function SummaryCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardFooter className="text-sm text-muted-foreground">{detail}</CardFooter>
    </Card>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b pb-3 last:border-b-0 last:pb-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  )
}
