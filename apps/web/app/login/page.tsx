"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/lib/api";
import { AuthVisual } from "@/components/auth/auth-visual";
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
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="grid min-h-screen lg:grid-cols-2">
        <AuthVisual mode="login" />
        <section className="relative flex items-center justify-center px-6 py-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_28%)]" />
          <div className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.4)] backdrop-blur-xl">
            <div className="mb-10 lg:hidden"><NexstockLogo light /></div>
            <div className="mb-8">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-white/45">Welcome back</p>
              <h2 className="text-4xl font-black tracking-[-0.05em]">Sign in to NexStock</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">Access your product, inventory, integrations, and automation workspace.</p>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {error && <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
              <div className="space-y-2"><Label className="text-zinc-300">Email</Label><Input {...register("email", { required: true })} className="rounded-2xl border-white/10 bg-black/40 text-white placeholder:text-zinc-600" placeholder="you@company.com" /></div>
              <div className="space-y-2"><Label className="text-zinc-300">Password</Label><Input type="password" {...register("password", { required: true })} className="rounded-2xl border-white/10 bg-black/40 text-white placeholder:text-zinc-600" placeholder="Enter your password" /></div>
              <Button className="w-full rounded-2xl bg-white py-6 font-semibold text-black hover:bg-zinc-200" disabled={isSubmitting}>{isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</> : "Sign in"}</Button>
            </form>
            <p className="mt-6 text-center text-sm text-zinc-500">No account? <Link href="/signup" className="font-medium text-white hover:underline">Create one</Link></p>
          </div>
        </section>
      </div>
    </main>
  );
}
