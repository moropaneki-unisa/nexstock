"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { CheckCircle2, Loader2, Mail } from "lucide-react";

import { NexstockLogo } from "@/components/brand/nexstock-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/lib/api";

type ForgotPasswordValues = { email: string };

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<ForgotPasswordValues>();

  async function onSubmit(values: ForgotPasswordValues) {
    setError(null);
    setSent(false);
    try {
      await requestPasswordReset(values.email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset link");
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
          <Link href="/" aria-label="NexStock home"><NexstockLogo tagline={false} className="px-2 py-1" /></Link>
          <Link href="/login" className="rounded-xl border bg-background/70 px-4 py-2 text-sm font-semibold transition hover:bg-muted">Sign in</Link>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-73px)] w-full max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_28rem] lg:px-10">
        <div className="hidden lg:block">
          <p className="inline-flex items-center gap-2 border bg-card/95 px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground"><Mail className="h-3.5 w-3.5 text-primary" /> Account recovery</p>
          <h1 className="mt-6 max-w-2xl text-5xl font-black tracking-[-0.06em] xl:text-6xl">Recover access to your product workspace.</h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground">Enter your account email and NexStock will send a secure password reset link if the account exists.</p>
          <section className="mt-8 border bg-card/95"><div className="divide-y"><InfoLine label="Secure reset link" /><InfoLine label="Expires after 30 minutes" /><InfoLine label="Existing sessions are cleared after reset" /></div></section>
        </div>

        <div className="mx-auto w-full max-w-md lg:mx-0">
          <section className="border bg-card/95 shadow-sm">
            <div className="p-6 text-center lg:text-left"><div className="mx-auto flex h-11 w-11 items-center justify-center bg-primary/10 text-primary lg:mx-0"><Mail className="h-5 w-5" /></div><p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Forgot password</p><h2 className="mt-2 text-4xl font-black tracking-[-0.05em]">Reset your password</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Enter your email address and we will send you a secure reset link.</p></div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-0 border-t">
              {error && <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
              {sent && <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">If an account exists, a reset link has been sent.</div>}
              <Field label="Email"><Input type="email" {...register("email", { required: true })} className="rounded-xl" placeholder="you@company.com" /></Field>
              <div className="border-t p-4"><Button className="w-full rounded-xl py-6 font-semibold" disabled={isSubmitting}>{isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> : "Send reset link"}</Button></div>
            </form>
            <div className="border-t bg-muted/20 px-5 py-4 text-center text-sm text-muted-foreground">Remembered your password? <Link href="/login" className="font-medium text-foreground hover:underline">Sign in</Link></div>
          </section>
        </div>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="border-b p-4"><Label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</Label><div className="mt-3">{children}</div></div>; }
function InfoLine({ label }: { label: string }) { return <div className="flex items-center justify-between px-4 py-3 text-sm"><span className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />{label}</span><span className="text-xs text-muted-foreground">Ready</span></div>; }
