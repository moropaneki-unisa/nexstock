import { AuthGuard } from "@/components/auth/auth-guard";
import { AppFooter } from "@/components/layout/app-footer";
import { CommandPalette } from "@/components/layout/command-palette";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="fixed inset-0 flex overflow-hidden bg-[radial-gradient(circle_at_12%_8%,rgba(99,102,241,0.10),transparent_28rem),radial-gradient(circle_at_92%_0%,rgba(16,185,129,0.10),transparent_24rem),linear-gradient(180deg,#fbfbfd,#f4f6fb)] text-foreground">
        <Sidebar />
        <div className="flex h-dvh min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar commandPalette={<CommandPalette />} />
          <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain scroll-smooth">
            <div className="pointer-events-none fixed inset-x-0 top-[4.25rem] h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            <div className="min-h-[calc(100dvh-4rem)]">
              {children}
            </div>
            <AppFooter compact />
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
