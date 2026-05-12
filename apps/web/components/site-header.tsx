"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

const routes: Array<{ prefix: string; section: string; title: string }> = [
  { prefix: "/dashboard", section: "Workspace", title: "Dashboard" },
  { prefix: "/products/fields", section: "Data", title: "Product Fields" },
  { prefix: "/products", section: "Workspace", title: "Products" },
  { prefix: "/suppliers", section: "Workspace", title: "Suppliers" },
  { prefix: "/purchase-orders", section: "Workspace", title: "Purchase Orders" },
  { prefix: "/imports", section: "Data", title: "Imports" },
  { prefix: "/data-tools", section: "Data", title: "Data Tools" },
  { prefix: "/integrations", section: "Connect", title: "Integrations" },
  { prefix: "/api-keys", section: "Connect", title: "API Keys" },
  { prefix: "/webhooks", section: "Connect", title: "Webhooks" },
  { prefix: "/billing", section: "Account", title: "Billing" },
  { prefix: "/organization", section: "Account", title: "Organization" },
  { prefix: "/profile", section: "Account", title: "Profile" },
  { prefix: "/settings", section: "Account", title: "Settings" },
]

export function SiteHeader() {
  const pathname = usePathname()
  const current = routes.find((item) => pathname.startsWith(item.prefix)) || {
    section: "Workspace",
    title: "NexStock",
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink asChild>
                <Link href="/dashboard">{current.section}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>{current.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  )
}
