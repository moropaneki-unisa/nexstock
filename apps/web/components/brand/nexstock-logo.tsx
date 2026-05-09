import { PackageSearch } from "lucide-react";
import { cn } from "@/lib/utils";

export function NexstockMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl shadow-[0_20px_60px_rgba(59,130,246,0.28)] ring-1 ring-white/15", className)}>
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(255,255,255,0.38),transparent_24%),linear-gradient(135deg,#6d5dfc_0%,#2f7cff_36%,#17d6d1_68%,#35e6a4_100%)]" />
      <span className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(0,0,0,0.20)_52%,transparent_100%)]" />
      <span className="relative h-7 w-8">
        <span className="absolute left-0 top-1 h-6 w-2.5 -rotate-45 rounded-full bg-white/95 shadow-sm" />
        <span className="absolute left-3.5 top-0 h-8 w-2.5 -rotate-45 rounded-full bg-white/80 shadow-sm" />
        <span className="absolute right-0 top-0 h-3 w-2 rounded-sm bg-white/95" />
        <span className="absolute right-0 top-4 h-3 w-2 rounded-sm bg-white/80" />
      </span>
    </span>
  );
}

export function NexstockLogo({ className, light = false, tagline = true }: { className?: string; light?: boolean; tagline?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <NexstockMark />
      <span className="leading-none">
        <span className={cn("block text-xl font-bold tracking-[-0.045em]", light ? "text-white" : "text-slate-950")}>NexStock</span>
        {tagline && <span className={cn("mt-1.5 block text-[0.62rem] font-semibold uppercase tracking-[0.34em]", light ? "text-cyan-100/70" : "text-slate-500")}>Connect · Manage · Grow</span>}
      </span>
    </span>
  );
}

export function LegacyProductIcon({ className }: { className?: string }) {
  return <PackageSearch className={className} />;
}
