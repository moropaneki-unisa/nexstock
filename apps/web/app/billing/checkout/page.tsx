"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, CreditCard, Loader2, ShieldCheck } from "lucide-react";

import { AuthCard, AuthShell } from "@/components/marketing/auth-shell";
import { Button } from "@/components/ui/button";
import { initializeSubscriptionCheckout, verifySubscriptionPayment } from "@/lib/api";

type PaidPlan = "starter" | "growth";

const PLAN_STORAGE_KEY = "nexstock:selected-plan";

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

export default function BillingCheckoutPage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<PaidPlan>("starter");
  const [reference, setReference] = useState<string | null>(null);
  const plan = plans[selectedPlan];
  const [status, setStatus] = useState<"idle" | "starting" | "verifying" | "success" | "failed">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextPlan = getPaidPlan(params.get("plan") || window.localStorage.getItem(PLAN_STORAGE_KEY));
    const nextReference = params.get("reference") || params.get("trxref");
    setSelectedPlan(nextPlan);
    setReference(nextReference);
    window.localStorage.setItem(PLAN_STORAGE_KEY, nextPlan);
    if (nextReference) setStatus("verifying");
  }, []);

  useEffect(() => {
    if (!reference) return;
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
          window.setTimeout(() => router.push("/organization/edit?setup=1"), 1200);
          return;
        }
        setStatus("failed");
        setError("Payment could not be verified. Please try again or contact support.");
      } catch (err) {
        if (cancelled) return;
        setStatus("failed");
        setError(err instanceof Error ? err.message : "Could not verify payment");
      }
    }

    verify();
    return () => { cancelled = true; };
  }, [reference, router]);

  function changePlan(nextPlan: PaidPlan) {
    if (status === "starting" || reference) return;
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
    try {
      const checkout = await initializeSubscriptionCheckout(selectedPlan as never);
      if (!checkout.authorization_url) throw new Error("Checkout link was not returned");
      window.location.href = checkout.authorization_url;
    } catch (err) {
      setStatus("failed");
      setError(err instanceof Error ? err.message : "Could not start checkout");
    }
  }

  return (
    <AuthShell
      eyebrow="Secure subscription"
      title="Choose before you pay."
      description="Review your subscription, switch plans if needed, then continue to Paystack only when you are ready."
      icon={ShieldCheck}
      highlights={["USD subscription pricing", "Change plan before payment", "Organization setup after successful payment"]}
      actionHref="/#pricing"
      actionLabel="Change plan"
    >
      <AuthCard
        icon={CreditCard}
        eyebrow="Subscription checkout"
        title="Review your plan"
        description="Choose the subscription that fits your product operations, then continue to Paystack when you are ready."
        footer={<Link href="/#pricing" className="font-medium text-foreground hover:underline">Compare all plans</Link>}
      >
        {!reference && (
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

        {status === "success" && <div className="border-t border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">Payment verified. Redirecting to organization setup...</div>}
        {error && <div className="border-t border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">{error}</div>}

        <div className="border-t p-5">
          {!reference ? (
            <Button onClick={startCheckout} className="w-full rounded-xl py-6 font-semibold" disabled={status === "starting"}>
              {status === "starting" ? <><Loader2 className="h-4 w-4 animate-spin" /> Starting checkout...</> : <>Pay {plan.price} with Paystack <ArrowRight className="h-4 w-4" /></>}
            </Button>
          ) : (
            <Button className="w-full rounded-xl py-6 font-semibold" disabled>
              {status === "verifying" ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying payment...</> : status === "success" ? "Payment verified" : "Verification failed"}
            </Button>
          )}
        </div>
      </AuthCard>
    </AuthShell>
  );
}

function Feature({ label }: { label: string }) {
  return <div className="flex items-center gap-3 text-sm"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><span>{label}</span></div>;
}
