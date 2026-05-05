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
  { id: "sample-1", message: "Zoho sync checked items and updated product records", createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(), type: "sync" as const },
  { id: "sample-2", message: "A new product was added to the active catalog", createdAt: new Date(Date.now() - 1000 * 60 * 36).toISOString(), type: "product" as const },
  { id: "sample-3", message: "product_updated webhook delivered to endpoint", createdAt: new Date(Date.now() - 1000 * 60 * 74).toISOString(), type: "webhook" as const },
];

const quickActions = [
  { href: "/products/new", label: "Create product", detail: "Add product, stock, images, and fields", icon: Plus },
  { href: "/products", label: "Review catalog", detail: "Open the product module list", icon: PackageSearch },
  { href: "/integrations", label: "Connect source", detail: "Configure integrations and mapping", icon: Zap },
  { href: "/api-keys", label: "Manage API keys", detail: "Developer access controls", icon: KeyRound },
];

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await apiFetch<Dashboard>("/api/dashboard"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const view = useMemo(() => {
    const totalProducts = data?.totalProducts ?? 0;
    const lowStock = data?.lowStock ?? 0;
    const inventoryValue = data?.inventoryValue ?? 0;
    const apiKeyCount = data?.apiKeyCount ?? 0;
    const webhookCount = data?.webhookCount ?? 0;
    const recentActivity = data?.recentActivity?.length ? data.recentActivity.map((item) => ({ ...item, type: "product" as const })) : sampleActivity;
    return { totalProducts, lowStock, inventoryValue, apiKeyCount, webhookCount, recentActivity };
  }, [data]);

  const metrics = [
    { label: "Products", value: view.totalProducts, helper: "Records in catalog", icon: Boxes, tone: "default" as const },
    { label: "Low stock", value: view.lowStock, helper: "Need attention", icon: PackageSearch, tone: view.lowStock > 0 ? "warning" as const : "success" as const },
    { label: "Inventory value", value: formatCurrency(view.inventoryValue), helper: "Estimated value", icon: CircleDollarSign, tone: "success" as const },
    { label: "API keys", value: view.apiKeyCount, helper: "Developer access", icon: KeyRound, tone: "default" as const },
    { label: "Webhooks", value: view.webhookCount, helper: "Event endpoints", icon: Webhook, tone: "default" as const },
  ];

  if (loading && !data) {
    return <main className="flex min-h-[70vh] items-center justify-center p-6 text-sm text-muted-foreground"><div className="rounded-[1.25rem] border bg-card/90 px-8 py-7 text-center shadow-lg"><Loader2 className="mx-auto mb-4 h-6 w-6 animate-spin" /><p className="font-medium text-foreground">Loading dashboard</p><p className="mt-1 text-xs text-muted-foreground">Preparing product, stock, sync, and activity data...</p></div></main>;
  }

  return (
    <PageShell className="space-y-5 pb-10">
      <PageHeader
        eyebrow="Dashboard"
        title="Operations overview"
        description="This is the only page for widgets, health summaries, alerts, activity, and quick actions. Module pages stay focused on records and workflows."
        actions={<><Button type="button" variant="outline" onClick={loadDashboard} disabled={loading} className="rounded-xl bg-background/70">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Refresh</Button><Button asChild className="rounded-xl shadow-sm"><Link href="/products/new"><Plus className="h-4 w-4" />New product</Link></Button></>}
      />

      {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}. Dashboard data could not refresh. Start the API and click Refresh.</div>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        <Card className="rounded-[1.25rem] border-border/80 bg-card/95 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div><CardTitle className="flex items-center gap-2 text-lg"><Activity className="h-5 w-5" />Operations feed</CardTitle><p className="mt-1 text-sm text-muted-foreground">Recent product, sync, and webhook events.</p></div>
            <Badge variant="secondary" className="rounded-full">Activity</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {view.recentActivity.map((item) => <ActivityItem key={item.id} message={item.message} createdAt={item.createdAt} type={item.type} />)}
          </CardContent>
        </Card>

        <Card className="rounded-[1.25rem] border-border/80 bg-card/95 shadow-sm">
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><AlertTriangle className="h-5 w-5" />Operational alerts</CardTitle><p className="text-sm text-muted-foreground">Use this panel for low stock, failed sync, or webhook delivery issues.</p></CardHeader>
          <CardContent className="space-y-3">
            <AlertRow title="Low-stock review" detail={view.lowStock > 0 ? `${view.lowStock} products need review.` : "No low-stock issues reported."} href="/products" tone={view.lowStock > 0 ? "warning" : "success"} />
            <AlertRow title="Integration mapping" detail="Confirm mappings before any sync can run." href="/integrations" tone="default" />
            <AlertRow title="Webhook delivery" detail={`${view.webhookCount} webhook endpoint${view.webhookCount === 1 ? "" : "s"} configured.`} href="/webhooks" tone="default" />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
        <Card className="rounded-[1.25rem] border-border/80 bg-card/95 shadow-sm">
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Layers3 className="h-5 w-5" />Go-live readiness</CardTitle><p className="text-sm text-muted-foreground">Launch checklist for this workspace.</p></CardHeader>
          <CardContent className="space-y-3">
            <ReadinessRow icon={CheckCircle2} label="Product module" value={view.totalProducts > 0 ? `${view.totalProducts} records` : "Add products"} ready={view.totalProducts > 0} />
            <ReadinessRow icon={DatabaseIcon} label="Integrations" value="Detection-first mapping" ready />
            <ReadinessRow icon={Webhook} label="Webhooks" value={`${view.webhookCount} configured`} ready={view.webhookCount > 0} />
            <ReadinessRow icon={KeyRound} label="API keys" value={`${view.apiKeyCount} active`} ready={view.apiKeyCount > 0} />
          </CardContent>
        </Card>

        <section className="grid gap-3 md:grid-cols-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return <Link key={action.href} href={action.href} className="group rounded-[1.25rem] border bg-card/95 p-5 shadow-sm transition hover:border-primary/30 hover:shadow-md"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground"><Icon className="h-5 w-5" /></span><div className="mt-5 flex items-center justify-between gap-3"><h3 className="font-semibold tracking-tight">{action.label}</h3><ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground" /></div><p className="mt-2 text-sm leading-6 text-muted-foreground">{action.detail}</p></Link>;
          })}
        </section>
      </section>
    </PageShell>
  );
}

