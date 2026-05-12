"use client"

import { usePathname } from "next/navigation"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

const titles: Array<{ prefix: string; title: string }> = [
  { prefix: "/dashboard", title: "Dashboard" },
  { prefix: "/products/fields", title: "Product Fields" },
  { prefix: "/products", title: "Products" },
  { prefix: "/suppliers", title: "Suppliers" },
  { prefix: "/purchase-orders", title: "Purchase Orders" },
  { prefix: "/imports", title: "Imports" },
  { prefix: "/data-tools", title: "Data Tools" },
  { prefix: "/integrations", title: "Integrations" },
  { prefix: "/api-keys", title: "API Keys" },
  { prefix: "/webhooks", title: "Webhooks" },
  { prefix: "/billing", title: "Billing" },
  { prefix: "/organization", title: "Organization" },
  { prefix: "/profile", title: "Profile" },
  { prefix: "/settings", title: "Settings" },
]

export function SiteHeader() {
  const pathname = usePathname()
  const pageTitle = titles.find((item) => pathname.startsWith(item.prefix))?.title || "NexStock"

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
        <div>
          <h1 className="text-base font-medium">{pageTitle}</h1>
          <p className="hidden text-xs text-muted-foreground sm:block">
            Inventory, suppliers, purchasing, imports, and connected workflows
          </p>
        </div>
      </div>
    </header>
  )
}
