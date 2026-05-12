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
    <main className="min-h-screen bg-[#f7f8fb] text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm"><ShieldCheck className="h-5 w-5" /></span>
            <div><p className="text-sm font-black tracking-tight">NexStock</p><p className="text-xs text-muted-foreground">Product operations workspace</p></div>
          </Link>
          <Link href="/organization" className="text-sm font-semibold text-muted-foreground transition hover:text-foreground">Go to app</Link>
        </header>

        <div className="flex flex-1 flex-col py-8 lg:py-12">
          <section className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground shadow-sm"><CreditCard className="h-3.5 w-3.5 text-primary" /> Subscription setup</div>
            <h1 className="mt-6 text-4xl font-black tracking-[-0.055em] text-slate-950 sm:text-5xl lg:text-6xl">Choose the plan that fits your inventory workflow.</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">Start free, or test a paid subscription safely. Paid checkouts show test-card details before opening Lemon Squeezy.</p>
          </section>

          <section className="mx-auto mt-8 grid w-full max-w-5xl gap-3 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
            {notes.map((item) => <div key={item} className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-muted-foreground"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>{item}</span></div>)}
          </section>

          <section className="mt-10 grid gap-5 lg:grid-cols-3">
            {plans.map((plan) => {
              const Icon = plan.icon;
              return (
                <article key={plan.name} className={`relative flex min-h-[500px] flex-col rounded-[1.75rem] border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/80 ${plan.highlighted ? "border-primary ring-4 ring-primary/10" : "border-slate-200"}`}>
                  {plan.highlighted && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-primary-foreground shadow-sm">Recommended</span>}
                  <div className="flex items-start justify-between gap-4 pt-2"><span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${plan.highlighted ? "bg-primary text-primary-foreground" : "bg-slate-100 text-slate-700"}`}><Icon className="h-5 w-5" /></span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{plan.eyebrow}</span></div>
                  <div className="mt-7"><h2 className="text-2xl font-black tracking-[-0.04em]">{plan.name}</h2><p className="mt-3 min-h-[72px] text-sm leading-6 text-muted-foreground">{plan.description}</p></div>
                  <div className="mt-6 rounded-3xl bg-slate-50 p-4"><div className="flex items-end gap-2"><span className="text-5xl font-black tracking-[-0.07em]">{plan.price}</span><span className="pb-1 text-sm font-medium text-muted-foreground">/{plan.cadence}</span></div><p className="mt-2 text-xs font-medium text-muted-foreground">{plan.footnote}</p></div>
                  <div className="mt-6 grid gap-3">{plan.features.map((feature) => <div key={feature} className="flex items-start gap-3 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span className="leading-5">{feature}</span></div>)}</div>
                  <div className="mt-auto pt-6"><Button asChild className="w-full rounded-2xl py-6 font-bold" variant={plan.name === "Free" ? "outline" : "default"}><Link href={plan.href}>{plan.cta} <ArrowRight className="h-4 w-4" /></Link></Button></div>
                </article>
              );
            })}
          </section>
        </div>
      </section>
    </main>
  );
}