const DatabaseIcon = Layers3;

function MetricCard({ label, value, helper, icon: Icon, tone }: { label: string; value: string | number; helper: string; icon: LucideIcon; tone: "default" | "success" | "warning" }) {
  return <Card className="rounded-[1.25rem] border-border/80 bg-card/95 shadow-sm"><CardContent className="p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-muted-foreground">{label}</p><span className={cn("rounded-xl p-2 shadow-sm", tone === "warning" ? "bg-amber-500 text-white" : tone === "success" ? "bg-emerald-600 text-white" : "bg-primary text-primary-foreground")}><Icon className="h-4 w-4" /></span></div><p className="mt-4 text-2xl font-semibold tracking-[-0.03em]">{value}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{helper}</p></CardContent></Card>;
}

function AlertRow({ title, detail, href, tone }: { title: string; detail: string; href: string; tone: "default" | "success" | "warning" }) {
  return <Link href={href} className="flex items-center justify-between gap-3 rounded-2xl border bg-background/70 p-4 transition hover:bg-muted/30"><div><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p></div><Badge variant={tone === "warning" ? "destructive" : tone === "success" ? "default" : "secondary"} className="rounded-full">{tone === "warning" ? "Review" : tone === "success" ? "Ready" : "Open"}</Badge></Link>;
}

function ReadinessRow({ icon: Icon, label, value, ready }: { icon: LucideIcon; label: string; value: string; ready: boolean }) {
  return <div className="flex items-center justify-between gap-3 rounded-2xl border bg-background/70 p-3"><div className="flex items-center gap-3"><span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}><Icon className="h-4 w-4" /></span><div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{value}</p></div></div><Badge variant={ready ? "default" : "secondary"} className="rounded-full">{ready ? "Ready" : "Next"}</Badge></div>;
}

function ActivityItem({ message, createdAt, type }: { message: string; createdAt: string; type: "product" | "sync" | "webhook" }) {
  const Icon = type === "sync" ? RefreshCw : type === "webhook" ? Webhook : PackageCheck;
  return <div className="group flex gap-4 rounded-2xl border bg-background/70 p-4 transition hover:bg-muted/30"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="text-sm font-medium">{message}</p><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />{new Date(createdAt).toLocaleString()}</p></div></div>;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(value ?? 0));
}
