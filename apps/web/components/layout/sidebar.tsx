"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Boxes, Code2, Home, KeyRound, Settings, Webhook } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/products", label: "Products", icon: Boxes },
  { href: "/integrations", label: "Integrations", icon: Code2 },
  { href: "/api-keys", label: "API Keys", icon: KeyRound },
  { href: "/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden min-h-screen w-64 border-r bg-white p-4 md:block">
      <Link href="/dashboard" className="mb-8 flex items-center gap-2 px-2 text-lg font-semibold">
        <BarChart3 className="h-5 w-5" /> InventoryHub
      </Link>
      <nav className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground", active && "bg-muted text-foreground")}>
              <Icon className="h-4 w-4" /> {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
