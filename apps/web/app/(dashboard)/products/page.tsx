"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit, Loader2, PackageSearch, Plus, RefreshCw, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/api";
import type { Paginated, Product } from "@/lib/types";

const PAGE_LIMIT = 25;

export default function ProductsPage() {
  const [search, setSearch] = useState("");
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
    } catch (err: any) {
      setError(err.message ?? "Failed to load products");
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
    } catch (err: any) {
      setError(err.message ?? "Failed to archive product");
    } finally {
      setDeletingId(null);
    }
  }

  const products = data?.items ?? [];
  const pagination = data?.pagination;

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">Manage product details, inventory levels, and MVP CRUD flows.</p>
        </div>

        <Button asChild>
          <Link href="/products/new">
            <Plus className="mr-2 h-4 w-4" />
            New product
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Input
              placeholder="Search by name, SKU, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="md:max-w-sm"
            />

            <Button type="button" variant="outline" onClick={loadProducts} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
          </div>

          {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

          {loading && !data ? (
            <p className="text-sm text-muted-foreground">Loading products...</p>
          ) : products.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center">
              <PackageSearch className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
              <p className="text-sm font-medium">No products found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first product or adjust your search query.
              </p>
              <Button asChild className="mt-4">
                <Link href="/products/new">Create product</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const lowStock = product.quantity <= product.lowStockLevel;

                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="font-medium">{product.name}</div>
                          {product.description && (
                            <div className="line-clamp-1 text-xs text-muted-foreground">{product.description}</div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                        <TableCell>{product.category || "-"}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.price)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={lowStock ? "destructive" : "secondary"}>{product.quantity}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.status === "archived" ? "outline" : "secondary"}>
                            {lowStock ? "Low stock" : product.status ?? "active"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/products/${product.id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </Link>
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteProduct(product)}
                              disabled={deletingId === product.id}
                            >
                              {deletingId === product.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="mr-2 h-4 w-4" />
                              )}
                              Archive
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {pagination && pagination.pages > 1 && (
            <div className="flex flex-col gap-3 border-t pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p>
                Showing page {pagination.page} of {pagination.pages} ({pagination.total} products)
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1 || loading}
                  onClick={() => setPage((value) => Math.max(value - 1, 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.pages || loading}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}
