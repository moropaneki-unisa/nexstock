import Link from "next/link";
import { ArrowLeft, PackagePlus, SlidersHorizontal } from "lucide-react";

import { ProductForm } from "@/components/products/product-form";
import { Button } from "@/components/ui/button";
import { PageHeader, PageShell } from "@/components/system/page-shell";

export default function NewProductPage() {
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
        title="Create product"
        description="Add a clean product record with pricing, stock, images, and custom schema values. InventoryHub will generate the SKU and create the initial stock log."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-xl bg-background/70">
              <Link href="/products/fields">
                <SlidersHorizontal className="h-4 w-4" />
                Product schema
              </Link>
            </Button>
            <Button asChild className="rounded-xl shadow-sm">
              <Link href="/products/new">
                <PackagePlus className="h-4 w-4" />
                New product
              </Link>
            </Button>
          </div>
        }
      />

      <ProductForm />
    </PageShell>
  );
}