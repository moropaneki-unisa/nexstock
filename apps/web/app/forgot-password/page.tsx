"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Mail } from "lucide-react";

import { AuthBanner, AuthCard, AuthField, AuthShell } from "@/components/marketing/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <AuthShell
      eyebrow="Account recovery"
      title="Recover access to your product workspace."
      description="Enter your account email and NexStock will send a secure recovery link if the account exists."
      icon={Mail}
      highlights={["Secure recovery link", "Expires after 30 minutes", "Existing sessions are cleared after reset"]}
      actionHref="/login"
      actionLabel="Sign in"
    >
      <AuthCard
        icon={Mail}
        eyebrow="Forgot password"
        title="Reset your password"
        description="Enter your email address and we will send you a secure recovery link."
        footer={<>Remembered your password? <Link href="/login" className="font-medium text-foreground hover:underline">Sign in</Link></>}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-0 border-t">
          {error && <AuthBanner variant="error">{error}</AuthBanner>}
          {sent && <AuthBanner variant="success">If an account exists, a reset link has been sent.</AuthBanner>}
          <AuthField label="Email">
            <Input type="email" {...register("email", { required: true })} className="rounded-xl" placeholder="you@company.com" />
          </AuthField>
          <div className="border-t p-4">
            <Button className="w-full rounded-xl py-6 font-semibold" disabled={isSubmitting}>{isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> : "Send reset link"}</Button>
          </div>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
