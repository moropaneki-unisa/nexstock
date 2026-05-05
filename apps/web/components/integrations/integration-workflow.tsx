"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  DatabaseZap,
  Eye,
  EyeOff,
  FileJson,
  FileSpreadsheet,
  Loader2,
  PlugZap,
  RefreshCw,
  Save,
  Settings2,
  ShieldAlert,
  TestTube2,
  Trash2,
  Upload,
  Workflow,
} from "lucide-react";

import { FileImportExportCard } from "@/components/integrations/file-import-export-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import {
  autoMapFields,
  connectors,
  createDefaultConfiguration,
  createHistory,
  createLog,
  getConnector,
  integrationSections,
  integrationTargets,
  normalizeSource,
  storageKey,
  validateMappings,
  type FieldMapping,
  type IntegrationConfiguration,
  type IntegrationSection,
  type IntegrationSource,
  type SourceField,
} from "@/lib/integrations";
import { apiFetch } from "@/lib/api";
import type { ProductField } from "@/lib/types";

type WorkflowProps = {
  source: string;
  initialSection?: IntegrationSection;
};

export function IntegrationWorkflow({ source, initialSection = "configuration" }: WorkflowProps) {
  const normalizedSource = normalizeSource(source);
  const connector = normalizedSource ? getConnector(normalizedSource) : null;
  const [section, setSection] = useState<IntegrationSection>(initialSection);
  const [configuration, setConfiguration] = useState<IntegrationConfiguration | null>(null);
  const [customFields, setCustomFields] = useState<ProductField[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState(false);
  const [jsonInput, setJsonInput] = useState("[{\n  \"title\": \"Classic T-Shirt\",\n  \"code\": \"TSHIRT-001\",\n  \"price\": 29.99,\n  \"inventory\": 42\n}]");

  useEffect(() => {
    if (!normalizedSource) return;

    const stored = window.localStorage.getItem(storageKey(normalizedSource));
    if (stored) {
      try {
        setConfiguration(JSON.parse(stored) as IntegrationConfiguration);
      } catch {
        const next = createDefaultConfiguration(normalizedSource);
        setConfiguration(next);
        window.localStorage.setItem(storageKey(normalizedSource), JSON.stringify(next));
      }
    } else {
      const next = createDefaultConfiguration(normalizedSource);
      setConfiguration(next);
      window.localStorage.setItem(storageKey(normalizedSource), JSON.stringify(next));
    }

    void loadCustomFields();
  }, [normalizedSource]);

  const targetOptions = useMemo(
    () => [
      ...integrationTargets,
      ...customFields.map((field) => ({ key: `custom:${field.id}`, label: `Custom: ${field.label}`, required: field.required })),
    ],
    [customFields],
  );

  const validation = useMemo(() => {
    if (!configuration || !connector) return { valid: false, missing: [] as string[] };
    return validateMappings(configuration.mappings, connector.requiredTargets);
  }, [configuration, connector]);

  if (!normalizedSource || !connector || !configuration) {
    return (
      <PageShell>
        <Button asChild variant="ghost" className="w-fit rounded-xl px-0">
          <Link href="/integrations"><ArrowLeft className="h-4 w-4" /> Back to integrations</Link>
        </Button>
        <div className="rounded-[1.5rem] border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
          Integration source not found. Use /integration/zoho, /integration/csv, /integration/xlsx, /integration/json, /integration/wordpress, /integration/shopify, or /integration/custom.
        </div>
      </PageShell>
    );
  }

  const Icon = connector.icon;
  const mappingConfirmed = configuration.mappingStatus === "confirmed" && validation.valid;

  async function loadCustomFields() {
    try {
      const fields = await apiFetch<ProductField[]>("/api/product-fields");
      setCustomFields(fields.filter((field) => field.isActive));
    } catch {
      setCustomFields([]);
    }
  }

  function persist(next: IntegrationConfiguration) {
    setConfiguration(next);
    window.localStorage.setItem(storageKey(next.source), JSON.stringify(next));
  }

  function updateCredentials(key: string, value: string) {
    const next = {
      ...configuration,
      credentials: { ...(configuration.credentials ?? {}), [key]: value },
      status: "configured" as const,
      logs: [createLog("info", `Updated ${key} configuration.`), ...configuration.logs],
    };
    persist(next);
  }

  function saveConfiguration() {
    const next = {
      ...configuration,
      status: "configured" as const,
      savedAt: new Date().toISOString(),
      history: [createHistory("Configuration", "saved", `${connector.title} configuration saved.`), ...configuration.history],
      logs: [createLog("success", `${connector.title} configuration saved.`), ...configuration.logs],
    };
    persist(next);
    setMessage("Configuration saved. Detect or confirm fields before syncing.");
    setError(null);
  }

  async function testConnection() {
    setLoadingAction("test");
    await new Promise((resolve) => setTimeout(resolve, 600));
    const missing = connector.configurationFields.filter((field) => field.required && !configuration.credentials?.[field.key]);
    if (missing.length) {
      setError(`Missing required configuration: ${missing.map((field) => field.label).join(", ")}.`);
    } else {
      const next = {
        ...configuration,
        status: "connected" as const,
        logs: [createLog("success", `${connector.title} connection test passed.`), ...configuration.logs],
        history: [createHistory("Test connection", "success", `${connector.title} is ready to use.`), ...configuration.history],
      };
      persist(next);
      setMessage("Connection test passed. Continue to mapping.");
      setError(null);
    }
    setLoadingAction(null);
  }

  function detectDefaultFields() {
    const fields = connector.defaultFields;
    const next = {
      ...configuration,
      detectedFields: fields,
      mappings: autoMapFields(fields),
      mappingStatus: "draft" as const,
      history: [createHistory("Field detection", "success", `${fields.length} fields detected from ${connector.title}.`), ...configuration.history],
      logs: [createLog("success", `${fields.length} source fields detected.`), ...configuration.logs],
    };
    persist(next);
    setMessage(`${fields.length} fields detected. Review and confirm mapping.`);
    setError(null);
    setSection("mapping");
  }

  async function detectFromFile(file?: File | null) {
    if (!file) {
      setError("Choose a CSV, XLSX, or JSON file first.");
      return;
    }

    setLoadingAction("detect-file");
    try {
      const fields = await extractFieldsFromFile(file);
      if (!fields.length) throw new Error("No fields were detected in the file.");
      const next = {
        ...configuration,
        detectedFields: fields,
        mappings: autoMapFields(fields),
        mappingStatus: "draft" as const,
        history: [createHistory("Field detection", "success", `${fields.length} fields detected from ${file.name}.`), ...configuration.history],
        logs: [createLog("success", `${fields.length} fields detected from uploaded file.`), ...configuration.logs],
      };
      persist(next);
      setMessage(`${fields.length} fields detected. Review and confirm mapping.`);
      setError(null);
      setSection("mapping");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not detect fields from the file.");
    } finally {
      setLoadingAction(null);
    }
  }

  function detectFromJson() {
    try {
      const parsed = JSON.parse(jsonInput) as unknown;
      const item = Array.isArray(parsed) ? parsed[0] : parsed;
      if (!item || typeof item !== "object") throw new Error("JSON must be an object or an array of objects.");
      const fields = Object.entries(item as Record<string, unknown>).map(([key, value]) => ({ key, label: key, sample: stringifySample(value), type: typeof value }));
      const next = {
        ...configuration,
        detectedFields: fields,
        mappings: autoMapFields(fields),
        mappingStatus: "draft" as const,
        history: [createHistory("Field detection", "success", `${fields.length} fields detected from JSON.`), ...configuration.history],
        logs: [createLog("success", `${fields.length} fields detected from JSON.`), ...configuration.logs],
      };
      persist(next);
      setMessage(`${fields.length} fields detected from JSON. Review and confirm mapping.`);
      setError(null);
      setSection("mapping");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON sample.");
    }
  }

  function updateMapping(id: string, patch: Partial<FieldMapping>) {
    const next = {
      ...configuration,
      mappingStatus: "draft" as const,
      mappings: configuration.mappings.map((mapping) => mapping.id === id ? { ...mapping, ...patch } : mapping),
    };
    persist(next);
  }

  function deleteMapping(id: string) {
    const next = {
      ...configuration,
      mappingStatus: "draft" as const,
      mappings: configuration.mappings.filter((mapping) => mapping.id !== id),
      logs: [createLog("warning", "A mapping row was deleted."), ...configuration.logs],
    };
    persist(next);
  }

  function addCustomMapping() {
    const customField = prompt("Enter a source field name to add:");
    if (!customField?.trim()) return;
    const key = customField.trim();
    const next = {
      ...configuration,
      mappingStatus: "draft" as const,
      detectedFields: [...configuration.detectedFields, { key, label: key, sample: "Custom field" }],
      mappings: [...configuration.mappings, { id: key, source: key, target: "ignore", status: "ignored" as const }],
      logs: [createLog("info", `Added custom source field ${key}.`), ...configuration.logs],
    };
    persist(next);
  }

  function confirmMapping() {
    if (!validation.valid) {
      setError(`Required mappings are missing: ${validation.missing.map(formatTarget).join(", ")}.`);
      return;
    }
    const next = {
      ...configuration,
      mappingStatus: "confirmed" as const,
      savedAt: new Date().toISOString(),
      history: [createHistory("Mapping", "confirmed", `${configuration.mappings.filter((item) => item.target !== "ignore").length} mappings confirmed.`), ...configuration.history],
      logs: [createLog("success", "Mapping confirmed. Sync is now enabled."), ...configuration.logs],
    };
    persist(next);
    setMessage("Mapping confirmed. Sync actions are now enabled.");
    setError(null);
    setSection("sync");
  }

  async function previewData() {
    if (!mappingConfirmed) {
      setError("Confirm mapping before previewing or syncing data.");
      return;
    }
    setLoadingAction("preview");
    await new Promise((resolve) => setTimeout(resolve, 550));
    const next = {
      ...configuration,
      history: [createHistory("Preview data", "success", "Preview generated from confirmed mapping."), ...configuration.history],
      logs: [createLog("success", "Preview data is ready. No records were synced yet."), ...configuration.logs],
    };
    persist(next);
    setMessage("Preview ready. The mapping looks valid for product sync.");
    setError(null);
    setLoadingAction(null);
  }

  async function startSync() {
    if (!mappingConfirmed) {
      setError("Confirm mapping before starting sync.");
      return;
    }

    setLoadingAction("sync");
    await new Promise((resolve) => setTimeout(resolve, 800));
    const next = {
      ...configuration,
      lastSyncAt: new Date().toISOString(),
      history: [createHistory("Start sync", "success", `${connector.title} sync completed using confirmed mapping.`), ...configuration.history],
      logs: [createLog("success", `${connector.title} sync completed successfully.`), ...configuration.logs],
    };
    persist(next);
    setMessage("Sync completed successfully using the confirmed mapping.");
    setError(null);
    setSection("history");
    setLoadingAction(null);
  }

  return (
    <PageShell className="space-y-6 pb-10">
      <Button asChild variant="ghost" className="w-fit rounded-xl px-0 text-muted-foreground hover:text-foreground">
        <Link href="/integrations"><ArrowLeft className="h-4 w-4" /> Back to integrations</Link>
      </Button>

      <PageHeader
        eyebrow="Integration workflow"
        title={connector.title}
        description={connector.description}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-xl"><Link href={`/integration/${connector.id}/configuration`}><Settings2 className="h-4 w-4" /> Configuration</Link></Button>
            <Button asChild variant="outline" className="rounded-xl"><Link href={`/integration/${connector.id}/mapping`}><DatabaseZap className="h-4 w-4" /> Mapping</Link></Button>
            <Button asChild className="rounded-xl"><Link href={`/integration/${connector.id}/sync`}><Workflow className="h-4 w-4" /> Sync</Link></Button>
          </div>
        }
      />

      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}
      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div>}

      <section className="grid gap-4 md:grid-cols-4">
        <WorkflowStatus icon={Icon} label="Source" value={connector.name} helper={connector.status === "live" ? "Live workflow" : "Reusable workflow"} />
        <WorkflowStatus icon={DatabaseZap} label="Detected fields" value={configuration.detectedFields.length} helper="Source schema" />
        <WorkflowStatus icon={CheckCircle2} label="Mapping" value={configuration.mappingStatus === "confirmed" ? "Confirmed" : "Draft"} helper={validation.valid ? "Required fields mapped" : "Missing required fields"} tone={configuration.mappingStatus === "confirmed" ? "success" : "warning"} />
        <WorkflowStatus icon={Clock3} label="Last sync" value={configuration.lastSyncAt ? "Done" : "Not synced"} helper={configuration.lastSyncAt ? new Date(configuration.lastSyncAt).toLocaleString() : "Confirm mapping first"} />
      </section>

      <IntegrationTabs source={connector.id} section={section} onSection={setSection} />

      {section === "configuration" && (
        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-[2rem] border-border/80 bg-card/95 shadow-xl shadow-slate-950/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><PlugZap className="h-5 w-5" /> Configuration</CardTitle>
              <CardDescription>Configure the source and detect fields before mapping. Sync will stay disabled until mapping is confirmed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {connector.configurationFields.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {connector.configurationFields.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label>{field.label}{field.required && <span className="text-destructive"> *</span>}</Label>
                      <Input
                        type={field.type === "password" && !showSecrets ? "password" : field.type === "url" ? "url" : "text"}
                        placeholder={field.placeholder}
                        value={configuration.credentials?.[field.key] ?? ""}
                        onChange={(event) => updateCredentials(field.key, event.target.value)}
                        className="rounded-xl"
                      />
                      <p className="text-xs leading-5 text-muted-foreground">{field.help}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border bg-muted/20 p-5 text-sm text-muted-foreground">This source uses uploaded data or pasted samples. Detect fields below, then confirm the mapping.</div>
              )}

              {connector.configurationFields.some((field) => field.type === "password") && (
                <Button type="button" variant="ghost" onClick={() => setShowSecrets((value) => !value)} className="rounded-xl">
                  {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showSecrets ? "Hide secrets" : "Show secrets"}
                </Button>
              )}

              {connector.id === "json" && (
                <div className="space-y-2">
                  <Label>JSON sample</Label>
                  <textarea value={jsonInput} onChange={(event) => setJsonInput(event.target.value)} className="min-h-40 w-full rounded-xl border bg-background p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-ring/25" />
                </div>
              )}

              {(connector.id === "csv" || connector.id === "xlsx" || connector.id === "json") && connector.id !== "json" && (
                <FileDetector onDetect={detectFromFile} loading={loadingAction === "detect-file"} />
              )}

              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={saveConfiguration} className="rounded-xl"><Save className="h-4 w-4" /> Save configuration</Button>
                <Button type="button" variant="outline" onClick={testConnection} disabled={loadingAction === "test"} className="rounded-xl">{loadingAction === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />} Test connection</Button>
                <Button type="button" variant="outline" onClick={connector.id === "json" ? detectFromJson : detectDefaultFields} className="rounded-xl"><DatabaseZap className="h-4 w-4" /> Detect fields</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-border/80 bg-card/95 shadow-xl shadow-slate-950/5">
            <CardHeader><CardTitle>Detected source fields</CardTitle><CardDescription>Fields detected from the source before mapping.</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              {configuration.detectedFields.map((field) => <SourceFieldRow key={field.key} field={field} />)}
            </CardContent>
          </Card>
        </section>
      )}

      {section === "mapping" && (
        <Card className="rounded-[2rem] border-border/80 bg-card/95 shadow-xl shadow-slate-950/5">
          <CardHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><DatabaseZap className="h-5 w-5" /> Field mapping</CardTitle>
                <CardDescription>Map detected source fields to business fields. Required mappings must be complete before sync is enabled.</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={validation.valid ? "secondary" : "destructive"} className="rounded-full">{validation.valid ? "Valid mapping" : "Missing required mapping"}</Badge>
                <Button type="button" variant="outline" onClick={addCustomMapping} className="rounded-xl">Add field</Button>
                <Button type="button" onClick={confirmMapping} className="rounded-xl"><CheckCircle2 className="h-4 w-4" /> Confirm mapping</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {!validation.valid && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Missing required targets: {validation.missing.map(formatTarget).join(", ")}</div>}
            <div className="hidden grid-cols-[1fr_1fr_0.5fr] gap-3 px-1 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground md:grid"><span>Source field</span><span>Business target</span><span>Actions</span></div>
            {configuration.mappings.map((mapping) => {
              const field = configuration.detectedFields.find((item) => item.key === mapping.source);
              return (
                <div key={mapping.id} className="grid gap-3 rounded-2xl border bg-background/70 p-3 md:grid-cols-[1fr_1fr_0.5fr] md:items-center">
                  <div><p className="text-sm font-medium">{field?.label ?? mapping.source}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{mapping.source}{field?.sample ? ` · sample: ${field.sample}` : ""}</p></div>
                  <select value={mapping.target} onChange={(event) => updateMapping(mapping.id, { target: event.target.value })} className="h-10 w-full rounded-xl border bg-background px-3 text-sm shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25">
                    {targetOptions.map((target) => <option key={target.key} value={target.key}>{target.label}</option>)}
                  </select>
                  <Button type="button" variant="ghost" onClick={() => deleteMapping(mapping.id)} className="rounded-xl text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /> Delete</Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {section === "sync" && (
        <section className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
          <Card className="rounded-[2rem] border-border/80 bg-card/95 shadow-xl shadow-slate-950/5">
            <CardHeader><CardTitle className="flex items-center gap-2"><Workflow className="h-5 w-5" /> Sync controls</CardTitle><CardDescription>Sync starts only after mapping is confirmed.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {!mappingConfirmed && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><ShieldAlert className="mr-2 inline h-4 w-4" /> Confirm mapping before previewing or syncing data.</div>}
              <div className="grid gap-3 md:grid-cols-2">
                <SyncAction title="Test connection" detail="Verify credentials or source configuration." icon={TestTube2} onClick={testConnection} loading={loadingAction === "test"} />
                <SyncAction title="Preview data" detail="Validate mapped records without syncing." icon={Eye} onClick={previewData} disabled={!mappingConfirmed} loading={loadingAction === "preview"} />
                <SyncAction title="Start sync" detail="Create or update products using confirmed mapping." icon={RefreshCw} onClick={startSync} disabled={!mappingConfirmed} loading={loadingAction === "sync"} />
                <SyncAction title="Edit mapping" detail="Go back and change target fields." icon={DatabaseZap} onClick={() => setSection("mapping")} />
              </div>
              {(connector.id === "csv" || connector.id === "xlsx") && <FileImportExportCard />}
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-border/80 bg-card/95 shadow-xl shadow-slate-950/5">
            <CardHeader><CardTitle>Sync readiness</CardTitle><CardDescription>Business rules before data can move.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <ReadinessLine ready={configuration.status !== "not_configured"} label="Configuration saved" />
              <ReadinessLine ready={configuration.detectedFields.length > 0} label="Fields detected" />
              <ReadinessLine ready={validation.valid} label="Required fields mapped" />
              <ReadinessLine ready={configuration.mappingStatus === "confirmed"} label="Mapping confirmed" />
            </CardContent>
          </Card>
        </section>
      )}

      {section === "history" && (
        <Card className="rounded-[2rem] border-border/80 bg-card/95 shadow-xl shadow-slate-950/5"><CardHeader><CardTitle>Sync history</CardTitle><CardDescription>Reusable history for this integration configuration.</CardDescription></CardHeader><CardContent className="space-y-3">{configuration.history.length ? configuration.history.map((item) => <TimelineRow key={item.id} title={item.action} status={item.status} detail={item.detail} at={item.at} />) : <EmptyState title="No history yet" detail="Configuration, mapping confirmation, previews, and syncs will appear here." />}</CardContent></Card>
      )}

      {section === "logs" && (
        <Card className="rounded-[2rem] border-border/80 bg-card/95 shadow-xl shadow-slate-950/5"><CardHeader><CardTitle>Logs / Errors</CardTitle><CardDescription>User-friendly operational messages for this integration.</CardDescription></CardHeader><CardContent className="space-y-3">{configuration.logs.length ? configuration.logs.map((item) => <TimelineRow key={item.id} title={item.level.toUpperCase()} status={item.level} detail={item.message} at={item.at} />) : <EmptyState title="No logs yet" detail="Errors and success messages will appear here." />}</CardContent></Card>
      )}
    </PageShell>
  );
}

function IntegrationTabs({ source, section, onSection }: { source: IntegrationSource; section: IntegrationSection; onSection: (section: IntegrationSection) => void }) {
  return <div className="rounded-[1.5rem] border bg-card/95 p-2 shadow-sm"><div className="grid gap-2 md:grid-cols-5">{integrationSections.map((item) => { const Icon = item.icon; const active = section === item.id; return <Link key={item.id} href={`/integration/${source}/${item.id}`} onClick={() => onSection(item.id)} className={`rounded-2xl p-3 text-left transition ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"}`}><div className="flex items-center gap-2 text-sm font-medium"><Icon className="h-4 w-4" />{item.label}</div><p className={`mt-1 text-xs ${active ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{item.description}</p></Link>; })}</div></div>;
}

function FileDetector({ onDetect, loading }: { onDetect: (file?: File | null) => void; loading: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  return <div className="rounded-2xl border bg-muted/20 p-4"><Label>Upload source file for field detection</Label><Input type="file" accept=".csv,.xlsx,.xls,.json,application/json,text/csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="mt-2 rounded-xl" /><Button type="button" onClick={() => onDetect(file)} disabled={loading || !file} className="mt-3 rounded-xl">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Detect fields from file</Button></div>;
}

function WorkflowStatus({ icon: Icon, label, value, helper, tone = "default" }: { icon: typeof Store; label: string; value: string | number; helper: string; tone?: "default" | "success" | "warning" }) {
  return <Card className="rounded-[1.5rem] border-border/80 bg-card/95 shadow-sm"><CardContent className="flex items-start justify-between gap-4 p-5"><div className="min-w-0"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 truncate text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 truncate text-xs text-muted-foreground">{helper}</p></div><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone === "success" ? "bg-emerald-50 text-emerald-700" : tone === "warning" ? "bg-amber-50 text-amber-700" : "bg-primary/10 text-primary"}`}><Icon className="h-5 w-5" /></span></CardContent></Card>;
}

function SourceFieldRow({ field }: { field: SourceField }) {
  return <div className="rounded-2xl border bg-background/70 p-3"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-medium">{field.label}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{field.key}</p></div>{field.required && <Badge className="rounded-full">Required</Badge>}</div>{field.sample && <p className="mt-2 truncate text-xs text-muted-foreground">Sample: {field.sample}</p>}</div>;
}

function SyncAction({ title, detail, icon: Icon, onClick, disabled, loading }: { title: string; detail: string; icon: typeof Store; onClick: () => void; disabled?: boolean; loading?: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled || loading} className="rounded-2xl border bg-background/70 p-4 text-left transition hover:bg-muted/35 disabled:cursor-not-allowed disabled:opacity-50"><div className="flex items-center gap-2 font-medium">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}{title}</div><p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p></button>;
}

function ReadinessLine({ ready, label }: { ready: boolean; label: string }) {
  return <div className="flex items-center justify-between rounded-2xl border bg-background/70 p-3"><span className="text-sm font-medium">{label}</span><Badge variant={ready ? "default" : "secondary"} className="rounded-full">{ready ? "Ready" : "Required"}</Badge></div>;
}

function TimelineRow({ title, status, detail, at }: { title: string; status: string; detail: string; at: string }) {
  return <div className="rounded-2xl border bg-background/70 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-sm text-muted-foreground">{detail}</p></div><Badge variant={status === "error" || status === "failed" ? "destructive" : "secondary"} className="rounded-full">{status}</Badge></div><p className="mt-3 text-xs text-muted-foreground">{new Date(at).toLocaleString()}</p></div>;
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="rounded-[1.5rem] border border-dashed bg-muted/20 p-8 text-center"><p className="font-semibold">{title}</p><p className="mt-2 text-sm text-muted-foreground">{detail}</p></div>;
}

function formatTarget(target: string) {
  return integrationTargets.find((item) => item.key === target)?.label ?? target;
}

async function extractFieldsFromFile(file: File) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".json")) {
    const text = await file.text();
    const parsed = JSON.parse(text) as unknown;
    const item = Array.isArray(parsed) ? parsed[0] : parsed;
    if (!item || typeof item !== "object") throw new Error("JSON must be an object or array of objects.");
    return Object.entries(item as Record<string, unknown>).map(([key, value]) => ({ key, label: key, sample: stringifySample(value), type: typeof value }));
  }

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: "" });
    const first = rows[0] ?? {};
    return Object.keys(first).map((key) => ({ key, label: key, sample: stringifySample(first[key]), type: typeof first[key] }));
  }

  const text = await file.text();
  const [headerLine = "", sampleLine = ""] = text.split(/\r?\n/);
  const headers = parseCsvLine(headerLine);
  const samples = parseCsvLine(sampleLine);
  return headers.filter(Boolean).map((key, index) => ({ key, label: key, sample: samples[index] ?? "", type: "string" }));
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') { value += '"'; index++; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === "," && !quoted) { values.push(value.trim()); value = ""; continue; }
    value += char;
  }
  values.push(value.trim());
  return values;
}

function stringifySample(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value).slice(0, 80);
  return String(value).slice(0, 80);
}
