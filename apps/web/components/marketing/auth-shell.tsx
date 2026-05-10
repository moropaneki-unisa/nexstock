import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CheckCircle2 } from "lucide-react";

import { NexstockLogo } from "@/components/brand/nexstock-logo";

export function AuthShell({
  children,
  eyebrow,
  title,
  description,
  icon: Icon,
  highlights,
  actionHref,
  actionLabel,
  asideFooter,
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  highlights: string[];
  actionHref: string;
  actionLabel: string;
  asideFooter?: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-background/90 px-4 backdrop-blur-xl sm:px-6 lg:px-10">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-6">
          <Link href="/" aria-label="NexStock home" className="flex shrink-0 items-center">
            <NexstockLogo tagline={false} className="px-0 py-0" />
          </Link>
          <Link href={actionHref} className="text-sm font-semibold text-muted-foreground transition hover:text-foreground">
            {actionLabel}
          </Link>
        </div>
      </header>

      <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
        <div className="mx-auto grid min-h-[calc(100vh-9rem)] w-full max-w-7xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_28rem] lg:gap-14">
          <aside className="hidden lg:block">
            <p className="inline-flex items-center gap-2 border bg-card/95 px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground shadow-sm">
              <Icon className="h-3.5 w-3.5 text-primary" /> {eyebrow}
            </p>
            <h1 className="mt-6 max-w-3xl text-5xl font-black tracking-[-0.06em] xl:text-6xl">{title}</h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">{description}</p>

            <section className="mt-8 overflow-hidden border bg-card/95 shadow-sm">
              <div className="divide-y">
                {highlights.map((item) => (
                  <AuthInfoLine key={item} label={item} />
                ))}
              </div>
              {asideFooter ? <div className="border-t bg-muted/25 px-5 py-4">{asideFooter}</div> : null}
            </section>
          </aside>

          <div className="mx-auto w-full max-w-md lg:mx-0">{children}</div>
        </div>
      </section>
    </main>
  );
}

export function AuthCard({
  icon: Icon,
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="overflow-hidden border bg-card/95 shadow-sm">
      <div className="p-6 text-center lg:text-left">
        <div className="mx-auto flex h-11 w-11 items-center justify-center bg-primary/10 text-primary lg:mx-0">
          <Icon className="h-5 w-5" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">{eyebrow}</p>
        <h2 className="mt-2 text-4xl font-black tracking-[-0.05em]">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {children}
      {footer ? <div className="border-t bg-muted/20 px-5 py-4 text-center text-sm text-muted-foreground">{footer}</div> : null}
    </section>
  );
}

export function AuthField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b p-4">
      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</label>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function AuthBanner({ variant = "info", children }: { variant?: "info" | "success" | "error"; children: ReactNode }) {
  const className =
    variant === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : variant === "error"
        ? "border-destructive/30 bg-destructive/10 text-destructive"
        : "border-border bg-muted/35 text-muted-foreground";

  return <div className={`border-b px-4 py-3 text-sm ${className}`}>{children}</div>;
}

export function AuthInfoLine({ label, value = "Ready" }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
        <span className="truncate">{label}</span>
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">{value}</span>
    </div>
  );
}
