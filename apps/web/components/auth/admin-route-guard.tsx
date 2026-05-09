"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LockKeyhole, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/system/page-shell";
import { apiFetch } from "@/lib/api";

type UserProfile = {
  organization?: {
    role?: string;
  } | null;
};

export function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;
    apiFetch<UserProfile>("/api/users/me")
      .then((profile) => {
        if (active) setAllowed(profile.organization?.role === "admin");
      })
      .catch(() => {
        if (active) setAllowed(false);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <PageShell>
        <div className="border bg-card/95 p-8 text-sm text-muted-foreground">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Checking access...
        </div>
      </PageShell>
    );
  }

  if (!allowed) {
    return (
      <PageShell className="pb-10">
        <section className="border bg-card/95 p-8">
          <div className="flex max-w-xl gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-destructive/10 text-destructive">
              <LockKeyhole className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Admin access required</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">You cannot access this page</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Organization and workspace settings are only available to administrators. Ask an admin to update your role if you need access.
              </p>
              <Button asChild className="mt-5 rounded-xl">
                <Link href="/dashboard">Back to dashboard</Link>
              </Button>
            </div>
          </div>
        </section>
      </PageShell>
    );
  }

  return <>{children}</>;
}
