"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  DatabaseZap,
  Eye,
  EyeOff,
  FileJson,
  FileSpreadsheet,
  Globe2,
  Loader2,
  PackageSearch,
  PlugZap,
  Save,
  ShieldCheck,
  TestTube2,
  Upload,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import {
  autoMapFields,
  createDefaultConfiguration,
  createHistory,
  createLog,
  getConnector,
  storageKey,
  type IntegrationConfiguration,
  type IntegrationSource,
  type SourceField,
} from "@/lib/integrations";

const sampleJson = `[
  {
    "name": "Classic T-Shirt",
    "sku": "TSHIRT-001",
    "price": 299.99,
    "stock_quantity": 42,
    "category": "Apparel",
    "image": "https://example.com/image.jpg"
  }
]`;

type Credentials = Record<string, string>;

type SourceConfigurationPageProps = {
  source: IntegrationSource;
};

export function SourceConfigurationPage({ source }: SourceConfigurationPageProps) {
  const connector = getConnector(source);
  const [credentials, setCredentials] = useState<Credentials>({});
  const [detectedFields, setDetectedFields] = useState<SourceField[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [jsonInput, setJsonInput] = useState(sampleJson);
  const [showSecrets, setShowSecrets] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!connector) return;
    const stored = window.localStorage.getItem(storageKey(source));
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as IntegrationConfiguration;
      setCredentials(parsed.credentials ?? {});
      setDetectedFields(parsed.detectedFields ?? []);
    } catch {
      window.localStorage.removeItem(storageKey(source));
    }
  }, [connector, source]);

  const isFileSource = source === "xlsx";
  const isJsonSource = source === "json" || source === "custom";
  const hasCredentialFields = Boolean(connector?.configurationFields.length);
  const requiredCredentialsReady = useMemo(() => {
    if (!connector) return false;
    return connector.configurationFields.every((field) => !field.required || Boolean(credentials[field.key]?.trim()));
  }, [connector, credentials]);
  const configurationReady = hasCredentialFields ? requiredCredentialsReady : isFileSource ? Boolean(file) : isJsonSource ? Boolean(jsonInput.trim()) : true;

  const readiness = useMemo(
    () => [
      { label: hasCredentialFields ? "Credentials ready" : isFileSource ? "File selected" : "Source sample ready", ready: configurationReady },
      { label: "Configuration saved", ready: Boolean(message || detectedFields.length) },
      { label: "Fields detected", ready: detectedFields.length > 0 },
      { label: "Mapping draft created", ready: detectedFields.length > 0 },
    ],
    [configurationReady, detectedFields.length, hasCredentialFields, isFileSource, message],
  );

  if (!connector) {
    return (
      <PageShell className="space-y-6 pb-10">
        <Button asChild variant="outline" className="w-fit rounded-xl bg-background/70"><Link href="/integrations"><ArrowLeft className="h-4 w-4" />Back to integrations</Link></Button>
        <div className="border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">Integration source not found.</div>
      </PageShell>
    );
  }

  function updateCredential(key: string, value: string) {
    setCredentials((current) => ({ ...current, [key]: value }));
    setError(null);
    setMessage(null);
  }

  function saveConfiguration(fields = detectedFields) {
    if (hasCredentialFields && !requiredCredentialsReady) {
      setError(`Complete required ${connector.title} credentials before saving.`);
      return null;
    }

    const base = createDefaultConfiguration(source);
    const next: IntegrationConfiguration = {
      ...base,
      status: fields.length ? "connected" : "configured",
      credentials: normalizeCredentials(credentials),
      detectedFields: fields,
      mappings: fields.length ? autoMapFields(fields) : [],
      mappingStatus: fields.length ? "draft" : "not_started",
      savedAt: new Date().toISOString(),
      history: [
        createHistory(`${connector.title} configuration`, "saved", fields.length ? `${fields.length} source fields detected and mapping draft created.` : `${connector.title} configuration saved.`),
        ...base.history,
      ],
      logs: [
        createLog("success", fields.length ? `${connector.title} configuration saved with detected fields.` : `${connector.title} configuration saved.`),
        ...base.logs,
      ],
    };

    window.localStorage.setItem(storageKey(source), JSON.stringify(next));
    return next;
  }

  function handleSave() {
    const saved = saveConfiguration();
    if (!saved) return;
    setError(null);
    setMessage(`${connector.title} configuration saved.`);
  }

  async function testConnection() {
    setLoading("test");
    setError(null);
    setMessage(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 450));
      const saved = saveConfiguration();
      if (!saved) return;
      setMessage(`${connector.title} connection details look ready. Detect fields next.`);
    } finally {
      setLoading(null);
    }
  }

  async function detectFields() {
    setLoading("detect");
    setError(null);
    setMessage(null);

    try {
      let fields: SourceField[] = [];

      if (isFileSource) {
        if (!file) throw new Error("Choose an XLSX file before detecting fields.");
        fields = await extractSpreadsheetFields(file);
      } else if (isJsonSource && connector.defaultFields.length === 0) {
        fields = extractFieldsFromJson(jsonInput);
      } else if (source === "json") {
        fields = extractFieldsFromJson(jsonInput);
      } else {
        if (hasCredentialFields && !requiredCredentialsReady) throw new Error(`Complete required ${connector.title} credentials before detecting fields.`);
        fields = connector.defaultFields;
      }

      if (!fields.length) throw new Error("No source fields were detected.");
      setDetectedFields(fields);
      const saved = saveConfiguration(fields);
      if (!saved) return;
      setMessage(`${fields.length} fields detected. A mapping draft is ready to review.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not detect source fields.");
    } finally {
      setLoading(null);
    }
  }

  const Icon = connector.icon;
  const mappingReady = detectedFields.length > 0;
  const sourceLabel = connector.id === "wordpress" ? "WooCommerce" : connector.name;

  return (
    <PageShell className="space-y-6 pb-10">
      <PageHeader
        eyebrow={`${connector.name} integration`}
        title={`${connector.title} configuration`}
        description="Configure the source, detect fields, create a mapping draft, then review mapping before syncing product data."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-xl bg-background/70">
              <Link href="/integrations"><ArrowLeft className="h-4 w-4" />Back to integrations</Link>
            </Button>
            <Button asChild className="rounded-xl shadow-sm" disabled={!mappingReady}>
              <Link href={`/integration/${source}/mapping`}>Review mapping<ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        }
      />

      {error && <div className="border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}
      {message && <div className="border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div>}

      <section className="border bg-card/95">
        <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          <Metric icon={Icon} label="Source" value={sourceLabel} helper={connector.status === "live" ? "Live workflow" : "Reusable workflow"} />
          <Metric icon={hasCredentialFields ? Globe2 : isFileSource ? FileSpreadsheet : FileJson} label="Configuration" value={configurationReady ? "Ready" : "Required"} helper={hasCredentialFields ? "Credentials" : isFileSource ? file?.name ?? "Upload file" : "Sample data"} />
          <Metric icon={DatabaseZap} label="Fields" value={detectedFields.length} helper="Detected source fields" />
          <Metric icon={ShieldCheck} label="Mapping" value={mappingReady ? "Draft" : "Locked"} helper={mappingReady ? "Ready to review" : "Detect fields first"} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <main className="space-y-6">
          <section className="border bg-card/95">
            <SectionHeader icon={PlugZap} title={`${connector.name} setup`} description={getSetupDescription(source)} badge="Required" />
            <div className="border-t">
              {hasCredentialFields && (
                <div className="grid divide-y md:grid-cols-2 md:divide-x md:divide-y-0">
                  <div className="divide-y">
                    {connector.configurationFields.filter((_, index) => index % 2 === 0).map((field) => (
                      <CredentialField key={field.key} field={field} value={credentials[field.key] ?? ""} showSecrets={showSecrets} onChange={(value) => updateCredential(field.key, value)} />
                    ))}
                  </div>
                  <div className="divide-y">
                    {connector.configurationFields.filter((_, index) => index % 2 === 1).map((field) => (
                      <CredentialField key={field.key} field={field} value={credentials[field.key] ?? ""} showSecrets={showSecrets} onChange={(value) => updateCredential(field.key, value)} />
                    ))}
                    {connector.configurationFields.some((field) => field.type === "password") && (
                      <div className="p-4">
                        <Button type="button" variant="outline" onClick={() => setShowSecrets((value) => !value)} className="rounded-xl bg-background/70">
                          {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          {showSecrets ? "Hide secrets" : "Show secrets"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {isFileSource && (
                <div className="p-5">
                  <label className="flex cursor-pointer flex-col items-center justify-center border border-dashed bg-muted/20 p-8 text-center transition hover:bg-muted/45">
                    <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
                    <span className="text-sm font-medium">{file ? file.name : "Choose XLSX file"}</span>
                    <span className="mt-1 text-xs text-muted-foreground">XLSX or XLS. First row must contain column headers.</span>
                    <Input type="file" accept=".xlsx,.xls" className="hidden" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setDetectedFields([]); setError(null); setMessage(null); }} />
                  </label>
                </div>
              )}

              {isJsonSource && (
                <div className="p-5">
                  <Label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Sample JSON</Label>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Paste a sample response object or array of product objects so NexStock can detect fields.</p>
                  <Textarea value={jsonInput} onChange={(event) => setJsonInput(event.target.value)} className="mt-3 min-h-56 font-mono text-sm" />
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 border-t p-4">
              <Button type="button" onClick={handleSave} className="rounded-xl">
                <Save className="h-4 w-4" />Save configuration
              </Button>
              <Button type="button" variant="outline" onClick={testConnection} disabled={loading === "test" || (!hasCredentialFields && isFileSource)} className="rounded-xl bg-background/70">
                {loading === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />}
                Test
              </Button>
              <Button type="button" variant="outline" onClick={detectFields} disabled={loading === "detect"} className="rounded-xl bg-background/70">
                {loading === "detect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <DatabaseZap className="h-4 w-4" />}
                Detect fields
              </Button>
            </div>
          </section>

          <section className="border bg-card/95">
            <SectionHeader icon={DatabaseZap} title="Detected source fields" description="NexStock uses these fields to build reusable product mapping suggestions." badge={detectedFields.length ? `${detectedFields.length} fields` : undefined} />
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
                <EmptyState source={connector.name} />
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
            <SectionHeader icon={PackageSearch} title="Sync plan" />
            <div className="divide-y border-t">
              <PlanItem number="01" label="Configure source" ready={configurationReady} />
              <PlanItem number="02" label="Detect source fields" ready={detectedFields.length > 0} />
              <PlanItem number="03" label="Review mapping" ready={false} />
              <PlanItem number="04" label="Preview and sync" ready={false} />
            </div>
          </section>
        </aside>
      </section>
    </PageShell>
  );
}

function SectionHeader({ icon: Icon, title, description, badge }: { icon: LucideIcon; title: string; description?: string; badge?: string }) {
  return <div className="flex flex-row items-start justify-between gap-4 p-5"><div><h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><Icon className="h-5 w-5" />{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>{badge && <Badge variant="secondary">{badge}</Badge>}</div>;
}

function Metric({ icon: Icon, label, value, helper }: { icon: LucideIcon; label: string; value: string | number; helper: string }) {
  return <div className="flex items-center justify-between p-4"><div className="min-w-0"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 truncate text-xl font-semibold capitalize">{value}</p><p className="mt-1 truncate text-xs text-muted-foreground">{helper}</p></div><span className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span></div>;
}

function CredentialField({ field, value, showSecrets, onChange }: { field: { key: string; label: string; type?: "text" | "password" | "url"; placeholder?: string; required?: boolean; help: string }; value: string; showSecrets: boolean; onChange: (value: string) => void }) {
  return <div className="p-4"><Label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{field.label}{field.required && <span className="ml-1 text-destructive">*</span>}</Label><p className="mt-1 text-xs leading-5 text-muted-foreground">{field.help}</p><Input className="mt-3" type={field.type === "password" && !showSecrets ? "password" : field.type === "url" ? "url" : "text"} placeholder={field.placeholder} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
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

function EmptyState({ source }: { source: string }) {
  return <div className="p-10 text-center"><DatabaseZap className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><p className="font-semibold">No source fields detected yet</p><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Save the {source} configuration and click Detect fields. NexStock will create a mapping draft from detected source fields.</p></div>;
}

function getSetupDescription(source: IntegrationSource) {
  if (source === "zoho") return "Add Zoho OAuth credentials and organization details from the Zoho API console.";
  if (source === "wordpress") return "Add WooCommerce REST API credentials from WordPress settings.";
  if (source === "shopify") return "Add Shopify Admin API credentials from your store private app or custom app.";
  if (source === "xlsx") return "Upload an Excel workbook so NexStock can detect sheet columns.";
  if (source === "json") return "Paste a sample JSON object or product array for field detection.";
  if (source === "custom") return "Add an endpoint and optional API key, then paste a sample JSON response.";
  return "Configure this source before field detection and mapping.";
}

async function extractSpreadsheetFields(file: File) {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const sample = rows[0] ?? {};
  return Object.keys(sample).map((key) => ({ key, label: key, sample: stringifySample(sample[key]), type: typeof sample[key] }));
}

function extractFieldsFromJson(value: string) {
  const parsed = JSON.parse(value) as unknown;
  const item = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!item || typeof item !== "object") throw new Error("JSON must be an object or an array of objects.");
  return Object.entries(item as Record<string, unknown>).map(([key, sample]) => ({ key, label: key, sample: stringifySample(sample), type: typeof sample }));
}

function stringifySample(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function normalizeCredentials(credentials: Credentials) {
  return Object.fromEntries(Object.entries(credentials).map(([key, value]) => [key, value.trim()]));
}
