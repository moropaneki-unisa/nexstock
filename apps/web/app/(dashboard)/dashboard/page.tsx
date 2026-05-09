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

  const readiness = [
    { label: "Products", value: view.totalProducts > 0 ? `${view.totalProducts} records` : "Add products", ready: view.totalProducts > 0 },
    { label: "Integrations", value: "Mapping ready", ready: true },
    { label: "Webhooks", value: `${view.webhookCount} configured`, ready: view.webhookCount > 0 },
    { label: "API keys", value: `${view.apiKeyCount} active`, ready: view.apiKeyCount > 0 },
  ];

  if (loading && !data) {
    return (
      <PageShell>
        <div className="border bg-card/95 p-8 text-sm text-muted-foreground">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading dashboard...
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Dashboard"
        title="Operations overview"
        description="A real-time command center for catalog health, stock risk, developer access, and launch readiness."
        actions={
          <>
            <Button type="button" variant="outline" onClick={loadDashboard} disabled={loading} className="rounded-xl bg-background/70">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
            <Button asChild className="rounded-xl shadow-sm">
              <Link href="/products/new"><Plus className="h-4 w-4" />New product</Link>
            </Button>
          </>
        }
      />

      {error && <div className="border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}. Dashboard data could not refresh. Start the API and click Refresh.</div>}

      <section className="border bg-card/95">
        <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-5">
          <Metric icon={Boxes} label="Products" value={view.totalProducts} />
          <Metric icon={PackageSearch} label="Low stock" value={view.lowStock} tone={view.lowStock > 0 ? "warning" : "success"} />
          <Metric icon={CircleDollarSign} label="Inventory value" value={formatCurrency(view.inventoryValue)} />
          <Metric icon={KeyRound} label="API keys" value={view.apiKeyCount} />
          <Metric icon={Webhook} label="Webhooks" value={view.webhookCount} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <main className="space-y-6">
          <section className="border bg-card/95">
            <SectionHeader
              icon={Activity}
              title="Operations feed"
              description="Recent product, sync, and webhook events across the workspace."
              action={<Link href="/products" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">Open catalog <ArrowRight className="h-4 w-4" /></Link>}
            />
            <div className="divide-y border-t">
              {view.recentActivity.slice(0, 5).map((item) => <ActivityItem key={item.id} message={item.message} createdAt={item.createdAt} type={item.type} />)}
            </div>
          </section>

          <section className="border bg-card/95">
            <SectionHeader icon={AlertTriangle} title="Focus next" description="The next operational areas to review before launch or daily handover." />
            <div className="grid divide-y border-t md:grid-cols-3 md:divide-x md:divide-y-0">
              <FocusItem title="Stock review" detail={view.lowStock > 0 ? `${view.lowStock} products need review.` : "No low-stock issues reported."} href="/products" status={view.lowStock > 0 ? "Review" : "Ready"} urgent={view.lowStock > 0} />
              <FocusItem title="Integration mapping" detail="Confirm fields before syncing data." href="/integrations" status="Open" />
              <FocusItem title="Webhook delivery" detail={`${view.webhookCount} endpoint${view.webhookCount === 1 ? "" : "s"} configured.`} href="/webhooks" status="Open" />
            </div>
          </section>
        </main>

        <aside className="space-y-6">
          <section className="border bg-card/95">
            <SectionHeader icon={Layers3} title="Launch readiness" />
            <div className="divide-y border-t">
              {readiness.map((item) => <ReadinessLine key={item.label} {...item} />)}
            </div>
          </section>

          <section className="border bg-card/95">
            <SectionHeader icon={Zap} title="Quick actions" description="Jump into common product operations." />
            <div className="divide-y border-t">
              {quickActions.map((action) => <ShortcutRow key={action.href} {...action} />)}
            </div>
          </section>
        </aside>
      </section>
    </PageShell>
  );
}

function SectionHeader({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="flex flex-row items-start justify-between gap-4 p-5"><div><h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><Icon className="h-5 w-5" />{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>{action}</div>;
}

function Metric({ label, value, icon: Icon, tone = "default" }: { label: string; value: string | number; icon: LucideIcon; tone?: "default" | "success" | "warning" }) {
  return <div className="flex items-center justify-between p-4"><div className="min-w-0"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 truncate text-xl font-semibold capitalize">{value}</p></div><span className={cn("flex h-10 w-10 shrink-0 items-center justify-center", tone === "warning" ? "bg-amber-50 text-amber-700" : tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-primary/10 text-primary")}><Icon className="h-4 w-4" /></span></div>;
}

function FocusItem({ title, detail, href, status, urgent = false }: { title: string; detail: string; href: string; status: string; urgent?: boolean }) {
  return <Link href={href} className="block p-5 transition hover:bg-muted/45"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold tracking-tight">{title}</h3><Badge variant={urgent ? "destructive" : "secondary"}>{status}</Badge></div><p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p></Link>;
}

function ReadinessLine({ label, value, ready }: { label: string; value: string; ready: boolean }) {
  return <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm"><div className="flex items-center gap-3"><span className={cn("flex h-8 w-8 items-center justify-center", ready ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground")}><CheckCircle2 className="h-4 w-4" /></span><div><p className="font-medium">{label}</p><p className="text-xs text-muted-foreground">{value}</p></div></div><Badge variant={ready ? "default" : "secondary"}>{ready ? "Ready" : "Next"}</Badge></div>;
}

function ShortcutRow({ href, label, icon: Icon }: { href: string; label: string; icon: LucideIcon }) {
  return <Link href={href} className="flex items-center gap-3 p-4 text-sm transition hover:bg-muted/45"><span className="flex h-10 w-10 items-center justify-center bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1 font-medium">{label}</span><ArrowRight className="h-4 w-4 text-muted-foreground" /></Link>;
}

function ActivityItem({ message, createdAt, type }: { message: string; createdAt: string; type: "product" | "sync" | "webhook" }) {
  const Icon = type === "sync" ? RefreshCw : type === "webhook" ? Webhook : PackageCheck;
  return <div className="flex gap-4 px-5 py-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="text-sm font-medium">{message}</p><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />{new Date(createdAt).toLocaleString()}</p></div></div>;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "ZAR", maximumFractionDigits: 2 }).format(Number(value ?? 0));
}
