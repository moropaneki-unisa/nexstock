"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, CheckCircle2, Code2, Loader2, Plus, Radio, Send, ShieldCheck, Trash2, Webhook } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, PageShell } from "@/components/system/page-shell";
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
    if (!url.trim()) {
      setError("Webhook URL is required");
      return;
    }

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

  const activeHooks = useMemo(() => hooks.filter((hook) => hook.isActive !== false), [hooks]);
  const inactiveHooks = useMemo(() => hooks.filter((hook) => hook.isActive === false), [hooks]);
  const deliveryCount = useMemo(() => hooks.reduce((total, hook) => total + (hook.deliveries?.length ?? 0), 0), [hooks]);

  return (
    <PageShell className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Developer platform"
        title="Webhooks"
        description="Register webhook endpoints for product and inventory events so external apps stay synchronized with NexStock."
        actions={
          <Button onClick={createHook} disabled={creating} className="rounded-xl shadow-sm">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create webhook
          </Button>
        }
      />

      {error && <div className="border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

      <section className="border bg-card/95">
        <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          <Metric icon={Webhook} label="Total webhooks" value={hooks.length} helper="Registered endpoints" />
          <Metric icon={CheckCircle2} label="Active" value={activeHooks.length} helper="Receiving events" />
          <Metric icon={Activity} label="Deliveries" value={deliveryCount} helper="Recent attempts" />
          <Metric icon={Trash2} label="Inactive" value={inactiveHooks.length} helper="Deactivated endpoints" />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <main className="space-y-6">
          <section className="border bg-card/95">
            <SectionHeader
              icon={Webhook}
              title="Create webhook"
              description="Use an HTTPS endpoint from your storefront, Zoho bridge, ERP, or custom app."
              badge="Signed delivery"
            />
            <div className="border-t p-5">
              <Label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Endpoint URL</Label>
              <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/webhook" className="rounded-xl" />
                <Button type="button" onClick={createHook} disabled={creating} className="rounded-xl">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Create webhook
                </Button>
              </div>
            </div>
            <div className="grid divide-y border-t bg-muted/15 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              {defaultEvents.map((event) => (
                <EventRow key={event} event={event} />
              ))}
            </div>
          </section>

          <section className="border bg-card/95">
            <SectionHeader icon={Webhook} title="Registered webhooks" description="Monitor active endpoints and recent delivery attempts." badge={`${hooks.length} endpoints`} />
            <div className="border-t">
              {loading ? (
                <div className="p-8 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                  Loading webhooks...
                </div>
              ) : hooks.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  <Webhook className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="font-semibold text-foreground">No webhooks yet</p>
                  <p className="mx-auto mt-2 max-w-md leading-6">Create one to start sending product and inventory events to external systems.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {hooks.map((hook) => (
                    <WebhookRow key={hook.id} hook={hook} busyId={busyId} onTest={testHook} onDeactivate={deactivateHook} />
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="border bg-card/95">
            <SectionHeader icon={Code2} title="Example payload" description="Use webhook events to keep custom apps in sync." />
            <div className="border-t p-5">
              <pre className="overflow-x-auto border bg-muted/40 p-4 text-xs leading-6"><code>{`{
  "event": "product_updated",
  "data": {
    "id": "prod_123",
    "sku": "NXS-001",
    "quantity": 42
  }
}`}</code></pre>
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Validate signatures before trusting incoming webhook payloads.
              </div>
            </div>
          </section>
        </main>

        <aside className="space-y-6">
          <section className="border bg-card/95">
            <SectionHeader icon={ShieldCheck} title="Delivery reliability" description="What is ready now and what should be added before public launch." />
            <div className="divide-y border-t">
              <ChecklistItem label="Event registration" status="Ready" detail="Dashboard can register product and inventory events." ready />
              <ChecklistItem label="Signed payloads" status="Ready" detail="Backend creates webhook secrets for delivery signing." ready />
              <ChecklistItem label="Test delivery" status="Ready" detail="Each webhook can emit a test event from the UI." ready />
              <ChecklistItem label="Retry queue" status="Next" detail="Move delivery retries to BullMQ workers before scaling." />
            </div>
          </section>

          <section className="border bg-card/95">
            <SectionHeader icon={ShieldCheck} title="Webhook guidance" />
            <div className="divide-y border-t">
              <Guidance label="Use HTTPS endpoints only." />
              <Guidance label="Respond with 2xx quickly, then process jobs async." />
              <Guidance label="Rotate or deactivate endpoints you no longer trust." />
            </div>
          </section>
        </aside>
      </section>
    </PageShell>
  );
}

function SectionHeader({ icon: Icon, title, description, badge }: { icon: any; title: string; description?: string; badge?: string }) {
  return <div className="flex flex-row items-start justify-between gap-4 p-5"><div><h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><Icon className="h-5 w-5" />{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>{badge && <Badge variant="secondary">{badge}</Badge>}</div>;
}

function Metric({ icon: Icon, label, value, helper }: { icon: any; label: string; value: string | number; helper: string }) {
  return <div className="flex items-center justify-between p-4"><div className="min-w-0"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 truncate text-xl font-semibold capitalize">{value}</p><p className="mt-1 truncate text-xs text-muted-foreground">{helper}</p></div><span className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span></div>;
}

function EventRow({ event }: { event: string }) {
  return <div className="flex items-center gap-2 p-4 text-sm"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><span className="font-mono text-xs">{event}</span></div>;
}

function WebhookRow({ hook, busyId, onTest, onDeactivate }: { hook: WebhookRecord; busyId: string | null; onTest: (hook: WebhookRecord) => void; onDeactivate: (hook: WebhookRecord) => void }) {
  return (
    <div className="p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="break-all font-medium">{hook.url}</p>
            <Badge variant={hook.isActive === false ? "outline" : "default"}>{hook.isActive === false ? "Inactive" : "Active"}</Badge>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{hook.events?.join(", ")}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onTest(hook)} disabled={busyId === hook.id || hook.isActive === false} className="rounded-xl bg-background/70">
            {busyId === hook.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Test
          </Button>
          {hook.isActive !== false && (
            <Button type="button" variant="destructive" size="sm" onClick={() => onDeactivate(hook)} disabled={busyId === hook.id} className="rounded-xl">
              <Trash2 className="h-4 w-4" />
              Deactivate
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4 border bg-muted/20">
        <div className="flex items-center gap-2 border-b px-3 py-2 text-xs font-medium text-muted-foreground">
          <Activity className="h-4 w-4" />
          Recent deliveries
        </div>
        {hook.deliveries?.length ? (
          <div className="divide-y">
            {hook.deliveries.map((delivery) => (
              <div key={delivery.id} className="flex items-center justify-between gap-3 bg-background px-3 py-2 text-xs">
                <span>{delivery.status ?? "queued"}</span>
                <span className="text-muted-foreground">{delivery.statusCode ?? "-"} · {new Date(delivery.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
            <Radio className="h-3.5 w-3.5" />
            No delivery attempts yet.
          </div>
        )}
      </div>
    </div>
  );
}

function ChecklistItem({ label, status, detail, ready = false }: { label: string; status: string; detail: string; ready?: boolean }) {
  return <div className="p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{label}</p><Badge variant={ready ? "default" : "secondary"}>{status}</Badge></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p></div>;
}

function Guidance({ label }: { label: string }) {
  return <div className="flex items-start gap-2 px-4 py-3 text-sm text-muted-foreground"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{label}</div>;
}
