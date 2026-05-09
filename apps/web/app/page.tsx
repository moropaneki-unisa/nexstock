import Link from "next/link";
import { ArrowRight, CheckCircle2, Globe2, Layers3, ShieldCheck, Sparkles, Webhook } from "lucide-react";
import { NexstockLogo } from "@/components/brand/nexstock-logo";

const features = [
  { icon: Layers3, title: "Unified product operations", description: "Manage inventory, catalogs, warehouses, SKUs, and pricing from a single modern workspace." },
  { icon: Globe2, title: "Platform integrations", description: "Connect ecommerce, ERP, POS, and logistics platforms through scalable APIs and webhooks." },
  { icon: ShieldCheck, title: "Enterprise-ready architecture", description: "Role-based access, API security, audit readiness, and high-performance backend infrastructure." },
  { icon: Webhook, title: "Automation workflows", description: "Trigger events, sync inventory in real time, and automate operational pipelines." },
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="absolute inset-0 hero-grid opacity-30" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.09),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.05),transparent_24%)]" />

      <header className="relative z-10 border-b border-white/10 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
          <NexstockLogo light />
          <nav className="hidden items-center gap-8 text-sm text-white/65 md:flex">
            <a href="#features" className="transition hover:text-white">Features</a>
            <a href="#platform" className="transition hover:text-white">Platform</a>
            <a href="#security" className="transition hover:text-white">Security</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/85 transition hover:bg-white/10">Sign in</Link>
            <Link href="/signup" className="rounded-2xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200">Start free</Link>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex max-w-7xl flex-col items-center px-6 pb-28 pt-24 text-center lg:px-10 lg:pt-32">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium uppercase tracking-[0.24em] text-white/70 backdrop-blur-xl">
          <Sparkles className="h-3.5 w-3.5" /> Next generation inventory SaaS
        </div>
        <h1 className="mt-8 max-w-5xl text-5xl font-black tracking-[-0.06em] text-white md:text-7xl">Modern inventory and product operations for growing companies.</h1>
        <p className="mt-8 max-w-3xl text-lg leading-8 text-zinc-400 md:text-xl">NexStock helps businesses connect platforms, automate inventory workflows, manage products, and scale operations with a clean modern SaaS experience.</p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/signup" className="inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-4 text-sm font-semibold text-black transition hover:bg-zinc-200">Launch workspace <ArrowRight className="h-4 w-4" /></Link>
          <Link href="/login" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-7 py-4 text-sm font-medium text-white/80 backdrop-blur-xl transition hover:bg-white/10 hover:text-white">Existing workspace</Link>
        </div>
        <div className="mt-20 grid w-full gap-5 lg:grid-cols-4" id="features">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="group rounded-[2rem] border border-white/10 bg-white/[0.03] p-7 text-left backdrop-blur-xl transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.05]">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white shadow-2xl"><Icon className="h-6 w-6" /></div>
                <h3 className="mt-6 text-xl font-semibold tracking-tight">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-zinc-400">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="platform" className="relative z-10 border-y border-white/10 bg-white/[0.03]">
        <div className="mx-auto grid max-w-7xl gap-14 px-6 py-24 lg:grid-cols-[1.1fr_0.9fr] lg:px-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/45">Built for scale</p>
            <h2 className="mt-5 text-4xl font-black tracking-[-0.05em] md:text-5xl">Professional SaaS infrastructure designed for real businesses.</h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400">From APIs and webhooks to inventory syncs and multi-platform integrations, NexStock gives teams the tools to manage operations from one elegant dashboard.</p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {["Real-time inventory sync", "Secure API access", "Webhook automations", "Multi-platform integrations", "Role-based access control", "Scalable architecture"].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-4"><CheckCircle2 className="h-5 w-5 text-white" /><span className="text-sm text-zinc-200">{item}</span></div>
              ))}
            </div>
          </div>
          <div className="rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-8 shadow-[0_40px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-5"><NexstockLogo light /><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/55">Live sync</span></div>
            <div className="mt-8 space-y-4">
              {[["Products synced", "12,480"], ["Webhook deliveries", "1.8M"], ["Connected platforms", "14"], ["Inventory accuracy", "99.98%"]].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4"><span className="text-sm text-zinc-400">{label}</span><span className="text-lg font-semibold tracking-tight">{value}</span></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
