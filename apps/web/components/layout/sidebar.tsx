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
  Sparkles,
  Webhook,
} from "lucide-react";

import { cn } from "@/lib/utils";

const sections = [
  {
    label: "Operate",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: Home },
      { href: "/products", label: "Products", icon: Boxes },
      { href: "/products/fields", label: "Product schema", icon: DatabaseZap },
    ],
  },
  {
    label: "Connect",
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
    <aside className="hidden h-screen w-[18rem] shrink-0 overflow-y-auto border-r border-border/70 bg-card/80 p-4 shadow-[12px_0_40px_rgba(15,23,42,0.035)] backdrop-blur-xl md:block">
      <Link href="/dashboard" className="mb-7 flex items-center gap-3 rounded-[1.35rem] border bg-background/75 p-3 shadow-sm transition hover:bg-background">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <PackageSearch className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold leading-5 tracking-tight">InventoryHub</span>
          <span className="block truncate text-xs text-muted-foreground">Zoho-first product OS</span>
        </span>
      </Link>

      <nav className="space-y-7">
        {sections.map((section) => (
          <div key={section.label} className="space-y-2.5">
            <p className="px-3 text-[0.67rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">{section.label}</p>
            <div className="space-y-1.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted/80 hover:text-foreground",
                      active && "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground",
                    )}
                  >
                    <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl transition", active ? "bg-white/15" : "bg-background/70 text-muted-foreground group-hover:text-foreground")}>
                      <Icon className="h-4 w-4" />
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-8 rounded-[1.35rem] border bg-gradient-to-br from-primary to-slate-800 p-4 text-primary-foreground shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4" />
          Launch-ready workspace
        </div>
        <p className="mt-2 text-xs leading-5 text-primary-foreground/75">
          Manage products, stock, Zoho sync, API keys, and webhooks from one professional inventory command center.
        </p>
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs">
          <BarChart3 className="h-3.5 w-3.5" />
          Production UI active
        </div>
      </div>
    </aside>
  );
}
