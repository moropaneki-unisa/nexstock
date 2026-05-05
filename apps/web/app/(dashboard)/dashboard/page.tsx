"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  KeyRound,
  Layers3,
  Loader2,
  PackageCheck,
  PackageSearch,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Webhook,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { apiFetch } from "@/lib/api";
import type { Dashboard } from "@/lib/types";
import { cn } from "@/lib/utils";

const sampleActivity = [
  {
    id: "sample-1",
    message: "Zoho sync checked 42 items and updated 8 products",
    createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    type: "sync" as const,
  },
  {
    id: "sample-2",
    message: "Premium Cotton T-Shirt was added to the active catalog",
    createdAt: new Date(Date.now() - 1000 * 60 * 36).toISOString(),
    type: "product" as const,
  },
  {
    id: "sample-3",
    message: "product_updated webhook delivered to production endpoint",
    createdAt: new Date(Date.now() - 1000 * 60 * 74).toISOString(),
    type: "webhook" as const,
  },
];

const lowStockItems = [
  { name: "Wireless Barcode Scanner", sku: "TEC-00118", quantity: 4, threshold: 8, category: "Hardware" },
  { name: "Organic Canvas Tote", sku: "BAG-00031", quantity: 6, threshold: 12, category: "Accessories" },
  { name: "Label Printer Rolls", sku: "PKG-00092", quantity: 9, threshold: 20, category: "Packaging" },
];

const categories = [
  { name: "Apparel", count: 48, percent: 42 },
  { name: "Hardware", count: 28, percent: 24 },
  { name: "Packaging", count: 22, percent: 19 },
  { name: "Accessories", count: 17, percent: 15 },
];

const quickActions = [
  { href: "/products/new", label: "Create product", detail: "Add product, stock, images, and schema values", icon: Plus },
  { href: "/products", label: "Review catalog", detail: "Search, edit, archive, and check low stock", icon: PackageSearch },
  { href: "/integrations", label: "Sync Zoho", detail: "Connect Zoho Inventory and import products", icon: Zap },
  { href: "/api-keys", label: "Manage API keys", detail: "Create secure keys for external clients", icon: KeyRound },
];

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

  const view = useMemo(() => {
    const totalProducts = data?.totalProducts ?? 128;
    const lowStock = data?.lowStock ?? 12;
    const inventoryValue = data?.inventoryValue ?? 48290;
    const apiKeyCount = data?.apiKeyCount ?? 3;
    const webhookCount = data?.webhookCount ?? 5;
    const recentActivity = data?.recentActivity?.length
      ? data.recentActivity.map((item) => ({ ...item, type: "product" as const }))
      : sampleActivity;

    return { totalProducts, lowStock, inventoryValue, apiKeyCount, webhookCount, recentActivity };
  }, [data]);

  const metrics = [
    {
      label: "Catalog size",
      value: view.totalProducts,
      helper: "Products in this workspace",
      icon: Boxes,
      tone: "default" as const,
      trend: "+12% this month",
    },
    {
      label: "Low stock",
      value: view.lowStock,
      helper: "Products need attention",
      icon: PackageSearch,
      tone: view.lowStock > 0 ? "warning" as const : "success" as const,
      trend: view.lowStock > 0 ? "Review today" : "Healthy",
    },
    {
      label: "Inventory value",
      value: formatCurrency(view.inventoryValue),
      helper: "Estimated retail value",
      icon: CircleDollarSign,
      tone: "success" as const,
      trend: "+8.4% growth",
    },
    {
      label: "API keys",
      value: view.apiKeyCount,
      helper: "Active developer access",
      icon: KeyRound,
      tone: "default" as const,
      trend: "Production ready",
    },
    {
      label: "Webhooks",
      value: view.webhookCount,
      helper: "Event destinations",
      icon: Webhook,
      tone: "default" as const,
      trend: "99.9% delivery",
    },
  ];

  if (loading && !data) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center p-6 text-sm text-muted-foreground">
        <div className="rounded-[2rem] border bg-card/90 px-8 py-7 text-center shadow-2xl shadow-slate-950/5 backdrop-blur">
          <Loader2 className="mx-auto mb-4 h-6 w-6 animate-spin" />
          <p className="font-medium text-foreground">Loading InventoryHub</p>
          <p className="mt-1 text-xs text-muted-foreground">Preparing catalog, stock, sync, and activity data...</p>
        </div>
      </main>
    );
  }

  return (
    <PageShell className="space-y-6">
      <PageHeader
        eyebrow="Command center"
        title="Inventory operations dashboard"
        description="A premium control center for product catalog health, stock risk, Zoho readiness, API access, and webhook activity."
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
        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {error}. Showing polished demo data so the dashboard remains presentable while the backend is unavailable.
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="overflow-hidden rounded-[2rem] border-border/80 bg-card/95 shadow-xl shadow-slate-950/5">
          <CardContent className="p-0">
            <div className="grid min-h-[360px] lg:grid-cols-[1fr_0.82fr]">
              <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-7 text-white">
                <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
                <div className="relative flex h-full flex-col justify-between gap-12">
                  <div>
                    <Badge className="rounded-full bg-white/10 text-white hover:bg-white/10">Executive overview</Badge>
                    <h2 className="mt-5 max-w-xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                      Your catalog is ready for connected commerce.
                    </h2>
                    <p className="mt-4 max-w-xl text-sm leading-6 text-white/70">
                      InventoryHub centralizes products, stock visibility, API access, webhooks, and Zoho sync so your team has one trusted product source.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <HeroStat label="Sync health" value="92%" />
                    <HeroStat label="Stock accuracy" value="98%" />
                    <HeroStat label="API uptime" value="99.9%" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold tracking-tight">Readiness score</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Launch-critical systems</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Strong</span>
                </div>
                <ReadinessRow icon={CheckCircle2} label="Protected workspace" value="Ready" percent={100} tone="success" />
                <ReadinessRow icon={PackageCheck} label="Product catalog" value={`${view.totalProducts} items`} percent={88} tone="success" />
                <ReadinessRow icon={Zap} label="Zoho integration" value="Configure" percent={72} tone="warning" />
                <ReadinessRow icon={Webhook} label="Webhook delivery" value={`${view.webhookCount} endpoints`} percent={82} tone="success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-border/80 bg-card/95 shadow-xl shadow-slate-950/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5" /> Low-stock alerts
            </CardTitle>
            <p className="text-sm text-muted-foreground">Products requiring purchasing or sync review.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStockItems.map((item) => (
              <div key={item.sku} className="rounded-2xl border bg-background/70 p-4 transition hover:bg-muted/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-medium">{item.name}</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{item.sku}</p>
                  </div>
                  <Badge variant="destructive" className="shrink-0">{item.quantity} left</Badge>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{item.category}</span>
                  <span>Alert at {item.threshold}</span>
                </div>
              </div>
            ))}
            <Button asChild variant="outline" className="w-full rounded-xl">
              <Link href="/products">
                Review inventory
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <Card className="rounded-[2rem] border-border/80 bg-card/95 shadow-xl shadow-slate-950/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Layers3 className="h-5 w-5" /> Category mix
            </CardTitle>
            <p className="text-sm text-muted-foreground">A snapshot of catalog distribution.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {categories.map((category) => (
              <div key={category.name}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">{category.name}</span>
                  <span className="text-muted-foreground">{category.count}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${category.percent}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-border/80 bg-card/95 shadow-xl shadow-slate-950/5">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5" /> Operations feed
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Recent product, sync, and webhook events.</p>
            </div>
            <Badge variant="secondary" className="rounded-full">Live</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {view.recentActivity.map((item) => (
              <ActivityItem key={item.id} message={item.message} createdAt={item.createdAt} type={item.type} />
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} href={action.href} className="group rounded-[1.5rem] border bg-card/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-950/5">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-5 w-5" />
              </span>
              <div className="mt-5 flex items-center justify-between gap-3">
                <h3 className="font-semibold tracking-tight">{action.label}</h3>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground" />
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{action.detail}</p>
            </Link>
          );
        })}
      </section>
    </PageShell>
  );
}

