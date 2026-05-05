import type { ReactNode } from "react";
import { ArrowRight, LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={cn("mx-auto w-full max-w-[1440px] space-y-5 px-4 py-4 sm:px-6 lg:px-7", className)}>{children}</main>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <section className="border-b border-border/70 pb-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-1">
          {eyebrow && <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{eyebrow}</p>}
          <h1 className="truncate text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl">{title}</h1>
          {description && <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </section>
  );
}

export function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  helper?: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    default: "bg-primary text-primary-foreground",
    success: "bg-emerald-600 text-white",
    warning: "bg-amber-500 text-white",
    danger: "bg-destructive text-white",
  }[tone];

  return (
    <Card className="soft-panel overflow-hidden rounded-[1.25rem] border-border/80">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <span className={cn("rounded-xl p-2 shadow-sm", toneClass)}>
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <p className="mt-4 text-2xl font-semibold tracking-[-0.03em]">{value}</p>
        {helper && <p className="mt-1 text-xs leading-5 text-muted-foreground">{helper}</p>}
      </CardContent>
    </Card>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-[1.25rem] border border-dashed bg-card/70 p-8 text-center shadow-sm">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {actionLabel && onAction && (
        <Button className="mt-5 rounded-xl" onClick={onAction}>
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export function ReadinessCard({
  title,
  description,
  items,
}: {
  title: string;
  description?: string;
  items: Array<{ label: string; detail: string; status: "ready" | "next" | "planned" }>;
}) {
  return (
    <Card className="soft-panel rounded-[1.25rem]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-2xl border bg-background/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">{item.label}</p>
              <Badge variant={item.status === "ready" ? "default" : item.status === "next" ? "secondary" : "outline"}>
                {item.status === "ready" ? "Ready" : item.status === "next" ? "Next" : "Planned"}
              </Badge>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
