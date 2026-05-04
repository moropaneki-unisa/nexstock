import { Building2, CheckCircle2, CreditCard, Crown, LockKeyhole, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, PageShell, ReadinessCard } from "@/components/system/page-shell";

const plans = [
  { name: "Free", price: "$0", detail: "For testing the API and managing a small catalog.", limits: ["100 products", "1 user", "Developer API sandbox"] },
  { name: "Pro", price: "$29", detail: "For growing teams that need webhooks and integrations.", limits: ["5,000 products", "5 users", "Zoho sync", "Webhooks"] },
  { name: "Business", price: "$99", detail: "For larger catalog operations and advanced sync controls.", limits: ["Unlimited products", "Team roles", "Priority sync", "Advanced audit logs"] },
];

export default function SettingsPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Workspace settings"
        title="Prepare InventoryHub for a real SaaS launch"
        description="Settings should become the control center for organization profile, team access, billing, security, and launch readiness."
        actions={<Button disabled>Save settings soon</Button>}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Organization</CardTitle>
            <CardDescription>Workspace profile, SKU prefix, and business defaults.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Use this area for organization name, default currency, timezone, and SKU prefix management.</p>
            <Badge variant="secondary">Next</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Team</CardTitle>
            <CardDescription>Invite admins and members into the organization.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Roles should map to admin and member permissions across products, API keys, and webhooks.</p>
            <Badge variant="secondary">Next</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><LockKeyhole className="h-5 w-5" /> Security</CardTitle>
            <CardDescription>Audit sensitive access and external integration credentials.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Show refresh-token sessions, revoked API keys, webhook signing secrets, and audit events.</p>
            <Badge variant="outline">Planned</Badge>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Billing plan design</CardTitle>
            <CardDescription>Stripe can be added after product CRUD, API keys, webhooks, and Zoho sync are stable.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <div key={plan.name} className="rounded-2xl border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">{plan.name}</h3>
                  {plan.name === "Pro" && <Badge><Crown className="mr-1 h-3 w-3" /> MVP</Badge>}
                </div>
                <p className="mt-3 text-3xl font-semibold">{plan.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{plan.detail}</p>
                <div className="mt-4 space-y-2">
                  {plan.limits.map((limit) => (
                    <div key={limit} className="flex items-center gap-2 text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      {limit}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <ReadinessCard
          title="Launch checklist"
          description="What to complete to match the SaaS vision."
          items={[
            { label: "Auth + tenancy", status: "ready", detail: "JWT workspace guard exists and all dashboard routes require authentication." },
            { label: "Product CRUD", status: "ready", detail: "Create, list, edit, and archive flows are now connected to the API." },
            { label: "Zoho integration", status: "next", detail: "Add OAuth, product mapping, sync jobs, and conflict review." },
            { label: "Stripe billing", status: "planned", detail: "Add after usage limits and plan enforcement exist in the backend." },
          ]}
        />
      </section>
    </PageShell>
  );
}
