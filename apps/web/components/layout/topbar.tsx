"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logout } from "@/lib/api";

const routeLabels: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/products": "Products",
  "/products/fields": "Product schema",
  "/integrations": "Integrations",
  "/api-keys": "API keys",
  "/webhooks": "Webhooks",
  "/settings": "Settings",
};

export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const title = routeLabels[pathname] ?? (pathname.startsWith("/products") ? "Products" : "Workspace");

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation">
          <Menu className="h-5 w-5" />
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
            if (event.key === "Enter") {
              const value = event.currentTarget.value.trim();
              if (value) router.push(`/products?search=${encodeURIComponent(value)}`);
            }
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
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            await logout();
            router.push("/login");
          }}
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
