"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signup } from "@/lib/api";
import { AuthVisual } from "@/components/auth/auth-visual";
import { NexstockLogo } from "@/components/brand/nexstock-logo";

type SignupValues = { email: string; password: string; name: string; orgName: string };

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Signup failed.";
}

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<SignupValues>();

  async function onSubmit(values: SignupValues) {
    setError(null);
    try {
      const res: any = await signup(values);
      if (res?.requiresVerification) {
        router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
        return;
      }
      router.push("/dashboard");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-2">
        <AuthVisual mode="signup" />
        <section className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden"><NexstockLogo /></div>
            <section className="border bg-card/95">
              <div className="p-6">
                <div className="flex h-11 w-11 items-center justify-center bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Start your workspace</p>
                <h1 className="mt-2 text-4xl font-black tracking-[-0.05em]">Create NexStock account</h1>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">Set up your product operations workspace and connect your inventory stack.</p>
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
                  <Button className="w-full rounded-xl py-6 font-semibold" disabled={isSubmitting}>{isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : "Create account"}</Button>
                </div>
              </form>

              <div className="border-t bg-muted/20 px-5 py-4 text-center text-sm text-muted-foreground">
                Already have an account? <Link href="/login" className="font-medium text-foreground hover:underline">Sign in</Link>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="border-b p-4"><Label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</Label><div className="mt-3">{children}</div></div>;
}
