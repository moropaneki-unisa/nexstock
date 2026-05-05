"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Eye, Loader2, PackageSearch, Save } from "lucide-react";

import { ProductForm } from "@/components/products/product-form";
import { Button } from "@/components/ui/button";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { apiFetch } from "@/lib/api";
import type { Product } from "@/lib/types";

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;

    let active = true;
    setLoading(true);
    setError(null);

    apiFetch<Product>(`/api/products/${params.id}`)
      .then((result) => {
        if (active) setProduct(result);
      })
      .catch((err) => {
        if (active) setError(err.message ?? "Failed to load product");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [params.id]);

  return (
    <PageShell className="space-y-6 pb-10">
      <Button asChild variant="ghost" className="w-fit rounded-xl px-0 text-muted-foreground hover:text-foreground">
        <Link href="/products">
          <ArrowLeft className="h-4 w-4" />
          Back to products
        </Link>
      </Button>

      <PageHeader
        eyebrow="Products"
        title={product ? `Edit ${product.name}` : "Edit product"}
        description="Update product details, pricing, images, custom fields, and inventory values in one clean workflow."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-xl bg-background/70">
              <Link href="/products">
                <PackageSearch className="h-4 w-4" />
                Catalog
              </Link>
            </Button>
            {product && (
              <Button asChild className="rounded-xl shadow-sm">
                <Link href={`/products/${product.id}`}>
                  <Eye className="h-4 w-4" />
                  View product
                </Link>
              </Button>
            )}
          </div>
        }
      />

      {loading ? (
        <div className="rounded-[2rem] border bg-card/95 p-8 shadow-xl shadow-slate-950/5">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading product editor...
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="rounded-[1.5rem] border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
          {error}
        </div>
      ) : product ? (
        <ProductForm mode="edit" product={product} />
      ) : (
        <div className="rounded-[1.5rem] border bg-card/95 p-6 text-sm text-muted-foreground shadow-sm">
          Product not found.
        </div>
      )}
    </PageShell>
  );
}
