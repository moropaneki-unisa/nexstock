"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Eye, Loader2 } from "lucide-react";

import { ProductForm } from "@/components/products/product-form-clean";
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
      .then((result) => { if (active) setProduct(result); })
      .catch((err) => { if (active) setError(err.message ?? "Failed to load product"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [params.id]);

  return (
    <PageShell className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Products"
        title={product ? `Edit ${product.name}` : "Edit product"}
        description="Update product details in a clean flow without repeating supplier costing fields in the pricing stage."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-xl bg-background/70">
              <Link href="/products"><ArrowLeft className="h-4 w-4" />Back to products</Link>
            </Button>
            {product && <Button asChild className="rounded-xl shadow-sm"><Link href={`/products/${product.id}`}><Eye className="h-4 w-4" />View product</Link></Button>}
          </div>
        }
      />

      {loading ? (
        <div className="border bg-card/95 p-8"><div className="flex items-center gap-3 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading product editor...</div></div>
      ) : error ? (
        <div className="border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">{error}</div>
      ) : product ? (
        <>
          <section className="border bg-card/95"><div className="grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0"><Metric label="SKU" value={product.sku} /><Metric label="Stock" value={`${product.quantity} units`} /><Metric label="Status" value={product.status ?? "active"} /></div></section>
          <ProductForm mode="edit" product={product} />
        </>
      ) : (
        <div className="border bg-card/95 p-6 text-sm text-muted-foreground">Product not found.</div>
      )}
    </PageShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 truncate text-xl font-semibold capitalize">{value}</p></div>;
}
