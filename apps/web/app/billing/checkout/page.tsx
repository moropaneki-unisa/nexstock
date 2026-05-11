"use client";

import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, CreditCard, Loader2, RefreshCcw, ShieldCheck } from "lucide-react";

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
  return params.get("transaction_id") || params.get("_ptxn") || params.get("reference") || params.get("trxref");
}

function hasCompletedPaymentSignal(params: URLSearchParams) {
  const checkoutStatus = `${params.get("status") || params.get("checkout_status") || params.get("payment_status") || params.get("result") || params.get("paddle_status") || ""}`.toLowerCase();
  const successFlag = `${params.get("success") || params.get("completed") || ""}`.toLowerCase();
  return ["paid", "completed", "complete", "success", "succeeded"].includes(checkoutStatus) || successFlag === "true" || successFlag === "1";
}

export default function BillingCheckoutPage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<PaidPlan>("starter");
  const [reference, setReference] = useState<string | null>(null);
  const [shouldVerify, setShouldVerify] = useState(false);
  const [paddleReady, setPaddleReady] = useState(false);
  const [paddleLoadFailed, setPaddleLoadFailed] = useState(false);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const checkoutStartedRef = useRef(false);
  const plan = plans[selectedPlan];
  const [status, setStatus] = useState<"idle" | "starting" | "checkout" | "verifying" | "success" | "failed">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextPlan = getPaidPlan(params.get("plan") || window.localStorage.getItem(PLAN_STORAGE_KEY));
    const nextReference = getReferenceFromSearch(params);
    const completedSignal = hasCompletedPaymentSignal(params);

    setSelectedPlan(nextPlan);
    window.localStorage.setItem(PLAN_STORAGE_KEY, nextPlan);

    if (nextReference && completedSignal) {
      setReference(nextReference);
      setShouldVerify(true);
      setStatus("verifying");
      return;
    }

    if (nextReference && !completedSignal) {
      window.localStorage.setItem(PADDLE_REFERENCE_KEY, nextReference);
      setReference(null);
      setShouldVerify(false);
      setStatus("idle");
      setError("Checkout was opened but payment has not been completed yet. Click continue to reopen secure payment, or start a new checkout.");
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete("_ptxn");
      nextUrl.searchParams.delete("transaction_id");
      nextUrl.searchParams.delete("reference");
      nextUrl.searchParams.delete("trxref");
      window.history.replaceState(null, "", nextUrl.toString());
    }
  }, []);

  useEffect(() => {
    if (paddleReady || paddleLoadFailed || status !== "idle") return;
    const timeout = window.setTimeout(() => {
      if (!window.Paddle) {
        setPaddleLoadFailed(true);
        setError("Payment checkout tools did not load. Check NEXT_PUBLIC_PADDLE_CLIENT_TOKEN and make sure Paddle scripts are not blocked, then refresh.");
      }
    }, 9000);

    return () => window.clearTimeout(timeout);
  }, [paddleLoadFailed, paddleReady, status]);

  useEffect(() => {
    if (!reference || !shouldVerify || status === "checkout" || status === "starting") return;
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
        setShouldVerify(false);
        setStatus("failed");
        setError(result.status ? `Payment is currently ${result.status}. Complete the checkout first, then verification will run automatically.` : "Payment could not be verified yet. Complete checkout first or start a new checkout.");
      } catch (err) {
        if (cancelled) return;
        setShouldVerify(false);
        setStatus("failed");
        setError(err instanceof Error ? err.message : "Could not verify payment");
      }
    }

    verify();
    return () => { cancelled = true; };
  }, [reference, router, shouldVerify, status]);

  function handlePaddleEvent(event: PaddleEvent) {
    if (event.name === "checkout.loaded") setStatus("checkout");
    if (event.name === "checkout.payment.initiated") setStatus("checkout");
    if (event.name === "checkout.payment.failed" || event.name === "checkout.error" || event.name === "checkout.payment.error") {
      setShouldVerify(false);
      setStatus("failed");
      setError("Payment could not be completed. Please check your payment method and try again.");
    }
    if (event.name === "checkout.completed") {
      const transactionId = event.data?.transaction_id || reference || window.localStorage.getItem(PADDLE_REFERENCE_KEY);
      if (transactionId) {
        window.localStorage.setItem(PADDLE_REFERENCE_KEY, transactionId);
        setReference(transactionId);
        setShouldVerify(true);
      }
      setStatus("verifying");
      setCheckoutVisible(false);
    }
  }

  function initializePaddle() {
    if (!paddleClientToken) {
      setPaddleLoadFailed(true);
      setError("Paddle checkout is not configured. Add NEXT_PUBLIC_PADDLE_CLIENT_TOKEN to the web environment and redeploy the web app.");
      return;
    }

    if (!window.Paddle) return;

    try {
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
      setPaddleLoadFailed(false);
      if (error?.includes("Payment checkout tools did not load") || error?.includes("Paddle checkout is not configured")) {
        setError(null);
      }
    } catch (err) {
      setPaddleLoadFailed(true);
      setError(err instanceof Error ? err.message : "Could not initialize Paddle checkout");
    }
  }

  function changePlan(nextPlan: PaidPlan) {
    if (status === "starting" || status === "checkout") return;
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
    setShouldVerify(false);
    setCheckoutVisible(true);

    if (!paddleClientToken) {
      setStatus("failed");
      setCheckoutVisible(false);
      setError("Paddle checkout is not configured. Add NEXT_PUBLIC_PADDLE_CLIENT_TOKEN to the web environment and redeploy the web app.");
      return;
    }

    try {
      if (!window.Paddle) throw new Error("Paddle checkout script has not loaded. Refresh the page or check whether the browser/network is blocking cdn.paddle.com.");
      if (!paddleReady) initializePaddle();

      const checkout = await initializeSubscriptionCheckout(selectedPlan);
      if (!checkout.reference) throw new Error("Paddle transaction was not returned");
      setReference(null);
      window.localStorage.setItem(PADDLE_REFERENCE_KEY, checkout.reference);
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
    setShouldVerify(false);
    setCheckoutVisible(false);
    setStatus("idle");
    setError(null);
    window.localStorage.removeItem(PADDLE_REFERENCE_KEY);
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete("_ptxn");
    nextUrl.searchParams.delete("transaction_id");
    nextUrl.searchParams.delete("reference");
    nextUrl.searchParams.delete("trxref");
    window.history.replaceState(null, "", nextUrl.toString());
  }

  return (
    <>
      <Script src="https://cdn.paddle.com/paddle/v2/paddle.js" strategy="afterInteractive" onLoad={initializePaddle} onError={() => { setPaddleLoadFailed(true); setError("Could not load Paddle checkout script from cdn.paddle.com. Check network/ad-blockers or try again."); }} />
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
          {!checkoutVisible && (
            <div className="grid gap-3 border-t p-5 sm:grid-cols-2">
              {(["starter", "growth"] as PaidPlan[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => changePlan(option)}
                  disabled={status === "starting" || status === "verifying"}
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
              <div className="space-y-3">
                <Button onClick={startCheckout} className="w-full rounded-xl py-6 font-semibold" disabled={status === "starting"}>
                  {status === "starting" ? <><Loader2 className="h-4 w-4 animate-spin" /> Starting checkout...</> : <>Continue to secure payment <ArrowRight className="h-4 w-4" /></>}
                </Button>
                {(status === "failed" || error) && <Button type="button" variant="outline" onClick={resetCheckout} className="w-full rounded-xl py-6 font-semibold"><RefreshCcw className="h-4 w-4" />Start fresh checkout</Button>}
              </div>
            ) : (
              <Button className="w-full rounded-xl py-6 font-semibold" disabled>
                {status === "verifying" ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying payment...</> : status === "success" ? "Payment verified" : "Checkout is open above"}
              </Button>
            )}
            {!paddleReady && !paddleLoadFailed && <p className="mt-3 text-center text-xs text-muted-foreground">Loading secure payment tools...</p>}
          </div>
        </AuthCard>
      </AuthShell>
    </>
  );
}

function Feature({ label }: { label: string }) {
  return <div className="flex items-center gap-3 text-sm"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><span>{label}</span></div>;
}
