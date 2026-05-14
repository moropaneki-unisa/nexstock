import { AppSidebar } from "@/components/app-sidebar"
import { ProductFormAlignmentFix } from "@/components/products/product-form-alignment-fix"
import { ProductFormWithLayout } from "@/components/products/product-form-with-layout"
import { SiteHeader } from "@/components/site-header"
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
        <ProductFormAlignmentFix />
        <ProductFormWithLayout productId={id} />
      </SidebarInset>
    </SidebarProvider>
  )
}
