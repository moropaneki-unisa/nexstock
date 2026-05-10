import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function LandingContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-7xl", className)}>{children}</div>;
}

export function LandingNarrowContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-4xl", className)}>{children}</div>;
}
