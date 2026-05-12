"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, CreditCard, ExternalLink, Loader2, RefreshCcw, ShieldCheck } from "lucide-react";

import { AuthCard, AuthShell } from "@/components/marketing/auth-shell";
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

export function PaddleInlineCheckout() {
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
    <AuthShell eyebrow="Secure subscription" title="Review your NexStock plan." description="Confirm the subscription that fits your product operations, then continue to Lemon Squeezy hosted checkout." icon={ShieldCheck} highlights={["Hosted Lemon Squeezy checkout", "Selected plan only", "Test-card details before checkout"]} actionHref="/subscriptions" actionLabel="Change plan">
      <AuthCard icon={CreditCard} eyebrow="Subscription checkout" title="Choose your checkout plan" description="We show test-card details here first so testers know not to use real card information.">
        <div className="grid gap-3 border-t p-5 sm:grid-cols-2">{(["starter", "growth"] as PaidPlan[]).map((option) => <button key={option} type="button" onClick={() => changePlan(option)} disabled={status === "starting" || status === "verifying"} className={`border p-4 text-left transition ${selectedPlan === option ? "border-primary bg-primary/5 ring-2 ring-primary" : "bg-background hover:bg-muted/50"}`}><div className="flex items-center justify-between gap-3"><p className="font-semibold">{plans[option].name}</p>{selectedPlan === option && <span className="bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">Selected</span>}</div><p className="mt-2 text-2xl font-black tracking-[-0.04em]">{plans[option].price.split("/")[0]}<span className="text-sm font-normal text-muted-foreground">/month</span></p><p className="mt-2 text-xs leading-5 text-muted-foreground">{plans[option].bestFor}</p></button>)}</div>
        <div className="border-t p-5"><div className="border bg-background p-5"><p className="text-sm font-semibold text-muted-foreground">Selected subscription</p><div className="mt-2 flex items-end gap-2"><span className="text-4xl font-black tracking-[-0.06em]">{plan.price.split("/")[0]}</span><span className="pb-1 text-sm text-muted-foreground">/month</span></div><h2 className="mt-3 text-xl font-semibold">NexStock {plan.name}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{plan.description}</p><div className="mt-5 grid gap-3">{plan.features.map((feature) => <div key={feature} className="flex items-center gap-3 text-sm"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><span>{feature}</span></div>)}</div></div></div>
        <div className="border-t bg-amber-50 p-5 text-amber-950"><div className="flex items-start gap-3"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">Testing mode: do not use a real card.</p><p className="mt-1 text-sm leading-6">Use Lemon Squeezy test card details while NexStock is still in implementation.</p><div className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><div className="border border-amber-200 bg-white/70 p-3"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">Visa test card</p><p className="mt-1 font-mono text-base">4242 4242 4242 4242</p></div><div className="border border-amber-200 bg-white/70 p-3"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">Expiry / CVC</p><p className="mt-1 font-mono text-base">12/35 · 123</p></div></div><p className="mt-2 text-xs leading-5">Use any cardholder name and the email you registered with. Lemon Squeezy will process this in test mode.</p></div></div></div>
        {status === "success" && <div className="border-t border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">Payment verified. Redirecting...</div>}
        {error && <div className="border-t border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive"><AlertCircle className="mr-2 inline h-4 w-4" />{error}</div>}
        <div className="border-t p-5"><div className="space-y-3"><Button onClick={startCheckout} className="w-full rounded-none py-6 font-semibold" disabled={status === "starting" || status === "verifying" || status === "success"}>{status === "starting" ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating hosted checkout...</> : <>Continue to Lemon Squeezy checkout <ExternalLink className="h-4 w-4" /></>}</Button>{reference && <Button type="button" variant="outline" onClick={() => verifyTransaction(reference)} className="w-full rounded-none py-6 font-semibold" disabled={status === "verifying" || status === "success"}>{status === "verifying" ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : <><RefreshCcw className="h-4 w-4" />Verify payment</>}</Button>}{lastCheckoutUrl && <Button type="button" variant="ghost" className="w-full rounded-none" onClick={() => window.location.assign(lastCheckoutUrl)}>Open hosted checkout again <ArrowRight className="h-4 w-4" /></Button>}</div></div>
      </AuthCard>
    </AuthShell>
  );
}