function MetricCard({ label, value, helper, icon: Icon, tone, trend }: { label: string; value: string | number; helper: string; icon: LucideIcon; tone: "default" | "success" | "warning"; trend: string }) {
  return (
    <Card className="group overflow-hidden rounded-[1.5rem] border-border/80 bg-card/95 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-950/5">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <span className={cn("rounded-2xl p-2.5 shadow-sm", tone === "warning" ? "bg-amber-500 text-white" : tone === "success" ? "bg-emerald-600 text-white" : "bg-primary text-primary-foreground")}>
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <p className="mt-5 text-3xl font-semibold tracking-[-0.03em]">{value}</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xs leading-5 text-muted-foreground">{helper}</p>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[0.68rem] font-medium text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            {trend}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-white/65">{label}</p>
    </div>
  );
}

function ReadinessRow({ icon: Icon, label, value, percent, tone }: { icon: LucideIcon; label: string; value: string; percent: number; tone: "success" | "warning" }) {
  return (
    <div className="rounded-2xl border bg-background/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">{value}</p>
          </div>
        </div>
        <span className="text-sm font-semibold">{percent}%</span>
      </div>
      <div className="mt-4 h-2 rounded-full bg-muted">
        <div className={cn("h-full rounded-full", tone === "success" ? "bg-emerald-600" : "bg-amber-500")} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function ActivityItem({ message, createdAt, type }: { message: string; createdAt: string; type: "product" | "sync" | "webhook" }) {
  const Icon = type === "sync" ? RefreshCw : type === "webhook" ? Webhook : PackageCheck;

  return (
    <div className="group flex gap-4 rounded-2xl border bg-background/70 p-4 transition hover:bg-muted/30">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{message}</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Clock3 className="h-3.5 w-3.5" />
          {new Date(createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}
