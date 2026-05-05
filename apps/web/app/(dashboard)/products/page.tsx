"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  Edit,
  Filter,
  ImageIcon,
  Loader2,
  PackageSearch,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { apiFetch } from "@/lib/api";
import type { Paginated, Product } from "@/lib/types";

const PAGE_LIMIT = 25;

type StatusFilter = "all" | "active" | "draft" | "archived";
type StockFilter = "all" | "healthy" | "low" | "out";

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";

  const [search, setSearch] = useState(initialSearch);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<Product> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");

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
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  async function archiveProduct(product: Product) {
    if (!window.confirm(`Archive ${product.name}? This removes it from active product lists.`)) return;

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

  function clearFilters() {
    setCategoryFilter("all");
    setStatusFilter("all");
    setStockFilter("all");
  }

  const products = data?.items ?? [];
  const pagination = data?.pagination;
  const categoryOptions = useMemo(
    () => Array.from(new Set(products.map((product) => product.category || "Uncategorized"))).sort(),
    [products],
  );
  const hasActiveFilters = categoryFilter !== "all" || statusFilter !== "all" || stockFilter !== "all";
  const visibleProducts = useMemo(
    () =>
      products.filter((product) => {
        const category = product.category || "Uncategorized";
        const status = product.status || "active";
        const lowStock = isLowStock(product);
        const outOfStock = product.quantity <= 0;

        if (categoryFilter !== "all" && category !== categoryFilter) return false;
        if (statusFilter !== "all" && status !== statusFilter) return false;
        if (stockFilter === "low" && (!lowStock || outOfStock)) return false;
        if (stockFilter === "out" && !outOfStock) return false;
        if (stockFilter === "healthy" && (lowStock || outOfStock)) return false;

        return true;
      }),
    [products, categoryFilter, statusFilter, stockFilter],
  );
  const totalProducts = pagination?.total ?? products.length;

  return (
    <PageShell className="space-y-5 pb-10">
      <PageHeader
        eyebrow="Catalog"
        title="Products"
        description="A focused place to search, filter, review, edit, and archive product records. Operational summaries live on the dashboard."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-xl bg-background/70">
              <Link href="/products/fields">
                <SlidersHorizontal className="h-4 w-4" />
                Product fields
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
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}. Check that the API is running, then refresh this catalog.
        </div>
      )}

      <Card className="overflow-hidden rounded-[1.5rem] border-border/80 bg-card/95 shadow-sm">
        <CardContent className="p-0">
          <div className="border-b bg-card p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-semibold tracking-tight">Product catalog</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {totalProducts} product{totalProducts === 1 ? "" : "s"} in this catalog.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="relative block min-w-0 sm:w-[22rem]" htmlFor="product-search">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="product-search"
                    placeholder="Search name, SKU, category..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="h-10 rounded-xl pl-9"
                    aria-label="Search products"
                  />
                </label>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={loadProducts} disabled={loading} className="h-10 rounded-xl bg-background/70">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Refresh
                  </Button>
                  <Button
                    type="button"
                    variant={filtersOpen || hasActiveFilters ? "secondary" : "outline"}
                    className="h-10 rounded-xl bg-background/70"
                    onClick={() => setFiltersOpen((open) => !open)}
                    aria-expanded={filtersOpen}
                  >
                    <Filter className="h-4 w-4" />
                    Filters
                    {hasActiveFilters && <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[0.65rem] text-primary-foreground">{activeFilterCount(categoryFilter, statusFilter, stockFilter)}</span>}
                  </Button>
                </div>
              </div>
            </div>

            {filtersOpen && (
              <div className="mt-4 rounded-2xl border bg-muted/20 p-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <FilterSelect label="Category" value={categoryFilter} onChange={setCategoryFilter} options={["all", ...categoryOptions]} formatOption={(value) => (value === "all" ? "All categories" : value)} />
                  <FilterSelect label="Status" value={statusFilter} onChange={(value) => setStatusFilter(value as StatusFilter)} options={["all", "active", "draft", "archived"]} formatOption={(value) => (value === "all" ? "All statuses" : titleCase(value))} />
                  <FilterSelect label="Stock" value={stockFilter} onChange={(value) => setStockFilter(value as StockFilter)} options={["all", "healthy", "low", "out"]} formatOption={(value) => stockFilterLabel(value as StockFilter)} />
                </div>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    {categoryFilter !== "all" && <ActiveFilter label={`Category: ${categoryFilter}`} />}
                    {statusFilter !== "all" && <ActiveFilter label={`Status: ${titleCase(statusFilter)}`} />}
                    {stockFilter !== "all" && <ActiveFilter label={`Stock: ${stockFilterLabel(stockFilter)}`} />}
                    {!hasActiveFilters && <span className="text-xs text-muted-foreground">No filters applied.</span>}
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={clearFilters} disabled={!hasActiveFilters} className="w-fit rounded-xl">
                    <X className="h-4 w-4" />
                    Clear filters
                  </Button>
                </div>
              </div>
            )}
          </div>

          {loading && !data ? (
            <CatalogLoading />
          ) : visibleProducts.length === 0 ? (
            <EmptyProducts hasFilters={hasActiveFilters} hasError={Boolean(error)} onClearFilters={clearFilters} />
          ) : (
            <>
              <div className="hidden overflow-x-auto xl:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/25 hover:bg-muted/25">
                      <TableHead className="min-w-[320px] pl-5">Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="pr-5 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleProducts.map((product) => (
                      <ProductTableRow key={product.id} product={product} deletingId={deletingId} onArchive={archiveProduct} />
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid gap-3 p-4 xl:hidden">
                {visibleProducts.map((product) => (
                  <ProductMobileCard key={product.id} product={product} deletingId={deletingId} onArchive={archiveProduct} />
                ))}
              </div>
            </>
          )}

          <div className="flex flex-col gap-3 border-t bg-muted/15 px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              Showing <span className="font-medium text-foreground">{visibleProducts.length}</span> of <span className="font-medium text-foreground">{totalProducts}</span> products{hasActiveFilters ? " after filters" : ""}
              {pagination && pagination.pages > 1 ? ` · Page ${pagination.page} of ${pagination.pages}` : ""}
            </p>
            {pagination && pagination.pages > 1 && (
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" disabled={pagination.page <= 1 || loading} onClick={() => setPage((value) => Math.max(value - 1, 1))} className="rounded-xl">Previous</Button>
                <Button type="button" variant="outline" size="sm" disabled={pagination.page >= pagination.pages || loading} onClick={() => setPage((value) => value + 1)} className="rounded-xl">Next</Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}

function ProductTableRow({ product, deletingId, onArchive }: { product: Product; deletingId: string | null; onArchive: (product: Product) => void }) {
  const lowStock = isLowStock(product);

  return (
    <TableRow className="group h-[68px] transition hover:bg-muted/25">
      <TableCell className="pl-5"><ProductIdentity product={product} /></TableCell>
      <TableCell><span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{product.category || "Uncategorized"}</span></TableCell>
      <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(product.price)}</TableCell>
      <TableCell className="text-right"><span className="font-semibold tabular-nums">{product.quantity}</span><span className="ml-1 text-xs text-muted-foreground">/ alert {product.lowStockLevel}</span></TableCell>
      <TableCell><ProductStatusBadge product={product} lowStock={lowStock} /></TableCell>
      <TableCell className="pr-5"><div className="flex justify-end gap-1"><Button asChild size="icon" variant="ghost" aria-label="View product" className="rounded-xl"><Link href={`/products/${product.id}`}><ArrowUpRight className="h-4 w-4" /></Link></Button><Button asChild size="icon" variant="ghost" aria-label="Edit product" className="rounded-xl"><Link href={`/products/${product.id}/edit`}><Edit className="h-4 w-4" /></Link></Button><Button type="button" size="icon" variant="ghost" aria-label="Archive product" onClick={() => onArchive(product)} disabled={deletingId === product.id} className="rounded-xl text-muted-foreground hover:text-destructive">{deletingId === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</Button></div></TableCell>
    </TableRow>
  );
}

function ProductMobileCard({ product, deletingId, onArchive }: { product: Product; deletingId: string | null; onArchive: (product: Product) => void }) {
  const lowStock = isLowStock(product);
  return (
    <article className="rounded-[1.25rem] border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3"><ProductThumbnail product={product} /><div className="min-w-0 flex-1"><Link href={`/products/${product.id}`} className="line-clamp-1 font-semibold hover:underline">{product.name}</Link><p className="mt-1 font-mono text-xs text-muted-foreground">{product.sku}</p><div className="mt-3 flex flex-wrap gap-2"><ProductStatusBadge product={product} lowStock={lowStock} /><Badge variant="secondary" className="rounded-full">{product.category || "Uncategorized"}</Badge></div></div></div>
      <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-muted/35 p-3 text-sm"><div><p className="text-xs text-muted-foreground">Price</p><p className="mt-1 font-semibold">{formatCurrency(product.price)}</p></div><div><p className="text-xs text-muted-foreground">Stock</p><p className="mt-1 font-semibold">{product.quantity} units</p></div></div>
      <div className="mt-4 flex gap-2"><Button asChild size="sm" variant="outline" className="flex-1 rounded-xl"><Link href={`/products/${product.id}`}>View</Link></Button><Button asChild size="sm" variant="outline" className="flex-1 rounded-xl"><Link href={`/products/${product.id}/edit`}>Edit</Link></Button><Button type="button" size="sm" variant="ghost" onClick={() => onArchive(product)} disabled={deletingId === product.id} className="rounded-xl text-muted-foreground hover:text-destructive">{deletingId === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</Button></div>
    </article>
  );
}

function ProductIdentity({ product }: { product: Product }) {
  return <div className="flex min-w-0 items-center gap-3"><ProductThumbnail product={product} /><div className="min-w-0"><Link href={`/products/${product.id}`} className="line-clamp-1 font-semibold hover:underline">{product.name}</Link><div className="mt-1 flex min-w-0 items-center gap-2"><span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.68rem] text-muted-foreground">{product.sku}</span>{product.description && <span className="line-clamp-1 text-xs text-muted-foreground">{product.description}</span>}</div></div></div>;
}

function ProductThumbnail({ product }: { product: Product }) {
  const image = product.images?.[0];
  if (image) return <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border bg-muted shadow-sm"><img src={image} alt={product.name} className="h-full w-full object-cover" /></div>;
  return <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-muted text-muted-foreground shadow-sm"><ImageIcon className="h-4 w-4" /></div>;
}

function ProductStatusBadge({ product, lowStock }: { product: Product; lowStock: boolean }) {
  if (product.status === "archived") return <Badge variant="outline" className="rounded-full">Archived</Badge>;
  if (product.quantity <= 0) return <Badge variant="destructive" className="rounded-full">Out of stock</Badge>;
  if (lowStock) return <Badge variant="destructive" className="rounded-full">Low stock</Badge>;
  if (product.status === "draft") return <Badge variant="secondary" className="rounded-full">Draft</Badge>;
  return <Badge className="rounded-full bg-emerald-600 hover:bg-emerald-600">Active</Badge>;
}

function FilterSelect({ label, value, onChange, options, formatOption }: { label: string; value: string; onChange: (value: string) => void; options: string[]; formatOption: (value: string) => string }) {
  return <label className="space-y-1.5 text-sm"><span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-xl border bg-background px-3 text-sm shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25">{options.map((option) => <option key={option} value={option}>{formatOption(option)}</option>)}</select></label>;
}

function ActiveFilter({ label }: { label: string }) {
  return <Badge variant="secondary" className="rounded-full">{label}</Badge>;
}

function CatalogLoading() {
  return <div className="space-y-3 p-4 sm:p-5">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-muted" />)}</div>;
}

function EmptyProducts({ hasFilters, hasError, onClearFilters }: { hasFilters: boolean; hasError: boolean; onClearFilters: () => void }) {
  return <div className="p-6"><div className="rounded-[1.5rem] border border-dashed bg-muted/20 p-10 text-center"><PackageSearch className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><p className="text-sm font-semibold">No products found</p><p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{hasError ? "The API could not load products. Start the backend and refresh this page." : hasFilters ? "No products match the current filters. Clear filters or adjust your search." : "Create your first product, import products, or adjust your search query."}</p>{hasFilters ? <Button type="button" variant="outline" onClick={onClearFilters} className="mt-5 rounded-xl"><X className="h-4 w-4" />Clear filters</Button> : <Button asChild className="mt-5 rounded-xl"><Link href="/products/new"><Plus className="h-4 w-4" />Create product</Link></Button>}</div></div>;
}

function activeFilterCount(categoryFilter: string, statusFilter: StatusFilter, stockFilter: StockFilter) {
  return [categoryFilter !== "all", statusFilter !== "all", stockFilter !== "all"].filter(Boolean).length;
}

function isLowStock(product: Product) {
  return product.quantity <= product.lowStockLevel;
}

function stockFilterLabel(value: StockFilter) {
  if (value === "all") return "All stock";
  if (value === "low") return "Low stock";
  if (value === "out") return "Out of stock";
  return "Healthy stock";
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(value ?? 0));
}
