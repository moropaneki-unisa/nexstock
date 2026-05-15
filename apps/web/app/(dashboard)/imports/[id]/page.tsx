import { AppSidebar } from "@/components/app-sidebar"
import { ImportDetailContent } from "@/components/imports/import-detail-content"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function Page({ params }: { params: { id: string } }) {
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
        <ImportDetailContent logId={params.id} />
      </SidebarInset>
    </SidebarProvider>
  )
}
