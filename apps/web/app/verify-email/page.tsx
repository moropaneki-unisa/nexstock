"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, MailCheck, ShieldCheck } from "lucide-react";

import { NexstockLogo } from "@/components/brand/nexstock-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resendVerificationOtp, verifyEmail } from "@/lib/api";

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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Verification failed.";
}

function saveSelectedPlan(plan: SelectedPlan) {
  window.localStorage.setItem(PLAN_STORAGE_KEY, plan);
}

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan>("free");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextPlan = getSelectedPlan(params.get("plan") || window.localStorage.getItem(PLAN_STORAGE_KEY));
    setEmail(params.get("email") ?? "");
    setSelectedPlan(nextPlan);
    saveSelectedPlan(nextPlan);
  }, []);

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!email) {
      setError("Missing email address. Please sign up again.");
      return;
    }
    if (!otp.trim()) {
      setError("Enter the OTP sent to your email.");
      return;
    }

    setIsSubmitting(true);
    try {
      saveSelectedPlan(selectedPlan);
      await verifyEmail({ email, otp });
      setMessage("Email verified. Redirecting...");
      if (selectedPlan !== "free") {
        router.push(`/billing/checkout?plan=${selectedPlan}&autostart=1`);
        return;
      }
      window.localStorage.removeItem(PLAN_STORAGE_KEY);
      router.push("/dashboard");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setMessage(null);

    if (!email) {
      setError("Missing email address. Please sign up again.");
      return;
    }

    setIsResending(true);
    try {
      await resendVerificationOtp(email);
      setMessage("A new OTP has been sent to your email.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsResending(false);
    }
  }

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
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Secure account verification
          </p>
          <h1 className="mt-6 max-w-2xl text-5xl font-black tracking-[-0.06em] xl:text-6xl">Verify your email before activating the workspace.</h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground">This keeps NexStock workspaces protected before product data, inventory workflows, API keys, and billing are enabled.</p>

          <section className="mt-8 border bg-card/95">
            <div className="divide-y">
              <Readiness label="OTP sent to the account email" />
              <Readiness label={`${planLabels[selectedPlan]} plan preserved`} />
              <Readiness label={selectedPlan === "free" ? "Dashboard opens after verification" : "Checkout opens after verification"} />
            </div>
          </section>
        </div>

        <div className="mx-auto w-full max-w-md lg:mx-0">
          <section className="border bg-card/95 shadow-sm">
            <div className="p-6 text-center lg:text-left">
              <div className="mx-auto flex h-11 w-11 items-center justify-center bg-primary/10 text-primary lg:mx-0">
                <MailCheck className="h-5 w-5" />
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Email verification</p>
              <h2 className="mt-2 text-4xl font-black tracking-[-0.05em]">Enter your OTP</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">We sent a verification code to {email || "your email address"}. The code expires after a few minutes.</p>
            </div>

            <div className="border-t bg-muted/20 px-5 py-4">
              <div className="rounded-xl border bg-background px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Selected plan</p>
                <p className="mt-1 text-sm font-semibold">{planLabels[selectedPlan]}</p>
              </div>
            </div>

            <form onSubmit={handleVerify} className="space-y-0 border-t">
              {error && <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
              {message && <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
              <Field label="Verification code">
                <Input value={otp} onChange={(event) => setOtp(event.target.value)} inputMode="numeric" maxLength={6} placeholder="Enter 6-digit OTP" className="rounded-xl" />
              </Field>
              <div className="border-t p-4">
                <Button className="w-full rounded-xl py-6 font-semibold" disabled={isSubmitting}>{isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : "Verify email"}</Button>
                <button type="button" onClick={handleResend} disabled={isResending} className="mt-4 w-full text-center text-sm font-medium text-muted-foreground hover:text-foreground hover:underline disabled:opacity-60">
                  {isResending ? "Sending new code..." : "Resend OTP"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="border-b p-4"><Label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</Label><div className="mt-3">{children}</div></div>;
}

function Readiness({ label }: { label: string }) {
  return <div className="flex items-center justify-between px-4 py-3 text-sm"><span className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />{label}</span><span className="text-xs text-muted-foreground">Ready</span></div>;
}
