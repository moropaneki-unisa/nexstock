import { AuthGuard } from "@/components/auth/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen overflow-hidden bg-muted/20">
        <Sidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar />
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            {children}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
