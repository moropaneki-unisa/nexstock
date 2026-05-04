"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { CheckCircle2, Loader2, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signup } from "@/lib/api";

type SignupValues = {
  email: string;
  password: string;
  name: string;
  orgName: string;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Signup failed. Please try again.";
}

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<SignupValues>();

  async function onSubmit(values: SignupValues) {
    setError(null);

    try {
      await signup(values);
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
            <p className="mb-4 text-sm font-medium text-neutral-500">Create your workspace</p>
            <h1 className="max-w-md text-4xl font-semibold tracking-[-0.035em]">
              Start building your product source of truth.
            </h1>
            <p className="mt-5 max-w-md leading-7 text-neutral-600">
              Create an organization workspace for product CRUD, inventory logs, API keys, webhooks, and future Zoho sync.
            </p>

            <div className="mt-8 space-y-3">
              {["Multi-tenant product workspace", "Developer API and webhooks", "Zoho-first sync roadmap"].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm text-neutral-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  {item}
                </div>
              ))}
            </div>
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
              <h2 className="text-3xl font-semibold tracking-tight">Create account</h2>
              <p className="mt-2 text-sm text-neutral-600">
                Add your details to create your InventoryHub workspace.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-neutral-700">
                    Name
                  </Label>
                  <Input
                    id="name"
                    autoComplete="name"
                    placeholder="Your name"
                    className="h-11 rounded-xl border-neutral-200 bg-white"
                    {...register("name", { required: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orgName" className="text-sm font-medium text-neutral-700">
                    Organization
                  </Label>
                  <Input
                    id="orgName"
                    autoComplete="organization"
                    placeholder="Company"
                    className="h-11 rounded-xl border-neutral-200 bg-white"
                    {...register("orgName", { required: true })}
                  />
                </div>
              </div>

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
                  autoComplete="new-password"
                  placeholder="Minimum 8 characters"
                  className="h-11 rounded-xl border-neutral-200 bg-white"
                  {...register("password", { required: true, minLength: 8 })}
                />
              </div>

              <Button className="h-11 w-full rounded-xl bg-neutral-950 text-white hover:bg-neutral-800" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create account"
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-neutral-600">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-neutral-950 underline underline-offset-4">
                Login
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
