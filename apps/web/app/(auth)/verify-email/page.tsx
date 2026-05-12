"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, MailCheck, ShieldCheck } from "lucide-react";

import { AuthBanner, AuthCard, AuthField, AuthShell } from "@/components/marketing/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resendVerificationOtp, verifyEmail } from "@/lib/api";

type VerifyEmailValues = { email: string; otp: string };
type SelectedPlan = "free" | "starter" | "growth";

const PLAN_STORAGE_KEY = "nexstock:selected-plan";

const planLabels: Record<SelectedPlan, string> = {
  free: "Free",
  starter: "Starter",
  growth: "Growth",
};

function getSelectedPlan(value: string | null): SelectedPlan {
  if (value === "starter" || value === "pro") return "starter";
  if (value === "growth" || value === "business") return "growth";
  return "free";
}

function saveSelectedPlan(plan: SelectedPlan) {
  window.localStorage.setItem(PLAN_STORAGE_KEY, plan);
}

export default function VerifyEmailPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan>("free");
  const { register, handleSubmit, setValue, watch, formState: { isSubmitting } } = useForm<VerifyEmailValues>({ defaultValues: { email: "", otp: "" } });

  const email = watch("email");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextEmail = params.get("email") ?? "";
    const nextPlan = getSelectedPlan(params.get("plan") || window.localStorage.getItem(PLAN_STORAGE_KEY));
    if (nextEmail) setValue("email", nextEmail);
    setSelectedPlan(nextPlan);
    saveSelectedPlan(nextPlan);
  }, [setValue]);

  async function onSubmit(values: VerifyEmailValues) {
    setError(null);
    setNotice(null);
    if (!values.email.trim()) return setError("Email address is required.");
    if (!values.otp.trim()) return setError("Verification code is required.");

    try {
      saveSelectedPlan(selectedPlan);
      await verifyEmail({ email: values.email.trim(), otp: values.otp.trim() });
      setVerified(true);
      setNotice("Email verified. Choose your subscription to continue...");
      window.setTimeout(() => router.push(`/subscriptions?plan=${selectedPlan}`), 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    }
  }

  async function resendCode() {
    setError(null);
    setNotice(null);
    if (!email?.trim()) return setError("Enter your email address before requesting a new code.");
    setResending(true);
    try {
      await resendVerificationOtp(email.trim());
      setNotice("A new verification code has been sent if the account exists.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend code");
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Email verification"
      title="Secure your product workspace before launch."
      description="Verify your email address to activate your NexStock workspace, create your organization, and choose how you want to start."
      icon={ShieldCheck}
      highlights={["Confirm account ownership", `${planLabels[selectedPlan]} plan preserved`, "Choose Free, Starter, or Growth next"]}
      actionHref="/login"
      actionLabel="Sign in"
    >
      <AuthCard
        icon={MailCheck}
        eyebrow="Verify email"
        title="Enter your code"
        description="We sent a 6-digit verification code to your email address."
        footer={<>Wrong account? <Link href="/signup" className="font-medium text-foreground hover:underline">Create a new account</Link></>}
      >
        <div className="border-t bg-muted/20 px-5 py-4"><div className="rounded-xl border bg-background px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Selected plan</p><p className="mt-1 text-sm font-semibold">{planLabels[selectedPlan]}</p></div></div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-0 border-t">
          {error && <AuthBanner variant="error">{error}</AuthBanner>}
          {notice && <AuthBanner variant="success">{notice}</AuthBanner>}
          <AuthField label="Email"><Input type="email" {...register("email", { required: true })} className="rounded-xl" placeholder="you@company.com" /></AuthField>
          <AuthField label="Verification code"><Input {...register("otp", { required: true })} inputMode="numeric" maxLength={6} className="rounded-xl text-center font-mono text-lg tracking-[0.4em]" placeholder="000000" /></AuthField>
          <div className="border-t p-4">
            <Button className="w-full rounded-xl py-6 font-semibold" disabled={isSubmitting || verified}>{isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : verified ? "Verified" : "Verify email"}</Button>
            <Button type="button" variant="ghost" onClick={resendCode} disabled={resending || isSubmitting} className="mt-2 w-full rounded-xl">{resending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Resend code</Button>
          </div>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
