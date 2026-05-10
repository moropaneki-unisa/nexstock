"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { BarChart3, Boxes, CheckCircle2, DatabaseZap, Loader2, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signup } from "@/lib/api";
import { NexstockLogo } from "@/components/brand/nexstock-logo";

type SignupValues = { email: string; password: string; name: string; orgName: string };
type SelectedPlan = "free" | "pro" | "business";

const planLabels: Record<SelectedPlan, { name: string; price: string; helper: string }> = {
  free: { name: "Free", price: "R0", helper: "Explore the workspace before upgrading." },
  pro: { name: "Pro", price: "R299/month", helper: "Product imports, mapping, and stock visibility." },
  business: { name: "Business", price: "R999/month", helper: "Integrations, webhooks, and team operations." },
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Signup failed.";
}

function getSelectedPlan(plan: string | null): SelectedPlan {
  if (plan === "pro" || plan === "business") return plan;
  return "free";
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupShell />}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPlan = useMemo(() => getSelectedPlan(searchParams.get("plan")), [searchParams]);
  const plan = planLabels[selectedPlan];
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<SignupValues>();

  async function onSubmit(values: SignupValues) {
    setError(null);
    try {
      const res: any = await signup(values);
      const planQuery = selectedPlan === "free" ? "" : `&plan=${selectedPlan}`;
      if (res?.requiresVerification) {
        router.push(`/verify-email?email=${encodeURIComponent(values.email)}${planQuery}`);
        return;
      }
      if (selectedPlan !== "free") {
        router.push(`/billing/checkout?plan=${selectedPlan}`);
        return;
      }
      router.push("/dashboard");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <SignupLayout selectedPlan={selectedPlan} plan={plan}>
      <section className="border bg-card/95 shadow-sm">
        <div className="p-6 text-center lg:text-left">
          <div className="mx-auto flex h-11 w-11 items-center justify-center bg-primary/10 text-primary lg:mx-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Start your workspace</p>
          <h2 className="mt-2 text-4xl font-black tracking-[-0.05em]">Create NexStock account</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Set up your product operations workspace and connect your inventory stack.</p>
        </div>

        <div className="border-t bg-muted/20 px-5 py-4">
          <div className="flex items-center justify-between gap-4 rounded-xl border bg-background px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Selected plan</p>
              <p className="mt-1 text-sm font-semibold">{plan.name} · {plan.price}</p>
            </div>
            <Link href="/#pricing" className="text-sm font-medium text-primary hover:underline">Change</Link>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-0 border-t">
          {error && <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
          <Field label="Full name">
            <Input placeholder="Your name" {...register("name", { required: true })} className="rounded-xl" />
          </Field>
          <Field label="Organization">
            <Input placeholder="Company name" {...register("orgName", { required: true })} className="rounded-xl" />
          </Field>
          <Field label="Email">
            <Input placeholder="you@company.com" {...register("email", { required: true })} className="rounded-xl" />
          </Field>
          <Field label="Password">
            <Input type="password" placeholder="Create a secure password" {...register("password", { required: true })} className="rounded-xl" />
          </Field>
          <div className="border-t p-4">
            <Button className="w-full rounded-xl py-6 font-semibold" disabled={isSubmitting}>{isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : selectedPlan === "free" ? "Create account" : "Create account and continue"}</Button>
          </div>
        </form>

        <div className="border-t bg-muted/20 px-5 py-4 text-center text-sm text-muted-foreground">
          Already have an account? <Link href="/login" className="font-medium text-foreground hover:underline">Sign in</Link>
        </div>
      </section>
    </SignupLayout>
  );
}

function SignupShell() {
  return (
    <SignupLayout selectedPlan="free" plan={planLabels.free}>
      <section className="border bg-card/95 p-10 text-center text-sm text-muted-foreground shadow-sm">
        <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
        Loading signup...
      </section>
    </SignupLayout>
  );
}

function SignupLayout({ children, selectedPlan, plan }: { children: React.ReactNode; selectedPlan: SelectedPlan; plan: { name: string; price: string; helper: string } }) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" aria-label="NexStock home">
            <NexstockLogo tagline={false} className="px-2 py-1" />
          </Link>
          <Link href="/login" className="rounded-xl border bg-background/70 px-4 py-2 text-sm font-semibold transition hover:bg-muted">Sign in</Link>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_28rem]">
        <div className="hidden lg:block">
          <p className="inline-flex items-center gap-2 border bg-card/95 px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Production workspace setup
          </p>
          <h1 className="mt-6 max-w-2xl text-5xl font-black tracking-[-0.06em] xl:text-6xl">Set up product operations your team can trust.</h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground">Create your workspace, invite your team, structure your catalog, and connect product sources using one clean operational layer.</p>

          <section className="mt-8 border bg-card/95">
            <div className="grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <MiniMetric icon={Boxes} label="Catalog" value="Unified" />
              <MiniMetric icon={DatabaseZap} label="Fields" value="Custom" />
              <MiniMetric icon={BarChart3} label="Launch" value="Ready" />
            </div>
            <div className="divide-y border-t">
              <Readiness label="Product fields and schema controls" />
              <Readiness label="Inventory and image workflows" />
              <Readiness label="API, webhook, and integration access" />
            </div>
            <div className="flex items-center justify-between border-t bg-muted/25 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center bg-primary/10 text-primary"><Workflow className="h-4 w-4" /></span>
                <div>
                  <p className="text-sm font-medium">Selected plan: {plan.name}</p>
                  <p className="text-xs text-muted-foreground">{plan.price} · {plan.helper}</p>
                </div>
              </div>
              {selectedPlan !== "free" && <span className="border bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Checkout next</span>}
            </div>
          </section>
        </div>

        <div className="mx-auto w-full max-w-md lg:mx-0">
          {children}
        </div>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="border-b p-4"><Label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</Label><div className="mt-3">{children}</div></div>;
}

function MiniMetric({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return <div className="p-4"><Icon className="h-4 w-4 text-primary" /><p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold text-foreground">{value}</p></div>;
}

function Readiness({ label }: { label: string }) {
  return <div className="flex items-center justify-between px-4 py-3 text-sm"><span className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />{label}</span><span className="text-xs text-muted-foreground">Ready</span></div>;
}
