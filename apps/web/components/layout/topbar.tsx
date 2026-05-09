"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Boxes,
  Building2,
  Code2,
  DatabaseZap,
  Home,
  KeyRound,
  LogOut,
  Menu,
  PackageSearch,
  Plus,
  Search,
  Settings,
  Sparkles,
  UploadCloud,
  Webhook,
  X,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logout } from "@/lib/api";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/products", label: "Products", icon: Boxes },
  { href: "/products/fields", label: "Product fields", icon: DatabaseZap },
  { href: "/integrations", label: "Integrations", icon: Code2, activePrefixes: ["/integration"] },
  { href: "/integration/csv/configuration", label: "Import data", icon: UploadCloud, activePrefixes: ["/integration/csv", "/integration/xlsx", "/integration/json"] },
  { href: "/api-keys", label: "API keys", icon: KeyRound },
  { href: "/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/organization", label: "Organization", icon: Building2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

const routeCopy = [
  { match: (path: string) => path.startsWith("/integration/"), title: "Integration workflow", description: "Configure, map, confirm, sync, and review integration activity" },
  { match: (path: string) => path.startsWith("/integrations"), title: "Integrations", description: "Choose apps, file imports, and source mappings" },
  { match: (path: string) => path.startsWith("/products/fields"), title: "Product fields", description: "Default and additional product data fields" },
  { match: (path: string) => path.startsWith("/products"), title: "Products", description: "Catalog, stock, images, and product records" },
  { match: (path: string) => path.startsWith("/api-keys"), title: "API keys", description: "Secure developer access for external systems" },
  { match: (path: string) => path.startsWith("/webhooks"), title: "Webhooks", description: "Reliable event delivery for product changes" },
  { match: (path: string) => path.startsWith("/organization"), title: "Organization", description: "Users, roles, permissions, plan, and security" },
  { match: (path: string) => path.startsWith("/settings"), title: "Settings", description: "Workspace preferences and defaults" },
  { match: (path: string) => path.startsWith("/dashboard"), title: "Dashboard", description: "Inventory operations command center" },
];

export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const route = routeCopy.find((item) => item.match(pathname)) ?? { title: "Workspace", description: "NexStock operations" };

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
    <header className="sticky top-0 z-30 border-b border-border/70 bg-card/90 shadow-sm backdrop-blur-xl">
      <div className="flex h-[4.25rem] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-xl md:hidden" aria-label={mobileOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileOpen} onClick={() => setMobileOpen((open) => !open)}>{mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</Button>
          <div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-sm font-semibold tracking-tight">{route.title}</p><span className="hidden items-center gap-1 rounded-full border bg-background/70 px-2 py-0.5 text-[0.68rem] font-medium text-muted-foreground sm:inline-flex"><Sparkles className="h-3 w-3" /> Live workspace</span></div><p className="hidden text-xs text-muted-foreground sm:block">{route.description}</p></div>
        </div>
        <div className="hidden w-full max-w-md items-center gap-2 rounded-2xl border bg-background/80 px-3 py-2 shadow-sm lg:flex"><Search className="h-4 w-4 text-muted-foreground" /><Input aria-label="Global product search" placeholder="Search products, SKUs, categories..." className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" onKeyDown={(event) => { if (event.key === "Enter") handleSearch(event.currentTarget.value); }} /></div>
        <div className="flex shrink-0 items-center gap-2"><Button asChild size="sm" variant="outline" className="hidden rounded-xl bg-background/70 sm:inline-flex"><Link href="/organization"><Building2 className="h-4 w-4" />Organization</Link></Button><Button asChild size="sm" className="hidden rounded-xl shadow-sm sm:inline-flex"><Link href="/products/new"><Plus className="h-4 w-4" />New product</Link></Button><Button variant="outline" size="sm" onClick={handleLogout} className="rounded-xl bg-background/70"><LogOut className="h-4 w-4" /><span className="hidden sm:inline">Logout</span></Button></div>
      </div>
      {mobileOpen && <div className="border-t bg-card/95 p-4 shadow-lg backdrop-blur-xl md:hidden"><div className="mb-4 flex items-center gap-2 rounded-2xl border bg-background/80 px-3 py-2 shadow-sm"><Search className="h-4 w-4 text-muted-foreground" /><Input aria-label="Mobile product search" placeholder="Search products..." className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" onKeyDown={(event) => { if (event.key === "Enter") handleSearch(event.currentTarget.value); }} /></div><nav className="grid gap-1.5">{navItems.map((item) => <MobileNavItem key={item.href} item={item} pathname={pathname} onClick={() => setMobileOpen(false)} />)}</nav></div>}
    </header>
  );
}

function MobileNavItem({ item, pathname, onClick }: { item: { href: string; label: string; icon: LucideIcon; activePrefixes?: string[] }; pathname: string; onClick: () => void }) {
  const Icon = item.icon;
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`) || item.activePrefixes?.some((prefix) => pathname.startsWith(prefix));
  return <Link href={item.href} onClick={onClick} className={cn("flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground", active && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground")}><Icon className="h-4 w-4" />{item.label}</Link>;
}
