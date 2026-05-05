"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, DatabaseZap, FileSpreadsheet, ListChecks, PlugZap, Settings2, Workflow, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  return (
    <PageShell className="space-y-5 pb-10">
      <PageHeader
        eyebrow="Integrations"
        title="Connect sources"
        description="Choose a source, configure it, detect fields, confirm mapping, then sync. This page is a launcher; activity and widgets belong inside each workflow or the dashboard."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-xl bg-background/70">
              <Link href="/integration/csv/configuration"><FileSpreadsheet className="h-4 w-4" />Import file</Link>
            </Button>
            <Button asChild className="rounded-xl shadow-sm">
              <Link href="/integration/zoho/configuration"><PlugZap className="h-4 w-4" />Connect Zoho</Link>
            </Button>
          </div>
        }
      />

      <Card className="rounded-[1.25rem] border-border/80 bg-card/95 shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold">Standard integration flow</p>
            <p className="mt-1 text-sm text-muted-foreground">Configure source → Detect fields → Review mapping → Confirm mapping → Sync</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="secondary" className="rounded-full"><CheckCircle2 className="h-3 w-3" /> Detection first</Badge>
            <Badge variant="secondary" className="rounded-full"><DatabaseZap className="h-3 w-3" /> Mapping required</Badge>
            <Badge variant="secondary" className="rounded-full"><Workflow className="h-3 w-3" /> Sync locked until confirmed</Badge>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {connectors.map((connector) => {
          const Icon = connector.icon;
          return (
            <Card key={connector.id} className="rounded-[1.25rem] border-border/80 bg-card/95 shadow-sm transition hover:border-primary/30 hover:shadow-md">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${connector.accent}`}><Icon className="h-5 w-5" /></span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold tracking-tight">{connector.title}</h2>
                        <Badge variant={connector.status === "live" ? "default" : connector.status === "foundation" ? "secondary" : "outline"} className="rounded-full">{connector.status === "live" ? "Live" : connector.status === "foundation" ? "Foundation" : "Planned"}</Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{connector.description}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-full">Detection-first</Badge>
                  <Badge variant="outline" className="rounded-full">Reusable mapping</Badge>
                  {connector.configurationFields.length > 0 && <Badge variant="outline" className="rounded-full">Credentials</Badge>}
                </div>

                <Button asChild className="w-full rounded-xl">
                  <Link href={`/integration/${connector.id}/configuration`}>Open workflow<ArrowRight className="h-4 w-4" /></Link>
                </Button>

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
              </CardContent>
            </Card>
          );
        })}
      </section>
    </PageShell>
  );
}
