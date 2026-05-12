"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Boxes,
  Building2,
  CheckSquare,
  ClipboardList,
  Code2,
  DatabaseZap,
  Home,
  KeyRound,
  Settings,
  ShieldCheck,
  Sparkles,
  Truck,
  UploadCloud,
  UserRound,
  Webhook,
  type LucideIcon,
} from "lucide-react";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  activePrefixes?: string[];
  adminOnly?: boolean;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

type UserProfile = {
  organization?: {
    role?: string;
  } | null;
};

const sections: NavSection[] = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", description: "Operations command center", icon: Home },
      { href: "/my-tasks", label: "My tasks", description: "Launch work, reminders", icon: CheckSquare },
      { href: "/products", label: "Products", description: "Catalog, stock, images", icon: Boxes },
      { href: "/suppliers", label: "Suppliers", description: "Vendors, costs, lead times", icon: Truck },
      { href: "/purchase-orders", label: "Purchase orders", description: "Supplier orders, receiving", icon: ClipboardList, activePrefixes: ["/purchase-orders"] },
      { href: "/products/fields", label: "Product fields", description: "Default and additional fields", icon: DatabaseZap },
    ],
  },
  {
    label: "Connect",
    items: [
      { href: "/integrations", label: "Integrations", description: "Apps, mapping, import/export", icon: Code2, activePrefixes: ["/integrations", "/integration"] },
      { href: "/imports", label: "Import data", description: "Upload, map, validate, import", icon: UploadCloud, activePrefixes: ["/imports"] },
      { href: "/data-tools", label: "Data tools", description: "Sanitize and convert", icon: Sparkles },
      { href: "/api-keys", label: "API keys", description: "Developer access", icon: KeyRound },
      { href: "/webhooks", label: "Webhooks", description: "Event delivery", icon: Webhook },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/profile", label: "My profile", description: "Edit profile and password", icon: UserRound },
      { href: "/organization", label: "Organization", description: "Users, roles, billing, security", icon: Building2, adminOnly: true },
      { href: "/settings", label: "Settings", description: "Workspace preferences", icon: Settings, adminOnly: true },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    apiFetch<UserProfile>("/api/users/me")
      .then((profile) => {
        if (active) setIsAdmin(profile.organization?.role === "admin");
      })
      .catch(() => {
        if (active) setIsAdmin(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleSections = sections
    .map((section) => ({ ...section, items: section.items.filter((item) => !item.adminOnly || isAdmin) }))
    .filter((section) => section.items.length > 0);

  return (
    <aside className="hidden h-screen w-[18.5rem] shrink-0 overflow-y-auto border-r border-border/70 bg-card/95 md:block">
      <div className="border-b p-4">
        <Link href="/dashboard" className="block border bg-background/70 px-3 py-3 transition hover:bg-muted/45" aria-label="NexStock dashboard">
          <img src="/nexstock-logo.svg" alt="NexStock" className="h-12 w-full object-contain object-left" />
        </Link>
      </div>

      <div className="border-b bg-muted/15 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          Go-live workspace
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">Products, integrations, APIs, webhooks, users, and permissions in one SaaS-ready console.</p>
      </div>

      <nav className="divide-y">
        {visibleSections.map((section) => (
          <section key={section.label} className="py-4">
            <p className="px-4 text-[0.67rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">{section.label}</p>
            <div className="mt-3 divide-y border-y">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`) || item.activePrefixes?.some((prefix) => pathname.startsWith(prefix));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-3 px-4 py-3 text-sm font-medium text-muted-foreground transition hover:bg-muted/45 hover:text-foreground",
                      active && "bg-primary/10 text-foreground hover:bg-primary/10",
                    )}
                  >
                    {active && <span className="absolute inset-y-0 left-0 w-1 bg-primary" />}
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center border bg-background text-muted-foreground transition group-hover:text-foreground", active && "border-primary/30 bg-primary text-primary-foreground")}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{item.label}</span>
                      <span className="block truncate text-[0.7rem] font-normal text-muted-foreground/80">{item.description}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      {isAdmin && (
        <div className="border-t p-4">
          <section className="border bg-card/95">
            <div className="p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-primary" />
                Production checklist
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Confirm mappings, invite users, review security, monitor webhooks, and keep product data clean before launch.
              </p>
            </div>
            <Link href="/organization" className="flex items-center gap-2 border-t bg-muted/20 px-4 py-3 text-xs font-medium transition hover:bg-muted/45">
              <BarChart3 className="h-3.5 w-3.5 text-primary" />
              Review admin setup
            </Link>
          </section>
        </div>
      )}
    </aside>
  );
}
