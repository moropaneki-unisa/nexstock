import Link from "next/link";
import { ExternalLink, Mail, MapPin, type LucideIcon } from "lucide-react";

import { NexstockLogo } from "@/components/brand/nexstock-logo";

const footerGroups = [
  {
    title: "Product",
    links: [
      { href: "/#features", label: "Catalog management" },
      { href: "/#workflow", label: "Integration workflow" },
      { href: "/#platform", label: "Developer platform" },
      { href: "/#security", label: "Security controls" },
    ],
  },
  {
    title: "Workspace",
    links: [
      { href: "/login", label: "Sign in" },
      { href: "/signup", label: "Create workspace" },
      { href: "/forgot-password", label: "Recover account" },
      { href: "/dashboard", label: "Dashboard" },
    ],
  },
  {
    title: "Connectors",
    links: [
      { href: "/integration/csv/configuration", label: "CSV import" },
      { href: "/integration/xlsx/configuration", label: "XLSX import" },
      { href: "/integration/wordpress/configuration", label: "WooCommerce" },
      { href: "/integration/shopify/configuration", label: "Shopify" },
    ],
  },
];

export function AppFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer className="border-t bg-card/95 px-4 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <section className="grid gap-0 border-x lg:grid-cols-[1.1fr_2fr]">
          <div className="border-b p-6 lg:border-b-0 lg:border-r lg:p-8">
            <NexstockLogo tagline={false} className="px-1 py-0" />
            <p className="mt-5 max-w-sm text-sm leading-6 text-muted-foreground">
              NexStock is a product operations workspace for teams that need cleaner catalog data, inventory visibility, integrations, APIs, and webhook-ready automation.
            </p>
            {!compact && (
              <div className="mt-6 space-y-3 text-sm text-muted-foreground">
                <FooterContact icon={Mail} label="support@nexstock.co.za" />
                <FooterContact icon={MapPin} label="South Africa" />
              </div>
            )}
          </div>

          <div className="grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {footerGroups.map((group) => (
              <div key={group.title} className="p-6 lg:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">{group.title}</p>
                <div className="mt-5 grid gap-3">
                  {group.links.map((item) => (
                    <Link key={item.href} href={item.href} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground">
                      {item.label}
                      {item.href.startsWith("/") && <ExternalLink className="h-3 w-3" />}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4 border-x border-t px-6 py-5 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>© 2026 NexStock. Connect. Manage. Grow.</p>
          <div className="flex flex-wrap gap-4">
            <span>Production-ready product operations</span>
            <span className="hidden md:inline">·</span>
            <span>Secure APIs and webhooks</span>
          </div>
        </section>
      </div>
    </footer>
  );
}

function FooterContact({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-primary" /><span>{label}</span></div>;
}
