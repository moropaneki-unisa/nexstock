import type { CSSProperties } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { TaskDetailContent } from "@/components/tasks/tasks-content"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

const sidebarStyle = {
  "--sidebar-width": "calc(var(--spacing) * 72)",
  "--header-height": "calc(var(--spacing) * 16)",
} as CSSProperties

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <SidebarProvider style={sidebarStyle}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <TaskDetailContent taskId={id} />
      </SidebarInset>
    </SidebarProvider>
  )
}
