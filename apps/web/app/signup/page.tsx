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

type SignupValues = {
  email: string;
  password: string;
  name: string;
  orgName: string;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Signup failed.";
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
      <div className="grid min-h-screen lg:grid-cols-2">
        <AuthVisual mode="signup" />

        <section className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="mb-10">
              <h2 className="text-3xl font-semibold">Create account</h2>
              <p className="text-sm text-neutral-600">Start your workspace</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {error && <div className="text-red-600">{error}</div>}

              <Input placeholder="Name" {...register("name", { required: true })} />
              <Input placeholder="Organization" {...register("orgName", { required: true })} />
              <Input placeholder="Email" {...register("email", { required: true })} />
              <Input type="password" placeholder="Password" {...register("password", { required: true })} />

              <Button className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create account"}
              </Button>
            </form>

            <p className="mt-6 text-sm">
              Already have account? <Link href="/login">Login</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
