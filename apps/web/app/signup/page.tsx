"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
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
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="grid min-h-screen lg:grid-cols-2">
        <AuthVisual mode="signup" />
        <section className="relative flex items-center justify-center px-6 py-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_28%)]" />
          <div className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.4)] backdrop-blur-xl">
            <div className="mb-10 lg:hidden"><NexstockLogo light /></div>
            <div className="mb-8">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-white/45">Start your workspace</p>
              <h2 className="text-4xl font-black tracking-[-0.05em]">Create NexStock account</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">Set up your product operations workspace and connect your inventory stack.</p>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {error && <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
              <div className="space-y-2"><Label className="text-zinc-300">Full name</Label><Input placeholder="Your name" {...register("name", { required: true })} className="rounded-2xl border-white/10 bg-black/40 text-white placeholder:text-zinc-600" /></div>
              <div className="space-y-2"><Label className="text-zinc-300">Organization</Label><Input placeholder="Company name" {...register("orgName", { required: true })} className="rounded-2xl border-white/10 bg-black/40 text-white placeholder:text-zinc-600" /></div>
              <div className="space-y-2"><Label className="text-zinc-300">Email</Label><Input placeholder="you@company.com" {...register("email", { required: true })} className="rounded-2xl border-white/10 bg-black/40 text-white placeholder:text-zinc-600" /></div>
              <div className="space-y-2"><Label className="text-zinc-300">Password</Label><Input type="password" placeholder="Create a secure password" {...register("password", { required: true })} className="rounded-2xl border-white/10 bg-black/40 text-white placeholder:text-zinc-600" /></div>
              <Button className="w-full rounded-2xl bg-white py-6 font-semibold text-black hover:bg-zinc-200" disabled={isSubmitting}>{isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : "Create account"}</Button>
            </form>
            <p className="mt-6 text-center text-sm text-zinc-500">Already have an account? <Link href="/login" className="font-medium text-white hover:underline">Sign in</Link></p>
          </div>
        </section>
      </div>
    </main>
  );
}
