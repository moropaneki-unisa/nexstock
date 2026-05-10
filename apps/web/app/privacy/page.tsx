import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";

import { NexstockLogo } from "@/components/brand/nexstock-logo";
import { AppFooter } from "@/components/layout/app-footer";

const sections = [
  {
    title: "1. Information we collect",
    body: "We collect account information such as name, email address, organization name, billing details, subscription plan, and authentication activity. We also process product records, inventory quantities, product images, custom fields, import files, integration settings, API keys, webhook settings, and operational logs that you add to NexStock.",
  },
  {
    title: "2. How we use information",
    body: "We use information to provide the NexStock service, authenticate users, manage organizations, process imports and integrations, deliver API and webhook functionality, provide support, improve reliability, prevent abuse, and manage subscription access.",
  },
  {
    title: "3. Payments and billing",
    body: "Paid subscription payments may be processed by Paddle as payment provider and Merchant of Record. Paddle may collect and process payment, tax, invoice, and billing information according to its own buyer terms and privacy notices. NexStock does not store full card numbers.",
  },
  {
    title: "4. Service providers",
    body: "We may use trusted service providers for hosting, databases, file storage, email delivery, analytics, payments, and infrastructure monitoring. These providers process information only as needed to operate and secure NexStock.",
  },
  {
    title: "5. Data security",
    body: "We use reasonable technical and organizational measures to protect account and workspace information, including authenticated access, organization-based separation, hashed secrets where applicable, and environment-based configuration. No online service can guarantee absolute security.",
  },
  {
    title: "6. Data retention",
    body: "We retain account, organization, product, import, integration, and billing records for as long as needed to provide the service, comply with legal obligations, resolve disputes, prevent abuse, and maintain operational records. You may request deletion or correction where applicable.",
  },
  {
    title: "7. Your choices",
    body: "You can update organization details, product data, integrations, API keys, and some account information from your workspace. For privacy requests, contact support@nexstock.co.za.",
  },
  {
    title: "8. Contact",
    body: "For privacy questions or requests, contact support@nexstock.co.za.",
  },
];

export default function PrivacyPage() {
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
          <p className="inline-flex items-center gap-2 border bg-card/95 px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground"><LockKeyhole className="h-3.5 w-3.5 text-primary" />Privacy</p>
          <h1 className="mt-6 text-4xl font-black tracking-[-0.05em] sm:text-5xl">Privacy Policy</h1>
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
