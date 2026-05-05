import { BarChart3, Boxes, CheckCircle2, DatabaseZap, PackageSearch, ShieldCheck, Sparkles, Workflow } from "lucide-react";

export function AuthVisual({ mode }: { mode: "login" | "signup" }) {
  const isSignup = mode === "signup";

  return (
    <div className="relative hidden min-h-screen overflow-hidden bg-neutral-950 text-white lg:flex">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.16),transparent_28%),radial-gradient(circle_at_78%_16%,rgba(99,102,241,0.28),transparent_28%),radial-gradient(circle_at_50%_80%,rgba(16,185,129,0.2),transparent_30%)]" />
      <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.18)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-20 right-4 h-96 w-96 rounded-full bg-emerald-400/20 blur-3xl" />

      <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-12">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-neutral-950 shadow-2xl shadow-white/10">
            <PackageSearch className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold tracking-tight">InventoryHub</p>
            <p className="text-xs text-white/55">Product data command center</p>
          </div>
        </div>

        <div className="max-w-xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            {isSignup ? "Launch your workspace" : "Welcome back to operations"}
          </div>
          <h1 className="text-5xl font-semibold tracking-[-0.055em] xl:text-6xl">
            {isSignup ? "Build your company’s product source of truth." : "Run your product operations from one trusted workspace."}
          </h1>
          <p className="mt-6 max-w-lg text-base leading-8 text-white/65">
            {isSignup
              ? "Create a real business workspace for product records, inventory health, custom fields, imports, APIs, webhooks, and integrations."
              : "Access clean product data, reliable sync workflows, developer APIs, operational alerts, and a focused SaaS dashboard."}
          </p>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.08] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="grid grid-cols-3 gap-3">
              <MiniCard icon={Boxes} label="Products" value="Live" />
              <MiniCard icon={DatabaseZap} label="Mapping" value="Ready" />
              <MiniCard icon={ShieldCheck} label="Security" value="On" />
            </div>
            <div className="mt-5 rounded-2xl bg-white/[0.08] p-4">
              <div className="mb-3 flex items-center justify-between text-xs text-white/55">
                <span>Catalog readiness</span>
                <span>84%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10">
                <div className="h-2 w-[84%] rounded-full bg-white" />
              </div>
              <div className="mt-4 grid gap-2 text-xs text-white/70">
                <Readiness label="Core fields" />
                <Readiness label="Cloud images" />
                <Readiness label="API access" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.07] p-4 backdrop-blur-xl">
              <BarChart3 className="h-5 w-5 text-emerald-300" />
              <p className="mt-3 text-sm font-medium">Stock health</p>
              <p className="mt-1 text-xs leading-5 text-white/55">Catch low stock and sync issues before customers do.</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.07] p-4 backdrop-blur-xl">
              <Workflow className="h-5 w-5 text-indigo-300" />
              <p className="mt-3 text-sm font-medium">Integration flow</p>
              <p className="mt-1 text-xs leading-5 text-white/55">Configure, map, preview, and sync safely.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-3">
      <Icon className="h-4 w-4 text-white/80" />
      <p className="mt-3 text-[11px] text-white/45">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function Readiness({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/[0.07] px-3 py-2">
      <span className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />{label}</span>
      <span className="text-white/45">Ready</span>
    </div>
  );
}
