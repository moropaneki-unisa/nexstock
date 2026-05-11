"use client";

import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, CreditCard, Loader2, RefreshCcw, ShieldCheck } from "lucide-react";

import { AuthCard, AuthShell } from "@/components/marketing/auth-shell";
import { Button } from "@/components/ui/button";
import { initializeSubscriptionCheckout, verifySubscriptionPayment, type SubscriptionPlan } from "@/lib/api";

type PaidPlan = SubscriptionPlan;
type PaddleEvent = { name?: string; data?: { transaction_id?: string } };

declare global {
  interface Window {
    Paddle?: {
      Environment?: { set: (environment: string) => void };
      Initialize: (options: Record<string, unknown>) => void;
      Update?: (options: Record<string, unknown>) => void;
      Checkout: { open: (options: Record<string, unknown>) => void; close?: () => void };
    };
    __nexstockPaddleInitialized?: boolean;
  }
}

const PLAN_STORAGE_KEY = "nexstock:selected-plan";
const PADDLE_FRAME_TARGET = "nexstock-paddle-checkout";
const paddleClientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
const paddleEnvironment = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || "sandbox";

const plans: Record<PaidPlan, { name: string; price: string; description: string; features: string[] }> = {
  starter: { name: "Starter", price: "$19/month", description: "Product imports, reusable mapping, inventory movement history, and API keys for connected workflows.", features: ["CSV and XLSX product imports", "Reusable product-field mapping", "Inventory movement history", "API keys for connected tools"] },
  growth: { name: "Growth", price: "$59/month", description: "Advanced imports, integration-ready workflows, webhooks, team controls, and priority setup support.", features: ["Advanced imports and integration workflows", "Webhooks for product and stock events", "Team workspace and admin controls", "Priority setup support"] },
};

function getPaidPlan(value: string | null): PaidPlan {
  return value === "growth" || value === "business" ? "growth" : "starter";
}

function cleanUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  ["_ptxn", "transaction_id", "reference", "trxref", "status", "checkout_status", "payment_status", "result", "paddle_status", "success", "completed"].forEach((key) => url.searchParams.delete(key));
  window.history.replaceState(null, "", url.toString());
}

