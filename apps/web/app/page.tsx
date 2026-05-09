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
  type LucideIcon,
} from "lucide-react";
import { NexstockLogo } from "@/components/brand/nexstock-logo";
import { AppFooter } from "@/components/layout/app-footer";

const navLinks = [
  { href: "#features", label: "Product" },
  { href: "#workflow", label: "Workflow" },
  { href: "#platform", label: "Platform" },
  { href: "#security", label: "Security" },
];

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
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-card/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10">
          <Link href="/" aria-label="NexStock home" className="shrink-0 border bg-background/70 px-3 py-2 transition hover:bg-muted/45">
            <NexstockLogo tagline={false} className="px-1 py-0" />
          </Link>

          <nav className="hidden items-center border bg-background/60 text-sm font-medium text-muted-foreground lg:flex">
            {navLinks.map((item) => (
              <a key={item.href} href={item.href} className="border-r px-4 py-2.5 transition last:border-r-0 hover:bg-muted/45 hover:text-foreground">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 text-sm md:flex">
            <Link href="/login" className="border bg-background/70 px-4 py-2.5 font-semibold transition hover:bg-muted/45">Sign in</Link>
            <Link href="/signup" className="inline-flex items-center gap-2 bg-primary px-4 py-2.5 font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90">
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <Link href="/signup" className="inline-flex items-center gap-2 bg-primary px-3 py-2 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 md:hidden">
            Start <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="border-t bg-muted/15 px-4 py-2 sm:px-6 lg:hidden">
          <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto text-xs font-medium text-muted-foreground">
            {navLinks.map((item) => (
              <a key={item.href} href={item.href} className="shrink-0 border bg-background/70 px-3 py-2 transition hover:bg-muted/45 hover:text-foreground">
                {item.label}
              </a>
            ))}
            <Link href="/login" className="shrink-0 border bg-background/70 px-3 py-2 transition hover:bg-muted/45 hover:text-foreground">Sign in</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:px-10 lg:pb-20 lg:pt-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_31rem] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 border bg-card/95 px-3 py-2 text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Connect · Manage · Grow
            </div>
            <h1 className="mt-7 max-w-5xl text-5xl font-black tracking-[-0.06em] sm:text-6xl lg:text-7xl">
              Product operations built for connected businesses.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              NexStock helps teams centralize product data, automate inventory workflows, connect business systems, and launch with clean operational visibility.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="inline-flex items-center gap-2 bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90">Create workspace <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/login" className="inline-flex items-center gap-2 border bg-card/95 px-6 py-3 text-sm font-semibold transition hover:bg-muted">Open dashboard</Link>
            </div>
          </div>

          <section className="border bg-card/95">
            <SectionHeader icon={BarChart3} title="NexStock Operations Dashboard" description="Products, integrations, webhooks, imports, and growth metrics in one view." badge="Launch ready" />
            <div className="grid divide-y border-t sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <DashboardMetric label="Products" value="12,480" />
              <DashboardMetric label="Integrations" value="14" />
            </div>
            <div className="grid divide-y border-t sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <DashboardMetric label="Sync events" value="1.8M" />
              <DashboardMetric label="Accuracy" value="99.98%" />
            </div>
            <div className="divide-y border-t">
              <HealthLine label="API health" value="Operational" />
              <HealthLine label="Import queue" value="Clear" />
              <HealthLine label="Webhook delivery" value="Monitoring" />
            </div>
          </section>
        </div>
      </section>

      <section id="features" className="border-y bg-card/40 px-4 py-16 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <SectionIntro eyebrow="Product" title="One operating layer for product data." description="NexStock gives your team the core tools needed to manage catalog data, stock workflows, and connected systems." />
          <div className="mt-10 border bg-card/95">
            <div className="grid divide-y md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4">
              {pillars.map((item) => <FeaturePanel key={item.title} {...item} />)}
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="px-4 py-16 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <SectionIntro eyebrow="How it works" title="Connect your stack, structure your data, and grow with confidence." description="NexStock turns disconnected stock and product data into a clean, automated operating layer." />
          <div className="mt-10 border bg-card/95">
            <div className="grid divide-y md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4">
              {workflow.map((step, index) => <WorkflowPanel key={step.title} index={index} {...step} />)}
            </div>
          </div>
        </div>
      </section>

      <section id="platform" className="border-y bg-card/40 px-4 py-16 sm:px-6 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <SectionIntro eyebrow="Platform ready" title="Built for integrations, APIs, imports, and cloud workflows." description="Whether your products live in spreadsheets, online stores, ERP systems, or custom apps, NexStock gives your team one reliable layer to connect, manage, and grow." />
          <section className="border bg-card/95">
            <SectionHeader icon={DatabaseZap} title="Platform capabilities" description="Core capabilities for connected product operations." />
            <div className="grid divide-y border-t sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              {platformItems.map((item) => <ListItem key={item} label={item} />)}
            </div>
          </section>
        </div>
      </section>

      <section id="security" className="px-4 py-16 sm:px-6 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <SectionIntro eyebrow="Security" title="Professional enough for real business operations." description="Designed for launch with secure access, API controls, operational monitoring, and a scalable cloud foundation." icon={LockKeyhole} />
          <section className="border bg-card/95">
            <SectionHeader icon={ShieldCheck} title="Operational controls" description="Security and infrastructure foundations for production teams." />
            <div className="grid divide-y border-t sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              {securityItems.map((item) => <ListItem key={item} label={item} icon={ShieldCheck} />)}
            </div>
          </section>
        </div>
      </section>

      <section className="border-t bg-card/40 px-4 py-16 text-center sm:px-6 lg:px-10">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-4xl font-black tracking-[-0.05em] md:text-6xl">Ready to connect, manage, and grow?</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">Launch your NexStock workspace and start building a cleaner product operating system for your company.</p>
          <div className="mt-8"><Link href="/signup" className="inline-flex items-center gap-2 bg-primary px-8 py-4 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90">Start free today <Zap className="h-4 w-4" /></Link></div>
        </div>
      </section>

      <AppFooter />
    </main>
  );
}

