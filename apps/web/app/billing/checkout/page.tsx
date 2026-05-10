"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, CreditCard, Loader2, ShieldCheck } from "lucide-react";

import { NexstockLogo } from "@/components/brand/nexstock-logo";
import { Button } from "@/components/ui/button";
import { initializeSubscriptionCheckout, verifySubscriptionPayment } from "@/lib/api";

type PaidPlan = "pro" | "business";

const plans: Record<PaidPlan, { name: string; price: string; description: string; features: string[] }> = {
  pro: {
    name: "Pro",
    price: "R299/month",
    description: "Product imports, reusable mapping, inventory movement history, and API keys for connected workflows.",
    features: ["CSV and XLSX product imports", "Reusable product-field mapping", "Inventory movement history", "API keys for connected tools"],
  },
  business: {
    name: "Business",
    price: "R999/month",
    description: "Advanced imports, integration-ready workflows, webhooks, team controls, and priority setup support.",
    features: ["Advanced imports and integration workflows", "Webhooks for product and stock events", "Team workspace and admin controls", "Priority setup support"],
  },
};

function getPaidPlan(value: string | null): PaidPlan {
  return value === "business" ? "business" : "pro";
}

export default function BillingCheckoutPage() {
  return (
    <Suspense fallback={<CheckoutShell />}>
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPlan = useMemo(() => getPaidPlan(searchParams.get("plan")), [searchParams]);
  const reference = searchParams.get("reference") || searchParams.get("trxref");
  const plan = plans[selectedPlan];
  const [status, setStatus] = useState<"idle" | "starting" | "verifying" | "success" | "failed">(reference ? "verifying" : "idle");
  const [error, setError] = useState<string | null>(null);

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
          window.setTimeout(() => router.push("/dashboard"), 1200);
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

    return () => {
      cancelled = true;
    };
  }, [reference, router]);

  async function startCheckout() {
    setStatus("starting");
    setError(null);
    try {
      const checkout = await initializeSubscriptionCheckout(selectedPlan);
      if (!checkout.authorization_url) throw new Error("Checkout link was not returned");
      window.location.href = checkout.authorization_url;
    } catch (err) {
      setStatus("failed");
      setError(err instanceof Error ? err.message : "Could not start checkout");
    }
  }

  return (
    <CheckoutLayout>
      <section className="border bg-card/95 shadow-sm">
        <div className="p-6 text-center lg:text-left">
          <div className="mx-auto flex h-11 w-11 items-center justify-center bg-primary/10 text-primary lg:mx-0">
            <CreditCard className="h-5 w-5" />
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Subscription checkout</p>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.05em]">Activate {plan.name}</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{plan.description}</p>
        </div>

        <div className="border-t p-5">
          <div className="rounded-2xl border bg-background p-5">
            <p className="text-sm font-semibold text-muted-foreground">Selected plan</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-4xl font-black tracking-[-0.06em]">{plan.price.split("/")[0]}</span>
              <span className="pb-1 text-sm text-muted-foreground">/month</span>
            </div>
            <div className="mt-5 grid gap-3">
              {plan.features.map((feature) => <Feature key={feature} label={feature} />)}
            </div>
          </div>
        </div>

        {status === "success" && <div className="border-t border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">Payment verified. Redirecting to dashboard...</div>}
        {error && <div className="border-t border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">{error}</div>}

        <div className="border-t p-5">
          {!reference ? (
            <Button onClick={startCheckout} className="w-full rounded-xl py-6 font-semibold" disabled={status === "starting"}>
              {status === "starting" ? <><Loader2 className="h-4 w-4 animate-spin" /> Starting checkout...</> : <>Continue to Paystack <ArrowRight className="h-4 w-4" /></>}
            </Button>
          ) : (
            <Button className="w-full rounded-xl py-6 font-semibold" disabled>
              {status === "verifying" ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying payment...</> : status === "success" ? "Payment verified" : "Verification failed"}
            </Button>
          )}
          <Link href="/dashboard" className="mt-4 block text-center text-sm font-medium text-muted-foreground hover:text-foreground hover:underline">Skip for now and open dashboard</Link>
        </div>
      </section>
    </CheckoutLayout>
  );
}

function CheckoutShell() {
  return (
    <CheckoutLayout>
      <section className="border bg-card/95 p-10 text-center text-sm text-muted-foreground shadow-sm">
        <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
        Loading checkout...
      </section>
    </CheckoutLayout>
  );
}

function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" aria-label="NexStock home">
            <NexstockLogo tagline={false} className="px-2 py-1" />
          </Link>
          <Link href="/dashboard" className="rounded-xl border bg-background/70 px-4 py-2 text-sm font-semibold transition hover:bg-muted">Dashboard</Link>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_28rem]">
        <div className="hidden lg:block">
          <p className="inline-flex items-center gap-2 border bg-card/95 px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Secure subscription
          </p>
          <h2 className="mt-6 max-w-2xl text-5xl font-black tracking-[-0.06em] xl:text-6xl">Upgrade your product operations workspace.</h2>
          <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground">Paid plans unlock more operational capacity for imports, integrations, API access, webhooks, and team workflows.</p>
        </div>

        <div className="mx-auto w-full max-w-md lg:mx-0">
          {children}
        </div>
      </section>
    </main>
  );
}

function Feature({ label }: { label: string }) {
  return <div className="flex items-center gap-3 text-sm"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><span>{label}</span></div>;
}
