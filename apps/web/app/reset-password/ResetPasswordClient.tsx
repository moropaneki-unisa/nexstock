"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, LockKeyhole } from "lucide-react";

import { AuthBanner, AuthCard, AuthField, AuthShell } from "@/components/marketing/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resetPassword } from "@/lib/api";

type ResetPasswordValues = { password: string; confirmPassword: string };

export default function ResetPasswordClient() {
  return <ResetPasswordForm />;
}

function ResetPasswordForm() {
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
    <ResetPasswordLayout>
      <AuthCard
        icon={LockKeyhole}
        eyebrow="Account recovery"
        title="Create new password"
        description={<>Enter and confirm your new password for {email || "your account"}.</>}
        footer={<>Need a new link? <Link href="/forgot-password" className="font-medium text-foreground hover:underline">Request reset</Link></>}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-0 border-t">
          {error && <AuthBanner variant="error">{error}</AuthBanner>}
          {done && <AuthBanner variant="success">Password updated. Redirecting to sign in...</AuthBanner>}
          <AuthField label="New password"><Input type="password" {...register("password", { required: true })} className="rounded-xl" placeholder="Create a secure password" /></AuthField>
          <AuthField label="Confirm password"><Input type="password" {...register("confirmPassword", { required: true })} className="rounded-xl" placeholder="Confirm your password" /></AuthField>
          <div className="border-t p-4"><Button className="w-full rounded-xl py-6 font-semibold" disabled={isSubmitting || done}>{isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating...</> : "Update password"}</Button></div>
        </form>
      </AuthCard>
    </ResetPasswordLayout>
  );
}

export function ResetPasswordShell() {
  return (
    <ResetPasswordLayout>
      <section className="border bg-card/95 p-10 text-center text-sm text-muted-foreground shadow-sm"><Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />Loading password reset form...</section>
    </ResetPasswordLayout>
  );
}

function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthShell
      eyebrow="Secure password reset"
      title="Set a new password for your workspace."
      description="Choose a strong password to protect product data, API keys, integrations, and inventory workflows."
      icon={LockKeyhole}
      highlights={["Use at least 8 characters", "Old sessions are revoked", "Return to sign in after reset"]}
      actionHref="/login"
      actionLabel="Sign in"
    >
      {children}
    </AuthShell>
  );
}
