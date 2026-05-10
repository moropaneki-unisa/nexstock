"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Columns3, Edit, Filter, ImageIcon, Loader2, PackageSearch, Plus, RefreshCw, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { apiFetch } from "@/lib/api";
import { DEFAULT_CURRENCY, formatMoney, normalizeCurrencyCode } from "@/lib/currencies";
import type { Paginated, Product } from "@/lib/types";

const PAGE_LIMIT = 25;
const STORAGE_KEY = "nexstock:product-catalog-view";

type StatusFilter = "all" | "active" | "draft" | "archived";
type StockFilter = "all" | "healthy" | "low" | "out";
type ColumnKey = "category" | "price" | "stock" | "status";
type OrganizationSummary = { baseCurrency?: string | null };
type ViewSettings = {
  search: string;
  categoryFilter: string;
  statusFilter: StatusFilter;
  stockFilter: StockFilter;
  visibleColumns: Record<ColumnKey, boolean>;
};

const defaultColumns: Record<ColumnKey, boolean> = { category: true, price: true, stock: true, status: true };
const defaultSettings: ViewSettings = { search: "", categoryFilter: "all", statusFilter: "all", stockFilter: "all", visibleColumns: defaultColumns };

export function BaseCurrencyProductCatalog({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname !== "/products" && pathname !== "/catalog") return <>{children}</>;
  return <ProductCatalog />;
}

