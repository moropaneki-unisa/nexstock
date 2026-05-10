"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, DatabaseZap, FileSpreadsheet, ListChecks, PlugZap, Settings2, Workflow, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { connectors } from "@/lib/integrations";

const sectionActions = [
  { section: "configuration", label: "Configure", icon: Settings2 },
  { section: "mapping", label: "Map", icon: DatabaseZap },
  { section: "sync", label: "Sync", icon: Workflow },
  { section: "history", label: "History", icon: Clock3 },
  { section: "logs", label: "Logs", icon: ListChecks },
] as const;

export default function IntegrationsPage() {
  const liveCount = connectors.filter((connector) => connector.status === "live").length;
  const foundationCount = connectors.filter((connector) => connector.status === "foundation").length;
  const credentialCount = connectors.filter((connector) => connector.configurationFields.length > 0).length;

  return (
    <PageShell className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Integrations"
        title="Connect sources"
        description="Choose a source, configure it, detect fields, confirm mapping, then sync. This page is a launcher for each workflow."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-xl bg-background/70">
              <Link href="/imports"><FileSpreadsheet className="h-4 w-4" />Import file</Link>
            </Button>
            <Button asChild className="rounded-xl shadow-sm">
              <Link href="/integration/zoho/configuration"><PlugZap className="h-4 w-4" />Connect Zoho</Link>
            </Button>
          </div>
        }
      />

      <section className="border bg-card/95">
        <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          <Metric icon={PlugZap} label="Sources" value={connectors.length} helper="Available connectors" />
          <Metric icon={CheckCircle2} label="Live" value={liveCount} helper="Ready workflows" />
          <Metric icon={Settings2} label="Foundation" value={foundationCount} helper="Base integrations" />
          <Metric icon={DatabaseZap} label="Credentials" value={credentialCount} helper="Require configuration" />
        </div>
      </section>

      <section className="border bg-card/95">
        <SectionHeader icon={Workflow} title="Standard integration flow" description="Configure source → Detect fields → Review mapping → Confirm mapping → Sync" />
        <div className="grid divide-y border-t md:grid-cols-3 md:divide-x md:divide-y-0">
          <FlowItem icon={CheckCircle2} title="Detection first" description="Pull the source schema before mapping so imports and syncs understand the incoming fields." />
          <FlowItem icon={DatabaseZap} title="Mapping required" description="Map detected source fields to NexStock product fields before writing catalog data." />
          <FlowItem icon={Workflow} title="Sync locked" description="Sync actions stay locked until the mapping has been reviewed and confirmed." />
        </div>
      </section>

      <section className="border bg-card/95">
        <SectionHeader icon={PlugZap} title="Integration sources" description="Open a connector workflow or jump directly to configuration, mapping, sync, history, or logs." />
        <div className="grid divide-y border-t lg:grid-cols-2 lg:divide-x lg:divide-y-0 xl:grid-cols-3">
          {connectors.map((connector) => (
            <ConnectorPanel key={connector.id} connector={connector} />
          ))}
        </div>
      </section>
    </PageShell>
  );
}

function SectionHeader({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description?: string }) {
  return <div className="flex flex-row items-start justify-between gap-4 p-5"><div><h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><Icon className="h-5 w-5" />{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div></div>;
}

function Metric({ icon: Icon, label, value, helper }: { icon: LucideIcon; label: string; value: string | number; helper: string }) {
  return <div className="flex items-center justify-between p-4"><div className="min-w-0"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 truncate text-xl font-semibold capitalize">{value}</p><p className="mt-1 truncate text-xs text-muted-foreground">{helper}</p></div><span className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span></div>;
}

function FlowItem({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return <div className="flex gap-4 p-5"><span className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p></div></div>;
}

function ConnectorPanel({ connector }: { connector: (typeof connectors)[number] }) {
  const Icon = connector.icon;
  const isFileConnector = connector.id === "csv" || connector.id === "xlsx" || connector.id === "json";
  const workflowHref = connector.id === "json" ? "/imports-json" : isFileConnector ? "/imports" : `/integration/${connector.id}/configuration`;
  return (
    <article className="p-5 transition hover:bg-muted/25">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center ${connector.accent}`}><Icon className="h-5 w-5" /></span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold tracking-tight">{connector.title}</h3>
              <Badge variant={connector.status === "live" ? "default" : connector.status === "foundation" ? "secondary" : "outline"}>{connector.status === "live" ? "Live" : connector.status === "foundation" ? "Foundation" : "Planned"}</Badge>
            </div>
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{connector.description}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="outline">Detection-first</Badge>
        <Badge variant="outline">Reusable mapping</Badge>
        {connector.configurationFields.length > 0 && <Badge variant="outline">Credentials</Badge>}
      </div>

      <div className="mt-4 grid gap-2">
        <Button asChild className="w-full rounded-xl">
          <Link href={workflowHref}>Open workflow<ArrowRight className="h-4 w-4" /></Link>
        </Button>
        {isFileConnector ? (
          <div className="rounded-xl border bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">{connector.id === "json" ? "JSON imports open a dedicated JSON flow for product objects, image arrays, and custom fields." : "File imports open the guided product import wizard for upload, preview, mapping, and validation."}</div>
        ) : (
          <div className="grid grid-cols-5 gap-1.5">
            {sectionActions.map((action) => {
              const ActionIcon = action.icon;
              return (
                <Button key={action.section} asChild variant="ghost" size="sm" className="h-auto flex-col gap-1 rounded-xl px-2 py-2 text-[0.68rem] text-muted-foreground hover:text-foreground">
                  <Link href={`/integration/${connector.id}/${action.section}`}>
                    <ActionIcon className="h-3.5 w-3.5" />
                    {action.label}
                  </Link>
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
}
