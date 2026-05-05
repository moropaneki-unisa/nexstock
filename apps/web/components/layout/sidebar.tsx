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
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Webhook,
} from "lucide-react";

import { cn } from "@/lib/utils";

const sections = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", description: "Operations command center", icon: Home },
      { href: "/products", label: "Products", description: "Catalog, stock, images", icon: Boxes },
      { href: "/products/fields", label: "Product schema", description: "Custom fields and rules", icon: DatabaseZap },
    ],
  },
  {
    label: "Connect",
    items: [
      { href: "/integrations", label: "Integrations", description: "Apps, mapping, import/export", icon: Code2, activePrefixes: ["/integration"] },
      { href: "/integration/csv/configuration", label: "Import data", description: "CSV, XLSX, JSON workflow", icon: UploadCloud, activePrefixes: ["/integration/csv", "/integration/xlsx", "/integration/json"] },
      { href: "/api-keys", label: "API keys", description: "Developer access", icon: KeyRound },
      { href: "/webhooks", label: "Webhooks", description: "Event delivery", icon: Webhook },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/settings", label: "Settings", description: "Workspace preferences", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-[18.5rem] shrink-0 overflow-y-auto border-r border-border/70 bg-card/95 p-4 shadow-[12px_0_40px_rgba(15,23,42,0.045)] backdrop-blur-xl md:block">
      <Link href="/dashboard" className="mb-6 flex items-center gap-3 rounded-[1.35rem] border bg-background/85 p-3 shadow-sm transition hover:bg-background">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <PackageSearch className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold leading-5 tracking-tight">InventoryHub</span>
          <span className="block truncate text-xs text-muted-foreground">Product data command center</span>
        </span>
      </Link>

      <div className="mb-5 rounded-[1.25rem] border bg-muted/25 p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          Go-live workspace
        </div>
        <p className="mt-1 text-[0.72rem] leading-5 text-muted-foreground">Products, integrations, APIs, and webhooks in one SaaS-ready console.</p>
      </div>

      <nav className="space-y-6">
        {sections.map((section) => (
          <div key={section.label} className="space-y-2">
            <p className="px-3 text-[0.67rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">{section.label}</p>
            <div className="space-y-1.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`) || item.activePrefixes?.some((prefix) => pathname.startsWith(prefix));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-muted/80 hover:text-foreground",
                      active && "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground",
                    )}
                  >
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition", active ? "bg-white/15" : "bg-background/80 text-muted-foreground group-hover:text-foreground")}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{item.label}</span>
                      <span className={cn("block truncate text-[0.7rem] font-normal", active ? "text-primary-foreground/70" : "text-muted-foreground/80")}>{item.description}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-7 rounded-[1.35rem] border bg-gradient-to-br from-primary to-slate-900 p-4 text-primary-foreground shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4" />
          Production checklist
        </div>
        <p className="mt-2 text-xs leading-5 text-primary-foreground/75">
          Confirm mappings before sync, monitor webhooks, and keep product data clean before launch.
        </p>
        <Link href="/integrations" className="mt-4 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs transition hover:bg-white/15">
          <BarChart3 className="h-3.5 w-3.5" />
          Review integrations
        </Link>
      </div>
    </aside>
  );
}
