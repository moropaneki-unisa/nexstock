"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Boxes,
  DollarSign,
  KeyRound,
  Loader2,
  PackageSearch,
  Plus,
  RefreshCw,
  Webhook,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    } catch (err: any) {
      setError(err.message ?? "Failed to load dashboard");
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
      { label: "Products", value: data.totalProducts, icon: Boxes, helper: "Active catalog items" },
      { label: "Low stock", value: data.lowStock, icon: PackageSearch, helper: "At or below threshold" },
      { label: "Inventory value", value: formatCurrency(data.inventoryValue), icon: DollarSign, helper: "Price multiplied by quantity" },
      { label: "API keys", value: data.apiKeyCount, icon: KeyRound, helper: "Active integration keys" },
      { label: "Webhooks", value: data.webhookCount, icon: Webhook, helper: "Active webhook endpoints" },
    ];
  }, [data]);

  if (loading && !data) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center p-6 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading dashboard...
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="space-y-4 p-6">
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
        <Button type="button" variant="outline" onClick={loadDashboard}>Try again</Button>
      </main>
    );
  }

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Inventory health, integration readiness, and recent product movement.</p>
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={loadDashboard} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
          <Button asChild>
            <Link href="/products/new">
              <Plus className="mr-2 h-4 w-4" />
              New product
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-3 text-3xl font-semibold tracking-tight">{metric.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{metric.helper}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" /> Recent activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!data?.recentActivity.length ? (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <Activity className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
                <p className="text-sm font-medium">No activity yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Create or update inventory to populate this feed.</p>
              </div>
            ) : (
              data.recentActivity.map((item) => (
                <div key={item.id} className="rounded-xl border bg-background p-4 text-sm">
                  <p className="font-medium">{item.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> MVP readiness
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <ReadinessRow label="Products API" ready={Boolean(data)} detail="Dashboard reads protected API data." />
            <ReadinessRow label="Product CRUD" ready detail="Create, list, edit, and archive are wired." />
            <ReadinessRow label="Inventory signals" ready={Boolean(data && data.totalProducts > 0)} detail="Add products to see stock movement." />
            <Button asChild className="w-full" variant="outline">
              <Link href="/products">Manage products</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function ReadinessRow({ label, ready, detail }: { label: string; ready: boolean; detail: string }) {
  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">{label}</p>
        <span className={ready ? "text-xs font-medium text-green-600" : "text-xs font-medium text-muted-foreground"}>
          {ready ? "Ready" : "Pending"}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
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
