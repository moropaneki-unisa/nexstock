"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  CircleDollarSign,
  KeyRound,
  Loader2,
  PackageSearch,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Webhook,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { apiFetch } from "@/lib/api";
import type { Dashboard } from "@/lib/types";

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiFetch<Dashboard>("/api/dashboard");
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const metrics = useMemo(() => {
    if (!data) return [];

    return [
      { label: "Catalog size", value: data.totalProducts, icon: Boxes, helper: "Products managed in this workspace", tone: "default" as const },
      { label: "Low stock", value: data.lowStock, icon: PackageSearch, helper: "Items at or below threshold", tone: data.lowStock > 0 ? "warning" as const : "success" as const },
      { label: "Inventory value", value: formatCurrency(data.inventoryValue), icon: CircleDollarSign, helper: "Current retail value", tone: "success" as const },
      { label: "API keys", value: data.apiKeyCount, icon: KeyRound, helper: "Active developer access", tone: "default" as const },
      { label: "Webhooks", value: data.webhookCount, icon: Webhook, helper: "Event destinations", tone: "default" as const },
    ];
  }, [data]);

  if (loading && !data) {
    return (
      <main className="flex min-h-[65vh] items-center justify-center p-6 text-sm text-muted-foreground">
        <div className="app-surface rounded-[2rem] px-8 py-7 text-center">
          <Loader2 className="mx-auto mb-4 h-6 w-6 animate-spin" />
          <p className="font-medium text-foreground">Loading your operations workspace</p>
          <p className="mt-1 text-xs text-muted-foreground">Preparing product, inventory, and integration signals...</p>
        </div>
      </main>
    );
  }

  if (error && !data) {
    return (
      <PageShell>
        <div className="rounded-[1.5rem] border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
          {error}
        </div>
        <Button type="button" variant="outline" onClick={loadDashboard}>Try again</Button>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Command center"
        title="Run your inventory operations from one place."
        description="A live operational view of catalog health, inventory value, low-stock pressure, developer access, and webhook readiness."
        actions={
          <>
            <Button type="button" variant="outline" onClick={loadDashboard} disabled={loading} className="rounded-xl bg-background/70">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
            <Button asChild className="rounded-xl shadow-sm">
              <Link href="/products/new">
                <Plus className="h-4 w-4" />
                New product
              </Link>
            </Button>
          </>
        }
      />

      {error && (
        <div className="rounded-[1.5rem] border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label} className="soft-panel rounded-[1.5rem]">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                  <span className={metric.tone === "warning" ? "rounded-2xl bg-amber-500 p-2.5 text-white" : metric.tone === "success" ? "rounded-2xl bg-emerald-600 p-2.5 text-white" : "rounded-2xl bg-primary p-2.5 text-primary-foreground"}>
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-5 text-3xl font-semibold tracking-[-0.03em]">{metric.value}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{metric.helper}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="soft-panel rounded-[1.75rem]">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" /> Operations feed
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Recent product and inventory events from the backend.</p>
            </div>
            <Badge variant="secondary" className="rounded-full">Live</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {!data?.recentActivity.length ? (
              <div className="rounded-[1.5rem] border border-dashed bg-background/60 p-10 text-center">
                <Activity className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-semibold">No activity yet</p>
                <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted-foreground">Create products, update stock, connect Zoho, or trigger webhooks to populate this activity stream.</p>
                <Button asChild className="mt-5 rounded-xl">
                  <Link href="/products/new">Create first product</Link>
                </Button>
              </div>
            ) : (
              data.recentActivity.map((item, index) => (
                <div key={item.id} className="flex gap-4 rounded-[1.25rem] border bg-background/70 p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{item.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="overflow-hidden rounded-[1.75rem] border-0 bg-gradient-to-br from-primary to-slate-800 text-primary-foreground shadow-xl shadow-slate-950/10">
            <CardContent className="p-6">
              <Sparkles className="h-7 w-7 text-white/80" />
              <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em]">Go-live health</h2>
              <p className="mt-2 text-sm leading-6 text-primary-foreground/75">Core SaaS surfaces are active. Finish image storage, Zoho credentials, and production envs before customer launch.</p>
              <div className="mt-6 grid gap-2 text-sm">
                <HealthRow icon={CheckCircle2} label="Protected app shell" value="Ready" />
                <HealthRow icon={ShieldCheck} label="Auth + refresh" value="Ready" />
                <HealthRow icon={Zap} label="Zoho sync" value="Configure" />
              </div>
            </CardContent>
          </Card>

          <Card className="soft-panel rounded-[1.75rem]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Recommended next actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ActionLink href="/products" label="Review product catalog" />
              <ActionLink href="/integrations" label="Connect Zoho Inventory" />
              <ActionLink href="/api-keys" label="Create production API key" />
              <ActionLink href="/webhooks" label="Configure webhook endpoint" />
            </CardContent>
          </Card>
        </div>
      </section>
    </PageShell>
  );
}

function HealthRow({ icon: Icon, label, value }: { icon: typeof CheckCircle2; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/10 px-3 py-2.5">
      <span className="flex items-center gap-2 text-primary-foreground/85"><Icon className="h-4 w-4" /> {label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-2xl border bg-background/70 px-4 py-3 font-medium transition hover:bg-muted">
      {label}
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}
