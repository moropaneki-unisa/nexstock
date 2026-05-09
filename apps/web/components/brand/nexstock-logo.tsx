import { PackageSearch } from "lucide-react";
import { cn } from "@/lib/utils";

export function NexstockMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-zinc-950 text-white shadow-[0_20px_45px_rgba(0,0,0,0.22)] ring-1 ring-white/10", className)}>
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_25%_10%,rgba(255,255,255,0.32),transparent_26%),linear-gradient(135deg,#050505,#18181b_45%,#000)]" />
      <span className="relative flex h-6 w-6 items-end gap-0.5">
        <span className="h-3.5 w-1.5 rounded-full bg-white" />
        <span className="h-5 w-1.5 rounded-full bg-white" />
        <span className="h-6 w-1.5 rounded-full bg-white" />
      </span>
      <span className="absolute bottom-3 left-2.5 h-1.5 w-6 -rotate-45 rounded-full bg-white" />
    </span>
  );
}

export function NexstockLogo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <NexstockMark />
      <span className="leading-none">
        <span className={cn("block text-lg font-bold tracking-[-0.04em]", light ? "text-white" : "text-zinc-950")}>NexStock</span>
        <span className={cn("mt-1 block text-[0.62rem] font-semibold uppercase tracking-[0.32em]", light ? "text-white/55" : "text-zinc-500")}>Connect · Manage · Grow</span>
      </span>
    </span>
  );
}

export function LegacyProductIcon({ className }: { className?: string }) {
  return <PackageSearch className={className} />;
}
