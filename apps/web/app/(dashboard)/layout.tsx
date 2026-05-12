import { AppSidebar } from "@/components/app-sidebar";
import { AuthGuard } from "@/components/auth/auth-guard";
import { BaseCurrencyProductCatalog } from "@/components/products/base-currency-product-catalog";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <main className="flex flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
              <BaseCurrencyProductCatalog>{children}</BaseCurrencyProductCatalog>
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}
