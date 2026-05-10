import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";

import { NexstockLogo } from "@/components/brand/nexstock-logo";
import { AppFooter } from "@/components/layout/app-footer";

const sections = [
  {
    title: "1. Subscription refunds",
    body: "NexStock offers paid SaaS subscriptions for product operations workspaces. If you are not satisfied with a paid subscription, contact support@nexstock.co.za within 14 days of the initial subscription payment and we will review the refund request.",
  },
  {
    title: "2. Renewals",
    body: "Recurring subscription renewals are generally non-refundable once a new billing period has started, unless required by law or approved after review. You can cancel your subscription before the next renewal to avoid future charges.",
  },
  {
    title: "3. Paddle processing",
    body: "Paid subscriptions may be sold and processed by Paddle as Merchant of Record. Approved refunds may be processed by Paddle back to the original payment method, subject to Paddle processing rules, payment network timing, and applicable law.",
  },
  {
    title: "4. Non-refundable cases",
    body: "Refunds may be declined where there is abuse, fraud, excessive service usage, violation of our Terms of Service, or where the request falls outside the stated review period and is not required by law.",
  },
  {
    title: "5. How to request a refund",
    body: "Email support@nexstock.co.za with your account email, organization name, payment date, and reason for the request. We may ask for additional information to locate the payment and review the request.",
  },
  {
    title: "6. Cancellation",
    body: "Cancelling a subscription stops future renewals but does not automatically refund previous payments. Workspace access may continue until the end of the paid billing period unless otherwise stated.",
  },
];

export default function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-background/90 px-4 backdrop-blur-xl sm:px-6 lg:px-10">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-6">
          <Link href="/" aria-label="NexStock home"><NexstockLogo tagline={false} className="px-0 py-0" /></Link>
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back home</Link>
        </div>
      </header>

      <section className="px-4 py-14 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-4xl">
          <p className="inline-flex items-center gap-2 border bg-card/95 px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground"><RefreshCw className="h-3.5 w-3.5 text-primary" />Refunds</p>
          <h1 className="mt-6 text-4xl font-black tracking-[-0.05em] sm:text-5xl">Refund Policy</h1>
          <p className="mt-4 text-sm text-muted-foreground">Last updated: 11 May 2026</p>
          <div className="mt-8 overflow-hidden border bg-card/95 shadow-sm">
            {sections.map((section) => (
              <section key={section.title} className="border-b p-6 last:border-b-0">
                <h2 className="text-lg font-semibold tracking-tight">{section.title}</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{section.body}</p>
              </section>
            ))}
          </div>
        </div>
      </section>

      <AppFooter />
    </main>
  );
}
