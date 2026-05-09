"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import {
  BellRing,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Code2,
  Globe2,
  KeyRound,
  Loader2,
  Mail,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  Webhook,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { cn } from "@/lib/utils";

type SettingsForm = {
  organizationName: string;
  workspaceSlug: string;
  defaultCurrency: string;
  timezone: string;
  skuPrefix: string;
  supportEmail: string;
  lowStockAlerts: boolean;
  syncAlerts: boolean;
  webhookAlerts: boolean;
  weeklyDigest: boolean;
  requireStrongKeys: boolean;
  webhookSigning: boolean;
  apiRateLimit: string;
};

const SETTINGS_STORAGE_KEY = "nexstock_workspace_settings";
const defaultSettings: SettingsForm = {
  organizationName: "NexStock Workspace",
  workspaceSlug: "nexstock",
  defaultCurrency: "ZAR",
  timezone: "Africa/Johannesburg",
  skuPrefix: "NXS",
  supportEmail: "support@nexstock.co.za",
  lowStockAlerts: true,
  syncAlerts: true,
  webhookAlerts: true,
  weeklyDigest: false,
  requireStrongKeys: true,
  webhookSigning: true,
  apiRateLimit: "1000",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsForm>(defaultSettings);
  const [savedSettings, setSavedSettings] = useState<SettingsForm>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "info"; message: string } | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!stored) {
      setLoaded(true);
      return;
    }

    try {
      const parsed = JSON.parse(stored) as { settings?: Partial<SettingsForm>; savedAt?: string };
      const nextSettings = { ...defaultSettings, ...parsed.settings };
      setSettings(nextSettings);
      setSavedSettings(nextSettings);
      setSavedAt(parsed.savedAt ?? null);
    } catch {
      window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
    } finally {
      setLoaded(true);
    }
  }, []);

  const dirty = useMemo(() => JSON.stringify(settings) !== JSON.stringify(savedSettings), [settings, savedSettings]);
  const readinessScore = useMemo(() => {
    const checks = [
      settings.organizationName.length > 2,
      settings.workspaceSlug.length > 2,
      settings.skuPrefix.length > 1,
      settings.requireStrongKeys,
      settings.webhookSigning,
      settings.lowStockAlerts,
      settings.syncAlerts,
      settings.webhookAlerts,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [settings]);

  function update<K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
    setNotice(null);
  }

  async function saveSettings() {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 350));
    const timestamp = new Date().toISOString();
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ settings, savedAt: timestamp }));
    setSavedSettings(settings);
    setSavedAt(timestamp);
    setSaving(false);
    setNotice({ type: "success", message: `Settings saved successfully at ${new Date(timestamp).toLocaleTimeString()}.` });
  }

  function resetSettings() {
    setSettings(savedSettings);
    setNotice({ type: "info", message: "Unsaved changes were reset." });
  }

  function restoreDefaults() {
    setSettings(defaultSettings);
    setSavedSettings(defaultSettings);
    setSavedAt(null);
    window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
    setNotice({ type: "info", message: "Default settings restored." });
  }

  return (
    <PageShell className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Settings"
        title="Workspace settings"
        description="Configure organization defaults, alerts, security, and developer behavior from one workspace settings page."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={resetSettings} disabled={!dirty || saving} className="rounded-xl bg-background/70">
              <RotateCcw className="h-4 w-4" />Reset
            </Button>
            <Button type="button" onClick={saveSettings} disabled={!loaded || saving || !dirty} className="rounded-xl shadow-sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : dirty ? <Save className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              {saving ? "Saving..." : dirty ? "Save settings" : "Saved"}
            </Button>
          </div>
        }
      />

      {notice && (
        <div className={cn("border p-4 text-sm", notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-sky-200 bg-sky-50 text-sky-800")}>
          {notice.message}
        </div>
      )}

      <section className="border bg-card/95">
        <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          <Metric icon={Building2} label="Workspace" value="Configured" helper={settings.organizationName} />
          <Metric icon={ShieldCheck} label="Readiness" value={`${readinessScore}%`} helper="Launch settings" />
          <Metric icon={BellRing} label="Alerts" value={settings.lowStockAlerts && settings.syncAlerts ? "Enabled" : "Review"} helper="Operational coverage" />
          <Metric icon={KeyRound} label="API limit" value={settings.apiRateLimit} helper="Requests per hour" />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <main className="space-y-6">
          <section className="border bg-card/95">
            <SectionHeader icon={Building2} title="Organization defaults" description="Core workspace preferences used across products, API clients, sync jobs, and alerts." />
            <div className="grid divide-y border-t md:grid-cols-2 md:divide-x md:divide-y-0">
              <div className="divide-y">
                <SettingsField label="Organization name" description="Displayed in the dashboard.">
                  <Input value={settings.organizationName} onChange={(event) => update("organizationName", event.target.value)} className="rounded-xl" />
                </SettingsField>
                <SettingsField label="Workspace slug" description="Future tenant URL reference.">
                  <Input value={settings.workspaceSlug} onChange={(event) => update("workspaceSlug", slugify(event.target.value))} className="rounded-xl font-mono" />
                </SettingsField>
                <SettingsField label="SKU prefix" description="Prefix for generated product SKUs.">
                  <Input value={settings.skuPrefix} onChange={(event) => update("skuPrefix", event.target.value.toUpperCase().slice(0, 8))} className="rounded-xl font-mono" />
                </SettingsField>
              </div>
              <div className="divide-y">
                <SettingsField label="Default currency" description="Used for catalog values.">
                  <select value={settings.defaultCurrency} onChange={(event) => update("defaultCurrency", event.target.value)} className="h-10 w-full rounded-xl border bg-background px-3 text-sm">
                    <option value="USD">USD</option>
                    <option value="ZAR">ZAR</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </SettingsField>
                <SettingsField label="Timezone" description="Used for sync logs and reports.">
                  <select value={settings.timezone} onChange={(event) => update("timezone", event.target.value)} className="h-10 w-full rounded-xl border bg-background px-3 text-sm">
                    <option value="Africa/Johannesburg">Africa/Johannesburg</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York</option>
                    <option value="Europe/London">Europe/London</option>
                  </select>
                </SettingsField>
                <SettingsField label="Alert recipient" description="Inbox for operational alerts.">
                  <Input type="email" value={settings.supportEmail} onChange={(event) => update("supportEmail", event.target.value)} className="rounded-xl" />
                </SettingsField>
              </div>
            </div>
          </section>

          <section className="border bg-card/95">
            <SectionHeader icon={BellRing} title="Operational alerts" description="Control alerts for stock risk, sync health, webhook failures, and weekly summaries." />
            <div className="grid divide-y border-t md:grid-cols-2 md:divide-x md:divide-y-0">
              <div className="divide-y">
                <ToggleRow icon={PackageCheck} label="Low-stock alerts" description="Notify admins when products reach threshold." checked={settings.lowStockAlerts} onChange={(checked) => update("lowStockAlerts", checked)} />
                <ToggleRow icon={RefreshCw} label="Sync alerts" description="Notify when sync jobs require attention." checked={settings.syncAlerts} onChange={(checked) => update("syncAlerts", checked)} />
              </div>
              <div className="divide-y">
                <ToggleRow icon={Webhook} label="Webhook failure alerts" description="Notify on repeated delivery failures." checked={settings.webhookAlerts} onChange={(checked) => update("webhookAlerts", checked)} />
                <ToggleRow icon={Mail} label="Weekly digest" description="Send weekly operations summary." checked={settings.weeklyDigest} onChange={(checked) => update("weeklyDigest", checked)} />
              </div>
            </div>
          </section>

          <section className="border bg-card/95">
            <SectionHeader icon={ShieldCheck} title="Security and developer defaults" description="Controls for API keys, webhook signing, and new credential defaults." />
            <div className="grid divide-y border-t md:grid-cols-2 md:divide-x md:divide-y-0">
              <div className="divide-y">
                <ToggleRow icon={KeyRound} label="Require strong API keys" description="Enforce secure generated keys." checked={settings.requireStrongKeys} onChange={(checked) => update("requireStrongKeys", checked)} />
                <ToggleRow icon={ShieldCheck} label="Webhook signing" description="Sign outgoing webhook payloads." checked={settings.webhookSigning} onChange={(checked) => update("webhookSigning", checked)} />
              </div>
              <div>
                <SettingsField label="Default API rate limit" description="Requests per hour for new API keys.">
                  <Input type="number" min={100} value={settings.apiRateLimit} onChange={(event) => update("apiRateLimit", event.target.value)} className="rounded-xl" />
                </SettingsField>
              </div>
            </div>
          </section>
        </main>

        <aside className="space-y-6">
          <section className="border bg-card/95">
            <SectionHeader icon={ShieldCheck} title="Launch readiness" />
            <div className="border-t p-5">
              <div className="h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${readinessScore}%` }} /></div>
              <p className="mt-2 text-sm font-medium">{readinessScore}% complete</p>
              <div className="mt-4 space-y-2">
                <ReadinessLine label="Organization profile" ready={settings.organizationName.length > 2} />
                <ReadinessLine label="SKU defaults" ready={settings.skuPrefix.length > 1} />
                <ReadinessLine label="Signed webhooks" ready={settings.webhookSigning} />
                <ReadinessLine label="Operational alerts" ready={settings.lowStockAlerts && settings.syncAlerts && settings.webhookAlerts} />
              </div>
              <Button type="button" onClick={restoreDefaults} variant="outline" className="mt-5 w-full rounded-xl bg-background/70">Restore defaults</Button>
              {savedAt && <p className="mt-3 text-xs text-muted-foreground">Last saved {new Date(savedAt).toLocaleString()}</p>}
            </div>
          </section>

          <section className="border bg-card/95">
            <SectionHeader icon={Code2} title="Quick links" description="Jump to connected configuration areas." />
            <div className="divide-y border-t">
              <ShortcutRow icon={Code2} title="API keys" description="Manage developer credentials." href="/api-keys" />
              <ShortcutRow icon={Webhook} title="Webhooks" description="Manage event destinations." href="/webhooks" />
              <ShortcutRow icon={Globe2} title="Integrations" description="Configure data sources." href="/integrations" />
            </div>
          </section>
        </aside>
      </section>
    </PageShell>
  );
}

