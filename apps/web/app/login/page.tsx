"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { BarChart3, Boxes, CheckCircle2, DatabaseZap, Loader2, LockKeyhole, ShieldCheck, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/lib/api";
import { NexstockLogo } from "@/components/brand/nexstock-logo";

type LoginValues = { email: string; password: string };

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Login failed. Please try again.";
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<LoginValues>();

  async function onSubmit(values: LoginValues) {
    setError(null);
    try {
      await login(values.email, values.password);
      router.push("/dashboard");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
          <Link href="/" aria-label="NexStock home">
            <NexstockLogo tagline={false} className="px-2 py-1" />
          </Link>
          <Link href="/signup" className="rounded-xl border bg-background/70 px-4 py-2 text-sm font-semibold transition hover:bg-muted">Create account</Link>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-73px)] w-full max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_28rem] lg:px-10">
        <div className="hidden lg:block">
          <p className="inline-flex items-center gap-2 border bg-card/95 px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Secure workspace access
          </p>
          <h1 className="mt-6 max-w-2xl text-5xl font-black tracking-[-0.06em] xl:text-6xl">Continue from your product command center.</h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground">Sign in to manage product data, inventory movement, field mapping, integrations, API access, and launch readiness from one operational workspace.</p>

          <section className="mt-8 border bg-card/95">
            <div className="grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <MiniMetric icon={Boxes} label="Products" value="Synced" />
              <MiniMetric icon={DatabaseZap} label="Fields" value="Mapped" />
              <MiniMetric icon={BarChart3} label="Readiness" value="84%" />
            </div>
            <div className="divide-y border-t">
              <Readiness label="Catalog fields combined" />
              <Readiness label="Cloud image storage ready" />
              <Readiness label="API and webhook controls" />
            </div>
            <div className="flex items-center justify-between border-t bg-muted/25 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center bg-primary/10 text-primary"><Workflow className="h-4 w-4" /></span>
                <div>
                  <p className="text-sm font-medium">Integration workflow</p>
                  <p className="text-xs text-muted-foreground">Configure → map → preview → sync</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="mx-auto w-full max-w-md lg:mx-0">
          <section className="border bg-card/95 shadow-sm">
            <div className="p-6 text-center lg:text-left">
              <div className="mx-auto flex h-11 w-11 items-center justify-center bg-primary/10 text-primary lg:mx-0">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Welcome back</p>
              <h2 className="mt-2 text-4xl font-black tracking-[-0.05em]">Sign in to NexStock</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Access your product, inventory, integrations, and automation workspace.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-0 border-t">
              {error && <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
              <Field label="Email">
                <Input {...register("email", { required: true })} className="rounded-xl" placeholder="you@company.com" />
              </Field>
              <Field label="Password">
                <Input type="password" {...register("password", { required: true })} className="rounded-xl" placeholder="Enter your password" />
                <div className="mt-3 text-right">
                  <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">Forgot password?</Link>
                </div>
              </Field>
              <div className="border-t p-4">
                <Button className="w-full rounded-xl py-6 font-semibold" disabled={isSubmitting}>{isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</> : "Sign in"}</Button>
              </div>
            </form>

            <div className="border-t bg-muted/20 px-5 py-4 text-center text-sm text-muted-foreground">
              No account? <Link href="/signup" className="font-medium text-foreground hover:underline">Create one</Link>
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

function MiniMetric({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return <div className="p-4"><Icon className="h-4 w-4 text-primary" /><p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold text-foreground">{value}</p></div>;
}

function Readiness({ label }: { label: string }) {
  return <div className="flex items-center justify-between px-4 py-3 text-sm"><span className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />{label}</span><span className="text-xs text-muted-foreground">Ready</span></div>;
}
