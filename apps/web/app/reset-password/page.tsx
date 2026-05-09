"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { CheckCircle2, Loader2, LockKeyhole } from "lucide-react";

import { NexstockLogo } from "@/components/brand/nexstock-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/lib/api";

type ResetPasswordValues = { password: string; confirmPassword: string };

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = useMemo(() => searchParams.get("email") ?? "", [searchParams]);
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<ResetPasswordValues>();

  async function onSubmit(values: ResetPasswordValues) {
    setError(null);
    if (!email || !token) {
      setError("Reset link is missing required details. Request a new reset link.");
      return;
    }
    if (values.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (values.password !== values.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      await resetPassword({ email, token, password: values.password });
      setDone(true);
      window.setTimeout(() => router.push("/login"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password");
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
            <LockKeyhole className="h-3.5 w-3.5 text-primary" /> Secure password reset
          </p>
          <h1 className="mt-6 max-w-2xl text-5xl font-black tracking-[-0.06em] xl:text-6xl">Set a new password for your workspace.</h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground">Choose a strong password to protect product data, API keys, integrations, and inventory workflows.</p>

          <section className="mt-8 border bg-card/95">
            <div className="divide-y">
              <InfoLine label="Use at least 8 characters" />
              <InfoLine label="Old sessions are revoked" />
              <InfoLine label="Return to sign in after reset" />
            </div>
          </section>
        </div>

        <div className="mx-auto w-full max-w-md lg:mx-0">
          <section className="border bg-card/95 shadow-sm">
            <div className="p-6 text-center lg:text-left">
              <div className="mx-auto flex h-11 w-11 items-center justify-center bg-primary/10 text-primary lg:mx-0">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Account recovery</p>
              <h2 className="mt-2 text-4xl font-black tracking-[-0.05em]">Create new password</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Enter and confirm your new password for {email || "your account"}.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-0 border-t">
              {error && <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
              {done && <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Password updated. Redirecting to sign in...</div>}
              <Field label="New password">
                <Input type="password" {...register("password", { required: true })} className="rounded-xl" placeholder="Create a secure password" />
              </Field>
              <Field label="Confirm password">
                <Input type="password" {...register("confirmPassword", { required: true })} className="rounded-xl" placeholder="Confirm your password" />
              </Field>
              <div className="border-t p-4">
                <Button className="w-full rounded-xl py-6 font-semibold" disabled={isSubmitting || done}>{isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating...</> : "Update password"}</Button>
              </div>
            </form>

            <div className="border-t bg-muted/20 px-5 py-4 text-center text-sm text-muted-foreground">
              Need a new link? <Link href="/forgot-password" className="font-medium text-foreground hover:underline">Request reset</Link>
            </div>
          </section>
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
