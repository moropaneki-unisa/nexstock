import Link from "next/link";
import { ArrowLeft, PackagePlus, SlidersHorizontal } from "lucide-react";

import { ProductForm } from "@/components/products/product-form-strict";
import { Button } from "@/components/ui/button";
import { PageHeader, PageShell } from "@/components/system/page-shell";

export default function NewProductPage() {
  return (
    <PageShell className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Products"
        title="Create product"
        description="Add a product with base-currency selling price and supplier-inherited cost currency to prevent scattered costing data."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-xl bg-background/70">
              <Link href="/products">
                <ArrowLeft className="h-4 w-4" />
                Back to products
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl bg-background/70">
              <Link href="/products/fields">
                <SlidersHorizontal className="h-4 w-4" />
                Product fields
              </Link>
            </Button>
          </div>
        }
      />

      <section className="border bg-card/95">
        <div className="flex items-center gap-3 p-5">
          <span className="flex h-10 w-10 items-center justify-center bg-primary/10 text-primary">
            <PackagePlus className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">New product workflow</h2>
            <p className="mt-1 text-sm text-muted-foreground">Selling price uses the organization base currency. Product cost inherits the selected supplier currency.</p>
          </div>
        </div>
      </section>

      <ProductForm />
    </PageShell>
  );
}
