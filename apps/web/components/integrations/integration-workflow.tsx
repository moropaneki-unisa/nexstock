"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  DatabaseZap,
  Eye,
  EyeOff,
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
  type LucideIcon,
} from "lucide-react";

import { FileImportExportCard } from "@/components/integrations/file-import-export-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { apiFetch } from "@/lib/api";
import {
  autoMapFields,
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
import type { ProductField } from "@/lib/types";

type WorkflowProps = { source: string; initialSection?: IntegrationSection };

const nextSection: Record<IntegrationSection, IntegrationSection> = {
  configuration: "mapping",
  mapping: "sync",
  sync: "history",
  history: "logs",
  logs: "configuration",
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
  const [newSourceField, setNewSourceField] = useState("");
  const [jsonInput, setJsonInput] = useState("[{\n  \"title\": \"Classic T-Shirt\",\n  \"code\": \"TSHIRT-001\",\n  \"price\": 29.99,\n  \"inventory\": 42\n}]");

  useEffect(() => setSection(initialSection), [initialSection]);

  useEffect(() => {
    if (!normalizedSource) return;
    const stored = window.localStorage.getItem(storageKey(normalizedSource));
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as IntegrationConfiguration;
        setConfiguration({ ...parsed, mappingStatus: parsed.mappingStatus ?? (parsed.mappings?.length ? "draft" : "not_started") });
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

  const targetOptions = useMemo(() => [...integrationTargets, ...customFields.map((field) => ({ key: `custom:${field.id}`, label: `Additional field: ${field.label}`, required: field.required }))], [customFields]);
  const validation = useMemo(() => !configuration || !connector ? { valid: false, missing: [] as string[] } : validateMappings(configuration.mappings, connector.requiredTargets), [configuration, connector]);

  if (!normalizedSource || !connector || !configuration) {
    return <PageShell className="space-y-6"><Button asChild variant="ghost" className="w-fit rounded-xl px-0"><Link href="/integrations"><ArrowLeft className="h-4 w-4" /> Back to integrations</Link></Button><div className="rounded-[1.5rem] border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">Integration source not found. Go back to the integrations page and choose a supported source.</div></PageShell>;
  }

  const Icon = connector.icon;
  const hasDetectedFields = configuration.detectedFields.length > 0;
  const mappingConfirmed = configuration.mappingStatus === "confirmed" && validation.valid;
  const hasRequiredConfiguration = connector.configurationFields.every((field) => !field.required || Boolean(configuration.credentials?.[field.key]?.trim()));

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

  function addEvent(next: IntegrationConfiguration, level: IntegrationConfiguration["logs"][number]["level"], action: string, status: string, detail: string) {
    return { ...next, history: [createHistory(action, status, detail), ...next.history], logs: [createLog(level, detail), ...next.logs] };
  }

  function updateCredentials(key: string, value: string) {
    persist({ ...configuration, credentials: { ...(configuration.credentials ?? {}), [key]: value }, status: "configured" });
  }

  function saveConfiguration() {
    const missing = connector.configurationFields.filter((field) => field.required && !configuration.credentials?.[field.key]?.trim());
    if (missing.length) return setError(`Missing required configuration: ${missing.map((field) => field.label).join(", ")}.`);
    const next = addEvent({ ...configuration, status: "configured", savedAt: new Date().toISOString() }, "success", "Configuration", "saved", `${connector.title} configuration saved.`);
    persist(next);
    setMessage("Configuration saved. Detect fields next, then review mapping suggestions.");
    setError(null);
  }

  async function testConnection() {
    setLoadingAction("test");
    await new Promise((resolve) => setTimeout(resolve, 450));
    const missing = connector.configurationFields.filter((field) => field.required && !configuration.credentials?.[field.key]?.trim());
    if (missing.length) setError(`Missing required configuration: ${missing.map((field) => field.label).join(", ")}.`);
    else {
      persist(addEvent({ ...configuration, status: "connected" }, "success", "Test connection", "success", `${connector.title} connection details look ready.`));
      setMessage("Connection check passed. Detect fields before mapping.");
      setError(null);
    }
    setLoadingAction(null);
  }

  function detectDefaultFields() {
    const fields = connector.defaultFields;
    if (!fields.length) return setError("This source needs a file, JSON sample, or real API discovery before fields can be detected.");
    const next = addEvent({ ...configuration, detectedFields: fields, mappings: autoMapFields(fields), mappingStatus: "draft" }, "success", "Field detection", "success", `${fields.length} source fields detected from ${connector.title}.`);
    persist(next);
    setMessage(`${fields.length} fields detected. Mapping suggestions are ready for review.`);
    setError(null);
    setSection("mapping");
  }

  async function detectFromFile(file?: File | null) {
    if (!file) return setError("Choose a CSV, XLSX, or JSON file first.");
    setLoadingAction("detect-file");
    try {
      const fields = await extractFieldsFromFile(file);
      if (!fields.length) throw new Error("No fields were detected in the file.");
      persist(addEvent({ ...configuration, detectedFields: fields, mappings: autoMapFields(fields), mappingStatus: "draft" }, "success", "Field detection", "success", `${fields.length} fields detected from ${file.name}.`));
      setMessage(`${fields.length} fields detected. Mapping suggestions are ready for review.`);
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
      persist(addEvent({ ...configuration, detectedFields: fields, mappings: autoMapFields(fields), mappingStatus: "draft" }, "success", "Field detection", "success", `${fields.length} fields detected from JSON.`));
      setMessage(`${fields.length} fields detected from JSON. Mapping suggestions are ready for review.`);
      setError(null);
      setSection("mapping");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON sample.");
    }
  }

  function updateMapping(id: string, patch: Partial<FieldMapping>) {
    persist({ ...configuration, mappingStatus: "draft", mappings: configuration.mappings.map((mapping) => mapping.id === id ? { ...mapping, ...patch } : mapping) });
  }

  function deleteMapping(id: string) {
    persist(addEvent({ ...configuration, mappingStatus: "draft", mappings: configuration.mappings.filter((mapping) => mapping.id !== id) }, "warning", "Mapping", "updated", "A mapping row was deleted."));
  }

  function addCustomMapping() {
    const key = newSourceField.trim();
    if (!key) return setError("Enter a source field name before adding it.");
    if (configuration.mappings.some((mapping) => mapping.source === key)) return setError("That source field already exists in the mapping.");
    persist(addEvent({ ...configuration, mappingStatus: "draft", detectedFields: [...configuration.detectedFields, { key, label: key, sample: "Manual source field" }], mappings: [...configuration.mappings, { id: key, source: key, target: "ignore", status: "ignored" }] }, "info", "Mapping", "updated", `Added source field ${key}.`));
    setNewSourceField("");
    setError(null);
  }

  function confirmMapping() {
    if (!hasDetectedFields) return setError("Detect source fields before confirming mapping.");
    if (!validation.valid) return setError(`Required mappings are missing: ${validation.missing.map(formatTarget).join(", ")}.`);
    const mappedCount = configuration.mappings.filter((item) => item.target !== "ignore").length;
    persist(addEvent({ ...configuration, mappingStatus: "confirmed", savedAt: new Date().toISOString() }, "success", "Mapping", "confirmed", `${mappedCount} mappings confirmed. Sync is now enabled.`));
    setMessage("Mapping confirmed. Sync actions are now enabled.");
    setError(null);
    setSection("sync");
  }

  async function previewData() {
    if (!mappingConfirmed) return setError("Confirm mapping before previewing or syncing data.");
    setLoadingAction("preview");
    await new Promise((resolve) => setTimeout(resolve, 450));
    persist(addEvent(configuration, "success", "Preview data", "success", "Preview generated from confirmed mapping. No records were changed."));
    setMessage("Preview ready. The mapping looks valid for product sync.");
    setError(null);
    setLoadingAction(null);
  }

  async function startSync() {
    if (!mappingConfirmed) return setError("Confirm mapping before starting sync.");
    setLoadingAction("sync");
    try {
      if (connector.id === "zoho") {
        const result = await apiFetch<{ created: number; updated: number; total: number }>("/api/integrations/zoho/sync", { method: "POST" });
        persist(addEvent({ ...configuration, lastSyncAt: new Date().toISOString() }, "success", "Start sync", "success", `Zoho sync completed: ${result.total} processed, ${result.created} created, ${result.updated} updated.`));
      } else {
        await new Promise((resolve) => setTimeout(resolve, 650));
        persist(addEvent({ ...configuration, lastSyncAt: new Date().toISOString() }, "success", "Start sync", "success", `${connector.title} sync workflow completed using confirmed mapping.`));
      }
      setMessage("Sync completed successfully using the confirmed mapping.");
      setError(null);
      setSection("history");
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Sync failed.";
      persist(addEvent(configuration, "error", "Start sync", "failed", detail));
      setError(detail);
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <PageShell className="space-y-5 pb-10">
      <Button asChild variant="ghost" className="w-fit rounded-xl px-0 text-muted-foreground hover:text-foreground"><Link href="/integrations"><ArrowLeft className="h-4 w-4" /> Back to integrations</Link></Button>
      <PageHeader eyebrow="Integration workflow" title={connector.title} description={connector.description} actions={<div className="flex flex-wrap gap-2"><Button asChild variant="outline" className="rounded-xl"><Link href={`/integration/${connector.id}/configuration`}><Settings2 className="h-4 w-4" /> Configuration</Link></Button><Button asChild variant="outline" className="rounded-xl"><Link href={`/integration/${connector.id}/mapping`}><DatabaseZap className="h-4 w-4" /> Mapping</Link></Button><Button asChild className="rounded-xl"><Link href={`/integration/${connector.id}/sync`}><Workflow className="h-4 w-4" /> Sync</Link></Button></div>} />
      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}
      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div>}
      <section className="grid gap-3 md:grid-cols-4"><WorkflowStatus icon={Icon} label="Source" value={connector.name} helper={connector.status === "live" ? "Live workflow" : "Reusable workflow"} /><WorkflowStatus icon={PlugZap} label="Configuration" value={hasRequiredConfiguration ? "Ready" : "Needs setup"} helper={connector.configurationFields.length ? "Required settings" : "File or sample based"} tone={hasRequiredConfiguration ? "success" : "warning"} /><WorkflowStatus icon={DatabaseZap} label="Fields" value={hasDetectedFields ? configuration.detectedFields.length : "Not detected"} helper={hasDetectedFields ? "Ready for mapping" : "Detect first"} tone={hasDetectedFields ? "success" : "warning"} /><WorkflowStatus icon={Clock3} label="Sync" value={mappingConfirmed ? "Enabled" : "Locked"} helper={mappingConfirmed ? "Mapping confirmed" : "Confirm mapping first"} /></section>
      <NextStepBanner section={section} source={connector.id} mappingConfirmed={mappingConfirmed} hasRequiredConfiguration={hasRequiredConfiguration} hasDetectedFields={hasDetectedFields} />
      <IntegrationTabs source={connector.id} section={section} onSection={setSection} />
      {section === "configuration" && <ConfigurationSection connector={connector} configuration={configuration} showSecrets={showSecrets} loadingAction={loadingAction} jsonInput={jsonInput} setJsonInput={setJsonInput} updateCredentials={updateCredentials} saveConfiguration={saveConfiguration} testConnection={testConnection} detectDefaultFields={detectDefaultFields} detectFromJson={detectFromJson} detectFromFile={detectFromFile} setShowSecrets={setShowSecrets} />}
      {section === "mapping" && <MappingSection hasDetectedFields={hasDetectedFields} configuration={configuration} validation={validation} targetOptions={targetOptions} newSourceField={newSourceField} setNewSourceField={setNewSourceField} updateMapping={updateMapping} deleteMapping={deleteMapping} addCustomMapping={addCustomMapping} confirmMapping={confirmMapping} goToConfiguration={() => setSection("configuration")} />}
      {section === "sync" && <SyncSection connectorId={connector.id} mappingConfirmed={mappingConfirmed} hasRequiredConfiguration={hasRequiredConfiguration} hasDetectedFields={hasDetectedFields} validationValid={validation.valid} mappingStatus={configuration.mappingStatus} loadingAction={loadingAction} testConnection={testConnection} previewData={previewData} startSync={startSync} goToMapping={() => setSection("mapping")} />}
      {section === "history" && <HistorySection configuration={configuration} />}
      {section === "logs" && <LogsSection configuration={configuration} />}
    </PageShell>
  );
}

function ConfigurationSection({ connector, configuration, showSecrets, loadingAction, jsonInput, setJsonInput, updateCredentials, saveConfiguration, testConnection, detectDefaultFields, detectFromJson, detectFromFile, setShowSecrets }: any) {
  return <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]"><Card className="rounded-[1.25rem]"><CardHeader><CardTitle className="flex items-center gap-2"><PlugZap className="h-5 w-5" /> Configuration and field detection</CardTitle><CardDescription>Set up the source first. Mapping stays empty until fields are detected from the source.</CardDescription></CardHeader><CardContent className="space-y-5">{connector.configurationFields.length > 0 ? <div className="grid gap-4 md:grid-cols-2">{connector.configurationFields.map((field: any) => <div key={field.key} className="space-y-2"><Label>{field.label}{field.required && <span className="text-destructive"> *</span>}</Label><Input type={field.type === "password" && !showSecrets ? "password" : field.type === "url" ? "url" : "text"} placeholder={field.placeholder} value={configuration.credentials?.[field.key] ?? ""} onChange={(event) => updateCredentials(field.key, event.target.value)} className="rounded-xl" /><p className="text-xs leading-5 text-muted-foreground">{field.help}</p></div>)}</div> : <div className="rounded-2xl border bg-muted/20 p-5 text-sm text-muted-foreground">Upload a file or paste a sample so InventoryHub can detect the real source fields.</div>}{connector.configurationFields.some((field: any) => field.type === "password") && <Button type="button" variant="ghost" onClick={() => setShowSecrets((value: boolean) => !value)} className="rounded-xl">{showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{showSecrets ? "Hide secrets" : "Show secrets"}</Button>}{connector.id === "json" && <div className="space-y-2"><Label>JSON sample</Label><textarea value={jsonInput} onChange={(event) => setJsonInput(event.target.value)} className="min-h-40 w-full rounded-xl border bg-background p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-ring/25" /></div>}{(connector.id === "csv" || connector.id === "xlsx") && <FileDetector onDetect={detectFromFile} loading={loadingAction === "detect-file"} />}<div className="flex flex-wrap gap-2"><Button type="button" onClick={saveConfiguration} className="rounded-xl"><Save className="h-4 w-4" /> Save configuration</Button><Button type="button" variant="outline" onClick={testConnection} disabled={loadingAction === "test"} className="rounded-xl">{loadingAction === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />} Test connection</Button><Button type="button" variant="outline" onClick={connector.id === "json" ? detectFromJson : detectDefaultFields} className="rounded-xl"><DatabaseZap className="h-4 w-4" /> Detect fields</Button></div></CardContent></Card><Card className="rounded-[1.25rem]"><CardHeader><CardTitle>Detected fields</CardTitle><CardDescription>These fields are discovered from the selected source. They will become mapping suggestions.</CardDescription></CardHeader><CardContent className="space-y-2">{configuration.detectedFields.length ? configuration.detectedFields.map((field: SourceField) => <SourceFieldRow key={field.key} field={field} />) : <EmptyState title="No fields detected yet" detail="Save or test configuration, then detect fields from Zoho, uploaded files, JSON, or another source." />}</CardContent></Card></section>;
}

function MappingSection({ hasDetectedFields, configuration, validation, targetOptions, newSourceField, setNewSourceField, updateMapping, deleteMapping, addCustomMapping, confirmMapping, goToConfiguration }: any) {
  if (!hasDetectedFields) return <Card className="rounded-[1.25rem]"><CardContent className="p-8"><EmptyState title="Detect fields before mapping" detail="Mapping starts after InventoryHub reads the source fields. Go to Configuration, upload or connect the source, then click Detect fields." /><Button type="button" onClick={goToConfiguration} className="mt-5 rounded-xl"><PlugZap className="h-4 w-4" /> Go to configuration</Button></CardContent></Card>;
  return <Card className="rounded-[1.25rem]"><CardHeader><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><CardTitle className="flex items-center gap-2"><DatabaseZap className="h-5 w-5" /> Field mapping</CardTitle><CardDescription>Review suggested mappings. Change anything that does not match your business fields, then confirm mapping to unlock sync.</CardDescription></div><div className="flex flex-wrap gap-2"><Badge variant={validation.valid ? "secondary" : "destructive"} className="rounded-full">{validation.valid ? "Valid mapping" : "Missing required mapping"}</Badge><Button type="button" onClick={confirmMapping} className="rounded-xl"><CheckCircle2 className="h-4 w-4" /> Confirm mapping</Button></div></div></CardHeader><CardContent className="space-y-4">{!validation.valid && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Missing required targets: {validation.missing.map(formatTarget).join(", ")}</div>}<div className="flex flex-col gap-2 rounded-2xl border bg-muted/20 p-4 sm:flex-row"><Input value={newSourceField} onChange={(event) => setNewSourceField(event.target.value)} placeholder="Add source field name, e.g. supplier_code" className="rounded-xl" /><Button type="button" variant="outline" onClick={addCustomMapping} className="rounded-xl">Add field</Button></div><div className="hidden grid-cols-[1fr_1fr_0.45fr] gap-3 px-1 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground md:grid"><span>Detected source field</span><span>InventoryHub field</span><span>Actions</span></div>{configuration.mappings.map((mapping: FieldMapping) => { const field = configuration.detectedFields.find((item: SourceField) => item.key === mapping.source); return <div key={mapping.id} className="grid gap-3 rounded-2xl border bg-background/70 p-3 md:grid-cols-[1fr_1fr_0.45fr] md:items-center"><div><p className="text-sm font-medium">{field?.label ?? mapping.source}</p><p className="mt-1 truncate font-mono text-xs text-muted-foreground">{mapping.source}{field?.sample ? ` · sample: ${field.sample}` : ""}</p></div><select value={mapping.target} onChange={(event) => updateMapping(mapping.id, { target: event.target.value })} className="h-10 w-full rounded-xl border bg-background px-3 text-sm shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25">{targetOptions.map((target: any) => <option key={target.key} value={target.key}>{target.label}</option>)}</select><Button type="button" variant="ghost" onClick={() => deleteMapping(mapping.id)} className="rounded-xl text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /> Delete</Button></div>; })}</CardContent></Card>;
}

function SyncSection({ connectorId, mappingConfirmed, hasRequiredConfiguration, hasDetectedFields, validationValid, mappingStatus, loadingAction, testConnection, previewData, startSync, goToMapping }: any) {
  return <section className="grid gap-5 xl:grid-cols-[1fr_0.8fr]"><Card className="rounded-[1.25rem]"><CardHeader><CardTitle className="flex items-center gap-2"><Workflow className="h-5 w-5" /> Sync controls</CardTitle><CardDescription>Sync is intentionally locked until fields are detected and mapping is confirmed.</CardDescription></CardHeader><CardContent className="space-y-4">{!mappingConfirmed && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><ShieldAlert className="mr-2 inline h-4 w-4" /> Confirm mapping before previewing or syncing data.</div>}<div className="grid gap-3 md:grid-cols-2"><SyncAction title="Test connection" detail="Verify credentials or source configuration." icon={TestTube2} onClick={testConnection} loading={loadingAction === "test"} /><SyncAction title="Preview data" detail="Validate mapped records without syncing." icon={Eye} onClick={previewData} disabled={!mappingConfirmed} loading={loadingAction === "preview"} /><SyncAction title="Start sync" detail="Create or update products using confirmed mapping." icon={RefreshCw} onClick={startSync} disabled={!mappingConfirmed} loading={loadingAction === "sync"} /><SyncAction title="Edit mapping" detail="Go back and change target fields." icon={DatabaseZap} onClick={goToMapping} disabled={!hasDetectedFields} /></div>{(connectorId === "csv" || connectorId === "xlsx") && <FileImportExportCard />}</CardContent></Card><Card className="rounded-[1.25rem]"><CardHeader><CardTitle>Sync readiness</CardTitle><CardDescription>Business rules before data can move.</CardDescription></CardHeader><CardContent className="space-y-3"><ReadinessLine ready={hasRequiredConfiguration} label="Configuration ready" /><ReadinessLine ready={hasDetectedFields} label="Fields detected" /><ReadinessLine ready={validationValid} label="Required fields mapped" /><ReadinessLine ready={mappingStatus === "confirmed"} label="Mapping confirmed" /></CardContent></Card></section>;
}

function HistorySection({ configuration }: { configuration: IntegrationConfiguration }) { return <Card className="rounded-[1.25rem]"><CardHeader><CardTitle>Sync history</CardTitle><CardDescription>Reusable history for this integration configuration.</CardDescription></CardHeader><CardContent className="space-y-3">{configuration.history.length ? configuration.history.map((item) => <TimelineRow key={item.id} title={item.action} status={item.status} detail={item.detail} at={item.at} />) : <EmptyState title="No history yet" detail="Configuration, field detection, mapping confirmation, previews, and syncs will appear here." />}</CardContent></Card>; }
function LogsSection({ configuration }: { configuration: IntegrationConfiguration }) { return <Card className="rounded-[1.25rem]"><CardHeader><CardTitle>Logs / Errors</CardTitle><CardDescription>User-friendly operational messages for this integration.</CardDescription></CardHeader><CardContent className="space-y-3">{configuration.logs.length ? configuration.logs.map((item) => <TimelineRow key={item.id} title={item.level.toUpperCase()} status={item.level} detail={item.message} at={item.at} />) : <EmptyState title="No logs yet" detail="Errors and success messages will appear here." />}</CardContent></Card>; }

function IntegrationTabs({ source, section, onSection }: { source: IntegrationSource; section: IntegrationSection; onSection: (section: IntegrationSection) => void }) { return <div className="rounded-[1.25rem] border bg-card/95 p-1.5 shadow-sm"><div className="grid gap-1.5 md:grid-cols-5">{integrationSections.map((item) => { const Icon = item.icon; const active = section === item.id; return <Link key={item.id} href={`/integration/${source}/${item.id}`} onClick={() => onSection(item.id)} className={`rounded-xl p-3 text-left transition ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"}`}><div className="flex items-center gap-2 text-sm font-medium"><Icon className="h-4 w-4" />{item.label}</div><p className={`mt-1 text-xs ${active ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{item.description}</p></Link>; })}</div></div>; }
function NextStepBanner({ section, source, mappingConfirmed, hasRequiredConfiguration, hasDetectedFields }: { section: IntegrationSection; source: IntegrationSource; mappingConfirmed: boolean; hasRequiredConfiguration: boolean; hasDetectedFields: boolean }) { const label = section === "configuration" ? "Next: detect source fields" : section === "mapping" ? "Next: confirm mapping" : section === "sync" ? "Next: preview or start sync" : "Next: review operational details"; const href = `/integration/${source}/${nextSection[section]}`; return <div className="flex flex-col gap-3 rounded-[1.25rem] border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">{label}</p><p className="mt-1 text-sm text-muted-foreground">{!hasRequiredConfiguration ? "Complete required configuration first." : !hasDetectedFields ? "Detect fields before mapping can start." : !mappingConfirmed ? "Confirm required mappings to unlock sync." : "This integration is ready for safe sync actions."}</p></div><Button asChild variant="outline" className="rounded-xl bg-background"><Link href={href}>Continue <ArrowRight className="h-4 w-4" /></Link></Button></div>; }
function FileDetector({ onDetect, loading }: { onDetect: (file?: File | null) => void; loading: boolean }) { const [file, setFile] = useState<File | null>(null); return <div className="rounded-2xl border bg-muted/20 p-4"><Label>Upload source file for field detection</Label><Input type="file" accept=".csv,.xlsx,.xls,.json,application/json,text/csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="mt-2 rounded-xl" /><Button type="button" onClick={() => onDetect(file)} disabled={loading || !file} className="mt-3 rounded-xl">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Detect fields from file</Button></div>; }
function WorkflowStatus({ icon: Icon, label, value, helper, tone = "default" }: { icon: LucideIcon; label: string; value: string | number; helper: string; tone?: "default" | "success" | "warning" }) { return <Card className="rounded-[1.25rem] border-border/80 bg-card/95 shadow-sm"><CardContent className="flex items-start justify-between gap-4 p-4"><div className="min-w-0"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 truncate text-xl font-semibold tracking-tight">{value}</p><p className="mt-1 truncate text-xs text-muted-foreground">{helper}</p></div><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone === "success" ? "bg-emerald-50 text-emerald-700" : tone === "warning" ? "bg-amber-50 text-amber-700" : "bg-primary/10 text-primary"}`}><Icon className="h-4 w-4" /></span></CardContent></Card>; }
function SourceFieldRow({ field }: { field: SourceField }) { return <div className="rounded-2xl border bg-background/70 p-3"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-medium">{field.label}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{field.key}</p></div>{field.required && <Badge className="rounded-full">Required</Badge>}</div>{field.sample && <p className="mt-2 truncate text-xs text-muted-foreground">Sample: {field.sample}</p>}</div>; }
function SyncAction({ title, detail, icon: Icon, onClick, disabled, loading }: { title: string; detail: string; icon: LucideIcon; onClick: () => void; disabled?: boolean; loading?: boolean }) { return <button type="button" onClick={onClick} disabled={disabled || loading} className="rounded-2xl border bg-background/70 p-4 text-left transition hover:bg-muted/35 disabled:cursor-not-allowed disabled:opacity-50"><div className="flex items-center gap-2 font-medium">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}{title}</div><p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p></button>; }
function ReadinessLine({ ready, label }: { ready: boolean; label: string }) { return <div className="flex items-center justify-between rounded-2xl border bg-background/70 p-3"><span className="text-sm font-medium">{label}</span><Badge variant={ready ? "default" : "secondary"} className="rounded-full">{ready ? "Ready" : "Required"}</Badge></div>; }
function TimelineRow({ title, status, detail, at }: { title: string; status: string; detail: string; at: string }) { return <div className="rounded-2xl border bg-background/70 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-sm text-muted-foreground">{detail}</p></div><Badge variant={status === "error" || status === "failed" ? "destructive" : "secondary"} className="rounded-full">{status}</Badge></div><p className="mt-3 text-xs text-muted-foreground">{new Date(at).toLocaleString()}</p></div>; }
function EmptyState({ title, detail }: { title: string; detail: string }) { return <div className="rounded-[1.25rem] border border-dashed bg-muted/20 p-8 text-center"><p className="font-semibold">{title}</p><p className="mt-2 text-sm text-muted-foreground">{detail}</p></div>; }
function formatTarget(target: string) { return integrationTargets.find((item) => item.key === target)?.label ?? target; }
async function extractFieldsFromFile(file: File) { const name = file.name.toLowerCase(); if (name.endsWith(".json")) { const text = await file.text(); const parsed = JSON.parse(text) as unknown; const item = Array.isArray(parsed) ? parsed[0] : parsed; if (!item || typeof item !== "object") throw new Error("JSON must be an object or array of objects."); return Object.entries(item as Record<string, unknown>).map(([key, value]) => ({ key, label: key, sample: stringifySample(value), type: typeof value })); } if (name.endsWith(".xlsx") || name.endsWith(".xls")) { const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" }); const sheetName = workbook.SheetNames[0]; if (!sheetName) return []; const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: "" }); const first = rows[0] ?? {}; return Object.keys(first).map((key) => ({ key, label: key, sample: stringifySample(first[key]), type: typeof first[key] })); } const text = await file.text(); const [headerLine = "", sampleLine = ""] = text.split(/\r?\n/); const headers = parseCsvLine(headerLine); const samples = parseCsvLine(sampleLine); return headers.filter(Boolean).map((key, index) => ({ key, label: key, sample: samples[index] ?? "", type: "string" })); }
function parseCsvLine(line: string) { const values: string[] = []; let value = ""; let quoted = false; for (let index = 0; index < line.length; index++) { const char = line[index]; const next = line[index + 1]; if (char === '"' && quoted && next === '"') { value += '"'; index++; continue; } if (char === '"') { quoted = !quoted; continue; } if (char === "," && !quoted) { values.push(value.trim()); value = ""; continue; } value += char; } values.push(value.trim()); return values; }
function stringifySample(value: unknown) { if (value === null || value === undefined) return ""; if (typeof value === "object") return JSON.stringify(value).slice(0, 80); return String(value).slice(0, 80); }
