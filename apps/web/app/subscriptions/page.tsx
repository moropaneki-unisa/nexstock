"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, CreditCard, DatabaseZap, ShieldCheck, Sparkles, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Free",
    price: "$0",
    cadence: "month",
    eyebrow: "Explore",
    description: "Validate your workspace and add your first products before upgrading.",
    href: "/organization/edit?setup=1",
    cta: "Start free",
    icon: Sparkles,
    features: ["Workspace access", "Manual products", "Basic stock view", "Secure login"],
    footnote: "No card required",
  },
  {
    name: "Starter",
    price: "$19",
    cadence: "month",
    eyebrow: "Most practical",
    description: "Import product files, map fields, clean records, and manage stock with less manual work.",
    href: "/billing/checkout?plan=starter",
    cta: "Choose Starter",
    icon: DatabaseZap,
    highlighted: true,
    features: ["CSV and XLSX imports", "Reusable field mapping", "Inventory movement history", "API keys"],
    footnote: "Best for early demos",
  },
  {
    name: "Growth",
    price: "$59",
    cadence: "month",
    eyebrow: "Connected teams",
    description: "Use webhooks, team controls, and integration-ready workflows as your operations grow.",
    href: "/billing/checkout?plan=growth",
    cta: "Choose Growth",
    icon: Zap,
    features: ["Advanced imports", "Product and stock webhooks", "Team workspace controls", "Priority setup support"],
    footnote: "Best for active operations",
  },
];

const notes = [
  "Selected plan only appears in checkout",
  "Use test cards while NexStock is in implementation",
  "Contact admin@nexstock.co.za before adding real launch data",
];

export default function SubscriptionsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 border-b pb-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center border bg-primary/10 text-primary"><ShieldCheck className="h-5 w-5" /></span>
            <div><p className="text-sm font-semibold tracking-tight">NexStock</p><p className="text-xs text-muted-foreground">Product operations workspace</p></div>
          </Link>
          <Link href="/organization" className="text-sm font-semibold text-muted-foreground transition hover:text-foreground">Go to app</Link>
        </header>

        <div className="flex flex-1 flex-col py-8 lg:py-12">
          <section className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 border bg-card/95 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"><CreditCard className="h-3.5 w-3.5 text-primary" /> Subscription setup</div>
            <h1 className="mt-6 text-4xl font-black tracking-[-0.055em] sm:text-5xl lg:text-6xl">Choose the plan that fits your inventory workflow.</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">Start free, or test a paid subscription safely. Paid checkouts show test-card details before opening Lemon Squeezy.</p>
          </section>

          <section className="mx-auto mt-8 grid w-full max-w-5xl gap-0 border bg-card/95 md:grid-cols-3 md:divide-x">
            {notes.map((item) => <div key={item} className="flex items-start gap-3 border-b px-4 py-3 text-sm text-muted-foreground last:border-b-0 md:border-b-0"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>{item}</span></div>)}
          </section>

          <section className="mt-10 grid gap-5 lg:grid-cols-3">
            {plans.map((plan) => {
              const Icon = plan.icon;
              return (
                <article key={plan.name} className={`relative flex min-h-[500px] flex-col border bg-card/95 p-5 ${plan.highlighted ? "border-primary" : ""}`}>
                  {plan.highlighted && <span className="absolute right-4 top-4 bg-primary px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground">Recommended</span>}
                  <div className="flex items-start justify-between gap-4 pt-2"><span className={`flex h-12 w-12 items-center justify-center border ${plan.highlighted ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground"}`}><Icon className="h-5 w-5" /></span><span className="border bg-muted/25 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{plan.eyebrow}</span></div>
                  <div className="mt-7"><h2 className="text-2xl font-black tracking-[-0.04em]">{plan.name}</h2><p className="mt-3 min-h-[72px] text-sm leading-6 text-muted-foreground">{plan.description}</p></div>
                  <div className="mt-6 border bg-muted/20 p-4"><div className="flex items-end gap-2"><span className="text-5xl font-black tracking-[-0.07em]">{plan.price}</span><span className="pb-1 text-sm font-medium text-muted-foreground">/{plan.cadence}</span></div><p className="mt-2 text-xs font-medium text-muted-foreground">{plan.footnote}</p></div>
                  <div className="mt-6 grid gap-3">{plan.features.map((feature) => <div key={feature} className="flex items-start gap-3 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span className="leading-5">{feature}</span></div>)}</div>
                  <div className="mt-auto pt-6"><Button asChild className="w-full rounded-none py-6 font-semibold" variant={plan.name === "Free" ? "outline" : "default"}><Link href={plan.href}>{plan.cta} <ArrowRight className="h-4 w-4" /></Link></Button></div>
                </article>
              );
            })}
          </section>
        </div>
      </section>
    </main>
  );
}
