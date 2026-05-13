"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Loader2, MailCheck, RefreshCw } from "lucide-react"

import { AuthShell } from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { resendVerificationOtp, verifyEmail } from "@/lib/api"

const PLAN_STORAGE_KEY = "nexstock:selected-plan"

type Plan = "free" | "starter" | "growth"

function normalizePlan(value: string | null): Plan {
  if (value === "starter") return "starter"
  if (value === "growth" || value === "business") return "growth"
  return "free"
}

export default function VerifyEmailPage() {
  const router = useRouter()
  const params = useSearchParams()
  const selectedPlan = useMemo(() => normalizePlan(params.get("plan")), [params])
  const [email, setEmail] = useState(params.get("email") || "")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PLAN_STORAGE_KEY, selectedPlan)
    }
  }, [selectedPlan])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)

    if (!email.trim() || !otp.trim()) {
      setError("Email and verification code are required.")
      return
    }

    setLoading(true)
    try {
      await verifyEmail({ email: email.trim(), otp: otp.trim() })
      router.push(`/subscriptions?plan=${selectedPlan}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed")
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setError(null)
    setNotice(null)

    if (!email.trim()) {
      setError("Enter your email address before requesting a new code.")
      return
    }

    setResending(true)
    try {
      await resendVerificationOtp(email.trim())
      setNotice("A new verification code has been sent if the account exists.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend code")
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Verify email"
      title="Confirm your email before opening the workspace."
      description="Use the verification code sent to your email. After verification, you will choose Free, Starter, or Growth."
      footer={
        <>
          Wrong email?{" "}
          <Link href="/signup" className="font-medium text-foreground hover:underline">
            Create a new account
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
        {notice ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
            {notice}
          </div>
        ) : null}

        <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          Selected plan: <span className="font-medium capitalize text-foreground">{selectedPlan}</span>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="email">Email address</Label>
          <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="otp">Verification code</Label>
          <Input id="otp" inputMode="numeric" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="000000" className="text-center font-mono tracking-[0.4em]" />
        </div>

        <Button type="submit" className="mt-2 w-full" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <MailCheck className="size-4" />}
          Verify email
        </Button>

        <Button type="button" variant="outline" className="w-full" disabled={resending || loading} onClick={handleResend}>
          {resending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Resend code
        </Button>
      </form>
    </AuthShell>
  )
}
