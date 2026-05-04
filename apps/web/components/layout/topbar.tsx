"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/api";

export function Topbar() {
  const router = useRouter();
  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div>
        <p className="text-sm font-medium">Product-ready MVP</p>
        <p className="text-xs text-muted-foreground">Zoho-first inventory API foundation</p>
      </div>
      <Button variant="outline" onClick={async () => { await logout(); router.push("/login"); }}>
        Logout
      </Button>
    </header>
  );
}
