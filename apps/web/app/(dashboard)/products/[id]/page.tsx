import type { CSSProperties } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { ProductDetailContent } from "@/components/products/product-detail-content"
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
        } as CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <ProductDetailContent productId={id} />
      </SidebarInset>
    </SidebarProvider>
  )
}
