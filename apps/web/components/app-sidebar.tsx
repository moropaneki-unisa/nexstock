"use client"

import * as React from "react"
import Link from "next/link"
import {
  BoxesIcon,
  Building2Icon,
  ChartNoAxesCombinedIcon,
  ClipboardListIcon,
  CreditCardIcon,
  DatabaseZapIcon,
  FileSpreadsheetIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  PackageIcon,
  Settings2Icon,
  SparklesIcon,
  TruckIcon,
  UserRoundIcon,
  WebhookIcon,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { apiFetch } from "@/lib/api"

type CurrentUser = {
  name?: string | null
  email?: string | null
  avatar?: string | null
  image?: string | null
  organization?: {
    name?: string | null
    role?: string | null
  } | null
}

const fallbackUser = {
  name: "NexStock User",
  email: "workspace@nexstock.co.za",
  avatar: "",
}

const data = {
  workspace: [
    { title: "Dashboard", url: "/dashboard", icon: <LayoutDashboardIcon /> },
    { title: "Products", url: "/products", icon: <BoxesIcon /> },
    { title: "Suppliers", url: "/suppliers", icon: <TruckIcon /> },
    { title: "Purchase Orders", url: "/purchase-orders", icon: <ClipboardListIcon /> },
  ],
  dataTools: [
    { title: "Imports", url: "/imports", icon: <FileSpreadsheetIcon /> },
    { title: "Data Tools", url: "/data-tools", icon: <DatabaseZapIcon /> },
    { title: "Product Fields", url: "/products/fields", icon: <PackageIcon /> },
  ],
  connect: [
    { title: "Integrations", url: "/integrations", icon: <SparklesIcon /> },
    { title: "API Keys", url: "/api-keys", icon: <KeyRoundIcon /> },
    { title: "Webhooks", url: "/webhooks", icon: <WebhookIcon /> },
  ],
  account: [
    { title: "Billing", url: "/billing", icon: <CreditCardIcon /> },
    { title: "Organization", url: "/organization", icon: <Building2Icon /> },
    { title: "Profile", url: "/profile", icon: <UserRoundIcon /> },
    { title: "Settings", url: "/settings", icon: <Settings2Icon /> },
  ],
}

function normalizeUser(user: CurrentUser | null) {
  if (!user) return fallbackUser

  return {
    name: user.name || user.email || fallbackUser.name,
    email: user.email || fallbackUser.email,
    avatar: user.avatar || user.image || "",
  }
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [currentUser, setCurrentUser] = React.useState<CurrentUser | null>(null)

  React.useEffect(() => {
    let active = true

    apiFetch<CurrentUser>("/api/users/me")
      .then((user) => {
        if (active) setCurrentUser(user)
      })
      .catch(() => {
        if (active) setCurrentUser(null)
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="NexStock" className="data-[slot=sidebar-menu-button]:p-1.5!">
              <Link href="/dashboard">
                <ChartNoAxesCombinedIcon className="size-5! text-primary" />
                <span className="text-base font-semibold">NexStock</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain label="Workspace" items={data.workspace} />
        <NavMain label="Data" items={data.dataTools} />
        <NavMain label="Connect" items={data.connect} />
        <NavSecondary items={data.account} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={normalizeUser(currentUser)} />
      </SidebarFooter>
    </Sidebar>
  )
}