function SectionIntro({ eyebrow, title, description, icon: Icon }: { eyebrow: string; title: string; description: string; icon?: LucideIcon }) {
  return (
    <div className="max-w-2xl">
      <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.22em] text-muted-foreground">{Icon && <Icon className="h-4 w-4 text-primary" />}{eyebrow}</p>
      <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] md:text-5xl">{title}</h2>
      <p className="mt-5 text-lg leading-8 text-muted-foreground">{description}</p>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, description, badge }: { icon: LucideIcon; title: string; description?: string; badge?: string }) {
  return <div className="flex flex-row items-start justify-between gap-4 p-5"><div><h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><Icon className="h-5 w-5" />{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>{badge && <span className="border bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{badge}</span>}</div>;
}

function FeaturePanel({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return <div className="p-5"><span className="flex h-10 w-10 items-center justify-center bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span><h3 className="mt-4 text-lg font-semibold tracking-tight">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div>;
}

function WorkflowPanel({ icon: Icon, title, text, index }: { icon: LucideIcon; title: string; text: string; index: number }) {
  return <div className="p-5"><span className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">0{index + 1}</span><span className="mt-4 flex h-10 w-10 items-center justify-center bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span><h3 className="mt-4 text-lg font-semibold tracking-tight">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div>;
}

function DashboardMetric({ label, value }: { label: string; value: string }) {
  return <div className="p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p></div>;
}

function HealthLine({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm"><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{label}</span><span className="font-medium">{value}</span></div>;
}

function ListItem({ label, icon: Icon = CheckCircle2 }: { label: string; icon?: LucideIcon }) {
  return <div className="flex items-center gap-3 p-4 text-sm"><span className="flex h-9 w-9 shrink-0 items-center justify-center bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span><span className="font-medium">{label}</span></div>;
}
