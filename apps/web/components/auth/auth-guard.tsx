"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PackageSearch } from "lucide-react";

import { getAccessToken, refreshAccessToken } from "@/lib/api";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function check() {
      if (getAccessToken()) {
        if (mounted) setReady(true);
        return;
      }

      const refreshed = await refreshAccessToken();
      if (!mounted) return;

      if (!refreshed) {
        router.replace("/login");
        return;
      }

      setReady(true);
    }

    void check();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <div>
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <PackageSearch className="h-5 w-5" />
          </span>
          <div className="mt-5 flex items-center justify-center gap-2 text-sm font-medium text-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            Loading workspace
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Checking your secure session...</p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
