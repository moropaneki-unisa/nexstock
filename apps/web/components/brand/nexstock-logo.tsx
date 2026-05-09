import { PackageSearch } from "lucide-react";
import { cn } from "@/lib/utils";

export function NexstockMark({ className }: { className?: string }) {
  return <img src="/nexstock-logo.svg" alt="NexStock" className={cn("h-12 w-auto object-contain", className)} />;
}

export function NexstockLogo({ className, light = false, tagline = true }: { className?: string; light?: boolean; tagline?: boolean }) {
  return (
    <span className={cn("inline-flex items-center", light && "rounded-2xl bg-white/95 px-3 py-2 shadow-[0_18px_48px_rgba(0,0,0,0.18)] ring-1 ring-white/20", className)}>
      <img src="/nexstock-logo.svg" alt="NexStock" className={cn("h-14 w-auto object-contain", !tagline && "h-11")} />
    </span>
  );
}

export function LegacyProductIcon({ className }: { className?: string }) {
  return <PackageSearch className={className} />;
}
