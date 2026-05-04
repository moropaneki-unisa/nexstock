"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/lib/api";

type LoginValues = {
  email: string;
  password: string;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Login failed. Please try again.";
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginValues>();

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
    <main className="min-h-screen bg-white text-neutral-950">
      <div className="mx-auto grid min-h-screen max-w-6xl px-6 lg:grid-cols-2 lg:px-8">
        <section className="hidden border-r border-neutral-100 py-8 pr-12 lg:flex lg:flex-col">
          <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-950 text-white">
              <PackageSearch className="h-4 w-4" />
            </span>
            InventoryHub
          </Link>

          <div className="flex flex-1 flex-col justify-center">
            <p className="mb-4 text-sm font-medium text-neutral-500">Welcome back</p>
            <h1 className="max-w-md text-4xl font-semibold tracking-[-0.035em]">
              Continue managing products, APIs, and sync readiness from one workspace.
            </h1>
            <p className="mt-5 max-w-md leading-7 text-neutral-600">
              Sign in to access product inventory, low-stock visibility, API keys, webhooks, and your Zoho-first integration roadmap.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center py-12 lg:pl-12">
          <div className="w-full max-w-md">
            <div className="mb-10 text-center lg:hidden">
              <Link href="/" className="inline-flex items-center gap-2 text-base font-semibold tracking-tight">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-950 text-white">
                  <PackageSearch className="h-4 w-4" />
                </span>
                InventoryHub
              </Link>
            </div>

            <div>
              <h2 className="text-3xl font-semibold tracking-tight">Login</h2>
              <p className="mt-2 text-sm text-neutral-600">
                Enter your details to open your InventoryHub workspace.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-neutral-700">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="h-11 rounded-xl border-neutral-200 bg-white"
                  {...register("email", { required: true })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-neutral-700">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="h-11 rounded-xl border-neutral-200 bg-white"
                  {...register("password", { required: true })}
                />
              </div>

              <Button className="h-11 w-full rounded-xl bg-neutral-950 text-white hover:bg-neutral-800" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Login"
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-neutral-600">
              New to InventoryHub?{" "}
              <Link href="/signup" className="font-medium text-neutral-950 underline underline-offset-4">
                Create an account
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
