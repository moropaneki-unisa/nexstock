"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  CheckCircle2,
  Clock3,
  Loader2,
  PlugZap,
  RefreshCw,
  ShoppingBag,
  Store,
  Workflow,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, PageShell, ReadinessCard } from "@/components/system/page-shell";
import { apiFetch } from "@/lib/api";

type Integration = {
  id: string;
  provider: "zoho" | "shopify" | "custom";
  status: "connected" | "disconnected" | "error" | "expired";
  connected: boolean;
  lastSyncAt?: string | null;
  tokenExpiresAt?: string | null;
  config?: Record<string, unknown> | null;
};

type SyncResult = {
  created: number;
  updated: number;
  total: number;
};

const syncSteps = [
  { title: "Connect", detail: "Authorize InventoryHub from your Zoho Inventory account.", icon: PlugZap },
  { title: "Import", detail: "Pull Zoho items into your InventoryHub product catalog.", icon: ArrowRightLeft },
  { title: "Update", detail: "Match by SKU and update product pricing, category, and quantity.", icon: RefreshCw },
  { title: "Review", detail: "Use products and inventory pages to review synced changes.", icon: Workflow },
];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const zoho = useMemo(() => integrations.find((item) => item.provider === "zoho"), [integrations]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const zohoStatus = params.get("zoho");
    const callbackMessage = params.get("message");

    if (zohoStatus === "connected") setMessage("Zoho connected successfully. You can now sync products.");
    if (zohoStatus === "error") setError(callbackMessage ?? "Zoho connection failed.");

    void loadIntegrations();
  }, []);

  async function loadIntegrations() {
    setLoading(true);
    setError(null);

    try {
      const data = await apiFetch<Integration[]>("/api/integrations");
      setIntegrations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load integrations");
    } finally {
      setLoading(false);
    }
  }

  async function connectZoho() {
    setConnecting(true);
    setError(null);
    setMessage(null);

    try {
      const result = await apiFetch<{ url: string }>("/api/integrations/zoho/connect");
      window.location.href = result.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start Zoho connection");
      setConnecting(false);
    }
  }

  async function syncZoho() {
    setSyncing(true);
    setError(null);
    setMessage(null);
    setSyncResult(null);

    try {
      const result = await apiFetch<SyncResult>("/api/integrations/zoho/sync", { method: "POST" });
      setSyncResult(result);
      setMessage(`Zoho sync complete: ${result.created} created, ${result.updated} updated.`);
      await loadIntegrations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Zoho sync failed");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Integrations"
        title="Connect InventoryHub to Zoho Inventory"
        description="Authorize Zoho, import products, and keep InventoryHub aligned with your inventory source of truth."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={loadIntegrations} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
            {zoho?.connected ? (
              <Button type="button" onClick={syncZoho} disabled={syncing}>
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Sync Zoho products
              </Button>
            ) : (
              <Button type="button" onClick={connectZoho} disabled={connecting}>
                {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Connect Zoho
              </Button>
            )}
          </div>
        }
      />

      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}
      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div>}

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Store className="h-5 w-5" />
                </span>
                <div>
                  <CardTitle>Zoho Inventory</CardTitle>
                  <CardDescription className="mt-1">
                    OAuth connection, product import, SKU matching, stock updates, and sync activity for Zoho-first businesses.
                  </CardDescription>
                </div>
              </div>
              <Badge variant={zoho?.connected ? "default" : zoho?.status === "error" ? "destructive" : "secondary"}>
                {zoho?.connected ? "Connected" : zoho?.status === "error" ? "Error" : "Not connected"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Status", zoho?.status ?? "disconnected"],
                ["Last sync", zoho?.lastSyncAt ? new Date(zoho.lastSyncAt).toLocaleString() : "Never"],
                ["Token expires", zoho?.tokenExpiresAt ? new Date(zoho.tokenExpiresAt).toLocaleString() : "Not connected"],
                ["Provider", "Zoho Inventory"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border bg-muted/30 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
                  <p className="mt-2 break-words text-sm font-medium">{value}</p>
                </div>
              ))}
            </div>

            {syncResult && (
              <div className="rounded-2xl border bg-background p-4">
                <p className="text-sm font-medium">Latest sync result</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {syncResult.total} Zoho items processed · {syncResult.created} created · {syncResult.updated} updated
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant={zoho?.connected ? "outline" : "default"} onClick={connectZoho} disabled={connecting}>
                {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
                {zoho?.connected ? "Reconnect Zoho" : "Connect Zoho"}
              </Button>
              <Button type="button" onClick={syncZoho} disabled={!zoho?.connected || syncing}>
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Sync products
              </Button>
            </div>
          </CardContent>
        </Card>

        <ReadinessCard
          title="Zoho setup checklist"
          description="Set these environment variables before connecting."
          items={[
            { label: "ZOHO_CLIENT_ID", status: "next", detail: "OAuth client ID from Zoho API Console." },
            { label: "ZOHO_CLIENT_SECRET", status: "next", detail: "OAuth client secret from Zoho API Console." },
            { label: "ZOHO_REDIRECT_URI", status: "next", detail: "Must match your backend callback URL: /api/integrations/zoho/callback." },
            { label: "ZOHO_ORGANIZATION_ID", status: "next", detail: "Optional but recommended for Zoho Inventory item requests." },
          ]}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Sync flow</CardTitle>
            <CardDescription>How InventoryHub imports products from Zoho.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            {syncSteps.map((step, index) => {
              const Icon = step.icon;

              return (
                <div key={step.title} className="rounded-2xl border bg-background p-4">
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-xs text-muted-foreground">0{index + 1}</span>
                  </div>
                  <h3 className="mt-4 font-medium">{step.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{step.detail}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coming next</CardTitle>
            <CardDescription>After Zoho is stable, reuse this pattern for more platforms.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { name: "Shopify", icon: ShoppingBag, status: "Planned" },
              { name: "Custom API", icon: PlugZap, status: "Ready foundation" },
              { name: "Sync conflict review", icon: Workflow, status: "Next" },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.name} className="flex items-center justify-between rounded-2xl border p-4">
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <Badge variant="secondary">{item.status}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock3 className="h-5 w-5" />
            Production note
          </CardTitle>
          <CardDescription>
            The first sync runs directly from the API request. Before high-volume launch, move Zoho pull/push jobs into a queue worker and encrypt stored provider credentials.
          </CardDescription>
        </CardHeader>
      </Card>
    </PageShell>
  );
}
