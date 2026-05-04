"use client";

import { useEffect, useState } from "react";
import { Activity, Boxes, KeyRound, PackageSearch, Webhook } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import type { Dashboard } from "@/lib/types";

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Dashboard>("/api/dashboard").then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <main className="p-6 text-sm text-destructive">{error}</main>;
  if (!data) return <main className="p-6 text-sm text-muted-foreground">Loading dashboard...</main>;

  const metrics = [
    { label: "Products", value: data.totalProducts, icon: Boxes },
    { label: "Low stock", value: data.lowStock, icon: PackageSearch },
    { label: "API keys", value: data.apiKeyCount, icon: KeyRound },
    { label: "Webhooks", value: data.webhookCount, icon: Webhook },
  ];

  return (
    <main className="space-y-6 p-6">
      <div><h1 className="text-2xl font-semibold">Dashboard</h1><p className="text-sm text-muted-foreground">Inventory health and recent movement.</p></div>
      <section className="grid gap-4 md:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return <Card key={metric.label}><CardContent className="p-5"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{metric.label}</p><Icon className="h-4 w-4" /></div><p className="mt-3 text-3xl font-semibold">{metric.value}</p></CardContent></Card>;
        })}
      </section>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Recent activity</CardTitle></CardHeader><CardContent className="space-y-3">{data.recentActivity.length === 0 ? <p className="text-sm text-muted-foreground">No activity yet.</p> : data.recentActivity.map((item) => <div key={item.id} className="rounded-lg border p-3 text-sm"><p>{item.message}</p><p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p></div>)}</CardContent></Card>
    </main>
  );
}
