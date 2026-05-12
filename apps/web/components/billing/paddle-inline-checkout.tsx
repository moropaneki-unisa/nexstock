"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, CreditCard, ExternalLink, Loader2, RefreshCcw, ShieldCheck } from "lucide-react";

import { AuthCard, AuthShell } from "@/components/marketing/auth-shell";
import { Button } from "@/components/ui/button";
import { initializeSubscriptionCheckout, verifySubscriptionPayment, type SubscriptionPlan } from "@/lib/api";

type PaidPlan = SubscriptionPlan;

const PLAN_STORAGE_KEY = "nexstock:selected-plan";

const plans: Record<PaidPlan, { name: string; price: string; description: string; features: string[] }> = {
  starter: { name: "Starter", price: "$19/month", description: "Product imports, reusable mapping, inventory movement history, and API keys for connected workflows.", features: ["CSV and XLSX product imports", "Reusable product-field mapping", "Inventory movement history", "API keys for connected tools"] },
  growth: { name: "Growth", price: "$59/month", description: "Advanced imports, integration-ready workflows, webhooks, team controls, and priority setup support.", features: ["Advanced imports and integration workflows", "Webhooks for product and stock events", "Team workspace and admin controls", "Priority setup support"] },
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
    <AuthShell eyebrow="Secure subscription" title="Checkout powered by Lemon Squeezy." description="Review your subscription, switch plans if needed, then complete payment securely on Lemon Squeezy." icon={ShieldCheck} highlights={["Hosted Merchant of Record checkout", "USD subscription pricing", "Organization setup after payment"]} actionHref="/#pricing" actionLabel="Change plan">
      <AuthCard icon={CreditCard} eyebrow="Subscription checkout" title="Review your plan" description="Choose the subscription that fits your product operations, then continue to Lemon Squeezy checkout." footer={<Link href="/#pricing" className="font-medium text-foreground hover:underline">Compare all plans</Link>}>
        <div className="grid gap-3 border-t p-5 sm:grid-cols-2">{(["starter", "growth"] as PaidPlan[]).map((option) => <button key={option} type="button" onClick={() => changePlan(option)} disabled={status === "starting" || status === "verifying"} className={`border p-4 text-left transition ${selectedPlan === option ? "border-primary bg-primary/5 ring-2 ring-primary" : "bg-background hover:bg-muted/50"}`}><div className="flex items-center justify-between gap-3"><p className="font-semibold">{plans[option].name}</p>{selectedPlan === option && <span className="bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">Selected</span>}</div><p className="mt-2 text-2xl font-black tracking-[-0.04em]">{plans[option].price.split("/")[0]}<span className="text-sm font-normal text-muted-foreground">/month</span></p><p className="mt-2 text-xs leading-5 text-muted-foreground">{plans[option].description}</p></button>)}</div>
        <div className="border-t p-5"><div className="border bg-background p-5"><p className="text-sm font-semibold text-muted-foreground">Selected plan</p><div className="mt-2 flex items-end gap-2"><span className="text-4xl font-black tracking-[-0.06em]">{plan.price.split("/")[0]}</span><span className="pb-1 text-sm text-muted-foreground">/month</span></div><p className="mt-3 text-sm text-muted-foreground">{plan.description}</p><div className="mt-5 grid gap-3">{plan.features.map((feature) => <div key={feature} className="flex items-center gap-3 text-sm"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><span>{feature}</span></div>)}</div></div></div>
        {status === "success" && <div className="border-t border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">Payment verified. Redirecting...</div>}
        {error && <div className="border-t border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive"><AlertCircle className="mr-2 inline h-4 w-4" />{error}</div>}
        <div className="border-t p-5"><div className="space-y-3"><Button onClick={startCheckout} className="w-full rounded-none py-6 font-semibold" disabled={status === "starting" || status === "verifying" || status === "success"}>{status === "starting" ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating checkout...</> : <>Continue to Lemon Squeezy <ExternalLink className="h-4 w-4" /></>}</Button>{reference && <Button type="button" variant="outline" onClick={() => verifyTransaction(reference)} className="w-full rounded-none py-6 font-semibold" disabled={status === "verifying" || status === "success"}>{status === "verifying" ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : <><RefreshCcw className="h-4 w-4" />Verify payment</>}</Button>}{lastCheckoutUrl && <Button asChild variant="ghost" className="w-full rounded-none"><a href={lastCheckoutUrl}>Open checkout again <ArrowRight className="h-4 w-4" /></a></Button>}</div></div>
      </AuthCard>
    </AuthShell>
  );
}
