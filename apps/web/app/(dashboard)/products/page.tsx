"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  Edit,
  ImageIcon,
  Loader2,
  MoreHorizontal,
  PackageCheck,
  PackageSearch,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
  Warehouse,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { apiFetch } from "@/lib/api";
import type { Paginated, Product } from "@/lib/types";
import { cn } from "@/lib/utils";

const PAGE_LIMIT = 25;

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

  async function deleteProduct(product: Product) {
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

  const products = data?.items ?? [];
  const pagination = data?.pagination;
  const totalProducts = pagination?.total ?? 0;
  const lowStockCount = products.filter((product) => isLowStock(product)).length;
  const inventoryValue = products.reduce((sum, product) => sum + Number(product.price ?? 0) * product.quantity, 0);
  const activeProducts = products.filter((product) => product.status !== "archived").length;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Inventory catalog"
        title="Products"
        description="Manage product records, stock health, images, categories, pricing, and generated SKUs from one focused workspace."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/products/fields">
                <SlidersHorizontal className="h-4 w-4" />
                Product schema
              </Link>
            </Button>
            <Button asChild>
              <Link href="/products/new">
                <Plus className="h-4 w-4" />
                New product
              </Link>
            </Button>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={PackageCheck} label="Total products" value={totalProducts} helper="Across this organization" />
        <MetricCard icon={Warehouse} label="Active on page" value={activeProducts} helper="Currently visible records" />
        <MetricCard icon={TrendingUp} label="Inventory value" value={formatCurrency(inventoryValue)} helper="Calculated from this page" />
        <MetricCard icon={PackageSearch} label="Low stock" value={lowStockCount} helper="Needs review on this page" tone={lowStockCount > 0 ? "warning" : "default"} />
      </section>

      <Card className="overflow-hidden border-border/80 shadow-sm">
        <CardContent className="p-0">
          <div className="border-b bg-card px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-semibold tracking-tight">Product catalog</h2>
                <p className="mt-1 text-sm text-muted-foreground">Search, review, and maintain products before publishing or syncing externally.</p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative w-full sm:w-80">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search name, SKU, category..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="h-10 rounded-xl pl-9"
                  />
                </div>
                <Button type="button" variant="outline" onClick={loadProducts} disabled={loading} className="rounded-xl">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          {error && (
            <div className="m-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive sm:m-6">
              {error}
            </div>
          )}

          {loading && !data ? (
            <CatalogLoading />
          ) : products.length === 0 ? (
            <EmptyProducts />
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="w-[36%] pl-6">Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="pr-6 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <ProductTableRow key={product.id} product={product} deletingId={deletingId} onArchive={deleteProduct} />
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid gap-3 p-4 lg:hidden">
                {products.map((product) => (
                  <ProductMobileCard key={product.id} product={product} deletingId={deletingId} onArchive={deleteProduct} />
                ))}
              </div>
            </>
          )}

          {pagination && (
            <div className="flex flex-col gap-3 border-t bg-muted/20 px-4 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p>
                Showing <span className="font-medium text-foreground">{products.length}</span> of{" "}
                <span className="font-medium text-foreground">{pagination.total}</span> products
                {pagination.pages > 1 ? ` · Page ${pagination.page} of ${pagination.pages}` : ""}
              </p>
              {pagination.pages > 1 && (
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={pagination.page <= 1 || loading} onClick={() => setPage((value) => Math.max(value - 1, 1))}>
                    Previous
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled={pagination.page >= pagination.pages || loading} onClick={() => setPage((value) => value + 1)}>
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}

function ProductTableRow({ product, deletingId, onArchive }: { product: Product; deletingId: string | null; onArchive: (product: Product) => void }) {
  const lowStock = isLowStock(product);

  return (
    <TableRow className="group h-[76px]">
      <TableCell className="pl-6">
        <ProductIdentity product={product} />
      </TableCell>
      <TableCell>
        <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {product.category || "Uncategorized"}
        </span>
      </TableCell>
      <TableCell className="text-right font-medium tabular-nums">{formatCurrency(product.price)}</TableCell>
      <TableCell className="text-right">
        <div className="inline-flex flex-col items-end">
          <span className="font-medium tabular-nums">{product.quantity}</span>
          <span className="text-xs text-muted-foreground">Alert at {product.lowStockLevel}</span>
        </div>
      </TableCell>
      <TableCell>
        <ProductStatusBadge product={product} lowStock={lowStock} />
      </TableCell>
      <TableCell className="pr-6">
        <div className="flex justify-end gap-1">
          <Button asChild size="icon" variant="ghost" aria-label="View product">
            <Link href={`/products/${product.id}`}>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="icon" variant="ghost" aria-label="Edit product">
            <Link href={`/products/${product.id}/edit`}>
              <Edit className="h-4 w-4" />
            </Link>
          </Button>
          <Button type="button" size="icon" variant="ghost" aria-label="Archive product" onClick={() => onArchive(product)} disabled={deletingId === product.id} className="text-muted-foreground hover:text-destructive">
            {deletingId === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function ProductMobileCard({ product, deletingId, onArchive }: { product: Product; deletingId: string | null; onArchive: (product: Product) => void }) {
  const lowStock = isLowStock(product);

  return (
    <article className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <ProductThumbnail product={product} />
        <div className="min-w-0 flex-1">
          <Link href={`/products/${product.id}`} className="line-clamp-1 font-medium hover:underline">{product.name}</Link>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{product.sku}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ProductStatusBadge product={product} lowStock={lowStock} />
            <Badge variant="secondary">{product.category || "Uncategorized"}</Badge>
          </div>
        </div>
        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Price</p>
          <p className="mt-1 font-medium">{formatCurrency(product.price)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Stock</p>
          <p className="mt-1 font-medium">{product.quantity} units</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Button asChild size="sm" variant="outline" className="flex-1">
          <Link href={`/products/${product.id}`}>View</Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="flex-1">
          <Link href={`/products/${product.id}/edit`}>Edit</Link>
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onArchive(product)} disabled={deletingId === product.id} className="text-muted-foreground hover:text-destructive">
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
        <Link href={`/products/${product.id}`} className="line-clamp-1 font-medium hover:underline">{product.name}</Link>
        <div className="mt-1 flex min-w-0 items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">{product.sku}</span>
          {product.description && <span className="line-clamp-1 text-xs text-muted-foreground">· {product.description}</span>}
        </div>
      </div>
    </div>
  );
}

function ProductThumbnail({ product }: { product: Product }) {
  const image = product.images?.[0];

  if (image) {
    return (
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border bg-muted">
        <img src={image} alt={product.name} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-muted text-muted-foreground">
      <ImageIcon className="h-5 w-5" />
    </div>
  );
}

function ProductStatusBadge({ product, lowStock }: { product: Product; lowStock: boolean }) {
  if (product.status === "archived") return <Badge variant="outline">Archived</Badge>;
  if (lowStock) return <Badge variant="destructive">Low stock</Badge>;
  if (product.status === "draft") return <Badge variant="secondary">Draft</Badge>;
  return <Badge className="bg-emerald-600 hover:bg-emerald-600">Active</Badge>;
}

function MetricCard({ icon: Icon, label, value, helper, tone = "default" }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; helper: string; tone?: "default" | "warning" }) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
        </div>
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", tone === "warning" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground")}>
          <Icon className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  );
}

function CatalogLoading() {
  return (
    <div className="space-y-3 p-4 sm:p-6">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-2xl bg-muted" />
      ))}
    </div>
  );
}

function EmptyProducts() {
  return (
    <div className="p-6">
      <div className="rounded-2xl border border-dashed bg-muted/20 p-10 text-center">
        <PackageSearch className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-medium">No products found</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Create your first product, upload images, define schema fields, or adjust your search query.</p>
        <Button asChild className="mt-5">
          <Link href="/products/new">
            <Plus className="h-4 w-4" />
            Create product
          </Link>
        </Button>
      </div>
    </div>
  );
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
