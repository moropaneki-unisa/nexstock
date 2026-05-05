import { ArrowRight, Boxes, CheckCircle2, DatabaseZap, PackageSearch, ShieldCheck, Workflow } from "lucide-react";

export function AuthVisual({ mode }: { mode: "login" | "signup" }) {
  const isSignup = mode === "signup";

  return (
    <aside className="relative hidden min-h-screen overflow-hidden border-r border-neutral-200 bg-[#f7f7f4] lg:flex">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(20,20,20,0.08),transparent_26%),radial-gradient(circle_at_90%_20%,rgba(20,20,20,0.06),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.78),rgba(247,247,244,0.9))]" />
      <div className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(23,23,23,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(23,23,23,.06)_1px,transparent_1px)] [background-size:56px_56px]" />

      <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-12">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-950 text-white shadow-sm">
            <PackageSearch className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold tracking-tight text-neutral-950">InventoryHub</p>
            <p className="text-xs text-neutral-500">Product data command center</p>
          </div>
        </div>

        <div className="max-w-xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {isSignup ? "Create a production workspace" : "Secure workspace access"}
          </div>
          <h1 className="max-w-lg text-5xl font-semibold tracking-[-0.055em] text-neutral-950 xl:text-6xl">
            {isSignup ? "Set up product operations your team can trust." : "Continue from your product command center."}
          </h1>
          <p className="mt-6 max-w-md text-base leading-8 text-neutral-600">
            {isSignup
              ? "InventoryHub keeps product records, custom fields, inventory activity, imports, APIs, and integrations aligned in one focused SaaS workspace."
              : "Manage product data, field mapping, Cloudinary images, API access, and operational readiness without switching between disconnected tools."}
          </p>
        </div>

        <div className="rounded-[2rem] border border-neutral-200 bg-white/85 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div>
              <p className="text-sm font-semibold text-neutral-950">Workspace readiness</p>
              <p className="text-xs text-neutral-500">Live operational overview</p>
            </div>
            <span className="rounded-full bg-neutral-950 px-3 py-1 text-xs font-medium text-white">84%</span>
          </div>

          <div className="grid gap-3 py-4 sm:grid-cols-3">
            <MiniMetric icon={Boxes} label="Products" value="Synced" />
            <MiniMetric icon={DatabaseZap} label="Fields" value="Mapped" />
            <MiniMetric icon={ShieldCheck} label="Access" value="Secure" />
          </div>

          <div className="space-y-2 rounded-2xl border border-neutral-100 bg-neutral-50 p-3">
            <Readiness label="Catalog fields combined" />
            <Readiness label="Cloud image storage ready" />
            <Readiness label="API and webhook controls" />
          </div>

          <div className="mt-4 flex items-center justify-between rounded-2xl bg-neutral-950 px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                <Workflow className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium">Integration workflow</p>
                <p className="text-xs text-white/55">Configure → map → preview → sync</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-white/60" />
          </div>
        </div>
      </div>
    </aside>
  );
}

function MiniMetric({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-neutral-100 bg-white p-3 shadow-sm">
      <Icon className="h-4 w-4 text-neutral-500" />
      <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-neutral-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-neutral-950">{value}</p>
    </div>
  );
}

function Readiness({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm text-neutral-700 shadow-sm">
      <span className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />{label}</span>
      <span className="text-xs text-neutral-400">Ready</span>
    </div>
  );
}