function SectionHeader({ icon: Icon, title, description, action }: { icon: ComponentType<{ className?: string }>; title: string; description?: string; action?: ReactNode }) {
  return <div className="flex flex-row items-start justify-between gap-4 p-5"><div><h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><Icon className="h-5 w-5" />{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>{action}</div>;
}

function Metric({ icon: Icon, label, value, helper }: { icon: ComponentType<{ className?: string }>; label: string; value: string; helper: string }) {
  return <div className="flex items-center justify-between p-4"><div className="min-w-0"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 truncate text-xl font-semibold capitalize">{value}</p><p className="mt-1 truncate text-xs text-muted-foreground">{helper}</p></div><span className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span></div>;
}

function SettingsField({ label, description, children }: { label: string; description: string; children: ReactNode }) {
  return <div className="p-4"><Label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</Label><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p><div className="mt-3">{children}</div></div>;
}

function ToggleRow({ icon: Icon, label, description, checked, onChange }: { icon: ComponentType<{ className?: string }>; label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-muted/45" aria-pressed={checked}><span className={cn("flex h-10 w-10 shrink-0 items-center justify-center", checked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{label}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span></span><span className={cn("flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition", checked ? "bg-primary" : "bg-muted")}><span className={cn("h-4 w-4 rounded-full bg-background shadow-sm transition", checked && "translate-x-5")} /></span></button>;
}

function ReadinessLine({ label, ready }: { label: string; ready: boolean }) {
  return <div className="flex items-center justify-between border bg-background/70 px-3 py-2 text-sm"><span className="flex items-center gap-2">{ready ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Clock3 className="h-4 w-4 text-amber-600" />}{label}</span><Badge variant={ready ? "default" : "secondary"}>{ready ? "Ready" : "Review"}</Badge></div>;
}

function ShortcutRow({ icon: Icon, title, description, href }: { icon: ComponentType<{ className?: string }>; title: string; description: string; href: string }) {
  return <Link href={href} className="flex items-center gap-3 p-4 text-sm transition hover:bg-muted/45"><span className="flex h-10 w-10 items-center justify-center bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-medium">{title}</span><span className="mt-1 block text-xs text-muted-foreground">{description}</span></span><ChevronRight className="h-4 w-4 text-muted-foreground" /></Link>;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-\s]/g, "").trim().replace(/\s+/g, "-").slice(0, 40);
}
