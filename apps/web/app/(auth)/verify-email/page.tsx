"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { CheckCircle2, Loader2, MailCheck, ShieldCheck } from "lucide-react";

import { NexstockLogo } from "@/components/brand/nexstock-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resendVerificationOtp, verifyEmail } from "@/lib/api";

type VerifyEmailValues = { email: string; otp: string };
type SelectedPlan = "free" | "pro" | "business";

const PLAN_STORAGE_KEY = "nexstock:selected-plan";

const planLabels: Record<SelectedPlan, string> = {
  free: "Free",
  pro: "Pro",
  business: "Business",
};

function getSelectedPlan(value: string | null): SelectedPlan {
  if (value === "pro" || value === "business") return value;
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
  const { register, handleSubmit, setValue, watch, formState: { isSubmitting } } = useForm<VerifyEmailValues>({
    defaultValues: { email: "", otp: "" },
  });

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

    if (!values.email.trim()) {
      setError("Email address is required.");
      return;
    }

    if (!values.otp.trim()) {
      setError("Verification code is required.");
      return;
    }

    try {
      saveSelectedPlan(selectedPlan);
      await verifyEmail({ email: values.email.trim(), otp: values.otp.trim() });
      setVerified(true);
      if (selectedPlan !== "free") {
        setNotice("Email verified. Redirecting to payment...");
        window.setTimeout(() => router.push(`/billing/checkout?plan=${selectedPlan}&autostart=1`), 600);
        return;
      }
      window.localStorage.removeItem(PLAN_STORAGE_KEY);
      setNotice("Email verified. Redirecting to your dashboard...");
      window.setTimeout(() => router.push("/dashboard"), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    }
  }

  async function resendCode() {
    setError(null);
    setNotice(null);

    if (!email?.trim()) {
      setError("Enter your email address before requesting a new code.");
      return;
    }

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
    <VerifyEmailLayout selectedPlan={selectedPlan}>
      <section className="border bg-card/95 shadow-sm">
        <div className="p-6 text-center lg:text-left">
          <div className="mx-auto flex h-11 w-11 items-center justify-center bg-primary/10 text-primary lg:mx-0">
            <MailCheck className="h-5 w-5" />
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Verify email</p>
          <h2 className="mt-2 text-4xl font-black tracking-[-0.05em]">Enter your code</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">We sent a 6-digit verification code to your email address.</p>
        </div>

        <div className="border-t bg-muted/20 px-5 py-4">
          <div className="rounded-xl border bg-background px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Selected plan</p>
            <p className="mt-1 text-sm font-semibold">{planLabels[selectedPlan]}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-0 border-t">
          {error && <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
          {notice && <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
          <Field label="Email">
            <Input type="email" {...register("email", { required: true })} className="rounded-sm" placeholder="you@company.com" />
          </Field>
          <Field label="Verification code">
            <Input {...register("otp", { required: true })} inputMode="numeric" maxLength={6} className="rounded-sm text-center font-mono text-lg tracking-[0.4em]" placeholder="000000" />
          </Field>
          <div className="border-t p-4">
            <Button className="w-full rounded-xl py-6 font-semibold" disabled={isSubmitting || verified}>{isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : verified ? "Verified" : "Verify email"}</Button>
            <Button type="button" variant="ghost" onClick={resendCode} disabled={resending || isSubmitting} className="mt-2 w-full rounded-xl">
              {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Resend code
            </Button>
          </div>
        </form>

        <div className="border-t bg-muted/20 px-5 py-4 text-center text-sm text-muted-foreground">
          Wrong account? <Link href="/signup" className="font-medium text-foreground hover:underline">Create a new account</Link>
        </div>
      </section>
    </VerifyEmailLayout>
  );
}

function VerifyEmailLayout({ children, selectedPlan }: { children: React.ReactNode; selectedPlan: SelectedPlan }) {
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
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Email verification
          </p>
          <h1 className="mt-6 max-w-2xl text-5xl font-black tracking-[-0.06em] xl:text-6xl">Secure your product workspace before launch.</h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground">Verify your email address to activate your NexStock workspace, create your organization, and access product operations.</p>

          <section className="mt-8 border bg-card/95">
            <div className="divide-y">
              <InfoLine label="Confirm account ownership" />
              <InfoLine label={`${planLabels[selectedPlan]} plan preserved`} />
              <InfoLine label={selectedPlan === "free" ? "Unlock dashboard access" : "Continue to subscription checkout"} />
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

function InfoLine({ label }: { label: string }) {
  return <div className="flex items-center justify-between px-4 py-3 text-sm"><span className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />{label}</span><span className="text-xs text-muted-foreground">Ready</span></div>;
}
