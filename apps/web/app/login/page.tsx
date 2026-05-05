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
      <div className="grid min-h-screen lg:grid-cols-2">
        <AuthVisual mode="login" />

        <section className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="mb-10">
              <h2 className="text-3xl font-semibold tracking-tight">Login</h2>
              <p className="mt-2 text-sm text-neutral-600">
                Access your InventoryHub workspace.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label>Email</Label>
                <Input {...register("email", { required: true })} />
              </div>

              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" {...register("password", { required: true })} />
              </div>

              <Button className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Logging in...
                  </>
                ) : (
                  "Login"
                )}
              </Button>
            </form>

            <p className="mt-6 text-sm">
              No account? <Link href="/signup">Create one</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
