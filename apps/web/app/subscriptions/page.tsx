"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, CreditCard, DatabaseZap, ShieldCheck, Sparkles, Zap } from "lucide-react";

import { AuthCard, AuthShell } from "@/components/marketing/auth-shell";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Free",
    price: "$0",
    cadence: "per month",
    eyebrow: "Validate the workflow",
    description: "Start a workspace, test the product experience, and understand how NexStock can fit into your inventory process before committing to a paid plan.",
    href: "/dashboard",
    cta: "Continue free",
    icon: Sparkles,
    features: [
      "Create a NexStock workspace",
      "Manual product catalog setup",
      "Basic inventory visibility",
      "Email verification and secure login",
    ],
    details: ["Best for first-time testing", "No payment required", "Upgrade later from billing"],
  },
  {
    name: "Starter",
    price: "$19",
    cadence: "per month",
    eyebrow: "Clean product operations",
    description: "For small teams that need structured imports, reusable mapping, and clearer stock visibility without manually rebuilding product records every time.",
    href: "/billing/checkout?plan=starter",
    cta: "Choose Starter",
    icon: DatabaseZap,
    highlighted: true,
    features: [
      "CSV and XLSX product imports",
      "Reusable product-field mapping",
      "Inventory movement history",
      "API keys for connected tools",
    ],
    details: ["Best for small product teams", "Selected plan only in checkout", "Use Lemon test card during implementation"],
  },
  {
    name: "Growth",
    price: "$59",
    cadence: "per month",
    eyebrow: "Connected workflows",
    description: "For growing teams that need integrations, webhooks, team controls, supplier workflows, and stronger product operations across connected systems.",
    href: "/billing/checkout?plan=growth",
    cta: "Choose Growth",
    icon: Zap,
    features: [
      "Advanced imports and integration workflows",
      "Webhooks for product and stock events",
      "Team workspace and admin controls",
      "Priority setup support",
    ],
    details: ["Best for active operations", "Selected plan only in checkout", "Use Lemon test card during implementation"],
  },
];

export default function SubscriptionsPage() {
  return (
    <AuthShell
      eyebrow="NexStock subscriptions"
      title="Choose how you want to start."
      description="Select Free, Starter, or Growth. Paid plans will show a NexStock review screen first with test card details before continuing to Lemon Squeezy checkout."
      icon={CreditCard}
      highlights={["Free workspace option", "Detailed paid plan review", "Selected subscription only in checkout"]}
      actionHref="/organization"
      actionLabel="Go to app"
    >
      <AuthCard
        icon={ShieldCheck}
        eyebrow="Subscription selection"
        title="Pick your NexStock plan"
        description="Choose the workspace level that matches your product operations. You can change plan later."
        footer={<>Need help choosing? Email <a href="mailto:admin@nexstock.co.za" className="font-medium text-foreground hover:underline">admin@nexstock.co.za</a></>}
      >
        <div className="grid gap-0 border-t lg:grid-cols-3 lg:divide-x">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <article key={plan.name} className={plan.highlighted ? "bg-primary/5" : "bg-background"}>
                <div className="border-b p-5">
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex h-11 w-11 items-center justify-center border bg-background text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    {plan.highlighted && <span className="bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">Popular</span>}
                  </div>
                  <p className="mt-5 text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{plan.eyebrow}</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">{plan.name}</h2>
                  <div className="mt-4 flex items-end gap-2">
                    <span className="text-4xl font-black tracking-[-0.06em]">{plan.price}</span>
                    <span className="pb-1 text-sm text-muted-foreground">{plan.cadence}</span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">{plan.description}</p>
                </div>

                <div className="border-b p-5">
                  <p className="text-sm font-semibold">Included</p>
                  <div className="mt-4 grid gap-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-b p-5">
                  <p className="text-sm font-semibold">Good to know</p>
                  <div className="mt-4 grid gap-2">
                    {plan.details.map((detail) => (
                      <div key={detail} className="border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">{detail}</div>
                    ))}
                  </div>
                </div>

                <div className="p-5">
                  <Button asChild className="w-full rounded-none py-6 font-semibold" variant={plan.name === "Free" ? "outline" : "default"}>
                    <Link href={plan.href}>{plan.cta} <ArrowRight className="h-4 w-4" /></Link>
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </AuthCard>
    </AuthShell>
  );
}
