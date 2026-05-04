"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  Code2,
  DatabaseZap,
  Home,
  KeyRound,
  PackageSearch,
  Settings,
  Webhook,
} from "lucide-react";

import { cn } from "@/lib/utils";

const sections = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: Home },
      { href: "/products", label: "Products", icon: Boxes },
      { href: "/products/fields", label: "Product schema", icon: DatabaseZap },
    ],
  },
  {
    label: "Platform",
    items: [
      { href: "/integrations", label: "Integrations", icon: Code2 },
      { href: "/api-keys", label: "API keys", icon: KeyRound },
      { href: "/webhooks", label: "Webhooks", icon: Webhook },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-72 shrink-0 overflow-y-auto border-r bg-background p-4 md:block">
      <Link href="/dashboard" className="mb-8 flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <PackageSearch className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-sm font-semibold leading-5">InventoryHub</span>
          <span className="block text-xs text-muted-foreground">Product sync SaaS</span>
        </span>
      </Link>

      <nav className="space-y-6">
        {sections.map((section) => (
          <div key={section.label} className="space-y-2">
            <p className="px-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{section.label}</p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground",
                      active && "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-8 rounded-2xl border bg-muted/40 p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <BarChart3 className="h-4 w-4" />
          MVP focus
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Ship product CRUD, developer API keys, webhooks, and a Zoho-first integration surface before adding billing and automation depth.
        </p>
      </div>
    </aside>
  );
}