export function PaddleInlineCheckout() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<PaidPlan>("starter");
  const [paddleReady, setPaddleReady] = useState(false);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [status, setStatus] = useState<"idle" | "starting" | "checkout" | "verifying" | "success" | "failed">("idle");
  const [error, setError] = useState<string | null>(null);
  const plan = plans[selectedPlan];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextPlan = getPaidPlan(params.get("plan") || window.localStorage.getItem(PLAN_STORAGE_KEY));
    setSelectedPlan(nextPlan);
    window.localStorage.setItem(PLAN_STORAGE_KEY, nextPlan);
    cleanUrl();
  }, []);

  function initializePaddle() {
    if (!paddleClientToken) {
      setError("Paddle is not configured. Add NEXT_PUBLIC_PADDLE_CLIENT_TOKEN to the web environment and redeploy.");
      setStatus("failed");
      return;
    }
    if (!window.Paddle) return;
    try {
      if (paddleEnvironment === "sandbox") window.Paddle.Environment?.set("sandbox");
      const settings = { displayMode: "inline", variant: "one-page", theme: "light", frameTarget: PADDLE_FRAME_TARGET, frameInitialHeight: "520", frameStyle: "width: 100%; min-width: 312px; background-color: transparent; border: none;" };
      const options = { token: paddleClientToken, eventCallback: handlePaddleEvent, checkout: { settings } };
      if (window.__nexstockPaddleInitialized && window.Paddle.Update) window.Paddle.Update({ eventCallback: handlePaddleEvent });
      else if (!window.__nexstockPaddleInitialized) {
        window.Paddle.Initialize(options);
        window.__nexstockPaddleInitialized = true;
      }
      setPaddleReady(true);
    } catch (err) {
      setStatus("failed");
      setError(err instanceof Error ? err.message : "Could not initialize Paddle checkout.");
    }
  }

  function closeCheckout(message?: string) {
    try { window.Paddle?.Checkout.close?.(); } catch {}
    setCheckoutVisible(false);
    setStatus(message ? "failed" : "idle");
    if (message) setError(message);
    cleanUrl();
  }

  function handlePaddleEvent(event: PaddleEvent) {
    if (event.name === "checkout.loaded" || event.name === "checkout.payment.initiated") setStatus("checkout");
    if (event.name === "checkout.closed") closeCheckout();
    if (event.name === "checkout.payment.failed" || event.name === "checkout.error" || event.name === "checkout.payment.error") {
      closeCheckout("Paddle could not load the checkout form. Check that sandbox/live client token, API key, price IDs, and approved domain all match, then try again.");
    }
    if (event.name === "checkout.completed") {
      const transactionId = event.data?.transaction_id;
      if (!transactionId) {
        closeCheckout("Paddle completed but did not return a transaction ID.");
        return;
      }
      setCheckoutVisible(false);
      setStatus("verifying");
      verifySubscriptionPayment(transactionId).then((result) => {
        if (result.success) {
          setStatus("success");
          window.localStorage.removeItem(PLAN_STORAGE_KEY);
          window.setTimeout(() => router.push("/organization/edit?setup=1"), 1200);
        } else {
          setStatus("failed");
          setError(result.status ? `Transaction is ${result.status}.` : "Could not verify transaction.");
        }
      }).catch((err) => {
        setStatus("failed");
        setError(err instanceof Error ? err.message : "Could not verify transaction.");
      });
    }
  }

  function changePlan(nextPlan: PaidPlan) {
    if (status === "starting" || status === "checkout" || status === "verifying") return;
    setSelectedPlan(nextPlan);
    window.localStorage.setItem(PLAN_STORAGE_KEY, nextPlan);
    const url = new URL(window.location.href);
    url.searchParams.set("plan", nextPlan);
    window.history.replaceState(null, "", url.toString());
  }

  async function startCheckout() {
    setStatus("starting");
    setError(null);
    setCheckoutVisible(true);
    cleanUrl();
    try {
      if (!window.Paddle) throw new Error("Paddle script has not loaded yet. Refresh and try again.");
      if (!paddleReady) initializePaddle();
      const checkout = await initializeSubscriptionCheckout(selectedPlan);
      const settings = { displayMode: "inline", variant: "one-page", theme: "light", frameTarget: PADDLE_FRAME_TARGET, frameInitialHeight: "520", frameStyle: "width: 100%; min-width: 312px; background-color: transparent; border: none;" };
      if (checkout.price_id) {
        window.Paddle.Checkout.open({ items: [{ priceId: checkout.price_id, quantity: 1 }], customData: checkout.custom_data, settings });
      } else if (checkout.reference) {
        window.Paddle.Checkout.open({ transactionId: checkout.reference, settings });
      } else {
        throw new Error("Checkout configuration was not returned.");
      }
      setStatus("checkout");
    } catch (err) {
      closeCheckout(err instanceof Error ? err.message : "Could not start checkout.");
    }
  }

  return (
    <>
      <Script src="https://cdn.paddle.com/paddle/v2/paddle.js" strategy="afterInteractive" onLoad={initializePaddle} onError={() => closeCheckout("Could not load Paddle checkout script.")} />
      <AuthShell eyebrow="Secure subscription" title="Pay without leaving NexStock." description="Review your subscription, switch plans if needed, then complete payment securely inside NexStock." icon={ShieldCheck} highlights={["Inline Paddle checkout", "USD subscription pricing", "Organization setup after payment"]} actionHref="/#pricing" actionLabel="Change plan">
        <AuthCard icon={CreditCard} eyebrow="Subscription checkout" title="Review your plan" description="Choose the subscription that fits your product operations, then complete payment in the embedded checkout." footer={<Link href="/#pricing" className="font-medium text-foreground hover:underline">Compare all plans</Link>}>
          {!checkoutVisible && (
            <div className="grid gap-3 border-t p-5 sm:grid-cols-2">{(["starter", "growth"] as PaidPlan[]).map((option) => <button key={option} type="button" onClick={() => changePlan(option)} disabled={status === "starting" || status === "verifying"} className={`rounded-2xl border p-4 text-left transition ${selectedPlan === option ? "border-primary bg-primary/5 ring-2 ring-primary" : "bg-background hover:bg-muted/50"}`}><div className="flex items-center justify-between gap-3"><p className="font-semibold">{plans[option].name}</p>{selectedPlan === option && <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">Selected</span>}</div><p className="mt-2 text-2xl font-black tracking-[-0.04em]">{plans[option].price.split("/")[0]}<span className="text-sm font-normal text-muted-foreground">/month</span></p><p className="mt-2 text-xs leading-5 text-muted-foreground">{plans[option].description}</p></button>)}</div>
          )}
          <div className="border-t p-5"><div className="rounded-2xl border bg-background p-5"><p className="text-sm font-semibold text-muted-foreground">Selected plan</p><div className="mt-2 flex items-end gap-2"><span className="text-4xl font-black tracking-[-0.06em]">{plan.price.split("/")[0]}</span><span className="pb-1 text-sm text-muted-foreground">/month</span></div><p className="mt-3 text-sm text-muted-foreground">{plan.description}</p><div className="mt-5 grid gap-3">{plan.features.map((feature) => <div key={feature} className="flex items-center gap-3 text-sm"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><span>{feature}</span></div>)}</div></div></div>
          {checkoutVisible && <div className="border-t bg-muted/15 p-5"><div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-sm font-semibold">Secure checkout</p><p className="text-xs text-muted-foreground">Complete checkout below.</p></div><Button type="button" variant="ghost" size="sm" onClick={() => closeCheckout()} className="rounded-xl">Cancel</Button></div>{status === "starting" && <div className="mb-3 border bg-background px-4 py-3 text-sm text-muted-foreground"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Preparing secure checkout...</div>}<div className={`${PADDLE_FRAME_TARGET} min-h-[520px] overflow-hidden rounded-2xl border bg-background`} /></div>}
          {status === "success" && <div className="border-t border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">Payment verified. Redirecting...</div>}
          {error && <div className="border-t border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">{error}</div>}
          <div className="border-t p-5">{!checkoutVisible && status !== "verifying" && status !== "success" ? <div className="space-y-3"><Button onClick={startCheckout} className="w-full rounded-xl py-6 font-semibold" disabled={status === "starting"}>{status === "starting" ? <><Loader2 className="h-4 w-4 animate-spin" /> Starting...</> : status === "failed" ? <><RefreshCcw className="h-4 w-4" /> Try again</> : <>Continue to secure checkout <ArrowRight className="h-4 w-4" /></>}</Button>{(status === "failed" || error) && <Button type="button" variant="outline" onClick={() => closeCheckout()} className="w-full rounded-xl py-6 font-semibold"><RefreshCcw className="h-4 w-4" />Reset</Button>}</div> : <Button className="w-full rounded-xl py-6 font-semibold" disabled>{status === "verifying" ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : status === "success" ? "Verified" : "Checkout is open above"}</Button>}{!paddleReady && status === "idle" && <p className="mt-3 text-center text-xs text-muted-foreground">Loading secure checkout tools...</p>}</div>
        </AuthCard>
      </AuthShell>
    </>
  );
}
