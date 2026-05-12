"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, CreditCard, Loader2, RefreshCw, ShieldCheck, Sparkles, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { apiFetch } from "@/lib/api";

type Plan = "free" | "starter" | "growth" | "business";

type OrganizationSummary = {
  name?: string | null;
  plan?: Plan | null;
  onboardingComplete?: boolean | null;
};

const plans = [
  {
    id: "free" as Plan,
    name: "Free",
    price: "$0",
    cadence: "month",
    description: "Validate your workspace and manage your first products manually.",
    href: "/organization/edit?setup=1",
    cta: "Continue setup",
    icon: Sparkles,
    features: ["Workspace access", "Manual products", "Basic stock view", "Secure login"],
  },
  {
    id: "starter" as Plan,
    name: "Starter",
    price: "$19",
    cadence: "month",
    description: "Import product files, map fields, clean records, and manage stock with less manual work.",
    href: "/billing/checkout?plan=starter",
    cta: "Upgrade to Starter",
    icon: CreditCard,
    highlighted: true,
    features: ["CSV and XLSX imports", "Reusable field mapping", "Inventory movement history", "API keys"],
  },
  {
    id: "growth" as Plan,
    name: "Growth",
    price: "$59",
    cadence: "month",
    description: "Use webhooks, team controls, and integration-ready workflows as your operations grow.",
    href: "/billing/checkout?plan=growth",
    cta: "Upgrade to Growth",
    icon: Zap,
    features: ["Advanced imports", "Product and stock webhooks", "Team workspace controls", "Priority setup support"],
  },
];

function planLabel(plan?: string | null) {
  if (!plan) return "Free";
  return plan.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function BillingPage() {
  const [organization, setOrganization] = useState<OrganizationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadBilling() {
    setLoading(true);
    setError(null);
    try {
      const org = await apiFetch<OrganizationSummary>("/api/organization");
      setOrganization(org);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load billing details");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadBilling(); }, []);

  const currentPlan = useMemo<Plan>(() => {
    const plan = organization?.plan || "free";
    if (plan === "business") return "growth";
    return plan;
  }, [organization?.plan]);

  return (
    <PageShell className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Billing"
        title="Subscription and plan"
        description="Review your current NexStock plan, upgrade safely, and keep billing decisions in one clear place."
        actions={<Button type="button" variant="outline" onClick={loadBilling} disabled={loading} className="rounded-none bg-background/70">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Refresh</Button>}
      />

      {error && <div className="border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

      <section className="border bg-card/95">
        <div className="border-b p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Current workspace</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">{organization?.name || "NexStock workspace"}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Your active subscription controls product limits, import access, integrations, and automation features.</p>
            </div>
            <div className="border bg-muted/20 p-4 lg:min-w-64">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Current plan</p>
              <div className="mt-2 flex items-center justify-between gap-4">
                <p className="text-2xl font-semibold tracking-tight">{planLabel(organization?.plan)}</p>
                <Badge className="rounded-none bg-emerald-600 hover:bg-emerald-600">Active</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="border-b bg-amber-50 p-4 text-sm text-amber-900">
          NexStock is still in implementation. Use test cards only for paid checkout testing.
        </div>

        <div className="p-5 sm:p-6">
          {loading && !organization ? <div className="flex items-center gap-3 p-8 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading billing details...</div> : (
            <div className="grid gap-4 xl:grid-cols-3">
              {plans.map((plan) => {
                const Icon = plan.icon;
                const isCurrent = currentPlan === plan.id;
                return (
                  <article key={plan.id} className={`relative flex min-h-[420px] flex-col border bg-background p-5 ${plan.highlighted ? "border-primary" : "border-border"}`}>
                    {plan.highlighted && <span className="absolute right-4 top-4 bg-primary px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground">Recommended</span>}
                    <div className="flex items-start justify-between gap-4 pt-2">
                      <span className={`flex h-11 w-11 items-center justify-center border ${isCurrent ? "bg-emerald-50 text-emerald-700" : "bg-primary/10 text-primary"}`}><Icon className="h-5 w-5" /></span>
                      {isCurrent && <Badge className="rounded-none bg-emerald-600 hover:bg-emerald-600">Current</Badge>}
                    </div>
                    <h3 className="mt-6 text-2xl font-black tracking-[-0.04em]">{plan.name}</h3>
                    <p className="mt-3 min-h-[72px] text-sm leading-6 text-muted-foreground">{plan.description}</p>
                    <div className="mt-5 border bg-muted/25 p-4"><span className="text-4xl font-black tracking-[-0.06em]">{plan.price}</span><span className="ml-1 text-sm text-muted-foreground">/{plan.cadence}</span></div>
                    <div className="mt-5 grid gap-3">{plan.features.map((feature) => <div key={feature} className="flex items-start gap-3 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>{feature}</span></div>)}</div>
                    <div className="mt-auto pt-6">
                      <Button asChild className="w-full rounded-none py-6 font-semibold" variant={isCurrent ? "outline" : "default"}>
                        <Link href={isCurrent ? "/organization/edit?setup=1" : plan.href}>{isCurrent ? "Manage workspace" : plan.cta}<ArrowRight className="h-4 w-4" /></Link>
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
