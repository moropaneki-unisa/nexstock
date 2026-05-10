"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowUpRight, Edit, Filter, ImageIcon, Loader2, PackageSearch, Plus, RefreshCw, Search, SlidersHorizontal, Trash2, X } from "lucide-react";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { apiFetch } from "@/lib/api";
import type { Paginated, Product } from "@/lib/types";

const PAGE_LIMIT = 25;

type StatusFilter = "all" | "active" | "draft" | "archived";
type StockFilter = "all" | "healthy" | "low" | "out";

export default function CatalogPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<Product> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [productToArchive, setProductToArchive] = useState<Product | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSearch(params.get("search") ?? "");
  }, []);

  const queryString = useMemo(() => {
    const query = new URLSearchParams({ page: String(page), limit: String(PAGE_LIMIT) });
    if (search.trim()) query.set("search", search.trim());
    return query.toString();
  }, [page, search]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await apiFetch<Paginated<Product>>(`/api/products?${queryString}`));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load products";
      setError(message);
      toast.error("Could not load products", { description: message });
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

  const products = data?.items ?? [];
  const pagination = data?.pagination;
  const categoryOptions = useMemo(() => Array.from(new Set(products.map((product) => product.category || "Uncategorized"))).sort(), [products]);

  const hasActiveFilters = categoryFilter !== "all" || statusFilter !== "all" || stockFilter !== "all";
  const visibleProducts = useMemo(() => products.filter((product) => {
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
  }), [products, categoryFilter, statusFilter, stockFilter]);

  const totalProducts = pagination?.total ?? products.length;
  const lowStockCount = products.filter((product) => product.quantity > 0 && isLowStock(product)).length;
  const outOfStockCount = products.filter((product) => product.quantity <= 0).length;
  const activeCount = products.filter((product) => (product.status || "active") === "active").length;

  function clearFilters() {
    setCategoryFilter("all");
    setStatusFilter("all");
    setStockFilter("all");
    toast.success("Filters cleared");
  }

  async function archiveProduct() {
    if (!productToArchive) return;
    setDeletingId(productToArchive.id);
    setError(null);
    try {
      await apiFetch(`/api/products/${productToArchive.id}`, { method: "DELETE" });
      toast.success("Product archived", { description: `${productToArchive.name} was removed from active product lists.` });
      setProductToArchive(null);
      await loadProducts();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to archive product";
      setError(message);
      toast.error("Could not archive product", { description: message });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <PageShell className="space-y-6 pb-10">
      <PageHeader eyebrow="Catalog" title="Products" description="Search, filter, review, edit, and archive product records from one operational catalog." actions={<div className="flex flex-wrap gap-2"><Button asChild variant="outline" className="rounded-xl bg-background/70"><Link href="/products/fields"><SlidersHorizontal className="h-4 w-4" />Product attributes</Link></Button><Button asChild className="rounded-xl shadow-sm"><Link href="/products/new"><Plus className="h-4 w-4" />New product</Link></Button></div>} />

      {error && <div className="border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}. Check that the API is running, then refresh this catalog.</div>}

      <section className="border bg-card/95"><div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4"><Metric icon={PackageSearch} label="Total products" value={totalProducts} /><Metric icon={SlidersHorizontal} label="Active" value={activeCount} /><Metric icon={Filter} label="Low stock" value={lowStockCount} /><Metric icon={X} label="Out of stock" value={outOfStockCount} /></div></section>

      <section className="border bg-card/95">
        <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><PackageSearch className="h-5 w-5" />Product catalog</h2><p className="mt-1 text-sm text-muted-foreground">{totalProducts} product{totalProducts === 1 ? "" : "s"} in this catalog.</p></div><div className="flex flex-col gap-2 sm:flex-row sm:items-center"><label className="relative block min-w-0 sm:w-[22rem]" htmlFor="product-search"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="product-search" placeholder="Search name, SKU, category..." value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 rounded-xl pl-9" aria-label="Search products" /></label><div className="flex gap-2"><Button type="button" variant="outline" onClick={loadProducts} disabled={loading} className="h-10 rounded-xl bg-background/70">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Refresh</Button><Button type="button" variant={filtersOpen || hasActiveFilters ? "secondary" : "outline"} className="h-10 rounded-xl bg-background/70" onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen}><Filter className="h-4 w-4" />Filters{hasActiveFilters && <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[0.65rem] text-primary-foreground">{activeFilterCount(categoryFilter, statusFilter, stockFilter)}</span>}</Button></div></div></div>

        {filtersOpen && <div className="border-t bg-muted/15 p-4"><div className="grid gap-3 md:grid-cols-3"><FilterSelect label="Category" value={categoryFilter} onChange={setCategoryFilter} options={["all", ...categoryOptions]} formatOption={(value) => value === "all" ? "All categories" : value} /><FilterSelect label="Status" value={statusFilter} onChange={(value) => setStatusFilter(value as StatusFilter)} options={["all", "active", "draft", "archived"]} formatOption={(value) => value === "all" ? "All statuses" : titleCase(value)} /><FilterSelect label="Stock" value={stockFilter} onChange={(value) => setStockFilter(value as StockFilter)} options={["all", "healthy", "low", "out"]} formatOption={(value) => stockFilterLabel(value as StockFilter)} /></div><div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-wrap gap-2">{categoryFilter !== "all" && <ActiveFilter label={`Category: ${categoryFilter}`} />}{statusFilter !== "all" && <ActiveFilter label={`Status: ${titleCase(statusFilter)}`} />}{stockFilter !== "all" && <ActiveFilter label={`Stock: ${stockFilterLabel(stockFilter)}`} />}{!hasActiveFilters && <span className="text-xs text-muted-foreground">No filters applied.</span>}</div><Button type="button" variant="ghost" size="sm" onClick={clearFilters} disabled={!hasActiveFilters} className="w-fit rounded-xl"><X className="h-4 w-4" />Clear filters</Button></div></div>}

        {loading && !data ? <CatalogLoading /> : visibleProducts.length === 0 ? <EmptyProducts hasFilters={hasActiveFilters} hasError={Boolean(error)} onClearFilters={clearFilters} /> : <><div className="hidden overflow-x-auto border-t xl:block"><Table><TableHeader><TableRow className="bg-muted/25 hover:bg-muted/25"><TableHead className="min-w-[320px] pl-5">Product</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">Stock</TableHead><TableHead>Status</TableHead><TableHead className="pr-5 text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{visibleProducts.map((product) => <ProductTableRow key={product.id} product={product} deletingId={deletingId} onRequestArchive={setProductToArchive} />)}</TableBody></Table></div><div className="grid gap-3 border-t p-4 xl:hidden">{visibleProducts.map((product) => <ProductMobileCard key={product.id} product={product} deletingId={deletingId} onRequestArchive={setProductToArchive} />)}</div></>}

        <div className="flex flex-col gap-3 border-t bg-muted/15 px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><p>Showing <span className="font-medium text-foreground">{visibleProducts.length}</span> of <span className="font-medium text-foreground">{totalProducts}</span> products{hasActiveFilters ? " after filters" : ""}{pagination && pagination.pages > 1 ? ` · Page ${pagination.page} of ${pagination.pages}` : ""}</p>{pagination && pagination.pages > 1 && <div className="flex gap-2"><Button type="button" variant="outline" size="sm" disabled={pagination.page <= 1 || loading} onClick={() => setPage((value) => Math.max(value - 1, 1))} className="rounded-xl">Previous</Button><Button type="button" variant="outline" size="sm" disabled={pagination.page >= pagination.pages || loading} onClick={() => setPage((value) => value + 1)} className="rounded-xl">Next</Button></div>}</div>
      </section>

      <AlertDialog open={Boolean(productToArchive)} onOpenChange={(open) => !open && setProductToArchive(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Archive product?</AlertDialogTitle><AlertDialogDescription>{productToArchive ? `This will remove "${productToArchive.name}" from active product lists. Existing records, inventory history, and integrations remain preserved.` : "This product will be archived."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={Boolean(deletingId)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); void archiveProduct(); }} className="bg-destructive text-white hover:bg-destructive/90" disabled={Boolean(deletingId)}>{deletingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Archive product</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </PageShell>
  );
}

function ProductTableRow({ product, deletingId, onRequestArchive }: { product: Product; deletingId: string | null; onRequestArchive: (product: Product) => void }) { const lowStock = isLowStock(product); return <TableRow className="group h-[68px] transition hover:bg-muted/25"><TableCell className="pl-5"><ProductIdentity product={product} /></TableCell><TableCell><span className="inline-flex bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{product.category || "Uncategorized"}</span></TableCell><TableCell className="text-right font-semibold tabular-nums">{formatCurrency(product.price)}</TableCell><TableCell className="text-right"><span className="font-semibold tabular-nums">{product.quantity}</span><span className="ml-1 text-xs text-muted-foreground">/ alert {product.lowStockLevel}</span></TableCell><TableCell><ProductStatusBadge product={product} lowStock={lowStock} /></TableCell><TableCell className="pr-5"><div className="flex justify-end gap-1"><Button asChild size="icon" variant="ghost" aria-label="View product" className="rounded-xl"><Link href={`/products/${product.id}`}><ArrowUpRight className="h-4 w-4" /></Link></Button><Button asChild size="icon" variant="ghost" aria-label="Edit product" className="rounded-xl"><Link href={`/products/${product.id}/edit`}><Edit className="h-4 w-4" /></Link></Button><Button type="button" size="icon" variant="ghost" aria-label="Archive product" onClick={() => onRequestArchive(product)} disabled={deletingId === product.id} className="rounded-xl text-muted-foreground hover:text-destructive">{deletingId === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</Button></div></TableCell></TableRow>; }
function ProductMobileCard({ product, deletingId, onRequestArchive }: { product: Product; deletingId: string | null; onRequestArchive: (product: Product) => void }) { const lowStock = isLowStock(product); return <article className="border bg-card p-4"><div className="flex items-start gap-3"><ProductThumbnail product={product} /><div className="min-w-0 flex-1"><Link href={`/products/${product.id}`} className="line-clamp-1 font-semibold hover:underline">{product.name}</Link><p className="mt-1 font-mono text-xs text-muted-foreground">{product.sku}</p><div className="mt-3 flex flex-wrap gap-2"><ProductStatusBadge product={product} lowStock={lowStock} /><Badge variant="secondary">{product.category || "Uncategorized"}</Badge></div></div></div><div className="mt-4 grid grid-cols-2 gap-3 border bg-muted/25 p-3 text-sm"><div><p className="text-xs text-muted-foreground">Price</p><p className="mt-1 font-semibold">{formatCurrency(product.price)}</p></div><div><p className="text-xs text-muted-foreground">Stock</p><p className="mt-1 font-semibold">{product.quantity} units</p></div></div><div className="mt-4 flex gap-2"><Button asChild size="sm" variant="outline" className="flex-1 rounded-xl"><Link href={`/products/${product.id}`}>View</Link></Button><Button asChild size="sm" variant="outline" className="flex-1 rounded-xl"><Link href={`/products/${product.id}/edit`}>Edit</Link></Button><Button type="button" size="sm" variant="ghost" onClick={() => onRequestArchive(product)} disabled={deletingId === product.id} className="rounded-xl text-muted-foreground hover:text-destructive">{deletingId === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</Button></div></article>; }
function ProductIdentity({ product }: { product: Product }) { return <div className="flex min-w-0 items-center gap-3"><ProductThumbnail product={product} /><div className="min-w-0"><Link href={`/products/${product.id}`} className="line-clamp-1 font-semibold hover:underline">{product.name}</Link><div className="mt-1 flex min-w-0 items-center gap-2"><span className="shrink-0 bg-muted px-1.5 py-0.5 font-mono text-[0.68rem] text-muted-foreground">{product.sku}</span>{product.description && <span className="line-clamp-1 text-xs text-muted-foreground">{product.description}</span>}</div></div></div>; }
function ProductThumbnail({ product }: { product: Product }) { const image = product.images?.[0]; if (image) return <div className="h-10 w-10 shrink-0 overflow-hidden border bg-muted"><img src={image} alt={product.name} className="h-full w-full object-cover" /></div>; return <div className="flex h-10 w-10 shrink-0 items-center justify-center border bg-muted text-muted-foreground"><ImageIcon className="h-4 w-4" /></div>; }
function ProductStatusBadge({ product, lowStock }: { product: Product; lowStock: boolean }) { if (product.status === "archived") return <Badge variant="outline">Archived</Badge>; if (product.quantity <= 0) return <Badge variant="destructive">Out of stock</Badge>; if (lowStock) return <Badge variant="destructive">Low stock</Badge>; if (product.status === "draft") return <Badge variant="secondary">Draft</Badge>; return <Badge className="bg-emerald-600 hover:bg-emerald-600">Active</Badge>; }
function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) { return <div className="flex items-center justify-between p-4"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold capitalize">{value}</p></div><span className="flex h-10 w-10 items-center justify-center bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span></div>; }
function FilterSelect({ label, value, onChange, options, formatOption }: { label: string; value: string; onChange: (value: string) => void; options: string[]; formatOption: (value: string) => string }) { return <label className="space-y-1.5 text-sm"><span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25">{options.map((option) => <option key={option} value={option}>{formatOption(option)}</option>)}</select></label>; }
function ActiveFilter({ label }: { label: string }) { return <Badge variant="secondary">{label}</Badge>; }
function CatalogLoading() { return <div className="space-y-3 border-t p-4 sm:p-5">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-16 animate-pulse bg-muted" />)}</div>; }
function EmptyProducts({ hasFilters, hasError, onClearFilters }: { hasFilters: boolean; hasError: boolean; onClearFilters: () => void }) { return <div className="border-t p-6"><div className="border border-dashed bg-muted/20 p-10 text-center"><PackageSearch className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><p className="text-sm font-semibold">No products found</p><p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{hasError ? "The API could not load products. Start the backend and refresh this page." : hasFilters ? "No products match the current filters. Clear filters or adjust your search." : "Create your first product, import products, or adjust your search query."}</p>{hasFilters ? <Button type="button" variant="outline" onClick={onClearFilters} className="mt-5 rounded-xl"><X className="h-4 w-4" />Clear filters</Button> : <Button asChild className="mt-5 rounded-xl"><Link href="/products/new"><Plus className="h-4 w-4" />Create product</Link></Button>}</div></div>; }
function activeFilterCount(categoryFilter: string, statusFilter: StatusFilter, stockFilter: StockFilter) { return [categoryFilter !== "all", statusFilter !== "all", stockFilter !== "all"].filter(Boolean).length; }
function isLowStock(product: Product) { return product.quantity <= product.lowStockLevel; }
function stockFilterLabel(value: StockFilter) { if (value === "all") return "All stock"; if (value === "low") return "Low stock"; if (value === "out") return "Out of stock"; return "Healthy stock"; }
function titleCase(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
function formatCurrency(value: string | number) { return new Intl.NumberFormat(undefined, { style: "currency", currency: "ZAR", maximumFractionDigits: 2 }).format(Number(value ?? 0)); }
