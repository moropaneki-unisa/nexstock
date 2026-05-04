"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

import { ProductForm } from "@/components/products/product-form";
import { Button } from "@/components/ui/button";
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
    <main className="min-h-screen bg-muted/30 px-4 py-8 md:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="space-y-4">
          <Button asChild variant="ghost" className="px-0">
            <Link href="/products">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to products
            </Link>
          </Button>

          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Products</p>
            <h1 className="text-3xl font-semibold tracking-tight">Edit product</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Update product details, pricing, images, metadata, and inventory levels.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 rounded-xl border bg-background p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading product...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
            {error}
          </div>
        ) : product ? (
          <ProductForm mode="edit" product={product} />
        ) : (
          <div className="rounded-xl border bg-background p-6 text-sm text-muted-foreground">
            Product not found.
          </div>
        )}
      </div>
    </main>
  );
}
