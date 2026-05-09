import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  Cloud,
  DatabaseZap,
  Link2,
  LockKeyhole,
  PlugZap,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { NexstockLogo } from "@/components/brand/nexstock-logo";

const pillars = [
  { icon: Boxes, title: "Product catalog", text: "Manage SKUs, variants, stock levels, categories, images, and custom product data from one place." },
  { icon: Link2, title: "Connected systems", text: "Bring together stores, spreadsheets, ERP tools, POS platforms, warehouses, and custom apps." },
  { icon: BarChart3, title: "Operational insight", text: "Spot product issues, sync gaps, stock risks, and growth opportunities before they become problems." },
  { icon: Cloud, title: "Cloud workflows", text: "Use secure APIs, webhooks, imports, and automation-ready workflows built for real operations." },
];

const workflow = [
  { icon: PlugZap, title: "Connect", text: "Import files or connect your product sources." },
  { icon: DatabaseZap, title: "Structure", text: "Map fields, clean data, and standardize records." },
  { icon: RefreshCw, title: "Sync", text: "Keep product and inventory updates moving." },
  { icon: BarChart3, title: "Grow", text: "Use reliable product data to make better decisions." },
];

const platformItems = [
  "Product catalog API",
  "Webhook event delivery",
  "Custom field mapping",
  "Cloud image storage",
  "Inventory movement logs",
  "Integration sync history",
];

