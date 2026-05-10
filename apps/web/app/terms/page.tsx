import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { NexstockLogo } from "@/components/brand/nexstock-logo";
import { AppFooter } from "@/components/layout/app-footer";

const sections = [
  {
    title: "1. About NexStock",
    body: "NexStock is a SaaS product operations workspace for catalog management, inventory visibility, import workflows, integrations, API access, and webhook-ready automation. By creating an account or using NexStock, you agree to these Terms of Service.",
  },
  {
    title: "2. Accounts and organizations",
    body: "You are responsible for keeping your account credentials secure and for all activity within your organization workspace. Organization administrators are responsible for managing users, permissions, product data, integrations, API keys, and billing choices.",
  },
  {
    title: "3. Subscriptions and payments",
    body: "Paid subscriptions are billed according to the plan selected at checkout. NexStock uses Paddle as payment provider and Merchant of Record. Paddle may process payments, invoices, taxes, and approved refunds for paid subscriptions. Subscription access may be limited, suspended, or downgraded if payment fails or a subscription is cancelled.",
  },
  {
    title: "4. Product data and integrations",
    body: "You retain responsibility for the accuracy, legality, and completeness of product records, inventory quantities, pricing data, images, imported files, third-party credentials, API usage, and connected systems. NexStock provides tools to help manage this information but does not guarantee that imported or synced data is error-free.",
  },
  {
    title: "5. Acceptable use",
    body: "You may not use NexStock to upload unlawful content, abuse integrations, attempt unauthorized access, disrupt the service, reverse engineer protected systems, or use API keys in a way that harms NexStock, other users, or third-party platforms.",
  },
  {
    title: "6. Availability and changes",
    body: "We work to keep NexStock reliable, but the service may change, experience downtime, or depend on third-party providers. Features, plan limits, integrations, and pricing may be updated as the product evolves.",
  },
  {
    title: "7. Limitation of liability",
    body: "To the maximum extent permitted by law, NexStock is provided without warranties of uninterrupted operation or error-free results. NexStock is not liable for indirect, incidental, special, or consequential losses, including lost revenue, lost data, or business interruption.",
  },
  {
    title: "8. Contact",
    body: "For questions about these terms, contact support@nexstock.co.za.",
  },
];

export default function TermsPage() {
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
          <p className="inline-flex items-center gap-2 border bg-card/95 px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 text-primary" />Legal</p>
          <h1 className="mt-6 text-4xl font-black tracking-[-0.05em] sm:text-5xl">Terms of Service</h1>
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
