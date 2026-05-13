"use client"

import Link from "next/link"
import { useState } from "react"
import { Loader2, Send } from "lucide-react"

import { AuthShell } from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { requestPasswordReset } from "@/lib/api"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)

    if (!email.trim()) {
      setError("Email address is required.")
      return
    }

    setLoading(true)
    try {
      await requestPasswordReset(email.trim())
      setNotice("If the account exists, a password reset link has been sent.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset link")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset access to your workspace."
      description="Enter your email address and we will send instructions for setting a new password."
      footer={
        <>
          Remembered your password?{" "}
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
        {notice ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
            {notice}
          </div>
        ) : null}

        <div className="grid gap-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
          />
        </div>

        <Button type="submit" className="mt-2 w-full" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Send reset link
        </Button>
      </form>
    </AuthShell>
  )
}
