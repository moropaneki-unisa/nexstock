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
        description="Manage one unified product field system: default NexStock fields plus additional business fields for imports, integrations, APIs, and product forms."
        actions={
          <Button disabled variant="outline" className="rounded-xl bg-background/70">
            <Plus className="h-4 w-4" />
            Add from manager
          </Button>
        }
      />

      <section className="border bg-card/95">
        <div className="grid divide-y md:grid-cols-3 md:divide-x md:divide-y-0">
          <IntroMetric
            icon={PackageSearch}
            title="Default fields"
            description="Name, SKU, price, quantity, low-stock level, category, description, and images are built into every product."
          />
          <IntroMetric
            icon={DatabaseZap}
            title="Additional fields"
            description="Add business-specific fields like brand, supplier code, color, material, warranty, or external category."
          />
          <IntroMetric
            icon={ShieldCheck}
            title="Used everywhere"
            description="Fields are available in product forms, import/export files, integrations, mapping, and developer APIs."
          />
        </div>
      </section>

      <ProductFieldsManager />
    </PageShell>
  );
}

function IntroMetric({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="flex gap-4 p-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
