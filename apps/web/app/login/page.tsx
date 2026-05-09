"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, LockKeyhole } from "lucide-react";
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
      <div className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-center">
            <Link href="/" aria-label="NexStock home">
              <NexstockLogo tagline={false} className="px-2 py-1" />
            </Link>
          </div>

          <section className="border bg-card/95">
            <div className="p-6 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center bg-primary/10 text-primary">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Welcome back</p>
              <h1 className="mt-2 text-4xl font-black tracking-[-0.05em]">Sign in to NexStock</h1>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">Access your product, inventory, integrations, and automation workspace.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-0 border-t">
              {error && <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
              <Field label="Email">
                <Input {...register("email", { required: true })} className="rounded-xl" placeholder="you@company.com" />
              </Field>
              <Field label="Password">
                <Input type="password" {...register("password", { required: true })} className="rounded-xl" placeholder="Enter your password" />
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
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="border-b p-4"><Label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</Label><div className="mt-3">{children}</div></div>;
}