function ProductCatalog() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(defaultColumns);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [data, setData] = useState<Paginated<Product> | null>(null);
  const [organization, setOrganization] = useState<OrganizationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const baseCurrency = normalizeCurrencyCode(organization?.baseCurrency || DEFAULT_CURRENCY);

  useEffect(() => {
    const stored = readSettings();
    const params = new URLSearchParams(window.location.search);
    setSearch(params.get("search") ?? stored.search);
    setCategoryFilter(stored.categoryFilter);
    setStatusFilter(stored.statusFilter);
    setStockFilter(stored.stockFilter);
    setVisibleColumns(stored.visibleColumns);
    setSettingsLoaded(true);
  }, []);

  useEffect(() => {
    if (!settingsLoaded) return;
    writeSettings({ search, categoryFilter, statusFilter, stockFilter, visibleColumns });
  }, [settingsLoaded, search, categoryFilter, statusFilter, stockFilter, visibleColumns]);

  const queryString = useMemo(() => {
    const query = new URLSearchParams({ page: String(page), limit: String(PAGE_LIMIT) });
    if (search.trim()) query.set("search", search.trim());
    return query.toString();
  }, [page, search]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [products, org] = await Promise.all([
        apiFetch<Paginated<Product>>(`/api/products?${queryString}`),
        apiFetch<OrganizationSummary>("/api/organization").catch(() => null),
      ]);
      setData(products);
      setOrganization(org);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load products";
      setError(message);
      toast.error("Could not load products", { description: message });
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    if (!settingsLoaded) return;
    void loadProducts();
  }, [settingsLoaded, loadProducts]);

  useEffect(() => setPage(1), [search]);

  const products = data?.items ?? [];
  const pagination = data?.pagination;

  const categoryOptions = useMemo(() => Array.from(new Set(products.map((product) => product.category || "Uncategorized"))).sort(), [products]);
  const visibleProducts = useMemo(() => products.filter((product) => {
    const category = product.category || "Uncategorized";
    const status = product.status || "active";
    const outOfStock = product.quantity <= 0;
    const lowStock = product.quantity <= product.lowStockLevel;
    if (categoryFilter !== "all" && category !== categoryFilter) return false;
    if (statusFilter !== "all" && status !== statusFilter) return false;
    if (stockFilter === "out" && !outOfStock) return false;
    if (stockFilter === "low" && (!lowStock || outOfStock)) return false;
    if (stockFilter === "healthy" && (lowStock || outOfStock)) return false;
    return true;
  }), [products, categoryFilter, statusFilter, stockFilter]);

  const totalProducts = pagination?.total ?? products.length;
  const activeCount = products.filter((product) => (product.status || "active") === "active").length;
  const lowStockCount = products.filter((product) => product.quantity > 0 && product.quantity <= product.lowStockLevel).length;
  const outOfStockCount = products.filter((product) => product.quantity <= 0).length;
  const hasFilters = categoryFilter !== "all" || statusFilter !== "all" || stockFilter !== "all";

  function clearFilters() {
    setCategoryFilter("all");
    setStatusFilter("all");
    setStockFilter("all");
  }

  function resetView() {
    setSearch("");
    clearFilters();
    setVisibleColumns(defaultColumns);
    window.localStorage.removeItem(STORAGE_KEY);
    toast.success("Catalog view reset");
  }

  async function archiveProduct(product: Product) {
    try {
      await apiFetch(`/api/products/${product.id}`, { method: "DELETE" });
      toast.success("Product archived", { description: product.name });
      await loadProducts();
    } catch (err) {
      toast.error("Could not archive product", { description: err instanceof Error ? err.message : "Failed to archive product" });
    }
  }

  return (
    <PageShell className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Catalog"
        title="Products"
        description={`Search, filter, review, edit, and archive products. Selling prices are shown in organization base currency: ${baseCurrency}.`}
        actions={<div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={resetView} className="rounded-xl bg-background/70"><X className="h-4 w-4" />Reset view</Button><Button asChild variant="outline" className="rounded-xl bg-background/70"><Link href="/products/fields"><SlidersHorizontal className="h-4 w-4" />Product attributes</Link></Button><Button asChild className="rounded-xl shadow-sm"><Link href="/products/new"><Plus className="h-4 w-4" />New product</Link></Button></div>}
      />

      {error && <div className="border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

      <section className="border bg-card/95"><div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4"><Metric icon={PackageSearch} label="Total products" value={totalProducts} /><Metric icon={SlidersHorizontal} label="Active" value={activeCount} /><Metric icon={Filter} label="Low stock" value={lowStockCount} /><Metric icon={X} label="Out of stock" value={outOfStockCount} /></div></section>

      <section className="border bg-card/95">
        <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><PackageSearch className="h-5 w-5" />Product catalog</h2><p className="mt-1 text-sm text-muted-foreground">{totalProducts} products. View settings are saved on this device.</p></div><div className="flex flex-col gap-2 sm:flex-row sm:items-center"><label className="relative block min-w-0 sm:w-[22rem]"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search name, SKU, category..." value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 rounded-xl pl-9" /></label><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={loadProducts} disabled={loading} className="h-10 rounded-xl bg-background/70">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Refresh</Button><Button type="button" variant={columnsOpen ? "secondary" : "outline"} onClick={() => setColumnsOpen((value) => !value)} className="h-10 rounded-xl bg-background/70"><Columns3 className="h-4 w-4" />Columns</Button><Button type="button" variant={filtersOpen || hasFilters ? "secondary" : "outline"} onClick={() => setFiltersOpen((value) => !value)} className="h-10 rounded-xl bg-background/70"><Filter className="h-4 w-4" />Filters</Button></div></div></div>

        {columnsOpen && <div className="border-t bg-muted/15 p-4"><p className="text-sm font-semibold">Catalog columns</p><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{(Object.keys(defaultColumns) as ColumnKey[]).map((column) => <Toggle key={column} label={titleCase(column)} checked={visibleColumns[column]} onChange={() => setVisibleColumns((current) => ({ ...current, [column]: !current[column] }))} />)}</div></div>}
        {filtersOpen && <div className="border-t bg-muted/15 p-4"><div className="grid gap-3 md:grid-cols-3"><FilterSelect label="Category" value={categoryFilter} onChange={setCategoryFilter} options={["all", ...categoryOptions]} format={(value) => value === "all" ? "All categories" : value} /><FilterSelect label="Status" value={statusFilter} onChange={(value) => setStatusFilter(value as StatusFilter)} options={["all", "active", "draft", "archived"]} format={(value) => value === "all" ? "All statuses" : titleCase(value)} /><FilterSelect label="Stock" value={stockFilter} onChange={(value) => setStockFilter(value as StockFilter)} options={["all", "healthy", "low", "out"]} format={(value) => value === "all" ? "All stock" : titleCase(value)} /></div><Button type="button" variant="ghost" size="sm" onClick={clearFilters} disabled={!hasFilters} className="mt-3 rounded-xl"><X className="h-4 w-4" />Clear filters</Button></div>}

        {loading && !data ? <div className="border-t p-6 text-sm text-muted-foreground"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading products...</div> : visibleProducts.length === 0 ? <div className="border-t p-10 text-center text-sm text-muted-foreground">No products found.</div> : <><div className="hidden overflow-x-auto border-t xl:block"><Table><TableHeader><TableRow className="bg-muted/25 hover:bg-muted/25"><TableHead className="min-w-[320px] pl-5">Product</TableHead>{visibleColumns.category && <TableHead>Category</TableHead>}{visibleColumns.price && <TableHead className="text-right">Price ({baseCurrency})</TableHead>}{visibleColumns.stock && <TableHead className="text-right">Stock</TableHead>}{visibleColumns.status && <TableHead>Status</TableHead>}<TableHead className="pr-5 text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{visibleProducts.map((product) => <ProductRow key={product.id} product={product} baseCurrency={baseCurrency} visibleColumns={visibleColumns} onArchive={() => archiveProduct(product)} />)}</TableBody></Table></div><div className="grid gap-3 border-t p-4 xl:hidden">{visibleProducts.map((product) => <ProductCard key={product.id} product={product} baseCurrency={baseCurrency} onArchive={() => archiveProduct(product)} />)}</div></>}

        <div className="flex flex-col gap-3 border-t bg-muted/15 px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><p>Showing <span className="font-medium text-foreground">{visibleProducts.length}</span> of <span className="font-medium text-foreground">{totalProducts}</span> products</p>{pagination && pagination.pages > 1 && <div className="flex gap-2"><Button type="button" variant="outline" size="sm" disabled={pagination.page <= 1 || loading} onClick={() => setPage((value) => Math.max(value - 1, 1))} className="rounded-xl">Previous</Button><Button type="button" variant="outline" size="sm" disabled={pagination.page >= pagination.pages || loading} onClick={() => setPage((value) => value + 1)} className="rounded-xl">Next</Button></div>}</div>
      </section>
    </PageShell>
  );
}

function ProductRow({ product, baseCurrency, visibleColumns, onArchive }: { product: Product; baseCurrency: string; visibleColumns: Record<ColumnKey, boolean>; onArchive: () => void }) { return <TableRow><TableCell className="pl-5"><Identity product={product} /></TableCell>{visibleColumns.category && <TableCell><Badge variant="secondary">{product.category || "Uncategorized"}</Badge></TableCell>}{visibleColumns.price && <TableCell className="text-right font-semibold tabular-nums">{formatMoney(product.price, baseCurrency)}</TableCell>}{visibleColumns.stock && <TableCell className="text-right"><span className="font-semibold">{product.quantity}</span><span className="ml-1 text-xs text-muted-foreground">/ alert {product.lowStockLevel}</span></TableCell>}{visibleColumns.status && <TableCell><Status product={product} /></TableCell>}<TableCell className="pr-5"><div className="flex justify-end gap-1"><Button asChild size="icon" variant="ghost" className="rounded-xl"><Link href={`/products/${product.id}`}><ArrowUpRight className="h-4 w-4" /></Link></Button><Button asChild size="icon" variant="ghost" className="rounded-xl"><Link href={`/products/${product.id}/edit`}><Edit className="h-4 w-4" /></Link></Button><Button type="button" size="icon" variant="ghost" onClick={onArchive} className="rounded-xl text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></div></TableCell></TableRow>; }
function ProductCard({ product, baseCurrency, onArchive }: { product: Product; baseCurrency: string; onArchive: () => void }) { return <article className="border bg-card p-4"><div className="flex items-start gap-3"><Thumbnail product={product} /><div className="min-w-0 flex-1"><Link href={`/products/${product.id}`} className="line-clamp-1 font-semibold hover:underline">{product.name}</Link><p className="mt-1 font-mono text-xs text-muted-foreground">{product.sku}</p></div><Status product={product} /></div><div className="mt-4 grid grid-cols-2 gap-3 border bg-muted/25 p-3 text-sm"><div><p className="text-xs text-muted-foreground">Price ({baseCurrency})</p><p className="mt-1 font-semibold">{formatMoney(product.price, baseCurrency)}</p></div><div><p className="text-xs text-muted-foreground">Stock</p><p className="mt-1 font-semibold">{product.quantity} units</p></div></div><div className="mt-4 flex gap-2"><Button asChild size="sm" variant="outline" className="flex-1 rounded-xl"><Link href={`/products/${product.id}`}>View</Link></Button><Button asChild size="sm" variant="outline" className="flex-1 rounded-xl"><Link href={`/products/${product.id}/edit`}>Edit</Link></Button><Button type="button" size="sm" variant="ghost" onClick={onArchive} className="rounded-xl text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></div></article>; }
function Identity({ product }: { product: Product }) { return <div className="flex min-w-0 items-center gap-3"><Thumbnail product={product} /><div className="min-w-0"><Link href={`/products/${product.id}`} className="line-clamp-1 font-semibold hover:underline">{product.name}</Link><p className="mt-1 font-mono text-xs text-muted-foreground">{product.sku}</p></div></div>; }
function Thumbnail({ product }: { product: Product }) { const image = product.images?.[0]; if (image) return <div className="h-10 w-10 shrink-0 overflow-hidden border bg-muted"><img src={image} alt={product.name} className="h-full w-full object-cover" /></div>; return <div className="flex h-10 w-10 shrink-0 items-center justify-center border bg-muted text-muted-foreground"><ImageIcon className="h-4 w-4" /></div>; }
function Status({ product }: { product: Product }) { if (product.status === "archived") return <Badge variant="outline">Archived</Badge>; if (product.quantity <= 0) return <Badge variant="destructive">Out of stock</Badge>; if (product.quantity <= product.lowStockLevel) return <Badge variant="destructive">Low stock</Badge>; if (product.status === "draft") return <Badge variant="secondary">Draft</Badge>; return <Badge className="bg-emerald-600 hover:bg-emerald-600">Active</Badge>; }
function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) { return <div className="flex items-center justify-between p-4"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold capitalize">{value}</p></div><span className="flex h-10 w-10 items-center justify-center bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span></div>; }
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) { return <label className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border bg-background px-3 py-2 text-sm ${checked ? "border-primary ring-1 ring-primary" : ""}`}><span className="font-medium">{label}</span><input type="checkbox" checked={checked} onChange={onChange} /></label>; }
function FilterSelect({ label, value, onChange, options, format }: { label: string; value: string; onChange: (value: string) => void; options: string[]; format: (value: string) => string }) { return <label className="space-y-1.5 text-sm"><span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none">{options.map((option) => <option key={option} value={option}>{format(option)}</option>)}</select></label>; }
function titleCase(value: string) { return value.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()); }
function readSettings(): ViewSettings { try { const raw = window.localStorage.getItem(STORAGE_KEY); if (!raw) return defaultSettings; const parsed = JSON.parse(raw) as Partial<ViewSettings>; return { ...defaultSettings, ...parsed, visibleColumns: { ...defaultColumns, ...(parsed.visibleColumns ?? {}) } }; } catch { return defaultSettings; } }
function writeSettings(settings: ViewSettings) { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); }
