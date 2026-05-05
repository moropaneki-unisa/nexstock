import { DatabaseZap, PackageSearch, Plus, ShieldCheck } from "lucide-react";

import { ProductFieldsManager } from "@/components/products/product-fields-manager";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Button } from "@/components/ui/button";

export default function ProductFieldsPage() {
  return (
    <PageShell className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Product setup"
        title="Product fields"
        description="Manage one unified product field system: default InventoryHub fields plus additional business fields for imports, integrations, APIs, and product forms."
        actions={
          <Button disabled variant="outline" className="rounded-xl bg-background/70">
            <Plus className="h-4 w-4" />
            Add from manager
          </Button>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.5rem] border bg-card/95 p-5 shadow-sm">
          <PackageSearch className="h-5 w-5 text-primary" />
          <p className="mt-4 text-sm font-semibold">Default fields</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Name, SKU, price, quantity, low-stock level, category, description, and images are built into every product.</p>
        </div>
        <div className="rounded-[1.5rem] border bg-card/95 p-5 shadow-sm">
          <DatabaseZap className="h-5 w-5 text-primary" />
          <p className="mt-4 text-sm font-semibold">Additional fields</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Add business-specific fields like brand, supplier code, color, material, warranty, or external category.</p>
        </div>
        <div className="rounded-[1.5rem] border bg-card/95 p-5 shadow-sm">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <p className="mt-4 text-sm font-semibold">Used everywhere</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Fields are available in product forms, import/export files, integrations, mapping, and developer APIs.</p>
        </div>
      </section>

      <ProductFieldsManager />
    </PageShell>
  );
}
