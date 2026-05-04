"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Boxes,
  CalendarClock,
  DatabaseZap,
  Edit,
  History,
  ImageIcon,
  Loader2,
  PackageSearch,
  Tags,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { apiFetch } from "@/lib/api";
import type { Product } from "@/lib/types";

type InventoryLog = {
  id: string;
  type: string;
  quantityBefore: number;
  quantityAfter: number;
  delta: number;
  reason?: string | null;
  source?: string | null;
  createdAt: string;
};

type ProductDetail = Product & {
  inventoryLogs?: InventoryLog[];
  variants?: Array<{ id: string; name?: string; sku?: string; price?: string | number; quantity?: number }>;
};

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;

    let active = true;
    setLoading(true);
    setError(null);

    apiFetch<ProductDetail>(`/api/products/${params.id}`)
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

  const lowStock = product ? product.quantity <= product.lowStockLevel : false;
  const customValues = useMemo(() => product?.customFieldValues ?? [], [product?.customFieldValues]);

  if (loading) {
    return (
      <PageShell>
        <div className="flex items-center gap-2 rounded-xl border bg-background p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading product...
        </div>
      </PageShell>
    );
  }

  if (error || !product) {
    return (
      <PageShell>
        <Button asChild variant="ghost" className="w-fit px-0">
          <Link href="/products">
            <ArrowLeft className="h-4 w-4" />
            Back to products
          </Link>
        </Button>
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
          {error ?? "Product not found."}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Button asChild variant="ghost" className="w-fit px-0">
        <Link href="/products">
          <ArrowLeft className="h-4 w-4" />
          Back to products
        </Link>
      </Button>

      <PageHeader
        eyebrow="Product detail"
        title={product.name}
        description={product.description || "View product details, stock state, schema fields, and recent inventory movement."}
        actions={
          <Button asChild>
            <Link href={`/products/${product.id}/edit`}>
              <Edit className="h-4 w-4" />
              Edit product
            </Link>
          </Button>
        }
      />

      <section className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="SKU" value={product.sku} icon={Tags} mono />
        <SummaryCard label="Price" value={formatCurrency(product.price)} icon={PackageSearch} />
        <SummaryCard label="Quantity" value={product.quantity} icon={Boxes} tone={lowStock ? "danger" : "default"} />
        <SummaryCard label="Low stock alert" value={product.lowStockLevel} icon={CalendarClock} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Product information</CardTitle>
            <CardDescription>Core fields saved on the product record.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <InfoRow label="Name" value={product.name} />
            <InfoRow label="SKU" value={product.sku} mono />
            <InfoRow label="Category" value={product.category || "-"} />
            <InfoRow label="Status" value={lowStock ? "Low stock" : product.status ?? "active"} />
            <InfoRow label="Price" value={formatCurrency(product.price)} />
            <InfoRow label="Cost" value={product.cost == null ? "-" : formatCurrency(product.cost)} />
            <InfoRow label="Created" value={formatDate(product.createdAt)} />
            <InfoRow label="Updated" value={product.updatedAt ? formatDate(product.updatedAt) : "-"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Images
            </CardTitle>
            <CardDescription>Images currently saved on this product.</CardDescription>
          </CardHeader>
          <CardContent>
            {product.images?.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {product.images.map((image, index) => (
                  <img key={`${image}-${index}`} src={image} alt={`${product.name} image ${index + 1}`} className="h-32 w-full rounded-xl border object-cover" />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No images uploaded.</div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DatabaseZap className="h-5 w-5" />
              Product schema values
            </CardTitle>
            <CardDescription>Custom values captured from organization product fields.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {customValues.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                No custom field values captured for this product.
              </div>
            ) : (
              customValues.map((item) => (
                <div key={item.fieldId} className="rounded-xl border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{item.field?.label ?? item.fieldId}</p>
                    {item.field?.type && <Badge variant="outline">{item.field.type}</Badge>}
                  </div>
                  <p className="mt-1 break-words text-sm text-muted-foreground">{formatCustomValue(item.value)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Inventory movement
            </CardTitle>
            <CardDescription>Latest inventory logs returned by the product API.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {product.inventoryLogs?.length ? (
              product.inventoryLogs.map((log) => (
                <div key={log.id} className="rounded-xl border p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{log.type}</p>
                    <Badge variant={log.delta < 0 ? "destructive" : "secondary"}>{log.delta > 0 ? `+${log.delta}` : log.delta}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {log.quantityBefore} → {log.quantityAfter} · {log.reason ?? "No reason"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(log.createdAt)}</p>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                No inventory movement yet.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  mono,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: typeof Tags;
  mono?: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{label}</p>
          <Icon className={tone === "danger" ? "h-4 w-4 text-destructive" : "h-4 w-4 text-muted-foreground"} />
        </div>
        <p className={mono ? "mt-3 break-all font-mono text-xl font-semibold" : "mt-3 text-2xl font-semibold tracking-tight"}>{value}</p>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={mono ? "mt-1 break-all font-mono text-sm" : "mt-1 text-sm font-medium"}>{value}</p>
    </div>
  );
}

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatCustomValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
