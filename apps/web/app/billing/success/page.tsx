import Link from "next/link";
import { CheckCircle2, Mail, PackageCheck, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function BillingSuccessPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <section className="mx-auto max-w-3xl border bg-card/95">
        <div className="border-b p-6">
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">NexStock billing</p>
          <h1 className="mt-3 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            Checkout received
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Thank you for testing NexStock. Your payment checkout has been completed or returned from Lemon Squeezy.
          </p>
        </div>

        <div className="space-y-5 p-6">
          <div className="border bg-amber-50 p-5 text-amber-900">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">NexStock is still in implementation/testing mode.</p>
                <p className="mt-2 text-sm leading-6">
                  Please do not use real card details while we are still testing payments. Use the Lemon Squeezy test card details provided on the checkout screen.
                </p>
              </div>
            </div>
          </div>

          <div className="border bg-background p-5">
            <div className="flex items-start gap-3">
              <PackageCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-semibold">Already imported real product data?</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Let us know before launch so we do not delete or reset your real products during final cleanup and migration work.
                </p>
              </div>
            </div>
          </div>

          <div className="border bg-background p-5">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-semibold">Contact the NexStock admin team</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Email us at <a className="font-medium text-foreground underline" href="mailto:admin@nexstock.co.za">admin@nexstock.co.za</a> if you have imported real products or need your test account protected.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t p-6 sm:flex-row sm:items-center sm:justify-between">
          <Button asChild variant="outline" className="rounded-none">
            <Link href="/billing/checkout">Back to checkout</Link>
          </Button>
          <Button asChild className="rounded-none">
            <Link href="/organization">Go to NexStock</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
