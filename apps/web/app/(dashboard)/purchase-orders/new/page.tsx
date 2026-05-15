import type { CSSProperties } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { PurchaseOrderFormContent } from "@/components/purchase-orders/purchase-order-form-content"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function Page() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 16)",
        } as CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <PurchaseOrderFormContent />
      </SidebarInset>
    </SidebarProvider>
  )
}
