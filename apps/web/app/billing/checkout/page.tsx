"use client";

import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, CreditCard, Loader2, ShieldCheck } from "lucide-react";

import { AuthCard, AuthShell } from "@/components/marketing/auth-shell";
import { Button } from "@/components/ui/button";
import { initializeSubscriptionCheckout, verifySubscriptionPayment, type SubscriptionPlan } from "@/lib/api";

type PaidPlan = SubscriptionPlan;
type PaddleEvent = { name?: string; data?: { transaction_id?: string; status?: string } };

declare global {
  interface Window {
    Paddle?: {
      Environment?: { set: (environment: string) => void };
      Initialize: (options: Record<string, unknown>) => void;
      Update?: (options: Record<string, unknown>) => void;
      Checkout: {
        open: (options: Record<string, unknown>) => void;
        close?: () => void;
      };
    };
    __nexstockPaddleInitialized?: boolean;
  }
}

const PLAN_STORAGE_KEY = "nexstock:selected-plan";
const PADDLE_REFERENCE_KEY = "nexstock:paddle-reference";
const PADDLE_FRAME_TARGET = "nexstock-paddle-checkout";

const paddleClientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
const paddleEnvironment = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || "sandbox";

const plans: Record<PaidPlan, { name: string; price: string; description: string; features: string[] }> = {
  starter: {
    name: "Starter",
    price: "$19/month",
    description: "Product imports, reusable mapping, inventory movement history, and API keys for connected workflows.",
    features: ["CSV and XLSX product imports", "Reusable product-field mapping", "Inventory movement history", "API keys for connected tools"],
  },
  growth: {
    name: "Growth",
    price: "$59/month",
    description: "Advanced imports, integration-ready workflows, webhooks, team controls, and priority setup support.",
    features: ["Advanced imports and integration workflows", "Webhooks for product and stock events", "Team workspace and admin controls", "Priority setup support"],
  },
};

function getPaidPlan(value: string | null): PaidPlan {
  if (value === "growth" || value === "business") return "growth";
  return "starter";
}

function getReferenceFromSearch(params: URLSearchParams) {
  return (
    params.get("transaction_id") ||
    params.get("_ptxn") ||
    params.get("reference") ||
    params.get("trxref") ||
    window.localStorage.getItem(PADDLE_REFERENCE_KEY)
  );
}

