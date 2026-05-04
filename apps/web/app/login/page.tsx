"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<{ email: string; password: string }>();

  async function onSubmit(values: { email: string; password: string }) {
    setError(null);
    try {
      await login(values.email, values.password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message ?? "Login failed");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Login to InventoryHub</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            <div className="space-y-2"><Label>Email</Label><Input type="email" {...register("email", { required: true })} /></div>
            <div className="space-y-2"><Label>Password</Label><Input type="password" {...register("password", { required: true })} /></div>
            <Button className="w-full" disabled={isSubmitting}>{isSubmitting ? "Logging in..." : "Login"}</Button>
            <p className="text-center text-sm text-muted-foreground">No account? <Link href="/signup" className="underline">Create one</Link></p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
