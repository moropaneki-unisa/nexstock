"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, refreshAccessToken } from "@/lib/api";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function check() {
      if (getAccessToken()) {
        setReady(true);
        return;
      }
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        router.replace("/login");
        return;
      }
      setReady(true);
    }
    void check();
  }, [router]);

  if (!ready) return <div className="p-6 text-sm text-muted-foreground">Loading workspace...</div>;
  return <>{children}</>;
}
