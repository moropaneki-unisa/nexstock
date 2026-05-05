"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ComponentType } from "react";
import {
  BellRing,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Code2,
  CreditCard,
  Crown,
  Globe2,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Users,
  Webhook,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const initialSettings: SettingsForm = {
  organizationName: "InventoryHub Workspace",
  workspaceSlug: "inventoryhub",
  defaultCurrency: "USD",
  timezone: "Africa/Johannesburg",
  skuPrefix: "INV",
  supportEmail: "support@inventoryhub.local",
  lowStockAlerts: true,
  syncAlerts: true,
  webhookAlerts: true,
  weeklyDigest: false,
  requireStrongKeys: true,
  webhookSigning: true,
  apiRateLimit: "1000",
};

const plans = [
  {
    name: "Free",
    price: "$0",
    detail: "For testing the API and managing a small catalog.",
    limits: ["100 products", "1 user", "Developer API sandbox"],
  },
  {
    name: "Pro",
    price: "$29",
    detail: "For growing teams that need webhooks and integrations.",
    limits: ["5,000 products", "5 users", "Zoho sync", "Webhooks"],
    active: true,
  },
  {
    name: "Business",
    price: "$99",
    detail: "For larger catalog operations and advanced sync controls.",
    limits: ["Unlimited products", "Team roles", "Priority sync", "Advanced audit logs"],
  },
];

const teamMembers = [
  { name: "Zack", email: "admin@inventoryhub.local", role: "Owner", status: "Active" },
  { name: "Operations", email: "ops@inventoryhub.local", role: "Admin", status: "Invited" },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsForm>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty = useMemo(() => JSON.stringify(settings) !== JSON.stringify(initialSettings), [settings]);
  const readinessScore = useMemo(() => {
    const checks = [
      settings.organizationName.length > 2,
      settings.workspaceSlug.length > 2,
      settings.skuPrefix.length > 1,
      settings.requireStrongKeys,
      settings.webhookSigning,
      settings.lowStockAlerts,
      settings.syncAlerts,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [settings]);

  function update<K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  async function saveSettings() {
    setSaving(true);
    setSaved(false);
    await new Promise((resolve) => setTimeout(resolve, 650));
    setSaving(false);
    setSaved(true);
  }

  function resetSettings() {
    setSettings(initialSettings);
    setSaved(false);
  }

  return (
    <PageShell className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Workspace settings"
        title="Settings"
        description="Manage organization profile, catalog defaults, security, operational alerts, billing, and launch readiness from one polished control center."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={resetSettings} disabled={!dirty || saving} className="rounded-xl bg-background/70">
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button type="button" onClick={saveSettings} disabled={saving || (!dirty && saved)} className="rounded-xl shadow-sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : saved ? "Saved" : "Save settings"}
            </Button>
          </div>
        }
      />

      {saved && (
        <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Settings saved locally. Connect these controls to backend settings endpoints when persistence is added.
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatusMetric icon={Building2} label="Workspace" value="Configured" helper={settings.organizationName} tone="default" />
        <StatusMetric icon={ShieldCheck} label="Security" value={`${readinessScore}%`} helper="Launch readiness" tone={readinessScore >= 85 ? "success" : "warning"} />
        <StatusMetric icon={BellRing} label="Alerts" value={settings.lowStockAlerts && settings.syncAlerts ? "Enabled" : "Review"} helper="Operational coverage" tone={settings.lowStockAlerts && settings.syncAlerts ? "success" : "warning"} />
        <StatusMetric icon={Crown} label="Plan" value="Pro" helper="Current workspace tier" tone="success" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.45fr]">
        <div className="space-y-6">
          <Card className="rounded-[2rem] border-border/80 bg-card/95 shadow-xl shadow-slate-950/5">
            <CardHeader className="border-b bg-gradient-to-br from-card to-muted/25">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Building2 className="h-5 w-5" /> Organization profile
              </CardTitle>
              <p className="text-sm leading-6 text-muted-foreground">Core workspace information used across products, API clients, sync jobs, and operational emails.</p>
            </CardHeader>
            <CardContent className="grid gap-5 p-5 md:grid-cols-2">
              <SettingsField label="Organization name" description="Displayed inside the dashboard and future billing screens.">
                <Input value={settings.organizationName} onChange={(event) => update("organizationName", event.target.value)} className="rounded-xl" />
              </SettingsField>
              <SettingsField label="Workspace slug" description="Used for future tenant URLs and internal references.">
                <Input value={settings.workspaceSlug} onChange={(event) => update("workspaceSlug", slugify(event.target.value))} className="rounded-xl font-mono" />
              </SettingsField>
              <SettingsField label="Default currency" description="Used for catalog values and inventory reporting.">
                <select value={settings.defaultCurrency} onChange={(event) => update("defaultCurrency", event.target.value)} className="h-10 w-full rounded-xl border bg-background px-3 text-sm shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25">
                  <option value="USD">USD - US Dollar</option>
                  <option value="ZAR">ZAR - South African Rand</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </SettingsField>
              <SettingsField label="Timezone" description="Used for reports, sync logs, and webhook timestamps.">
                <select value={settings.timezone} onChange={(event) => update("timezone", event.target.value)} className="h-10 w-full rounded-xl border bg-background px-3 text-sm shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25">
                  <option value="Africa/Johannesburg">Africa/Johannesburg</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="Europe/London">Europe/London</option>
                </select>
              </SettingsField>
              <SettingsField label="SKU prefix" description="Prefix for generated product SKUs.">
                <Input value={settings.skuPrefix} onChange={(event) => update("skuPrefix", event.target.value.toUpperCase().slice(0, 8))} className="rounded-xl font-mono" />
              </SettingsField>
              <SettingsField label="Alert recipient" description="Primary inbox for stock, sync, and webhook operational alerts.">
                <Input type="email" value={settings.supportEmail} onChange={(event) => update("supportEmail", event.target.value)} className="rounded-xl" />
              </SettingsField>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-border/80 bg-card/95 shadow-xl shadow-slate-950/5">
            <CardHeader className="border-b bg-gradient-to-br from-card to-muted/25">
              <CardTitle className="flex items-center gap-2 text-xl">
                <BellRing className="h-5 w-5" /> Operational alerts
              </CardTitle>
              <p className="text-sm leading-6 text-muted-foreground">Control the alerts that protect day-to-day inventory operations: stock risk, Zoho sync health, webhook failures, and weekly executive summaries.</p>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="grid gap-3 md:grid-cols-2">
                <ToggleRow icon={PackageCheck} label="Low-stock alerts" description="Notify admins when products reach their low-stock threshold." checked={settings.lowStockAlerts} onChange={(checked) => update("lowStockAlerts", checked)} />
                <ToggleRow icon={RefreshCw} label="Zoho sync alerts" description="Notify when sync jobs succeed, fail, or require reconnecting." checked={settings.syncAlerts} onChange={(checked) => update("syncAlerts", checked)} />
                <ToggleRow icon={Webhook} label="Webhook failure alerts" description="Notify when webhook delivery repeatedly fails or returns non-2xx responses." checked={settings.webhookAlerts} onChange={(checked) => update("webhookAlerts", checked)} />
                <ToggleRow icon={Mail} label="Weekly operations digest" description="Send a weekly summary of inventory value, low-stock items, sync status, and API usage." checked={settings.weeklyDigest} onChange={(checked) => update("weeklyDigest", checked)} />
              </div>

              <div className="grid gap-3 rounded-[1.5rem] border bg-background/70 p-4 md:grid-cols-3">
                <AlertSummary label="Stock risk" value={settings.lowStockAlerts ? "Monitored" : "Off"} ready={settings.lowStockAlerts} />
                <AlertSummary label="Sync health" value={settings.syncAlerts ? "Monitored" : "Off"} ready={settings.syncAlerts} />
                <AlertSummary label="Webhook delivery" value={settings.webhookAlerts ? "Monitored" : "Off"} ready={settings.webhookAlerts} />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-border/80 bg-card/95 shadow-xl shadow-slate-950/5">
            <CardHeader className="border-b bg-gradient-to-br from-card to-muted/25">
              <CardTitle className="flex items-center gap-2 text-xl">
                <LockKeyhole className="h-5 w-5" /> Security and developer defaults
              </CardTitle>
              <p className="text-sm leading-6 text-muted-foreground">Controls for API keys, webhook signing, rate limits, and external access posture.</p>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="grid gap-3 md:grid-cols-2">
                <ToggleRow icon={KeyRound} label="Require strong API keys" description="Enforce secure generated keys for public API clients." checked={settings.requireStrongKeys} onChange={(checked) => update("requireStrongKeys", checked)} />
                <ToggleRow icon={ShieldCheck} label="Webhook signing" description="Sign outgoing webhook payloads with a shared secret." checked={settings.webhookSigning} onChange={(checked) => update("webhookSigning", checked)} />
              </div>
              <SettingsField label="Default API rate limit" description="Requests per hour for new API keys until backend policy enforcement is added.">
                <Input type="number" min={100} value={settings.apiRateLimit} onChange={(event) => update("apiRateLimit", event.target.value)} className="max-w-sm rounded-xl" />
              </SettingsField>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="overflow-hidden rounded-[2rem] border-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-xl shadow-slate-950/10">
            <CardContent className="p-6">
              <Sparkles className="h-7 w-7 text-white/80" />
              <h2 className="mt-5 text-2xl font-semibold tracking-[-0.04em]">Launch readiness</h2>
              <p className="mt-2 text-sm leading-6 text-white/70">Your workspace is configured for a professional MVP. Connect persistence later to make these live backend settings.</p>
              <div className="mt-6 h-2 rounded-full bg-white/10">
                <div className="h-full rounded-full bg-white" style={{ width: `${readinessScore}%` }} />
              </div>
              <p className="mt-2 text-sm font-medium">{readinessScore}% complete</p>
              <div className="mt-5 space-y-2 text-sm">
                <DarkCheck label="Organization profile" ready={settings.organizationName.length > 2} />
                <DarkCheck label="SKU defaults" ready={settings.skuPrefix.length > 1} />
                <DarkCheck label="Signed webhooks" ready={settings.webhookSigning} />
                <DarkCheck label="Operational alerts" ready={settings.lowStockAlerts && settings.syncAlerts && settings.webhookAlerts} />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-border/80 bg-card/95 shadow-xl shadow-slate-950/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Users className="h-5 w-5" /> Team access</CardTitle>
              <p className="text-sm text-muted-foreground">Current workspace members and invitations.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {teamMembers.map((member) => (
                <div key={member.email} className="flex items-center justify-between gap-3 rounded-2xl border bg-background/70 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{member.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge variant={member.status === "Active" ? "default" : "secondary"} className="rounded-full">{member.role}</Badge>
                    <p className="mt-1 text-xs text-muted-foreground">{member.status}</p>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" className="w-full rounded-xl">Invite member</Button>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-border/80 bg-card/95 shadow-xl shadow-slate-950/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><CreditCard className="h-5 w-5" /> Billing</CardTitle>
              <p className="text-sm text-muted-foreground">Plan design for the MVP pricing model.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {plans.map((plan) => (
                <div key={plan.name} className={cn("rounded-2xl border bg-background/70 p-4", plan.active && "border-primary/30 bg-primary/5")}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold">{plan.name}</h3>
                    {plan.active && <Badge className="rounded-full"><Crown className="mr-1 h-3 w-3" /> Current</Badge>}
                  </div>
                  <p className="mt-3 text-2xl font-semibold">{plan.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{plan.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <ShortcutCard icon={Code2} title="API keys" description="Create and rotate developer credentials for external product access." href="/api-keys" />
        <ShortcutCard icon={Webhook} title="Webhooks" description="Manage event destinations and delivery health." href="/webhooks" />
        <ShortcutCard icon={Globe2} title="Integrations" description="Connect Zoho and keep product data synchronized." href="/integrations" />
      </section>
    </PageShell>
  );
}

function SettingsField({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

function ToggleRow({ icon: Icon, label, description, checked, onChange }: { icon: ComponentType<{ className?: string }>; label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3 rounded-2xl border bg-background/70 p-4 text-left transition hover:bg-muted/35 focus:outline-none focus:ring-2 focus:ring-ring/30"
      aria-pressed={checked}
    >
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", checked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
      </span>
      <span className={cn("mt-1 flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition", checked ? "bg-primary" : "bg-muted")}> 
        <span className={cn("h-4 w-4 rounded-full bg-background shadow-sm transition", checked && "translate-x-5")} />
      </span>
    </button>
  );
}

function AlertSummary({ label, value, ready }: { label: string; value: string; ready: boolean }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{value}</p>
        <Badge variant={ready ? "default" : "secondary"} className="rounded-full">{ready ? "On" : "Off"}</Badge>
      </div>
    </div>
  );
}

function StatusMetric({ icon: Icon, label, value, helper, tone = "default" }: { icon: ComponentType<{ className?: string }>; label: string; value: string; helper: string; tone?: "default" | "success" | "warning" }) {
  return (
    <Card className="rounded-[1.5rem] border-border/80 bg-card/95 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-950/5">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 truncate text-2xl font-semibold tracking-tight">{value}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{helper}</p>
        </div>
        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", tone === "warning" ? "bg-amber-50 text-amber-700" : tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-primary/10 text-primary")}>
          <Icon className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  );
}

function DarkCheck({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/10 px-3 py-2.5">
      <span className="flex items-center gap-2 text-white/75">
        {ready ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
        {label}
      </span>
      <span className="font-medium">{ready ? "Ready" : "Review"}</span>
    </div>
  );
}

function ShortcutCard({ icon: Icon, title, description, href }: { icon: ComponentType<{ className?: string }>; title: string; description: string; href: string }) {
  return (
    <Link href={href} className="group rounded-[1.5rem] border bg-card/95 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-950/5">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <div className="mt-5 flex items-center justify-between gap-3">
        <h3 className="font-semibold tracking-tight">{title}</h3>
        <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground" />
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </Link>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40);
}
