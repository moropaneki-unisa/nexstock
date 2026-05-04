"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/api";
import type { Paginated, Product } from "@/lib/types";

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [data, setData] = useState<Paginated<Product> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    apiFetch<Paginated<Product>>(`/api/products?${query.toString()}`).then(setData).catch((err) => setError(err.message));
  }, [search]);

  return (
    <main className="space-y-6 p-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-semibold">Products</h1><p className="text-sm text-muted-foreground">Manage products and inventory levels.</p></div><Button asChild><Link href="/products/new">New product</Link></Button></div>
      <Card><CardContent className="p-4"><Input placeholder="Search by name or SKU..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4" />{error ? <p className="text-sm text-destructive">{error}</p> : !data ? <p className="text-sm text-muted-foreground">Loading products...</p> : <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>SKU</TableHead><TableHead>Category</TableHead><TableHead>Price</TableHead><TableHead>Quantity</TableHead></TableRow></TableHeader><TableBody>{data.items.map((product) => <TableRow key={product.id}><TableCell className="font-medium">{product.name}</TableCell><TableCell>{product.sku}</TableCell><TableCell>{product.category || "-"}</TableCell><TableCell>{Number(product.price).toFixed(2)}</TableCell><TableCell><Badge variant={product.quantity <= product.lowStockLevel ? "destructive" : "secondary"}>{product.quantity}</Badge></TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card>
    </main>
  );
}
