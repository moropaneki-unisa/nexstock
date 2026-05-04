import { ArrowRightLeft, CheckCircle2, Clock3, PlugZap, RefreshCw, ShoppingBag, Store, Workflow, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, PageShell, ReadinessCard } from "@/components/system/page-shell";

const integrations = [
  {
    name: "Zoho Inventory",
    status: "Next build",
    icon: Store,
    description: "OAuth connection, product pull, product push, conflict handling, and sync logs for Zoho-first businesses.",
    features: ["OAuth account connection", "Import products", "Push product updates", "Sync conflict review"],
  },
  {
    name: "Shopify",
    status: "Planned",
    icon: ShoppingBag,
    description: "Keep ecommerce catalog and InventoryHub stock levels aligned after the Zoho MVP is stable.",
    features: ["Product sync", "Inventory levels", "Webhook ingestion", "Variant mapping"],
  },
  {
    name: "Custom API",
    status: "Ready foundation",
    icon: PlugZap,
    description: "Use API keys and webhooks to integrate custom storefronts, internal tools, and developer apps.",
    features: ["REST products API", "API key auth", "Webhooks", "Pagination and search"],
  },
];

const syncSteps = [
  { title: "Connect", detail: "Admin authorizes Zoho or creates API credentials.", icon: PlugZap },
  { title: "Map", detail: "Fields, variants, SKUs, categories, and external references are mapped.", icon: ArrowRightLeft },
  { title: "Sync", detail: "Background workers pull, push, retry, and log sync events.", icon: RefreshCw },
  { title: "Review", detail: "Conflicts and failed syncs appear in the sync dashboard before overwrite.", icon: Workflow },
];

export default function IntegrationsPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Integrations"
        title="Connect InventoryHub to the tools that run your business"
        description="Start with a Zoho-first integration strategy, then expand to ecommerce platforms and developer APIs without changing the core product model."
        actions={
          <Button disabled>
            <Zap className="h-4 w-4" />
            Connect Zoho soon
          </Button>
        }
      />

      <section className="grid gap-4 lg:grid-cols-3">
        {integrations.map((integration) => {
          const Icon = integration.icon;

          return (
            <Card key={integration.name} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <Badge variant={integration.status === "Ready foundation" ? "default" : "secondary"}>{integration.status}</Badge>
                </div>
                <CardTitle>{integration.name}</CardTitle>
                <CardDescription>{integration.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {integration.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    {feature}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Sync engine blueprint</CardTitle>
            <CardDescription>
              This is the execution flow to implement with Redis and BullMQ once the core API is fully deployed.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            {syncSteps.map((step, index) => {
              const Icon = step.icon;

              return (
                <div key={step.title} className="rounded-2xl border bg-background p-4">
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-xs text-muted-foreground">0{index + 1}</span>
                  </div>
                  <h3 className="mt-4 font-medium">{step.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{step.detail}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <ReadinessCard
          title="Integration roadmap"
          description="The frontend now shows an honest MVP-to-V2 path."
          items={[
            { label: "Developer API", status: "ready", detail: "API keys and public product endpoints are already represented in the app." },
            { label: "Webhooks", status: "ready", detail: "Product and inventory events can be registered from the dashboard." },
            { label: "Zoho OAuth", status: "next", detail: "Add OAuth credentials, token storage, and product mapping services." },
            { label: "Sync workers", status: "planned", detail: "Add Redis/BullMQ workers for reliable pull/push jobs and retry logs." },
          ]}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock3 className="h-5 w-5" />
            MVP integration rule
          </CardTitle>
          <CardDescription>
            Do not build Shopify, WooCommerce, and Zoho all at once. Ship Zoho + Custom API first, then reuse the same sync abstractions for additional platforms.
          </CardDescription>
        </CardHeader>
      </Card>
    </PageShell>
  );
}
