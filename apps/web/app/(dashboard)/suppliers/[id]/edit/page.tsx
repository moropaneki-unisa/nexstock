import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SupplierFormContent } from "@/components/suppliers/supplier-form-content"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

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
        <SupplierFormContent supplierId={id} />
      </SidebarInset>
    </SidebarProvider>
  )
}
