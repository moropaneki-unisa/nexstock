"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, CreditCard, ExternalLink, Loader2, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { initializeSubscriptionCheckout, verifySubscriptionPayment, type SubscriptionPlan } from "@/lib/api";

type PaidPlan = SubscriptionPlan;

const PLAN_STORAGE_KEY = "nexstock:selected-plan";

const plans: Record<PaidPlan, { name: string; price: string; description: string; features: string[]; bestFor: string }> = {
  starter: { name: "Starter", price: "$19/month", bestFor: "Small teams starting structured product operations.", description: "Import product files, clean product fields, track stock movement, and start building one reliable catalog.", features: ["CSV and XLSX product imports", "Reusable product-field mapping", "Inventory movement history", "API keys for connected tools"] },
  growth: { name: "Growth", price: "$59/month", bestFor: "Growing teams that need automation and connected workflows.", description: "Add stronger product operations with integrations, webhooks, team controls, and priority setup support.", features: ["Advanced imports and integration-ready workflows", "Webhooks for product and stock events", "Team workspace and admin controls", "Priority setup support"] },
};

function getPaidPlan(value: string | null): PaidPlan {
  return value === "growth" || value === "business" ? "growth" : "starter";
}

function getReferenceFromUrl() {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  return params.get("checkout_id") || params.get("order_id") || params.get("subscription_id") || params.get("reference") || "";
}