export default function BillingCheckoutPage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<PaidPlan>("starter");
  const [reference, setReference] = useState<string | null>(null);
  const [paddleReady, setPaddleReady] = useState(false);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const checkoutStartedRef = useRef(false);
  const plan = plans[selectedPlan];
  const [status, setStatus] = useState<"idle" | "starting" | "checkout" | "verifying" | "success" | "failed">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextPlan = getPaidPlan(params.get("plan") || window.localStorage.getItem(PLAN_STORAGE_KEY));
    const nextReference = getReferenceFromSearch(params);
    setSelectedPlan(nextPlan);
    setReference(nextReference);
    window.localStorage.setItem(PLAN_STORAGE_KEY, nextPlan);
    if (nextReference) setStatus("verifying");
  }, []);

  useEffect(() => {
    if (!reference || status === "checkout") return;
    let cancelled = false;

    async function verify() {
      setStatus("verifying");
      setError(null);
      try {
        const result = await verifySubscriptionPayment(reference as string);
        if (cancelled) return;
        if (result.success) {
          setStatus("success");
          window.localStorage.removeItem(PLAN_STORAGE_KEY);
          window.localStorage.removeItem(PADDLE_REFERENCE_KEY);
          window.setTimeout(() => router.push("/organization/edit?setup=1"), 1200);
          return;
        }
        setStatus("failed");
        setError(result.status ? `Payment is currently ${result.status}. If you completed payment, wait a few seconds and refresh.` : "Payment could not be verified. Please try again or contact support.");
      } catch (err) {
        if (cancelled) return;
        setStatus("failed");
        setError(err instanceof Error ? err.message : "Could not verify payment");
      }
    }

    verify();
    return () => { cancelled = true; };
  }, [reference, router, status]);

  function handlePaddleEvent(event: PaddleEvent) {
    if (event.name === "checkout.loaded") setStatus("checkout");
    if (event.name === "checkout.payment.initiated") setStatus("checkout");
    if (event.name === "checkout.payment.failed" || event.name === "checkout.error" || event.name === "checkout.payment.error") {
      setStatus("failed");
      setError("Payment could not be completed. Please check your payment method and try again.");
    }
    if (event.name === "checkout.completed") {
      const transactionId = event.data?.transaction_id || reference;
      if (transactionId) {
        window.localStorage.setItem(PADDLE_REFERENCE_KEY, transactionId);
        setReference(transactionId);
      }
      setStatus("verifying");
      setCheckoutVisible(false);
    }
  }

  function initializePaddle() {
    if (!window.Paddle || !paddleClientToken) return;

    if (paddleEnvironment === "sandbox") {
      window.Paddle.Environment?.set("sandbox");
    }

    const options = {
      token: paddleClientToken,
      eventCallback: handlePaddleEvent,
      checkout: {
        settings: {
          displayMode: "inline",
          variant: "one-page",
          theme: "light",
          frameTarget: PADDLE_FRAME_TARGET,
          frameInitialHeight: "520",
          frameStyle: "width: 100%; min-width: 312px; background-color: transparent; border: none;",
        },
      },
    };

    if (window.__nexstockPaddleInitialized && window.Paddle.Update) {
      window.Paddle.Update({ eventCallback: handlePaddleEvent });
    } else if (!window.__nexstockPaddleInitialized) {
      window.Paddle.Initialize(options);
      window.__nexstockPaddleInitialized = true;
    }

    setPaddleReady(true);
  }

  function changePlan(nextPlan: PaidPlan) {
    if (status === "starting" || status === "checkout" || reference) return;
    setSelectedPlan(nextPlan);
    window.localStorage.setItem(PLAN_STORAGE_KEY, nextPlan);
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("plan", nextPlan);
    nextUrl.searchParams.delete("autostart");
    window.history.replaceState(null, "", nextUrl.toString());
  }

  async function startCheckout() {
    setStatus("starting");
    setError(null);
    setCheckoutVisible(true);

    if (!paddleClientToken) {
      setStatus("failed");
      setError("Paddle checkout is not configured. Add NEXT_PUBLIC_PADDLE_CLIENT_TOKEN to the web environment.");
      return;
    }

    try {
      if (!window.Paddle) throw new Error("Paddle checkout script is still loading. Try again in a moment.");
      if (!paddleReady) initializePaddle();

      const checkout = await initializeSubscriptionCheckout(selectedPlan);
      if (!checkout.reference) throw new Error("Paddle transaction was not returned");
      window.localStorage.setItem(PADDLE_REFERENCE_KEY, checkout.reference);
      setReference(checkout.reference);
      checkoutStartedRef.current = true;

      window.Paddle.Checkout.open({
        transactionId: checkout.reference,
        settings: {
          displayMode: "inline",
          variant: "one-page",
          theme: "light",
          frameTarget: PADDLE_FRAME_TARGET,
          frameInitialHeight: "520",
          frameStyle: "width: 100%; min-width: 312px; background-color: transparent; border: none;",
        },
      });

      setStatus("checkout");
    } catch (err) {
      setStatus("failed");
      setCheckoutVisible(false);
      setError(err instanceof Error ? err.message : "Could not start checkout");
    }
  }

  function resetCheckout() {
    try {
      window.Paddle?.Checkout.close?.();
    } catch {}
    checkoutStartedRef.current = false;
    setReference(null);
    setCheckoutVisible(false);
    setStatus("idle");
    setError(null);
    window.localStorage.removeItem(PADDLE_REFERENCE_KEY);
  }

  return (
    <>
      <Script src="https://cdn.paddle.com/paddle/v2/paddle.js" strategy="afterInteractive" onLoad={initializePaddle} />
      <AuthShell
        eyebrow="Secure subscription"
        title="Pay without leaving NexStock."
        description="Review your subscription, switch plans if needed, then complete payment securely inside the NexStock checkout page."
        icon={ShieldCheck}
        highlights={["Inline Paddle checkout", "USD subscription pricing", "Organization setup after successful payment"]}
        actionHref="/#pricing"
        actionLabel="Change plan"
      >
        <AuthCard
          icon={CreditCard}
          eyebrow="Subscription checkout"
          title="Review your plan"
          description="Choose the subscription that fits your product operations, then complete payment in the embedded checkout."
          footer={<Link href="/#pricing" className="font-medium text-foreground hover:underline">Compare all plans</Link>}
        >
          {!reference && !checkoutVisible && (
            <div className="grid gap-3 border-t p-5 sm:grid-cols-2">
              {(["starter", "growth"] as PaidPlan[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => changePlan(option)}
                  disabled={status === "starting"}
                  className={`rounded-2xl border p-4 text-left transition ${selectedPlan === option ? "border-primary bg-primary/5 ring-2 ring-primary" : "bg-background hover:bg-muted/50"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{plans[option].name}</p>
                    {selectedPlan === option && <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">Selected</span>}
                  </div>
                  <p className="mt-2 text-2xl font-black tracking-[-0.04em]">{plans[option].price.split("/")[0]}<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{plans[option].description}</p>
                </button>
              ))}
            </div>
          )}

          <div className="border-t p-5">
            <div className="rounded-2xl border bg-background p-5">
              <p className="text-sm font-semibold text-muted-foreground">Selected plan</p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-4xl font-black tracking-[-0.06em]">{plan.price.split("/")[0]}</span>
                <span className="pb-1 text-sm text-muted-foreground">/month</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{plan.description}</p>
              <div className="mt-5 grid gap-3">
                {plan.features.map((feature) => <Feature key={feature} label={feature} />)}
              </div>
            </div>
          </div>

          {checkoutVisible && (
            <div className="border-t bg-muted/15 p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Secure payment</p>
                  <p className="text-xs text-muted-foreground">Powered by Paddle. Complete payment below without leaving NexStock.</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={resetCheckout} className="rounded-xl">Cancel</Button>
              </div>
              {status === "starting" && <div className="mb-3 border bg-background px-4 py-3 text-sm text-muted-foreground"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Preparing secure checkout...</div>}
              <div className={`${PADDLE_FRAME_TARGET} min-h-[520px] overflow-hidden rounded-2xl border bg-background`} />
            </div>
          )}

          {status === "success" && <div className="border-t border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">Payment verified. Redirecting to organization setup...</div>}
          {error && <div className="border-t border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">{error}</div>}

          <div className="border-t p-5">
            {!checkoutVisible && status !== "verifying" && status !== "success" ? (
              <Button onClick={startCheckout} className="w-full rounded-xl py-6 font-semibold" disabled={status === "starting" || !paddleReady}>
                {status === "starting" ? <><Loader2 className="h-4 w-4 animate-spin" /> Starting checkout...</> : <>Continue to secure payment <ArrowRight className="h-4 w-4" /></>}
              </Button>
            ) : (
              <Button className="w-full rounded-xl py-6 font-semibold" disabled>
                {status === "verifying" ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying payment...</> : status === "success" ? "Payment verified" : "Checkout is open above"}
              </Button>
            )}
            {!paddleReady && <p className="mt-3 text-center text-xs text-muted-foreground">Loading secure payment tools...</p>}
          </div>
        </AuthCard>
      </AuthShell>
    </>
  );
}

function Feature({ label }: { label: string }) {
  return <div className="flex items-center gap-3 text-sm"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><span>{label}</span></div>;
}
