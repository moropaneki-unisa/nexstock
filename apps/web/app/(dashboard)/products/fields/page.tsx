import { DatabaseZap, Plus } from "lucide-react";

import { ProductFieldsManager } from "@/components/products/product-fields-manager";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Button } from "@/components/ui/button";

export default function ProductFieldsPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Product setup"
        title="Product schema"
        description="Define organization-level product fields that make InventoryHub flexible enough for Zoho users, ecommerce catalogs, and custom developer APIs."
        actions={
          <Button disabled variant="outline">
            <Plus className="h-4 w-4" />
            Add from manager
          </Button>
        }
      />

      <div className="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
        <div className="flex items-start gap-3">
          <DatabaseZap className="mt-0.5 h-5 w-5 text-primary" />
          <p>
            Product schema fields are saved through the <span className="font-mono text-foreground">/api/product-fields</span> backend and can be used to enforce consistent product metadata across the organization.
          </p>
        </div>
      </div>

      <ProductFieldsManager />
    </PageShell>
  );
}
