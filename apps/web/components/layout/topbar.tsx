"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Boxes,
  Code2,
  DatabaseZap,
  Home,
  KeyRound,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  Webhook,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logout } from "@/lib/api";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/products", label: "Products", icon: Boxes },
  { href: "/products/fields", label: "Product schema", icon: DatabaseZap },
  { href: "/integrations", label: "Integrations", icon: Code2 },
  { href: "/api-keys", label: "API keys", icon: KeyRound },
  { href: "/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/settings", label: "Settings", icon: Settings },
];

const routeLabels: Record<string, string> = Object.fromEntries(navItems.map((item) => [item.href, item.label]));

export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const title = routeLabels[pathname] ?? (pathname.startsWith("/products") ? "Products" : "Workspace");

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  function handleSearch(value: string) {
    const query = value.trim();
    if (!query) return;
    router.push(`/products?search=${encodeURIComponent(query)}`);
    setMobileOpen(false);
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{title}</p>
            <p className="hidden text-xs text-muted-foreground sm:block">Zoho-first inventory API and product sync platform</p>
          </div>
        </div>

        <div className="hidden w-full max-w-sm items-center gap-2 rounded-xl border bg-muted/40 px-3 py-1.5 lg:flex">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Global search"
            placeholder="Search products, SKUs, integrations..."
            className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSearch(event.currentTarget.value);
            }}
          />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/products/new">
              <Plus className="h-4 w-4" />
              New product
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t bg-background p-4 md:hidden">
          <div className="mb-4 flex items-center gap-2 rounded-xl border bg-muted/40 px-3 py-1.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              aria-label="Mobile product search"
              placeholder="Search products..."
              className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSearch(event.currentTarget.value);
              }}
            />
          </div>

          <nav className="grid gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground",
                    active && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
