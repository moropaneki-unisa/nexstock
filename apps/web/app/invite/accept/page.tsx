"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { CheckCircle2, Loader2, Mail } from "lucide-react";

import { NexstockLogo } from "@/components/brand/nexstock-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setAccessToken, getApiUrl } from "@/lib/api";

type AcceptInviteValues = {
  name: string;
  password: string;
  confirmPassword: string;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to accept invite. Please try again.";
}

function AcceptInviteForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = useMemo(() => params.get("email")?.trim() || "", [params]);
  const token = useMemo(() => params.get("token")?.trim() || "", [params]);
  const [error, setError] = useState<string | null>(!email || !token ? "This invite link is missing required details. Ask your admin to send a new invite." : null);
  const [accepted, setAccepted] = useState(false);
  const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm<AcceptInviteValues>({
    defaultValues: { name: email ? email.split("@")[0] : "" },
  });

  async function onSubmit(values: AcceptInviteValues) {
    if (!email || !token) return;
    setError(null);

    if (values.password !== values.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const response = await fetch(`${getApiUrl()}/api/auth/invite/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, token, password: values.password, name: values.name }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || "Invite could not be accepted.");
      }

      const data = await response.json();
      if (data.accessToken) setAccessToken(data.accessToken);
      setAccepted(true);
      setTimeout(() => router.push("/dashboard"), 900);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const password = watch("password");

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <section className="relative flex min-h-screen items-center justify-center px-6 py-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(47,124,255,0.22),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(37,224,190,0.16),transparent_26%)]" />
        <div className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.045] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.42)] backdrop-blur-xl">
          <div className="mb-8"><NexstockLogo light /></div>

          {accepted ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h1 className="text-3xl font-black tracking-[-0.045em]">Invite accepted</h1>
              <p className="text-sm leading-6 text-zinc-400">Your password is set and you are being redirected to your NexStock dashboard.</p>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-white/45"><Mail className="h-3.5 w-3.5" /> Organization invite</p>
                <h1 className="text-4xl font-black tracking-[-0.05em]">Join NexStock</h1>
                <p className="mt-3 text-sm leading-6 text-zinc-400">Create your password to accept the invite and access the organization workspace.</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {error && <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
                <div className="space-y-2">
                  <Label className="text-zinc-300">Email</Label>
                  <Input value={email} readOnly className="rounded-2xl border-white/10 bg-black/40 text-white placeholder:text-zinc-600" />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Name</Label>
                  <Input {...register("name", { required: true })} className="rounded-2xl border-white/10 bg-black/40 text-white placeholder:text-zinc-600" placeholder="Your name" />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Password</Label>
                  <Input type="password" {...register("password", { required: true, minLength: 8 })} className="rounded-2xl border-white/10 bg-black/40 text-white placeholder:text-zinc-600" placeholder="Create a password" />
                  {password && password.length < 8 && <p className="text-xs text-amber-200">Password must be at least 8 characters.</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Confirm password</Label>
                  <Input type="password" {...register("confirmPassword", { required: true })} className="rounded-2xl border-white/10 bg-black/40 text-white placeholder:text-zinc-600" placeholder="Confirm your password" />
                </div>
                <Button className="w-full rounded-2xl bg-white py-6 font-semibold text-black hover:bg-zinc-200" disabled={isSubmitting || Boolean(!email || !token)}>
                  {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Accepting invite...</> : "Accept invite"}
                </Button>
              </form>
              <p className="mt-6 text-center text-sm text-zinc-500">Already accepted? <Link href="/login" className="font-medium text-white hover:underline">Sign in</Link></p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#050505] text-white" />}>
      <AcceptInviteForm />
    </Suspense>
  );
}
