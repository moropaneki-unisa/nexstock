"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Code2, Copy, KeyRound, Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader, PageShell, ReadinessCard } from "@/components/system/page-shell";
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

  return (
    <PageShell>
      <PageHeader
        eyebrow="Developer platform"
        title="API keys"
        description="Create organization-scoped keys for the public NexStock API. Keys are hashed in the backend and the secret is only shown once."
        actions={
          <Button onClick={createKey} disabled={creating}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create key
          </Button>
        }
      />

      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Create API key
            </CardTitle>
            <CardDescription>
              Use clear names like “Zoho sync worker”, “Website storefront”, or “Production API key”.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Production API key" />
            {secret && (
              <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                  <ShieldCheck className="h-4 w-4" />
                  Copy this key now. It will not be shown again.
                </div>
                <div className="break-all rounded-xl bg-background p-3 font-mono text-xs">{secret}</div>
                <Button type="button" variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(secret)}>
                  <Copy className="h-4 w-4" />
                  Copy secret
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <ReadinessCard
          title="Public API checklist"
          description="The backend already exposes protected key creation for organization APIs."
          items={[
            { label: "Organization isolation", status: "ready", detail: "Keys belong to the signed-in user's organization." },
            { label: "Secret hashing", status: "ready", detail: "Only the hash and prefix are persisted; full secret appears once." },
            { label: "Rate limiting", status: "next", detail: "Add per-key limits before external launch." },
            { label: "Scopes", status: "planned", detail: "Add granular read/write scopes for public integrations." },
          ]}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Existing keys</CardTitle>
          <CardDescription>Revoke any key you no longer trust or use.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading keys...
            </div>
          ) : keys.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No API keys yet. Create one to start testing the developer API.
            </div>
          ) : (
            keys.map((key) => (
              <div key={key.id} className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{key.name}</p>
                    <Badge variant={key.revokedAt ? "outline" : "default"}>{key.revokedAt ? "Revoked" : "Active"}</Badge>
                  </div>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{key.keyPrefix}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {key.lastUsedAt ? `Last used ${new Date(key.lastUsedAt).toLocaleString()}` : "Never used"}
                  </p>
                </div>
                {!key.revokedAt && (
                  <Button type="button" variant="destructive" size="sm" onClick={() => revokeKey(key)} disabled={revokingId === key.id}>
                    {revokingId === key.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Revoke
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            Example request
          </CardTitle>
          <CardDescription>Use API keys for external apps that need inventory data.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-2xl bg-muted p-4 text-xs leading-6"><code>{`curl "$NEXT_PUBLIC_API_URL/api/public/products" \\
  -H "Authorization: Bearer ih_live_xxx"`}</code></pre>
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Pair API keys with webhooks to keep custom apps in sync.
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
