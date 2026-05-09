import { ArrowRight, Boxes, CheckCircle2, DatabaseZap, ShieldCheck, Workflow } from "lucide-react";

export function AuthVisual({ mode }: { mode: "login" | "signup" }) {
  const isSignup = mode === "signup";

  return (
    <aside className="hidden min-h-screen border-r bg-card/40 lg:flex">
      <div className="flex w-full flex-col justify-between p-10 xl:p-12">
        <div className="flex items-center">
          <img src="/nexstock-logo.svg" alt="NexStock" className="h-16 w-72 object-contain object-left" />
        </div>

        <div className="max-w-xl">
          <div className="mb-5 inline-flex items-center gap-2 border bg-card/95 px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            <span className="h-1.5 w-1.5 bg-emerald-500" />
            {isSignup ? "Create a production workspace" : "Secure workspace access"}
          </div>
          <h1 className="max-w-lg text-5xl font-black tracking-[-0.055em] text-foreground xl:text-6xl">
            {isSignup ? "Set up product operations your team can trust." : "Continue from your product command center."}
          </h1>
          <p className="mt-6 max-w-md text-base leading-8 text-muted-foreground">
            {isSignup
              ? "NexStock keeps product records, custom fields, inventory activity, imports, APIs, and integrations aligned in one focused SaaS workspace."
              : "Manage product data, field mapping, Cloudinary images, API access, and operational readiness without switching between disconnected tools."}
          </p>
        </div>

        <section className="border bg-card/95">
          <div className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-semibold text-foreground">Workspace readiness</p>
              <p className="mt-1 text-xs text-muted-foreground">Live operational overview</p>
            </div>
            <span className="border bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">84%</span>
          </div>

          <div className="grid divide-y border-t sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <MiniMetric icon={Boxes} label="Products" value="Synced" />
            <MiniMetric icon={DatabaseZap} label="Fields" value="Mapped" />
            <MiniMetric icon={ShieldCheck} label="Access" value="Secure" />
          </div>

          <div className="divide-y border-t">
            <Readiness label="Catalog fields combined" />
            <Readiness label="Cloud image storage ready" />
            <Readiness label="API and webhook controls" />
          </div>

          <div className="flex items-center justify-between border-t bg-muted/25 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center bg-primary/10 text-primary">
                <Workflow className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium">Integration workflow</p>
                <p className="text-xs text-muted-foreground">Configure → map → preview → sync</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </section>
      </div>
    </aside>
  );
}

function MiniMetric({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="p-4">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Readiness({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm text-foreground">
      <span className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />{label}</span>
      <span className="text-xs text-muted-foreground">Ready</span>
    </div>
  );
}
