"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  CircleDollarSign,
  Edit,
  Filter,
  ImageIcon,
  Layers3,
  Loader2,
  PackageCheck,
  PackageSearch,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Warehouse,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { apiFetch } from "@/lib/api";
import type { Paginated, Product } from "@/lib/types";
import { cn } from "@/lib/utils";

const PAGE_LIMIT = 25;

const sampleProducts: Product[] = [
  {
    id: "sample-1",
    name: "Premium Cotton T-Shirt",
    sku: "APP-00042",
    description: "High-margin apparel product prepared for Zoho sync.",
    price: 29.99,
    cost: 12.5,
    quantity: 48,
    lowStockLevel: 10,
    category: "Apparel",
    images: [],
    status: "active",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample-2",
    name: "Wireless Barcode Scanner",
    sku: "TEC-00118",
    description: "Warehouse scanning device with low inventory risk.",
    price: 149.99,
    cost: 86,
    quantity: 4,
    lowStockLevel: 8,
    category: "Hardware",
    images: [],
    status: "active",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample-3",
    name: "Recycled Mailer Box",
    sku: "PKG-00077",
    description: "Packaging SKU used by ecommerce fulfillment.",
    price: 2.45,
    cost: 0.8,
    quantity: 240,
    lowStockLevel: 50,
    category: "Packaging",
    images: [],
    status: "active",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample-4",
    name: "Organic Canvas Tote",
    sku: "BAG-00031",
    description: "Draft accessory awaiting supplier confirmation.",
    price: 18,
    cost: 7.5,
    quantity: 6,
    lowStockLevel: 12,
    category: "Accessories",
    images: [],
    status: "draft",
    createdAt: new Date().toISOString(),
  },
];

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";

  const [search, setSearch] = useState(initialSearch);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<Product> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const query = new URLSearchParams({ page: String(page), limit: String(PAGE_LIMIT) });
    if (search.trim()) query.set("search", search.trim());
    return query.toString();
  }, [page, search]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiFetch<Paginated<Product>>(`/api/products?${queryString}`);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  async function archiveProduct(product: Product) {
    const confirmed = window.confirm(`Archive ${product.name}? This removes it from active product lists.`);
    if (!confirmed) return;

    setDeletingId(product.id);
    setError(null);

    try {
      await apiFetch(`/api/products/${product.id}`, { method: "DELETE" });
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive product");
    } finally {
      setDeletingId(null);
    }
  }

  const realProducts = data?.items ?? [];
  const hasBackendData = realProducts.length > 0;
  const products = hasBackendData ? realProducts : error ? sampleProducts : realProducts;
  const pagination = data?.pagination;
  const totalProducts = pagination?.total ?? products.length;
  const activeProducts = products.filter((product) => product.status !== "archived").length;
  const lowStockCount = products.filter((product) => isLowStock(product)).length;
  const inventoryValue = products.reduce((sum, product) => sum + Number(product.price ?? 0) * product.quantity, 0);
  const categories = Array.from(new Set(products.map((product) => product.category || "Uncategorized")));

  return (
    <PageShell className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Inventory catalog"
        title="Products command center"
        description="Manage product records, stock health, images, categories, pricing, generated SKUs, and integration readiness from one production-grade catalog."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-xl bg-background/70">
              <Link href="/products/fields">
                <SlidersHorizontal className="h-4 w-4" />
                Product schema
              </Link>
            </Button>
            <Button asChild className="rounded-xl shadow-sm">
              <Link href="/products/new">
                <Plus className="h-4 w-4" />
                New product
              </Link>
            </Button>
          </div>
        }
      />

      {error && (
        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {error}. Showing polished sample data so the product page remains presentable while the API is unavailable.
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={PackageCheck} label="Total products" value={totalProducts} helper="Catalog records" tone="default" />
        <MetricCard icon={Warehouse} label="Active products" value={activeProducts} helper="Ready for operations" tone="success" />
        <MetricCard icon={CircleDollarSign} label="Inventory value" value={formatCurrency(inventoryValue)} helper="Value on visible page" tone="success" />
        <MetricCard icon={PackageSearch} label="Low stock" value={lowStockCount} helper="Needs review" tone={lowStockCount > 0 ? "warning" : "default"} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.42fr]">
        <Card className="overflow-hidden rounded-[2rem] border-border/80 bg-card/95 shadow-xl shadow-slate-950/5">
          <CardContent className="p-0">
            <div className="border-b bg-gradient-to-br from-card to-muted/25 p-4 sm:p-5">
              <div className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="rounded-full">Pro catalog</Badge>
                      <Badge variant="outline" className="rounded-full bg-background/70">{categories.length} categories</Badge>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold tracking-[-0.03em]">Product catalog</h2>
                      <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                        Search products by name, SKU, or category. Keep product data ready for Zoho sync, public APIs, and webhooks.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border bg-background/80 p-2 shadow-sm">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center">
                    <label className="relative block min-w-0 flex-1" htmlFor="product-search">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="product-search"
                        placeholder="Search products, SKUs, categories..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="h-10 border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0"
                        aria-label="Search products"
                      />
                    </label>

                    <div className="flex shrink-0 gap-2 md:border-l md:pl-2">
                      <Button type="button" variant="ghost" onClick={loadProducts} disabled={loading} className="h-10 flex-1 rounded-xl px-3 md:flex-none">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Refresh
                      </Button>
                      <Button type="button" variant="ghost" className="h-10 flex-1 rounded-xl px-3 md:flex-none">
                        <Filter className="h-4 w-4" />
                        Filters
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {loading && !data && !error ? (
              <CatalogLoading />
            ) : products.length === 0 ? (
              <EmptyProducts />
            ) : (
              <>
                <div className="hidden overflow-x-auto xl:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="min-w-[340px] pl-6">Product</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="pr-6 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <ProductTableRow key={product.id} product={product} deletingId={deletingId} onArchive={archiveProduct} sampleMode={!hasBackendData && Boolean(error)} />
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="grid gap-3 p-4 xl:hidden">
                  {products.map((product) => (
                    <ProductMobileCard key={product.id} product={product} deletingId={deletingId} onArchive={archiveProduct} sampleMode={!hasBackendData && Boolean(error)} />
                  ))}
                </div>
              </>
            )}

            <div className="flex flex-col gap-3 border-t bg-muted/20 px-4 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p>
                Showing <span className="font-medium text-foreground">{products.length}</span> of{" "}
                <span className="font-medium text-foreground">{totalProducts}</span> products
                {pagination && pagination.pages > 1 ? ` · Page ${pagination.page} of ${pagination.pages}` : ""}
              </p>
              {pagination && pagination.pages > 1 && (
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={pagination.page <= 1 || loading} onClick={() => setPage((value) => Math.max(value - 1, 1))} className="rounded-xl">
                    Previous
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled={pagination.page >= pagination.pages || loading} onClick={() => setPage((value) => value + 1)} className="rounded-xl">
                    Next
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <aside className="space-y-6">
          <Card className="rounded-[2rem] border-border/80 bg-card/95 shadow-xl shadow-slate-950/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Layers3 className="h-5 w-5" /> Category health
              </CardTitle>
              <p className="text-sm text-muted-foreground">Visible catalog distribution.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {buildCategoryStats(products).map((category) => (
                <div key={category.name}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium">{category.name}</span>
                    <span className="text-muted-foreground">{category.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${category.percent}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-[2rem] border-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-xl shadow-slate-950/10">
            <CardContent className="p-6">
              <ShieldCheck className="h-7 w-7 text-white/80" />
              <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em]">Catalog readiness</h3>
              <p className="mt-2 text-sm leading-6 text-white/70">
                Keep products complete, synced, and ready for external API clients before going live.
              </p>
              <div className="mt-5 space-y-2 text-sm">
                <ReadinessItem label="Images" value="Configured" />
                <ReadinessItem label="SKU generation" value="Ready" />
                <ReadinessItem label="Zoho sync" value="Available" />
              </div>
            </CardContent>
          </Card>
        </aside>
      </section>
    </PageShell>
  );
}

function ProductTableRow({ product, deletingId, onArchive, sampleMode }: { product: Product; deletingId: string | null; onArchive: (product: Product) => void; sampleMode: boolean }) {
  const lowStock = isLowStock(product);

  return (
    <TableRow className="group h-[82px] transition hover:bg-muted/25">
      <TableCell className="pl-6">
        <ProductIdentity product={product} />
      </TableCell>
      <TableCell>
        <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {product.category || "Uncategorized"}
        </span>
      </TableCell>
      <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(product.price)}</TableCell>
      <TableCell className="text-right">
        <div className="inline-flex flex-col items-end">
          <span className="font-semibold tabular-nums">{product.quantity}</span>
          <span className="text-xs text-muted-foreground">Alert at {product.lowStockLevel}</span>
        </div>
      </TableCell>
      <TableCell>
        <ProductStatusBadge product={product} lowStock={lowStock} />
      </TableCell>
      <TableCell className="pr-6">
        <div className="flex justify-end gap-1">
          <Button asChild size="icon" variant="ghost" aria-label="View product" className="rounded-xl">
            <Link href={`/products/${product.id}`}>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="icon" variant="ghost" aria-label="Edit product" className="rounded-xl">
            <Link href={`/products/${product.id}/edit`}>
              <Edit className="h-4 w-4" />
            </Link>
          </Button>
          <Button type="button" size="icon" variant="ghost" aria-label="Archive product" onClick={() => onArchive(product)} disabled={sampleMode || deletingId === product.id} className="rounded-xl text-muted-foreground hover:text-destructive">
            {deletingId === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function ProductMobileCard({ product, deletingId, onArchive, sampleMode }: { product: Product; deletingId: string | null; onArchive: (product: Product) => void; sampleMode: boolean }) {
  const lowStock = isLowStock(product);

  return (
    <article className="rounded-[1.5rem] border bg-card/95 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <ProductThumbnail product={product} />
        <div className="min-w-0 flex-1">
          <Link href={`/products/${product.id}`} className="line-clamp-1 font-semibold hover:underline">{product.name}</Link>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{product.sku}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ProductStatusBadge product={product} lowStock={lowStock} />
            <Badge variant="secondary" className="rounded-full">{product.category || "Uncategorized"}</Badge>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-muted/40 p-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Price</p>
          <p className="mt-1 font-semibold">{formatCurrency(product.price)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Stock</p>
          <p className="mt-1 font-semibold">{product.quantity} units</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Button asChild size="sm" variant="outline" className="flex-1 rounded-xl">
          <Link href={`/products/${product.id}`}>View</Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="flex-1 rounded-xl">
          <Link href={`/products/${product.id}/edit`}>Edit</Link>
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onArchive(product)} disabled={sampleMode || deletingId === product.id} className="rounded-xl text-muted-foreground hover:text-destructive">
          {deletingId === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
      </div>
    </article>
  );
}

function ProductIdentity({ product }: { product: Product }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <ProductThumbnail product={product} />
      <div className="min-w-0">
        <Link href={`/products/${product.id}`} className="line-clamp-1 font-semibold hover:underline">{product.name}</Link>
        <div className="mt-1 flex min-w-0 items-center gap-2">
          <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.68rem] text-muted-foreground">{product.sku}</span>
          {product.description && <span className="line-clamp-1 text-xs text-muted-foreground">{product.description}</span>}
        </div>
      </div>
    </div>
  );
}

function ProductThumbnail({ product }: { product: Product }) {
  const image = product.images?.[0];

  if (image) {
    return (
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl border bg-muted shadow-sm">
        <img src={image} alt={product.name} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border bg-muted text-muted-foreground shadow-sm">
      <ImageIcon className="h-5 w-5" />
    </div>
  );
}

function ProductStatusBadge({ product, lowStock }: { product: Product; lowStock: boolean }) {
  if (product.status === "archived") return <Badge variant="outline" className="rounded-full">Archived</Badge>;
  if (lowStock) return <Badge variant="destructive" className="rounded-full">Low stock</Badge>;
  if (product.status === "draft") return <Badge variant="secondary" className="rounded-full">Draft</Badge>;
  return <Badge className="rounded-full bg-emerald-600 hover:bg-emerald-600">Active</Badge>;
}

function MetricCard({ icon: Icon, label, value, helper, tone = "default" }: { icon: ComponentType<{ className?: string }>; label: string; value: string | number; helper: string; tone?: "default" | "success" | "warning" }) {
  return (
    <Card className="rounded-[1.5rem] border-border/80 bg-card/95 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-950/5">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
        </div>
        <span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", tone === "warning" ? "bg-amber-50 text-amber-700" : tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-primary/10 text-primary")}>
          <Icon className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  );
}

function CatalogLoading() {
  return (
    <div className="space-y-3 p-4 sm:p-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-20 animate-pulse rounded-2xl bg-muted" />
      ))}
    </div>
  );
}

function EmptyProducts() {
  return (
    <div className="p-6">
      <div className="rounded-[1.75rem] border border-dashed bg-muted/20 p-10 text-center">
        <PackageSearch className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-semibold">No products found</p>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
          Create your first product, upload images, define schema fields, or adjust your search query.
        </p>
        <Button asChild className="mt-5 rounded-xl">
          <Link href="/products/new">
            <Plus className="h-4 w-4" />
            Create product
          </Link>
        </Button>
      </div>
    </div>
  );
}

function ReadinessItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/10 px-3 py-2.5">
      <span className="text-white/75">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function buildCategoryStats(products: Product[]) {
  const total = Math.max(products.length, 1);
  const counts = products.reduce<Record<string, number>>((acc, product) => {
    const key = product.category || "Uncategorized";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([name, count]) => ({ name, count, percent: Math.max(8, Math.round((count / total) * 100)) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function isLowStock(product: Product) {
  return product.quantity <= product.lowStockLevel;
}

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}
