"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, DatabaseZap, FileSpreadsheet, ListChecks, PlugZap, Settings2, ShieldCheck, Workflow, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { connectors, integrationSections } from "@/lib/integrations";

const sectionActions = [
  { section: "configuration", label: "Configure", icon: Settings2 },
  { section: "mapping", label: "Map fields", icon: DatabaseZap },
  { section: "sync", label: "Sync", icon: Workflow },
  { section: "history", label: "History", icon: Clock3 },
  { section: "logs", label: "Logs", icon: ListChecks },
] as const;

export default function IntegrationsPage() {
  const liveConnectors = connectors.filter((connector) => connector.status === "live").length;

  return (
    <PageShell className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Integrations"
        title="Choose an integration"
        description="Connect a source, detect its fields, map them to InventoryHub fields, confirm the mapping, and only then start syncing. Every integration has clear workflow pages."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-xl bg-background/70">
              <Link href="/integration/csv/configuration"><FileSpreadsheet className="h-4 w-4" />Import CSV</Link>
            </Button>
            <Button asChild className="rounded-xl shadow-sm">
              <Link href="/integration/zoho/configuration"><PlugZap className="h-4 w-4" />Connect Zoho</Link>
            </Button>
          </div>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={PlugZap} label="Connectors" value={connectors.length} helper="Available workflows" />
        <SummaryCard icon={CheckCircle2} label="Live now" value={liveConnectors} helper="Zoho, CSV, XLSX" tone="success" />
        <SummaryCard icon={DatabaseZap} label="Mapping first" value="Required" helper="No sync before confirm" />
        <SummaryCard icon={ShieldCheck} label="Safe sync" value="Gated" helper="Validate before import" />
      </section>

      <Card className="rounded-[2rem] border-border/80 bg-card/95 shadow-xl shadow-slate-950/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl"><ListChecks className="h-5 w-5" />Integration workflow</CardTitle>
          <CardDescription>Every source follows the same simple business process. Users always know the next step.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          {integrationSections.map((section, index) => {
            const Icon = section.icon;
            return (
              <div key={section.id} className="rounded-2xl border bg-background/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground"><Icon className="h-5 w-5" /></span>
                  <span className="text-xs font-medium text-muted-foreground">0{index + 1}</span>
                </div>
                <h3 className="mt-4 text-sm font-semibold">{section.label}</h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{section.description}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {connectors.map((connector) => {
          const Icon = connector.icon;
          return (
            <Card key={connector.id} className="overflow-hidden rounded-[2rem] border-border/80 bg-card/95 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-950/5">
              <CardHeader className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${connector.accent}`}><Icon className="h-6 w-6" /></span>
                  <Badge variant={connector.status === "live" ? "default" : connector.status === "foundation" ? "secondary" : "outline"} className="rounded-full">{connector.status === "live" ? "Live" : connector.status === "foundation" ? "Foundation" : "Planned"}</Badge>
                </div>
                <div>
                  <CardTitle className="text-xl tracking-tight">{connector.title}</CardTitle>
                  <CardDescription className="mt-2 leading-6">{connector.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={connector.status === "live" ? "default" : "secondary"} className="rounded-full">{connector.status === "live" ? "Ready to use" : "Workflow prepared"}</Badge>
                  <Badge variant="outline" className="rounded-full">{connector.defaultFields.length} fields</Badge>
                  <Badge variant="outline" className="rounded-full">Reusable mapping</Badge>
                </div>
                <Button asChild className="w-full rounded-xl"><Link href={`/integration/${connector.id}`}>Open {connector.name}<ArrowRight className="h-4 w-4" /></Link></Button>
                <div className="grid gap-2 sm:grid-cols-2">
                  {sectionActions.map((action) => {
                    const ActionIcon = action.icon;
                    return <Button key={action.section} asChild variant="outline" className="rounded-xl bg-background/70"><Link href={`/integration/${connector.id}/${action.section}`}><ActionIcon className="h-4 w-4" />{action.label}</Link></Button>;
                  })}
                </div>
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Recommended next step</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{connector.status === "live" ? `Start with ${connector.title} configuration, detect fields, then confirm mapping before syncing.` : `${connector.title} uses the same workflow foundation and is ready for backend connector implementation.`}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </PageShell>
  );
}

function SummaryCard({ icon: Icon, label, value, helper, tone = "default" }: { icon: LucideIcon; label: string; value: string | number; helper: string; tone?: "default" | "success" }) {
  return <Card className="rounded-[1.5rem] border-border/80 bg-card/95 shadow-sm"><CardContent className="flex items-start justify-between gap-4 p-5"><div className="min-w-0"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 truncate text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 truncate text-xs text-muted-foreground">{helper}</p></div><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-primary/10 text-primary"}`}><Icon className="h-5 w-5" /></span></CardContent></Card>;
}
