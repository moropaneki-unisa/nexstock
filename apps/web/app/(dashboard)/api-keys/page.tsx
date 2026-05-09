"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Code2, Copy, KeyRound, Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { apiFetch } from "@/lib/api";

type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes?: string[];
  lastUsedAt?: string | null;
  revokedAt?: string | null;
  createdAt?: string;
  secret?: string;
  warning?: string;
};

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState("Production API key");
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    setLoading(true);
    setError(null);

    try {
      const data = await apiFetch<ApiKey[]>("/api/api-keys");
      setKeys(data);
    } catch (err: any) {
      setError(err.message ?? "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }

  async function createKey() {
    if (!name.trim()) {
      setError("API key name is required");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const created = await apiFetch<ApiKey>("/api/api-keys", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setSecret(created.secret ?? null);
      setKeys((prev) => [created, ...prev]);
      setName("Production API key");
    } catch (err: any) {
      setError(err.message ?? "Failed to create API key");
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(key: ApiKey) {
    const confirmed = window.confirm(`Revoke ${key.name}? Existing integrations using this key will stop working.`);
    if (!confirmed) return;

    setRevokingId(key.id);
    setError(null);

    try {
      await apiFetch(`/api/api-keys/${key.id}`, { method: "DELETE" });
      await loadKeys();
    } catch (err: any) {
      setError(err.message ?? "Failed to revoke API key");
    } finally {
      setRevokingId(null);
    }
  }

  const activeKeys = useMemo(() => keys.filter((key) => !key.revokedAt), [keys]);
  const revokedKeys = useMemo(() => keys.filter((key) => key.revokedAt), [keys]);
  const usedKeys = useMemo(() => keys.filter((key) => key.lastUsedAt), [keys]);

  return (
    <PageShell className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Developer platform"
        title="API keys"
        description="Create organization-scoped keys for the public NexStock API. Keys are hashed in the backend and the secret is only shown once."
        actions={
          <Button onClick={createKey} disabled={creating} className="rounded-xl shadow-sm">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create key
          </Button>
        }
      />

      {error && <div className="border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

      <section className="border bg-card/95">
        <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          <Metric icon={KeyRound} label="Total keys" value={keys.length} helper="All created keys" />
          <Metric icon={CheckCircle2} label="Active" value={activeKeys.length} helper="Available for API use" />
          <Metric icon={Code2} label="Used" value={usedKeys.length} helper="Have request history" />
          <Metric icon={Trash2} label="Revoked" value={revokedKeys.length} helper="Blocked secrets" />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <main className="space-y-6">
          <section className="border bg-card/95">
            <SectionHeader
              icon={KeyRound}
              title="Create API key"
              description="Use clear names like Zoho sync worker, Website storefront, or Production API key."
              badge="Secret shown once"
            />
            <div className="border-t p-5">
              <Label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Key name</Label>
              <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Production API key" className="rounded-xl" />
                <Button type="button" onClick={createKey} disabled={creating} className="rounded-xl">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Create key
                </Button>
              </div>
            </div>
            {secret && (
              <div className="border-t border-emerald-200 bg-emerald-50 p-5">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                  <ShieldCheck className="h-4 w-4" />
                  Copy this key now. It will not be shown again.
                </div>
                <div className="mt-3 break-all border bg-background p-3 font-mono text-xs">{secret}</div>
                <Button type="button" variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(secret)} className="mt-3 rounded-xl bg-background/70">
                  <Copy className="h-4 w-4" />
                  Copy secret
                </Button>
              </div>
            )}
          </section>

          <section className="border bg-card/95">
            <SectionHeader icon={KeyRound} title="Existing keys" description="Revoke any key you no longer trust or use." badge={`${keys.length} keys`} />
            <div className="border-t">
              {loading ? (
                <div className="p-8 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                  Loading keys...
                </div>
              ) : keys.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  <KeyRound className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="font-semibold text-foreground">No API keys yet</p>
                  <p className="mx-auto mt-2 max-w-md leading-6">Create one to start testing the developer API or connecting external systems.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {keys.map((key) => (
                    <ApiKeyRow key={key.id} apiKey={key} revokingId={revokingId} onRevoke={revokeKey} />
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="border bg-card/95">
            <SectionHeader icon={Code2} title="Example request" description="Use API keys for external apps that need inventory data." />
            <div className="border-t p-5">
              <pre className="overflow-x-auto border bg-muted/40 p-4 text-xs leading-6"><code>{`curl "$NEXT_PUBLIC_API_URL/api/public/products" \\
  -H "Authorization: Bearer ih_live_xxx"`}</code></pre>
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Pair API keys with webhooks to keep custom apps in sync.
              </div>
            </div>
          </section>
        </main>

        <aside className="space-y-6">
          <section className="border bg-card/95">
            <SectionHeader icon={ShieldCheck} title="Public API checklist" description="Backend foundations for organization APIs." />
            <div className="divide-y border-t">
              <ChecklistItem label="Organization isolation" status="Ready" detail="Keys belong to the signed-in user's organization." ready />
              <ChecklistItem label="Secret hashing" status="Ready" detail="Only the hash and prefix are persisted." ready />
              <ChecklistItem label="Rate limiting" status="Next" detail="Add per-key limits before external launch." />
              <ChecklistItem label="Scopes" status="Planned" detail="Add granular read/write scopes." />
            </div>
          </section>

          <section className="border bg-card/95">
            <SectionHeader icon={ShieldCheck} title="Security guidance" />
            <div className="divide-y border-t">
              <Guidance label="Store secrets in environment variables only." />
              <Guidance label="Revoke keys when a system or vendor changes." />
              <Guidance label="Use different keys for production, testing, and workers." />
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

function ApiKeyRow({ apiKey, revokingId, onRevoke }: { apiKey: ApiKey; revokingId: string | null; onRevoke: (key: ApiKey) => void }) {
  return (
    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{apiKey.name}</p>
          <Badge variant={apiKey.revokedAt ? "outline" : "default"}>{apiKey.revokedAt ? "Revoked" : "Active"}</Badge>
        </div>
        <p className="mt-1 font-mono text-xs text-muted-foreground">{apiKey.keyPrefix}</p>
        <p className="mt-1 text-xs text-muted-foreground">{apiKey.lastUsedAt ? `Last used ${new Date(apiKey.lastUsedAt).toLocaleString()}` : "Never used"}</p>
      </div>
      {!apiKey.revokedAt && (
        <Button type="button" variant="destructive" size="sm" onClick={() => onRevoke(apiKey)} disabled={revokingId === apiKey.id} className="rounded-xl">
          {revokingId === apiKey.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Revoke
        </Button>
      )}
    </div>
  );
}

function ChecklistItem({ label, status, detail, ready = false }: { label: string; status: string; detail: string; ready?: boolean }) {
  return <div className="p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{label}</p><Badge variant={ready ? "default" : "secondary"}>{status}</Badge></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p></div>;
}

function Guidance({ label }: { label: string }) {
  return <div className="flex items-start gap-2 px-4 py-3 text-sm text-muted-foreground"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{label}</div>;
}
