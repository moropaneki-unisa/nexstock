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
  { href: "/products/new", label: "Create product", icon: Plus },
  { href: "/products", label: "Catalog", icon: PackageSearch },
  { href: "/integrations", label: "Connect", icon: Zap },
  { href: "/api-keys", label: "API keys", icon: KeyRound },
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
    { label: "Products", value: view.totalProducts, icon: Boxes, tone: "default" as const },
    { label: "Low stock", value: view.lowStock, icon: PackageSearch, tone: view.lowStock > 0 ? "warning" as const : "success" as const },
    { label: "Inventory value", value: formatCurrency(view.inventoryValue), icon: CircleDollarSign, tone: "success" as const },
    { label: "API keys", value: view.apiKeyCount, icon: KeyRound, tone: "default" as const },
    { label: "Webhooks", value: view.webhookCount, icon: Webhook, tone: "default" as const },
  ];

  const readiness = [
    { label: "Products", value: view.totalProducts > 0 ? `${view.totalProducts} records` : "Add products", ready: view.totalProducts > 0 },
    { label: "Integrations", value: "Mapping ready", ready: true },
    { label: "Webhooks", value: `${view.webhookCount} configured`, ready: view.webhookCount > 0 },
    { label: "API keys", value: `${view.apiKeyCount} active`, ready: view.apiKeyCount > 0 },
  ];

  if (loading && !data) {
    return <main className="flex min-h-[70vh] items-center justify-center p-6 text-sm text-muted-foreground"><div className="rounded-2xl border bg-card/90 px-8 py-7 text-center shadow-sm"><Loader2 className="mx-auto mb-4 h-6 w-6 animate-spin" /><p className="font-medium text-foreground">Loading dashboard</p><p className="mt-1 text-xs text-muted-foreground">Preparing your workspace overview...</p></div></main>;
  }

  return (
    <PageShell className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Dashboard"
        title="Operations overview"
        description="A cleaner command center with fewer cards, clearer priorities, and faster access to the main workflows."
        actions={<><Button type="button" variant="outline" onClick={loadDashboard} disabled={loading} className="rounded-xl bg-background/70">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Refresh</Button><Button asChild className="rounded-xl shadow-sm"><Link href="/products/new"><Plus className="h-4 w-4" />New product</Link></Button></>}
      />

      {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}. Dashboard data could not refresh. Start the API and click Refresh.</div>}

      <section className="rounded-[1.5rem] border bg-card/95 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Workspace health</p>
            <p className="mt-1 text-sm text-muted-foreground">Products, stock value, developer access, and delivery endpoints in one strip.</p>
          </div>
          <Badge variant={view.lowStock > 0 ? "destructive" : "default"} className="w-fit rounded-full">{view.lowStock > 0 ? `${view.lowStock} low-stock items` : "All clear"}</Badge>
        </div>
        <div className="mt-5 grid gap-0 divide-y rounded-2xl border bg-background/60 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-5">
          {metrics.map((metric) => <MetricCell key={metric.label} {...metric} />)}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.45fr_0.9fr]">
        <div className="rounded-[1.5rem] border bg-card/95 p-5 shadow-sm">
          <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><Activity className="h-5 w-5" />Operations feed</h2>
              <p className="mt-1 text-sm text-muted-foreground">Recent product, sync, and webhook events.</p>
            </div>
            <Link href="/products" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">Open catalog <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="divide-y">
            {view.recentActivity.slice(0, 5).map((item) => <ActivityItem key={item.id} message={item.message} createdAt={item.createdAt} type={item.type} />)}
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-[1.5rem] border bg-card/95 p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><AlertTriangle className="h-5 w-5" />Focus next</h2>
            <div className="mt-4 space-y-3">
              <FocusRow title="Stock review" detail={view.lowStock > 0 ? `${view.lowStock} products need review.` : "No low-stock issues reported."} href="/products" status={view.lowStock > 0 ? "Review" : "Ready"} urgent={view.lowStock > 0} />
              <FocusRow title="Integration mapping" detail="Confirm fields before syncing data." href="/integrations" status="Open" />
              <FocusRow title="Webhook delivery" detail={`${view.webhookCount} endpoint${view.webhookCount === 1 ? "" : "s"} configured.`} href="/webhooks" status="Open" />
            </div>
          </div>

          <div className="rounded-[1.5rem] border bg-card/95 p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><Layers3 className="h-5 w-5" />Launch readiness</h2>
            <div className="mt-4 space-y-3">
              {readiness.map((item) => <ReadinessLine key={item.label} {...item} />)}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return <Button key={action.href} asChild variant="outline" className="justify-start rounded-xl bg-background/70"><Link href={action.href}><Icon className="h-4 w-4" />{action.label}</Link></Button>;
              })}
            </div>
          </div>
        </aside>
      </section>
    </PageShell>
  );
}

function MetricCell({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: LucideIcon; tone: "default" | "success" | "warning" }) {
  return <div className="flex items-center justify-between gap-4 p-4"><div className="min-w-0"><p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</p><p className="mt-2 truncate text-xl font-semibold tracking-[-0.03em]">{value}</p></div><span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tone === "warning" ? "bg-amber-50 text-amber-700" : tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-primary/10 text-primary")}><Icon className="h-4 w-4" /></span></div>;
}

function FocusRow({ title, detail, href, status, urgent = false }: { title: string; detail: string; href: string; status: string; urgent?: boolean }) {
  return <Link href={href} className="flex items-center justify-between gap-3 rounded-2xl border bg-background/60 px-4 py-3 transition hover:bg-muted/40"><div><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p></div><Badge variant={urgent ? "destructive" : "secondary"} className="rounded-full">{status}</Badge></Link>;
}

function ReadinessLine({ label, value, ready }: { label: string; value: string; ready: boolean }) {
  return <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className={cn("flex h-8 w-8 items-center justify-center rounded-full", ready ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground")}><CheckCircle2 className="h-4 w-4" /></span><div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{value}</p></div></div><span className="text-xs font-medium text-muted-foreground">{ready ? "Ready" : "Next"}</span></div>;
}

function ActivityItem({ message, createdAt, type }: { message: string; createdAt: string; type: "product" | "sync" | "webhook" }) {
  const Icon = type === "sync" ? RefreshCw : type === "webhook" ? Webhook : PackageCheck;
  return <div className="flex gap-4 py-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="text-sm font-medium">{message}</p><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />{new Date(createdAt).toLocaleString()}</p></div></div>;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(value ?? 0));
}
