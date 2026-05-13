import { AppSidebar } from "@/components/app-sidebar"
import { PurchaseOrdersContent } from "@/components/purchase-orders/purchase-orders-content"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function Page() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 16)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <PurchaseOrdersContent />
      </SidebarInset>
    </SidebarProvider>
  )
}
