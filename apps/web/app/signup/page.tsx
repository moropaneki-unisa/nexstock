"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"
import { Loader2, UserPlus } from "lucide-react"

import { AuthShell } from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signup } from "@/lib/api"

const PLAN_STORAGE_KEY = "nexstock:selected-plan"

type Plan = "free" | "starter" | "growth"

function normalizePlan(value: string | null): Plan {
  if (value === "starter") return "starter"
  if (value === "growth" || value === "business") return "growth"
  return "free"
}

export default function SignupPage() {
  const router = useRouter()
  const params = useSearchParams()
  const selectedPlan = useMemo(() => normalizePlan(params.get("plan")), [params])
  const [name, setName] = useState("")
  const [organizationName, setOrganizationName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!name.trim() || !email.trim() || !password) {
      setError("Name, email, and password are required.")
      return
    }

    setLoading(true)
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(PLAN_STORAGE_KEY, selectedPlan)
      }
      await signup({
        name: name.trim(),
        email: email.trim(),
        password,
        organizationName: organizationName.trim() || undefined,
        plan: selectedPlan,
      })
      router.push(`/verify-email?email=${encodeURIComponent(email.trim())}&plan=${selectedPlan}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Create account"
      title="Start your NexStock workspace."
      description="Create an account, verify your email, then choose how your inventory workflow should start."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="grid gap-4">
        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          Selected plan: <span className="font-medium capitalize text-foreground">{selectedPlan}</span>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Kutullo Moropane" autoComplete="name" />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="organization">Organization name</Label>
          <Input id="organization" value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} placeholder="NexStock Demo Store" autoComplete="organization" />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="email">Email address</Label>
          <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" autoComplete="email" />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Create a password" autoComplete="new-password" />
        </div>

        <Button type="submit" className="mt-2 w-full" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
          Create account
        </Button>
      </form>
    </AuthShell>
  )
}
