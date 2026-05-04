import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  Code2,
  DatabaseZap,
  PackageSearch,
  ShieldCheck,
  Sparkles,
  Webhook,
  Zap,
} from "lucide-react";

const metrics = [
  { label: "Products tracked", value: "12.4k" },
  { label: "API uptime", value: "99.9%" },
  { label: "Webhook events", value: "48k" },
];

const features = [
  {
    title: "Inventory control",
    description: "Track stock levels, product activity, and movement history from one clean command center.",
    icon: Boxes,
  },
  {
    title: "Zoho-ready sync",
    description: "Designed around future Zoho integrations so teams can connect accounting, inventory, and operations.",
    icon: DatabaseZap,
  },
  {
    title: "Developer APIs",
    description: "Expose products, API keys, and webhooks with a frontend that makes technical workflows simple.",
    icon: Code2,
  },
];

const workflow = [
  "Create products and organize inventory records",
  "Connect API keys for external systems",
  "Monitor webhooks, sync status, and activity",
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f8fb] text-slate-950">
      <section className="relative border-b border-slate-200 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_35%),radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_30%)]" />
        <div className="relative mx-auto flex max-w-7xl flex-col px-6 py-6 lg:px-8">
          <nav className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 font-semibold tracking-tight">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
                <PackageSearch className="h-5 w-5" />
              </span>
              <span className="text-lg">ProductHub</span>
            </Link>
            <div className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
              <a href="#features" className="hover:text-slate-950">Features</a>
              <a href="#workflow" className="hover:text-slate-950">Workflow</a>
              <a href="#api" className="hover:text-slate-950">API</a>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:inline-flex">
                Login
              </Link>
              <Link href="/signup" className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">
                Get started <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </nav>

          <div className="grid items-center gap-12 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
            <div className="max-w-3xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-sm font-medium text-slate-600 shadow-sm backdrop-blur">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                Inventory, API keys, and webhooks in one workspace
              </div>
              <h1 className="text-5xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-7xl">
                Run your product operations from a cleaner frontend.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                ProductHub gives inventory teams a modern dashboard for products, stock activity, developer access, and sync visibility while the API handles the backend workflows.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-slate-800">
                  Start building <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="#features" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300">
                  Explore features
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-blue-200/60 via-white to-emerald-200/60 blur-2xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-950/10">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">Operations overview</p>
                    <p className="text-xs text-slate-500">Live inventory snapshot</p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> Synced
                  </span>
                </div>
                <div className="grid gap-4 p-5 sm:grid-cols-3">
                  {metrics.map((metric) => (
                    <div key={metric.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-2xl font-semibold tracking-tight">{metric.value}</p>
                      <p className="mt-1 text-xs text-slate-500">{metric.label}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-3 px-5 pb-5">
                  {[
                    { label: "Low stock alerts", value: "24", icon: Activity },
                    { label: "Products pending sync", value: "8", icon: Zap },
                    { label: "Protected API keys", value: "16", icon: ShieldCheck },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="text-sm font-medium text-slate-700">{item.label}</span>
                        </div>
                        <span className="text-lg font-semibold">{item.value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Frontend focus</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Built for inventory operators and developers.</h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-950/5">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-6 text-xl font-semibold tracking-tight">{feature.title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="workflow" className="bg-slate-950 px-6 py-20 text-white lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Workflow</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">A dashboard flow that matches how teams actually work.</h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              The frontend is structured around the key jobs ProductHub needs: manage products, expose integrations, and keep sync activity visible.
            </p>
          </div>
          <div className="space-y-4">
            {workflow.map((item, index) => (
              <div key={item} className="flex gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-950">{index + 1}</span>
                <div>
                  <p className="font-semibold">{item}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">Designed to connect cleanly with the `apps/api` backend as endpoints are added.</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="api" className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="grid gap-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[0.85fr_1.15fr] lg:p-8">
          <div>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <Webhook className="h-6 w-6" />
            </div>
            <h2 className="mt-6 text-3xl font-semibold tracking-tight">Ready for the backend API.</h2>
            <p className="mt-4 leading-7 text-slate-600">
              The web app is prepared to talk to `NEXT_PUBLIC_API_URL`, making it simple to wire pages to the NestJS backend in `apps/api`.
            </p>
          </div>
          <div className="rounded-3xl bg-slate-950 p-5 font-mono text-sm text-slate-100 shadow-inner">
            <div className="mb-4 flex items-center gap-2 text-slate-500">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-yellow-400" />
              <span className="h-3 w-3 rounded-full bg-emerald-400" />
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap leading-7">{`const apiUrl = process.env.NEXT_PUBLIC_API_URL;

await fetch(`${apiUrl}/products`, {
  headers: { Authorization: `Bearer ${token}` },
});`}</pre>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-6 py-8 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 ProductHub. Inventory operations made cleaner.</p>
          <div className="flex items-center gap-2 text-slate-600">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Frontend lives in apps/web
          </div>
        </div>
      </footer>
    </main>
  );
}
