"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon, Loader2Icon, PackagePlusIcon, SaveIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
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
}

type ProductFormState = {
  name: string
  sku: string
  category: string
  description: string
  status: string
  quantity: string
  lowStockLevel: string
  price: string
  costPrice: string
  currency: string
}

const emptyForm: ProductFormState = {
  name: "",
  sku: "",
  category: "",
  description: "",
  status: "active",
  quantity: "0",
  lowStockLevel: "0",
  price: "0",
  costPrice: "0",
  currency: "USD",
}

function productToForm(product: Product): ProductFormState {
  return {
    name: product.name || "",
    sku: product.sku || "",
    category: product.category || "",
    description: product.description || "",
    status: product.status || "active",
    quantity: String(product.quantity ?? 0),
    lowStockLevel: String(product.lowStockLevel ?? 0),
    price: String(product.price ?? 0),
    costPrice: String(product.costPrice ?? 0),
    currency: product.currency || "USD",
  }
}

function toPayload(form: ProductFormState) {
  return {
    name: form.name.trim(),
    sku: form.sku.trim() || undefined,
    category: form.category.trim() || undefined,
    description: form.description.trim() || undefined,
    status: form.status,
    quantity: Number(form.quantity || 0),
    lowStockLevel: Number(form.lowStockLevel || 0),
    price: Number(form.price || 0),
    costPrice: Number(form.costPrice || 0),
    currency: form.currency,
  }
}

export function ProductFormContent({ productId }: { productId?: string }) {
  const router = useRouter()
  const editing = Boolean(productId)
  const [form, setForm] = React.useState<ProductFormState>(emptyForm)
  const [loading, setLoading] = React.useState(Boolean(productId))
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!productId) return

    let active = true
    setLoading(true)
    setError(null)

    apiFetch<Product>(`/api/products/${productId}`)
      .then((product) => {
        if (active) setForm(productToForm(product))
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Could not load product"
        if (active) setError(message)
        toast.error("Product could not load", { description: message })
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [productId])

  function updateField(key: keyof ProductFormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!form.name.trim()) {
      setError("Product name is required.")
      return
    }

    setSaving(true)
    try {
      const payload = toPayload(form)
      const saved = editing
        ? await apiFetch<Product>(`/api/products/${productId}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await apiFetch<Product>("/api/products", {
            method: "POST",
            body: JSON.stringify(payload),
          })

      toast.success(editing ? "Product updated" : "Product created", {
        description: saved.name || form.name,
      })
      router.push(saved?.id ? `/products/${saved.id}` : "/products")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save product"
      setError(message)
      toast.error("Product could not save", { description: message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-[620px] rounded-xl" />
      </div>
    )
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Products</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {editing ? "Edit product" : "New product"}
          </h1>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/products">
            <ArrowLeftIcon className="size-4" />
            Back to products
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
          <div className="grid gap-4">
            {error ? (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle>Product identity</CardTitle>
                <CardDescription>Core catalog details used across stock, purchasing, and reporting.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="name">Product name</Label>
                  <Input id="name" value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Product name" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input id="sku" value={form.sku} onChange={(event) => updateField("sku", event.target.value)} placeholder="SKU-001" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Input id="category" value={form.category} onChange={(event) => updateField("category", event.target.value)} placeholder="Category" />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={form.description} onChange={(event) => updateField("description", event.target.value)} placeholder="Describe this product" className="min-h-28" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Stock and pricing</CardTitle>
                <CardDescription>Selling price follows the organization base currency. Supplier costs will be connected later through supplier links.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="grid gap-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input id="quantity" type="number" value={form.quantity} onChange={(event) => updateField("quantity", event.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lowStockLevel">Low stock alert</Label>
                  <Input id="lowStockLevel" type="number" value={form.lowStockLevel} onChange={(event) => updateField("lowStockLevel", event.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="price">Selling price</Label>
                  <Input id="price" type="number" step="0.01" value={form.price} onChange={(event) => updateField("price", event.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="costPrice">Fallback cost</Label>
                  <Input id="costPrice" type="number" step="0.01" value={form.costPrice} onChange={(event) => updateField("costPrice", event.target.value)} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 self-start">
            <Card>
              <CardHeader>
                <CardTitle>Publishing</CardTitle>
                <CardDescription>Control product availability in the catalog.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(value) => updateField("status", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Currency</Label>
                  <Select value={form.currency} onValueChange={(value) => updateField("currency", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="ZAR">ZAR</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter className="gap-2">
                <Button type="submit" disabled={saving} className="w-full">
                  {saving ? <Loader2Icon className="size-4 animate-spin" /> : editing ? <SaveIcon className="size-4" /> : <PackagePlusIcon className="size-4" />}
                  {editing ? "Save product" : "Create product"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
