"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, CreditCard, ExternalLink, Loader2, RefreshCcw } from "lucide-react";

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
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/subscriptions" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"><ArrowLeft className="h-4 w-4" />Change plan</Link>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Secure checkout</p>
            <h1 className="mt-2 text-4xl font-black tracking-[-0.055em]">Review your {plan.name} subscription.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Confirm your plan, copy the test card details, then continue to Lemon Squeezy hosted checkout.</p>
          </div>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center border bg-primary/10 text-primary"><CreditCard className="h-5 w-5" /></span>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <main className="space-y-6">
            <section className="border bg-card/95">
              <div className="border-b p-5">
                <h2 className="text-lg font-semibold tracking-tight">Selected subscription</h2>
                <p className="mt-1 text-sm text-muted-foreground">{plan.bestFor}</p>
              </div>
              <div className="grid gap-0 border-b sm:grid-cols-2 sm:divide-x">
                {(["starter", "growth"] as PaidPlan[]).map((option) => (
                  <button key={option} type="button" onClick={() => changePlan(option)} disabled={status === "starting" || status === "verifying"} className={`p-5 text-left transition ${selectedPlan === option ? "bg-primary/10" : "hover:bg-muted/35"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{plans[option].name}</p>
                      {selectedPlan === option && <span className="bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">Selected</span>}
                    </div>
                    <p className="mt-2 text-2xl font-black tracking-[-0.05em]">{plans[option].price.split("/")[0]}<span className="text-sm font-medium text-muted-foreground">/month</span></p>
                  </button>
                ))}
              </div>
              <div className="p-5">
                <div className="border bg-muted/20 p-5">
                  <div className="flex items-end gap-2"><span className="text-5xl font-black tracking-[-0.07em]">{plan.price.split("/")[0]}</span><span className="pb-1 text-sm font-medium text-muted-foreground">/month</span></div>
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">{plan.description}</p>
                </div>
                <div className="mt-6 grid gap-3">{plan.features.map((feature) => <div key={feature} className="flex items-start gap-3 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span className="leading-5">{feature}</span></div>)}</div>
              </div>
            </section>

            {status === "success" && <div className="border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">Payment verified. Redirecting...</div>}
            {error && <div className="border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive"><AlertCircle className="mr-2 inline h-4 w-4" />{error}</div>}

            <section className="border bg-card/95 p-4">
              <div className="space-y-3">
                <Button onClick={startCheckout} className="w-full rounded-none py-6 font-semibold" disabled={status === "starting" || status === "verifying" || status === "success"}>{status === "starting" ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating checkout...</> : <>Continue to Lemon Squeezy <ExternalLink className="h-4 w-4" /></>}</Button>
                {reference && <Button type="button" variant="outline" onClick={() => verifyTransaction(reference)} className="w-full rounded-none py-6 font-semibold" disabled={status === "verifying" || status === "success"}>{status === "verifying" ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : <><RefreshCwIcon />Verify payment</>}</Button>}
                {lastCheckoutUrl && <Button type="button" variant="ghost" className="w-full rounded-none" onClick={() => window.location.assign(lastCheckoutUrl)}>Open hosted checkout again <ArrowRight className="h-4 w-4" /></Button>}
              </div>
            </section>
          </main>

          <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <section className="border bg-card/95">
              <div className="border-b p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Testing card</p>
                <p className="mt-3 font-mono text-2xl font-black tracking-tight">4242 4242 4242 4242</p>
              </div>
              <div className="grid grid-cols-2 divide-x border-b text-sm">
                <div className="p-4"><p className="text-muted-foreground">Expiry</p><p className="mt-1 font-mono font-bold">12/35</p></div>
                <div className="p-4"><p className="text-muted-foreground">CVC</p><p className="mt-1 font-mono font-bold">123</p></div>
              </div>
              <div className="bg-amber-50 p-4 text-sm text-amber-900"><AlertCircle className="mr-2 inline h-4 w-4" />Use test card details only while NexStock is in implementation.</div>
            </section>

            <section className="border bg-card/95 p-4 text-xs leading-5 text-muted-foreground">
              Contact <a className="font-medium text-foreground underline" href="mailto:admin@nexstock.co.za">admin@nexstock.co.za</a> before adding real launch product data.
            </section>
          </aside>
        </section>
      </section>
    </main>
  );
}

function RefreshCwIcon() {
  return <RefreshCcw className="h-4 w-4" />;
}
