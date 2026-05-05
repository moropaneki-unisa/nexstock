import { AuthGuard } from "@/components/auth/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="fixed inset-0 flex overflow-hidden bg-background">
        <Sidebar />
        <div className="flex h-dvh min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar />
          <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain scroll-smooth">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
