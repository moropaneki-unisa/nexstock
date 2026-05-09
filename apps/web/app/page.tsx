import Link from "next/link";
import { ArrowRight, BarChart3, Boxes, CheckCircle2, Cloud, DatabaseZap, Link2, LockKeyhole, PlugZap, RefreshCw, Sparkles, Zap } from "lucide-react";
import { NexstockLogo } from "@/components/brand/nexstock-logo";

const pillars = [
  { icon: Boxes, title: "Products Management", text: "Control products, SKUs, stock, images, pricing and categories from one beautiful workspace." },
  { icon: Link2, title: "Seamless Integrations", text: "Connect online stores, ERP tools, POS systems, warehouses and custom platforms." },
  { icon: BarChart3, title: "Data Driven Growth", text: "Turn product and inventory data into clear decisions for faster growth." },
  { icon: Cloud, title: "Cloud Powered", text: "Run secure APIs, webhooks and sync workflows on a modern cloud foundation." },
];

const workflow = [
  { icon: PlugZap, title: "Connect", text: "Connect your stores, tools and spreadsheets." },
  { icon: DatabaseZap, title: "Manage", text: "Clean, map and manage your product data." },
  { icon: RefreshCw, title: "Sync", text: "Keep stock and product updates flowing." },
  { icon: BarChart3, title: "Grow", text: "Use clean data to make better decisions." },
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#06111f] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(63,117,255,0.38),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(35,224,190,0.32),transparent_28%),radial-gradient(circle_at_52%_78%,rgba(143,77,255,0.24),transparent_34%),linear-gradient(180deg,#050b16_0%,#071a2f_45%,#06111f_100%)]" />
      <div className="absolute inset-0 opacity-[0.13] [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:72px_72px]" />

      <header className="relative z-20 border-b border-white/10 bg-[#06111f]/72 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
          <NexstockLogo light />
          <nav className="hidden items-center gap-8 text-sm font-medium text-white/65 md:flex">
            <a href="#features" className="transition hover:text-white">Product</a>
            <a href="#workflow" className="transition hover:text-white">Integrations</a>
            <a href="#platform" className="transition hover:text-white">Platform</a>
            <a href="#security" className="transition hover:text-white">Security</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="rounded-2xl border border-white/12 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/85 transition hover:bg-white/10">Sign in</Link>
            <Link href="/signup" className="rounded-2xl bg-gradient-to-r from-[#6d5dfc] via-[#2f7cff] to-[#25e0be] px-5 py-2.5 text-sm font-bold text-white shadow-[0_18px_48px_rgba(47,124,255,0.30)] transition hover:-translate-y-0.5">Start free</Link>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24 pt-20 text-center lg:px-10 lg:pt-28">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-white/7 px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] text-cyan-100 shadow-[0_18px_60px_rgba(35,224,190,0.18)] backdrop-blur-xl">
          <Sparkles className="h-3.5 w-3.5 text-cyan-300" /> Connect · Manage · Grow
        </div>

        <h1 className="mx-auto mt-9 max-w-6xl text-5xl font-black tracking-[-0.07em] text-white md:text-7xl lg:text-8xl">
          Cloud product management for connected businesses.
        </h1>

        <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-slate-300 md:text-xl">
          NexStock helps teams manage products, connect platforms, automate inventory workflows and turn clean product data into growth.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/signup" className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#6d5dfc] via-[#2f7cff] to-[#25e0be] px-7 py-4 text-sm font-bold text-white shadow-[0_24px_76px_rgba(47,124,255,0.35)] transition hover:-translate-y-0.5">Create workspace <ArrowRight className="h-4 w-4" /></Link>
          <Link href="/login" className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/7 px-7 py-4 text-sm font-semibold text-white/85 backdrop-blur-xl transition hover:bg-white/12">Open dashboard</Link>
        </div>

        <div className="mx-auto mt-18 grid max-w-5xl gap-5 md:grid-cols-4" id="features">
          {pillars.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 text-left backdrop-blur-xl transition hover:-translate-y-1 hover:border-cyan-300/30 hover:bg-white/[0.075]">
                <div className="flex h-13 w-13 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-[#6d5dfc]/30 via-[#2f7cff]/25 to-[#25e0be]/25 text-cyan-100">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-bold tracking-tight">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{item.text}</p>
              </div>
            );
          })}
        </div>

        <div className="mx-auto mt-16 max-w-6xl rounded-[2.6rem] border border-white/10 bg-[#071527]/78 p-4 shadow-[0_50px_150px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.10] to-white/[0.025] p-5 text-left">
            <div className="flex flex-col gap-5 border-b border-white/10 pb-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-white">NexStock Operations Dashboard</p>
                <p className="mt-1 text-sm text-slate-400">Products, integrations, webhooks and growth analytics in one view.</p>
              </div>
              <span className="w-fit rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">Cloud powered</span>
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
          </div>
        </div>
      </section>

      <section id="workflow" className="relative z-10 border-y border-white/10 bg-[#071527]/72 px-6 py-24 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-cyan-300">How it works</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] md:text-5xl">Connect your stack, manage your data, grow with confidence.</h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">NexStock turns disconnected stock and product data into a managed, automated operating system.</p>
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

      <section id="platform" className="relative z-10 px-6 py-24 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-purple-300">Platform ready</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] md:text-5xl">Built for integrations, APIs and cloud workflows.</h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">Whether your products live in spreadsheets, online stores, ERP systems or custom apps, NexStock provides the layer to connect, manage and grow.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {["Product catalog API", "Webhook event delivery", "Custom field mapping", "Cloud image storage", "Inventory movement logs", "Integration sync history"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4"><CheckCircle2 className="h-5 w-5 text-cyan-300" /><span className="text-sm font-medium text-slate-200">{item}</span></div>
            ))}
          </div>
        </div>
      </section>

      <section id="security" className="relative z-10 border-t border-white/10 bg-white/[0.03] px-6 py-24 lg:px-10">
        <div className="mx-auto max-w-7xl rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-[#0d1d34] to-[#06111f] p-8 shadow-[0_40px_120px_rgba(0,0,0,0.35)] md:p-12">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <LockKeyhole className="h-10 w-10 text-cyan-300" />
              <h2 className="mt-5 text-4xl font-black tracking-[-0.05em]">Professional enough for real business operations.</h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">Designed for production from day one with secure access, API controls, automated deployments and a scalable cloud foundation.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {["Role-based workspace access", "Secure API keys", "Signed webhook events", "Cloud-ready infrastructure", "Audit-ready product operations", "Production deployment pipeline"].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-sm text-slate-200"><CheckCircle2 className="mb-3 h-5 w-5 text-emerald-300" />{item}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 px-6 py-24 text-center lg:px-10">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-4xl font-black tracking-[-0.05em] md:text-6xl">Ready to connect, manage and grow?</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">Launch your NexStock workspace and start building a cleaner product operating system for your company.</p>
          <div className="mt-8"><Link href="/signup" className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#6d5dfc] via-[#2f7cff] to-[#25e0be] px-8 py-4 text-sm font-bold text-white shadow-[0_24px_70px_rgba(47,124,255,0.35)]">Start free today <Zap className="h-4 w-4" /></Link></div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 px-6 py-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 text-sm text-slate-500 md:flex-row"><NexstockLogo light /><p>© 2026 NexStock. Connect. Manage. Grow.</p></div>
      </footer>
    </main>
  );
}
