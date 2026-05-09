"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  DatabaseZap,
  Eye,
  EyeOff,
  Globe2,
  Loader2,
  PackageSearch,
  Save,
  ShieldCheck,
  ShoppingCart,
  Store,
  TestTube2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import {
  autoMapFields,
  createDefaultConfiguration,
  createHistory,
  createLog,
  getConnector,
  storageKey,
  type IntegrationConfiguration,
  type SourceField,
} from "@/lib/integrations";

type Credentials = {
  siteUrl: string;
  consumerKey: string;
  consumerSecret: string;
};

const connector = getConnector("wordpress")!;

export default function WordPressConfigurationPage() {
  const [credentials, setCredentials] = useState<Credentials>({ siteUrl: "", consumerKey: "", consumerSecret: "" });
  const [showSecret, setShowSecret] = useState(false);
  const [detectedFields, setDetectedFields] = useState<SourceField[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey("wordpress"));
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as IntegrationConfiguration;
      setCredentials({
        siteUrl: parsed.credentials?.siteUrl ?? "",
        consumerKey: parsed.credentials?.consumerKey ?? "",
        consumerSecret: parsed.credentials?.consumerSecret ?? "",
      });
      setDetectedFields(parsed.detectedFields ?? []);
    } catch {
      window.localStorage.removeItem(storageKey("wordpress"));
    }
  }, []);

  const readiness = useMemo(
    () => [
      { label: "Store URL", ready: isValidUrl(credentials.siteUrl) },
      { label: "Consumer key", ready: Boolean(credentials.consumerKey.trim()) },
      { label: "Consumer secret", ready: Boolean(credentials.consumerSecret.trim()) },
      { label: "WooCommerce fields", ready: detectedFields.length > 0 },
    ],
    [credentials, detectedFields],
  );

  const configured = readiness.slice(0, 3).every((item) => item.ready);

  function updateCredential(key: keyof Credentials, value: string) {
    setCredentials((current) => ({ ...current, [key]: value }));
    setError(null);
    setMessage(null);
  }

  function saveConfiguration(fields = detectedFields) {
    if (!configured) {
      setError("Add a valid WordPress site URL, consumer key, and consumer secret before saving.");
      return null;
    }

    const base = createDefaultConfiguration("wordpress");
    const next: IntegrationConfiguration = {
      ...base,
      status: fields.length ? "connected" : "configured",
      credentials: normalizeCredentials(credentials),
      detectedFields: fields,
      mappings: fields.length ? autoMapFields(fields) : [],
      mappingStatus: fields.length ? "draft" : "not_started",
      savedAt: new Date().toISOString(),
      history: [
        createHistory("WordPress configuration", "saved", fields.length ? `${fields.length} WooCommerce fields detected and mapping draft created.` : "WordPress credentials saved."),
        ...base.history,
      ],
      logs: [
        createLog("success", fields.length ? "WordPress configuration saved with detected WooCommerce fields." : "WordPress configuration saved."),
        ...base.logs,
      ],
    };

    window.localStorage.setItem(storageKey("wordpress"), JSON.stringify(next));
    return next;
  }

  async function testConnection() {
    setLoading("test");
    setError(null);
    setMessage(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 450));
      const saved = saveConfiguration();
      if (!saved) return;
      setMessage("Connection details look ready. Detect WooCommerce fields next.");
    } finally {
      setLoading(null);
    }
  }

  async function detectFields() {
    setLoading("detect");
    setError(null);
    setMessage(null);

    try {
      if (!configured) {
        setError("Complete the WordPress API configuration before detecting fields.");
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 450));
      const fields = connector.defaultFields;
      setDetectedFields(fields);
      const saved = saveConfiguration(fields);
      if (!saved) return;
      setMessage(`${fields.length} WooCommerce fields detected. A mapping draft is ready to review.`);
    } finally {
      setLoading(null);
    }
  }

  return (
    <PageShell className="space-y-6 pb-10">
      <PageHeader
        eyebrow="WordPress integration"
        title="WordPress / WooCommerce configuration"
        description="Connect your WooCommerce REST API, detect product fields, create a reusable mapping draft, then sync products safely."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-xl bg-background/70">
              <Link href="/integrations"><ArrowLeft className="h-4 w-4" />Back to integrations</Link>
            </Button>
            <Button asChild className="rounded-xl shadow-sm" disabled={!detectedFields.length}>
              <Link href="/integration/wordpress/mapping">Review mapping<ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        }
      />

      {error && <div className="border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}
      {message && <div className="border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div>}

      <section className="border bg-card/95">
        <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          <Metric icon={Store} label="Source" value="WooCommerce" helper="WordPress products" />
          <Metric icon={Globe2} label="Site URL" value={isValidUrl(credentials.siteUrl) ? "Valid" : "Required"} helper={credentials.siteUrl || "https://store.example.com"} />
          <Metric icon={DatabaseZap} label="Fields" value={detectedFields.length} helper="Detected source fields" />
          <Metric icon={ShieldCheck} label="Mapping" value={detectedFields.length ? "Draft" : "Locked"} helper={detectedFields.length ? "Ready to review" : "Detect fields first"} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <main className="space-y-6">
          <section className="border bg-card/95">
            <SectionHeader icon={ShoppingCart} title="WooCommerce API credentials" description="Create REST API keys in WordPress under WooCommerce → Settings → Advanced → REST API." badge="Required" />
            <div className="grid divide-y border-t md:grid-cols-2 md:divide-x md:divide-y-0">
              <div className="divide-y">
                <Field label="Site URL" description="Your public WordPress or WooCommerce store URL.">
                  <Input value={credentials.siteUrl} onChange={(event) => updateCredential("siteUrl", event.target.value)} placeholder="https://store.example.com" />
                </Field>
                <Field label="Consumer key" description="WooCommerce REST API consumer key with product read/write permissions.">
                  <Input value={credentials.consumerKey} onChange={(event) => updateCredential("consumerKey", event.target.value)} placeholder="ck_xxxxxxxxxxxxxxxxx" />
                </Field>
              </div>
              <div className="divide-y">
                <Field label="Consumer secret" description="WooCommerce REST API consumer secret. Keep it private.">
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <Input type={showSecret ? "text" : "password"} value={credentials.consumerSecret} onChange={(event) => updateCredential("consumerSecret", event.target.value)} placeholder="cs_xxxxxxxxxxxxxxxxx" />
                    <Button type="button" variant="outline" onClick={() => setShowSecret((value) => !value)} className="rounded-xl bg-background/70">
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {showSecret ? "Hide" : "Show"}
                    </Button>
                  </div>
                </Field>
                <Field label="Connection actions" description="Save credentials, test readiness, then detect the WooCommerce product schema.">
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={() => { const saved = saveConfiguration(); if (saved) setMessage("WordPress configuration saved."); }} className="rounded-xl">
                      <Save className="h-4 w-4" />Save
                    </Button>
                    <Button type="button" variant="outline" onClick={testConnection} disabled={loading === "test"} className="rounded-xl bg-background/70">
                      {loading === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />}
                      Test
                    </Button>
                    <Button type="button" variant="outline" onClick={detectFields} disabled={loading === "detect"} className="rounded-xl bg-background/70">
                      {loading === "detect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <DatabaseZap className="h-4 w-4" />}
                      Detect fields
                    </Button>
                  </div>
                </Field>
              </div>
            </div>
          </section>

          <section className="border bg-card/95">
            <SectionHeader icon={DatabaseZap} title="Detected WooCommerce fields" description="NexStock uses these fields to build a reusable product mapping draft." badge={detectedFields.length ? `${detectedFields.length} fields` : undefined} />
            <div className="border-t">
              {detectedFields.length ? (
                <div className="grid divide-y md:grid-cols-2 md:divide-x md:divide-y-0">
                  <div className="divide-y">
                    {detectedFields.filter((_, index) => index % 2 === 0).map((field) => <FieldRow key={field.key} field={field} />)}
                  </div>
                  <div className="divide-y">
                    {detectedFields.filter((_, index) => index % 2 === 1).map((field) => <FieldRow key={field.key} field={field} />)}
                  </div>
                </div>
              ) : (
                <EmptyState />
              )}
            </div>
          </section>
        </main>

        <aside className="space-y-6">
          <section className="border bg-card/95">
            <SectionHeader icon={CheckCircle2} title="Configuration readiness" />
            <div className="divide-y border-t">
              {readiness.map((item) => <ReadinessLine key={item.label} {...item} />)}
            </div>
          </section>

          <section className="border bg-card/95">
            <SectionHeader icon={PackageSearch} title="WooCommerce sync plan" />
            <div className="divide-y border-t">
              <PlanItem number="01" label="Connect API credentials" ready={configured} />
              <PlanItem number="02" label="Detect product fields" ready={detectedFields.length > 0} />
              <PlanItem number="03" label="Review mapping" ready={false} />
              <PlanItem number="04" label="Preview and sync" ready={false} />
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

function Field({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return <div className="p-4"><Label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</Label><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p><div className="mt-3">{children}</div></div>;
}

function FieldRow({ field }: { field: SourceField }) {
  return <div className="p-4"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{field.label}</p>{field.required && <Badge>Required</Badge>}{field.type && <Badge variant="outline">{field.type}</Badge>}</div><p className="mt-2 font-mono text-xs text-muted-foreground">{field.key}</p>{field.sample && <p className="mt-2 truncate text-sm text-muted-foreground">Sample: {field.sample}</p>}</div>;
}

function ReadinessLine({ label, ready }: { label: string; ready: boolean }) {
  return <div className="flex items-center justify-between px-4 py-3 text-sm"><span className="flex items-center gap-2">{ready ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <ShieldCheck className="h-4 w-4 text-muted-foreground" />}{label}</span><Badge variant={ready ? "default" : "secondary"}>{ready ? "Ready" : "Required"}</Badge></div>;
}

function PlanItem({ number, label, ready }: { number: string; label: string; ready: boolean }) {
  return <div className="flex items-center justify-between px-4 py-3 text-sm"><span className="flex items-center gap-3"><span className="font-mono text-xs text-muted-foreground">{number}</span>{label}</span><Badge variant={ready ? "default" : "secondary"}>{ready ? "Done" : "Next"}</Badge></div>;
}

function EmptyState() {
  return <div className="p-10 text-center"><DatabaseZap className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><p className="font-semibold">No WooCommerce fields detected yet</p><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Save your API details and click Detect fields. NexStock will create a draft mapping from WooCommerce product fields.</p></div>;
}

function normalizeCredentials(credentials: Credentials) {
  return {
    siteUrl: credentials.siteUrl.trim().replace(/\/$/, ""),
    consumerKey: credentials.consumerKey.trim(),
    consumerSecret: credentials.consumerSecret.trim(),
  };
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
