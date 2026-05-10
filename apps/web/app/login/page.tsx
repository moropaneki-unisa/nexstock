"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, LockKeyhole, ShieldCheck } from "lucide-react";

import { AuthBanner, AuthCard, AuthField, AuthShell } from "@/components/marketing/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login } from "@/lib/api";

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
    <AuthShell
      eyebrow="Secure workspace access"
      title="Continue from your product command center."
      description="Sign in to manage product data, inventory movement, field mapping, integrations, API access, and launch readiness from one operational workspace."
      icon={ShieldCheck}
      highlights={["Catalog fields combined", "Cloud image storage ready", "API and webhook controls"]}
      actionHref="/signup"
      actionLabel="Create account"
    >
      <AuthCard
        icon={LockKeyhole}
        eyebrow="Welcome back"
        title="Sign in to NexStock"
        description="Access your product, inventory, integrations, and automation workspace."
        footer={<>No account? <Link href="/signup" className="font-medium text-foreground hover:underline">Create one</Link></>}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-0 border-t">
          {error && <AuthBanner variant="error">{error}</AuthBanner>}
          <AuthField label="Email">
            <Input {...register("email", { required: true })} className="rounded-xl" placeholder="you@company.com" />
          </AuthField>
          <AuthField label="Password">
            <Input type="password" {...register("password", { required: true })} className="rounded-xl" placeholder="Enter your password" />
            <div className="mt-3 text-right">
              <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">Forgot password?</Link>
            </div>
          </AuthField>
          <div className="border-t p-4">
            <Button className="w-full rounded-xl py-6 font-semibold" disabled={isSubmitting}>{isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</> : "Sign in"}</Button>
          </div>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