export function SubscriptionCheckoutReview() {
  const [selectedPlan, setSelectedPlan] = useState<PaidPlan>("starter");
  const [status, setStatus] = useState<"idle" | "starting" | "verifying" | "success" | "failed">("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastCheckoutUrl, setLastCheckoutUrl] = useState<string | null>(null);
  const [reference, setReference] = useState("");
  const plan = plans[selectedPlan];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextPlan = getPaidPlan(params.get("plan") || window.localStorage.getItem(PLAN_STORAGE_KEY));
    const urlReference = getReferenceFromUrl();
    setSelectedPlan(nextPlan);
    window.localStorage.setItem(PLAN_STORAGE_KEY, nextPlan);
    if (urlReference) {
      setReference(urlReference);
      void verifyTransaction(urlReference);
    }
  }, []);

  function changePlan(nextPlan: PaidPlan) {
    if (status === "starting" || status === "verifying") return;
    setSelectedPlan(nextPlan);
    window.localStorage.setItem(PLAN_STORAGE_KEY, nextPlan);
    const url = new URL(window.location.href);
    url.searchParams.set("plan", nextPlan);
    window.history.replaceState(null, "", url.toString());
  }

  async function startCheckout() {
    setStatus("starting");
    setError(null);
    setLastCheckoutUrl(null);
    try {
      const checkout = await initializeSubscriptionCheckout(selectedPlan);
      const url = checkout.checkout_url || checkout.authorization_url;
      if (!url) throw new Error("Lemon Squeezy did not return a checkout URL.");
      setReference(checkout.reference || "");
      setLastCheckoutUrl(url);
      window.location.href = url;
    } catch (err) {
      setStatus("failed");
      setError(err instanceof Error ? err.message : "Could not start Lemon Squeezy checkout.");
    }
  }

  async function verifyTransaction(checkoutReference = reference) {
    if (!checkoutReference) return;
    setStatus("verifying");
    setError(null);
    try {
      const result = await verifySubscriptionPayment(checkoutReference);
      if (result.success) {
        setStatus("success");
        window.localStorage.removeItem(PLAN_STORAGE_KEY);
        window.setTimeout(() => { window.location.href = "/organization/edit?setup=1"; }, 1200);
      } else {
        setStatus("failed");
        setError(result.status ? `Payment is ${result.status}. If you just paid, wait a few seconds for the webhook and try Verify again.` : "Payment is not verified yet.");
      }
    } catch (err) {
      setStatus("failed");
      setError(err instanceof Error ? err.message : "Could not verify payment. Make sure you are logged in, then try again.");
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-foreground">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:px-8">
        <aside className="rounded-[2rem] bg-[#0b1220] p-6 text-white shadow-xl shadow-slate-200 sm:p-8 lg:min-h-[640px]">
          <div className="flex h-full flex-col justify-between gap-10">
            <div>
              <Link href="/subscriptions" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white/70 transition hover:bg-white/15">
                <ArrowRight className="h-3.5 w-3.5 rotate-180" /> Change plan
              </Link>
              <h1 className="mt-8 max-w-xl text-4xl font-black tracking-[-0.055em] sm:text-5xl">Review your {plan.name} subscription.</h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-white/68">Confirm your plan, copy the test card details, then continue to Lemon Squeezy hosted checkout.</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/50">Testing card</p>
              <p className="mt-3 font-mono text-2xl font-black tracking-tight">4242 4242 4242 4242</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-white/10 p-3"><p className="text-white/50">Expiry</p><p className="mt-1 font-mono font-bold">12/35</p></div>
                <div className="rounded-2xl bg-white/10 p-3"><p className="text-white/50">CVC</p><p className="mt-1 font-mono font-bold">123</p></div>
              </div>
              <p className="mt-4 text-xs leading-5 text-white/55">NexStock is still in implementation. Use test card details only and contact admin@nexstock.co.za before adding real launch data.</p>
            </div>
          </div>
        </aside>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-6 sm:p-8">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">Secure checkout</p>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.05em]">NexStock {plan.name}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{plan.bestFor}</p>
              </div>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><CreditCard className="h-5 w-5" /></span>
            </div>
          </div>

          <div className="grid gap-0 border-b border-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-slate-100">
            {(["starter", "growth"] as PaidPlan[]).map((option) => (
              <button key={option} type="button" onClick={() => changePlan(option)} disabled={status === "starting" || status === "verifying"} className={`p-5 text-left transition ${selectedPlan === option ? "bg-primary/5" : "hover:bg-slate-50"}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold">{plans[option].name}</p>
                  {selectedPlan === option && <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">Selected</span>}
                </div>
                <p className="mt-2 text-2xl font-black tracking-[-0.05em]">{plans[option].price.split("/")[0]}<span className="text-sm font-medium text-muted-foreground">/month</span></p>
              </button>
            ))}
          </div>

          <div className="p-6 sm:p-8">
            <div className="rounded-3xl bg-slate-50 p-5">
              <div className="flex items-end gap-2"><span className="text-5xl font-black tracking-[-0.07em]">{plan.price.split("/")[0]}</span><span className="pb-1 text-sm font-medium text-muted-foreground">/month</span></div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">{plan.description}</p>
            </div>

            <div className="mt-6 grid gap-3">{plan.features.map((feature) => <div key={feature} className="flex items-start gap-3 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span className="leading-5">{feature}</span></div>)}</div>

            <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-amber-950"><div className="flex items-start gap-3"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-bold">Use test card details only.</p><p className="mt-1 text-sm leading-6">Do not use a real card while NexStock is still in implementation and payment testing.</p></div></div></div>

            {status === "success" && <div className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">Payment verified. Redirecting...</div>}
            {error && <div className="mt-5 rounded-3xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive"><AlertCircle className="mr-2 inline h-4 w-4" />{error}</div>}

            <div className="mt-6 space-y-3">
              <Button onClick={startCheckout} className="w-full rounded-2xl py-6 font-bold" disabled={status === "starting" || status === "verifying" || status === "success"}>{status === "starting" ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating checkout...</> : <>Continue to Lemon Squeezy <ExternalLink className="h-4 w-4" /></>}</Button>
              {reference && <Button type="button" variant="outline" onClick={() => verifyTransaction(reference)} className="w-full rounded-2xl py-6 font-bold" disabled={status === "verifying" || status === "success"}>{status === "verifying" ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : <><RefreshCwIcon />Verify payment</>}</Button>}
              {lastCheckoutUrl && <Button type="button" variant="ghost" className="w-full rounded-2xl" onClick={() => window.location.assign(lastCheckoutUrl)}>Open hosted checkout again <ArrowRight className="h-4 w-4" /></Button>}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function RefreshCwIcon() {
  return <RefreshCcw className="h-4 w-4" />;
}
