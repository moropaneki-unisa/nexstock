import type { ReactNode } from "react";
import { ArrowRight, LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={cn("mx-auto w-full max-w-[1440px] space-y-7 px-4 py-6 sm:px-6 lg:px-8", className)}>{children}</main>;
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
    <section className="app-surface relative overflow-hidden rounded-[2rem] px-5 py-6 sm:px-7 sm:py-7">
      <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-4xl space-y-2">
          {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{eyebrow}</p>}
          <h1 className="text-3xl font-semibold tracking-[-0.035em] text-foreground sm:text-4xl">{title}</h1>
          {description && <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>}
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
    <Card className="soft-panel overflow-hidden rounded-[1.5rem] border-border/80">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <span className={cn("rounded-2xl p-2.5 shadow-sm", toneClass)}>
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <p className="mt-5 text-3xl font-semibold tracking-[-0.03em]">{value}</p>
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
    <div className="rounded-[1.75rem] border border-dashed bg-card/70 p-10 text-center shadow-sm">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-5 text-base font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {actionLabel && onAction && (
        <Button className="mt-6 rounded-xl" onClick={onAction}>
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
    <Card className="soft-panel rounded-[1.5rem]">
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
