"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { BarChart3, Boxes, DatabaseZap, Loader2, ShieldCheck, Sparkles, Workflow } from "lucide-react";

import { AuthBanner, AuthCard, AuthField, AuthInfoLine, AuthShell } from "@/components/marketing/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signup } from "@/lib/api";

type SignupValues = { email: string; password: string; name: string; orgName: string };
type SelectedPlan = "free" | "starter" | "growth";

const PLAN_STORAGE_KEY = "nexstock:selected-plan";

const planLabels: Record<SelectedPlan, { name: string; price: string; helper: string }> = {
  free: { name: "Free", price: "$0/month", helper: "Explore the workspace before upgrading." },
  starter: { name: "Starter", price: "$19/month", helper: "Product imports, mapping, and stock visibility." },
  growth: { name: "Growth", price: "$59/month", helper: "Integrations, webhooks, and team operations." },
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Signup failed.";
}

function normalizePlan(plan: string | null): SelectedPlan {
  if (plan === "starter" || plan === "pro") return "starter";
  if (plan === "growth" || plan === "business") return "growth";
  return "free";
}

function saveSelectedPlan(plan: SelectedPlan) {
  window.localStorage.setItem(PLAN_STORAGE_KEY, plan);
}

export default function SignupPage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan>("free");
  const plan = planLabels[selectedPlan];
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<SignupValues>();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextPlan = normalizePlan(params.get("plan") || window.localStorage.getItem(PLAN_STORAGE_KEY));
    setSelectedPlan(nextPlan);
    saveSelectedPlan(nextPlan);
  }, []);

  async function onSubmit(values: SignupValues) {
    setError(null);
    try {
      saveSelectedPlan(selectedPlan);
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
    <AuthShell
      eyebrow="Production workspace setup"
      title="Set up product operations your team can trust."
      description="Create your workspace, invite your team, structure your catalog, and connect product sources using one clean operational layer."
      icon={ShieldCheck}
      highlights={["Product fields and schema controls", "Inventory and image workflows", "API, webhook, and integration access"]}
      actionHref="/login"
      actionLabel="Sign in"
      asideFooter={
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary/10 text-primary"><Workflow className="h-4 w-4" /></span>
            <div className="min-w-0"><p className="text-sm font-medium">Selected plan: {plan.name}</p><p className="truncate text-xs text-muted-foreground">{plan.price} · {plan.helper}</p></div>
          </div>
          {selectedPlan !== "free" && <span className="shrink-0 border bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Checkout next</span>}
        </div>
      }
    >
      <AuthCard
        icon={Sparkles}
        eyebrow="Start your workspace"
        title="Create NexStock account"
        description="Set up your product operations workspace and connect your inventory stack."
        footer={<>Already have an account? <Link href="/login" className="font-medium text-foreground hover:underline">Sign in</Link></>}
      >
        <div className="border-t bg-muted/20 px-5 py-4">
          <div className="flex items-center justify-between gap-4 rounded-xl border bg-background px-4 py-3">
            <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Selected plan</p><p className="mt-1 text-sm font-semibold">{plan.name} · {plan.price}</p></div>
            <Link href="/#pricing" className="text-sm font-medium text-primary hover:underline">Change</Link>
          </div>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-0 border-t">
          {error && <AuthBanner variant="error">{error}</AuthBanner>}
          <AuthField label="Full name"><Input placeholder="Your name" {...register("name", { required: true })} className="rounded-xl" /></AuthField>
          <AuthField label="Organization"><Input placeholder="Company name" {...register("orgName", { required: true })} className="rounded-xl" /></AuthField>
          <AuthField label="Email"><Input placeholder="you@company.com" {...register("email", { required: true })} className="rounded-xl" /></AuthField>
          <AuthField label="Password"><Input type="password" placeholder="Create a secure password" {...register("password", { required: true })} className="rounded-xl" /></AuthField>
          <div className="border-t p-4">
            <Button className="w-full rounded-xl py-6 font-semibold" disabled={isSubmitting}>{isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : selectedPlan === "free" ? "Create account" : "Create account and continue"}</Button>
          </div>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