const securityItems = [
  "Role-based workspace access",
  "Secure API keys",
  "Webhook controls",
  "Cloud-ready infrastructure",
  "Audit-ready product operations",
  "Production deployment pipeline",
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#06111f] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(63,117,255,0.38),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(35,224,190,0.32),transparent_28%),radial-gradient(circle_at_52%_78%,rgba(143,77,255,0.24),transparent_34%),linear-gradient(180deg,#050b16_0%,#071a2f_45%,#06111f_100%)]" />
      <div className="absolute inset-0 opacity-[0.13] [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:72px_72px]" />
      <div className="absolute left-1/2 top-28 h-80 w-80 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-3xl" />

      <header className="relative z-20 border-b border-white/10 bg-[#06111f]/75 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10">
          <Link href="/" aria-label="NexStock home" className="shrink-0">
            <NexstockLogo light tagline={false} className="px-2.5 py-2" />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-white/65 md:flex">
            <a href="#features" className="transition hover:text-white">Product</a>
            <a href="#workflow" className="transition hover:text-white">Workflow</a>
            <a href="#platform" className="transition hover:text-white">Platform</a>
            <a href="#security" className="transition hover:text-white">Security</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white/85 transition hover:bg-white/[0.10] sm:px-5">Sign in</Link>
            <Link href="/signup" className="rounded-2xl bg-gradient-to-r from-[#6d5dfc] via-[#2f7cff] to-[#25e0be] px-4 py-2.5 text-sm font-bold text-white shadow-[0_18px_48px_rgba(47,124,255,0.30)] transition hover:-translate-y-0.5 sm:px-5">Start free</Link>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-16 text-center sm:px-6 lg:px-10 lg:pb-28 lg:pt-24">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-white/[0.07] px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] text-cyan-100 shadow-[0_18px_60px_rgba(35,224,190,0.18)] backdrop-blur-xl">
          <Sparkles className="h-3.5 w-3.5 text-cyan-300" /> Connect · Manage · Grow
        </div>

        <h1 className="mx-auto mt-8 max-w-6xl text-5xl font-black tracking-[-0.07em] text-white sm:text-6xl md:text-7xl lg:text-8xl">
          Product operations built for connected businesses.
        </h1>

        <p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-slate-300 md:text-xl">
          NexStock helps teams centralize product data, automate inventory workflows, connect business systems, and launch with clean operational visibility.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/signup" className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#6d5dfc] via-[#2f7cff] to-[#25e0be] px-7 py-4 text-sm font-bold text-white shadow-[0_24px_76px_rgba(47,124,255,0.35)] transition hover:-translate-y-0.5">Create workspace <ArrowRight className="h-4 w-4" /></Link>
          <Link href="/login" className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.07] px-7 py-4 text-sm font-semibold text-white/85 backdrop-blur-xl transition hover:bg-white/[0.12]">Open dashboard</Link>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-5 md:grid-cols-4" id="features">
          {pillars.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 text-left backdrop-blur-xl transition hover:-translate-y-1 hover:border-cyan-300/30 hover:bg-white/[0.075]">
                <div className="flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-[#6d5dfc]/30 via-[#2f7cff]/25 to-[#25e0be]/25 text-cyan-100">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-bold tracking-tight">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{item.text}</p>
              </div>
            );
          })}
        </div>

        <div className="mx-auto mt-16 max-w-6xl rounded-[2.6rem] border border-white/10 bg-[#071527]/78 p-3 shadow-[0_50px_150px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-4">
          <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.10] to-white/[0.025] p-5 text-left">
            <div className="flex flex-col gap-5 border-b border-white/10 pb-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-white">NexStock Operations Dashboard</p>
                <p className="mt-1 text-sm text-slate-400">Products, integrations, webhooks, imports, and growth metrics in one view.</p>
              </div>
              <span className="w-fit rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">Launch ready</span>
            </div>
            <div className="grid gap-4 py-5 md:grid-cols-4">
              {[["Products", "12,480"], ["Integrations", "14"], ["Sync events", "1.8M"], ["Accuracy", "99.98%"]].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-2 text-2xl font-black tracking-tight">{value}</p>
                  <div className="mt-4 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-[#6d5dfc] via-[#2f7cff] to-[#25e0be]" style={{ width: label === "Accuracy" ? "99%" : "72%" }} /></div>
                </div>
              ))}
            </div>
            <div className="grid gap-4 rounded-[1.5rem] border border-white/10 bg-black/20 p-4 md:grid-cols-3">
              {[["API health", "Operational"], ["Import queue", "Clear"], ["Webhook delivery", "Monitoring"]].map(([label, value]) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-200"><CheckCircle2 className="h-4 w-4" /></span>
                  <div>
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="text-sm font-semibold text-slate-100">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="relative z-10 border-y border-white/10 bg-[#071527]/72 px-4 py-20 sm:px-6 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-cyan-300">How it works</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] md:text-5xl">Connect your stack, structure your data, and grow with confidence.</h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">NexStock turns disconnected stock and product data into a clean, automated operating layer.</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-4">
            {workflow.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
                  <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">0{index + 1}</span>
                  <div className="mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6d5dfc] via-[#2f7cff] to-[#25e0be]"><Icon className="h-6 w-6" /></div>
                  <h3 className="mt-5 text-xl font-bold">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{step.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="platform" className="relative z-10 px-4 py-20 sm:px-6 lg:px-10 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-purple-300">Platform ready</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] md:text-5xl">Built for integrations, APIs, imports, and cloud workflows.</h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">Whether your products live in spreadsheets, online stores, ERP systems, or custom apps, NexStock gives your team one reliable layer to connect, manage, and grow.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {platformItems.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4"><CheckCircle2 className="h-5 w-5 text-cyan-300" /><span className="text-sm font-medium text-slate-200">{item}</span></div>
            ))}
          </div>
        </div>
      </section>

      <section id="security" className="relative z-10 border-t border-white/10 bg-white/[0.03] px-4 py-20 sm:px-6 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-7xl rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-[#0d1d34] to-[#06111f] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.35)] md:p-12">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <LockKeyhole className="h-10 w-10 text-cyan-300" />
              <h2 className="mt-5 text-4xl font-black tracking-[-0.05em]">Professional enough for real business operations.</h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">Designed for launch with secure access, API controls, operational monitoring, and a scalable cloud foundation.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {securityItems.map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-sm text-slate-200"><ShieldCheck className="mb-3 h-5 w-5 text-emerald-300" />{item}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 px-4 py-20 text-center sm:px-6 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-4xl font-black tracking-[-0.05em] md:text-6xl">Ready to connect, manage, and grow?</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">Launch your NexStock workspace and start building a cleaner product operating system for your company.</p>
          <div className="mt-8"><Link href="/signup" className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#6d5dfc] via-[#2f7cff] to-[#25e0be] px-8 py-4 text-sm font-bold text-white shadow-[0_24px_70px_rgba(47,124,255,0.35)]">Start free today <Zap className="h-4 w-4" /></Link></div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 px-4 py-8 sm:px-6 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 text-sm text-slate-500 md:flex-row">
          <NexstockLogo light tagline={false} className="px-2.5 py-2" />
          <p>© 2026 NexStock. Connect. Manage. Grow.</p>
        </div>
      </footer>
    </main>
  );
}
