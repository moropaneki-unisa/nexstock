"use client";

import { useEffect, useState } from "react";
import { Activity, CheckCircle2, Loader2, Plus, Radio, Send, Trash2, Webhook } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader, PageShell, ReadinessCard } from "@/components/system/page-shell";
import { apiFetch } from "@/lib/api";

type WebhookRecord = {
  id: string;
  url: string;
  events: string[];
  isActive?: boolean;
  createdAt?: string;
  deliveries?: Array<{ id: string; status?: string; statusCode?: number; createdAt: string }>;
};

const defaultEvents = ["product_created", "product_updated", "inventory_updated", "webhook_test"];

export default function WebhooksPage() {
  const [hooks, setHooks] = useState<WebhookRecord[]>([]);
  const [url, setUrl] = useState("https://example.com/webhook");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    loadHooks();
  }, []);

  async function loadHooks() {
    setLoading(true);
    setError(null);

    try {
      const data = await apiFetch<WebhookRecord[]>("/api/webhooks");
      setHooks(data);
    } catch (err: any) {
      setError(err.message ?? "Failed to load webhooks");
    } finally {
      setLoading(false);
    }
  }

  async function createHook() {
    setCreating(true);
    setError(null);

    try {
      const created = await apiFetch<WebhookRecord>("/api/webhooks", {
        method: "POST",
        body: JSON.stringify({ url, events: defaultEvents }),
      });
      setHooks((prev) => [created, ...prev]);
      setUrl("https://example.com/webhook");
    } catch (err: any) {
      setError(err.message ?? "Failed to create webhook");
    } finally {
      setCreating(false);
    }
  }

  async function testHook(hook: WebhookRecord) {
    setBusyId(hook.id);
    setError(null);

    try {
      await apiFetch(`/api/webhooks/${hook.id}/test`, { method: "POST" });
      await loadHooks();
    } catch (err: any) {
      setError(err.message ?? "Failed to test webhook");
    } finally {
      setBusyId(null);
    }
  }

  async function deactivateHook(hook: WebhookRecord) {
    const confirmed = window.confirm(`Deactivate webhook ${hook.url}?`);
    if (!confirmed) return;

    setBusyId(hook.id);
    setError(null);

    try {
      await apiFetch(`/api/webhooks/${hook.id}`, { method: "DELETE" });
      await loadHooks();
    } catch (err: any) {
      setError(err.message ?? "Failed to deactivate webhook");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Developer platform"
        title="Webhooks"
        description="Register webhook endpoints for product and inventory events so external apps stay synchronized with NexStock."
        actions={
          <Button onClick={createHook} disabled={creating}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create webhook
          </Button>
        }
      />

      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Create webhook
            </CardTitle>
            <CardDescription>
              Use an HTTPS endpoint from your storefront, Zoho bridge, ERP, or custom app.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/webhook" />
            <div className="grid gap-2 sm:grid-cols-2">
              {defaultEvents.map((event) => (
                <div key={event} className="flex items-center gap-2 rounded-xl border bg-muted/30 p-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  {event}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <ReadinessCard
          title="Delivery reliability"
          description="What is ready now and what should be added before public launch."
          items={[
            { label: "Event registration", status: "ready", detail: "Dashboard can register product and inventory events." },
            { label: "Signed payloads", status: "ready", detail: "Backend creates webhook secrets for delivery signing." },
            { label: "Test delivery", status: "ready", detail: "Each webhook can emit a test event from the UI." },
            { label: "Retry queue", status: "next", detail: "Move delivery retries to BullMQ workers before scaling." },
          ]}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Registered webhooks</CardTitle>
          <CardDescription>Monitor active endpoints and recent delivery attempts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading webhooks...
            </div>
          ) : hooks.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No webhooks yet. Create one to start sending product and inventory events.
            </div>
          ) : (
            hooks.map((hook) => (
              <div key={hook.id} className="rounded-2xl border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="break-all font-medium">{hook.url}</p>
                      <Badge variant={hook.isActive === false ? "outline" : "default"}>{hook.isActive === false ? "Inactive" : "Active"}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{hook.events?.join(", ")}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => testHook(hook)} disabled={busyId === hook.id || hook.isActive === false}>
                      {busyId === hook.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Test
                    </Button>
                    {hook.isActive !== false && (
                      <Button type="button" variant="destructive" size="sm" onClick={() => deactivateHook(hook)} disabled={busyId === hook.id}>
                        <Trash2 className="h-4 w-4" />
                        Deactivate
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-muted/40 p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Activity className="h-4 w-4" />
                    Recent deliveries
                  </div>
                  {hook.deliveries?.length ? (
                    <div className="space-y-2">
                      {hook.deliveries.map((delivery) => (
                        <div key={delivery.id} className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-xs">
                          <span>{delivery.status ?? "queued"}</span>
                          <span className="text-muted-foreground">{delivery.statusCode ?? "-"} · {new Date(delivery.createdAt).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Radio className="h-3.5 w-3.5" />
                      No delivery attempts yet.
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
