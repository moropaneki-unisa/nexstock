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
import { LandingContainer, LandingNarrowContainer } from "@/components/landing/landing-container";
import { PricingSection } from "@/components/landing/pricing-section";

const navLinks = [
  { href: "#features", label: "Product" },
  { href: "#workflow", label: "Workflow" },
  { href: "#platform", label: "Platform" },
  { href: "#pricing", label: "Pricing" },
  { href: "#security", label: "Security" },
];

const pillars = [
  { icon: Boxes, title: "Central product catalog", text: "Create one reliable source of truth for product names, SKUs, categories, prices, stock levels, images, and custom attributes." },
  { icon: Link2, title: "Multi-source integrations", text: "Connect CSV, XLSX, JSON, Zoho, WooCommerce, Shopify, and custom API sources without rebuilding your product data manually." },
  { icon: BarChart3, title: "Inventory visibility", text: "Track stock movement, sync status, import history, and operational gaps so your team knows what needs attention." },
  { icon: Cloud, title: "Cloud-ready operations", text: "Manage product data from a secure SaaS workspace with user roles, API keys, webhooks, and scalable cloud storage." },
];

const workflow = [
  { icon: PlugZap, title: "Connect your sources", text: "Upload files or configure API credentials for the systems where your product data already lives." },
  { icon: DatabaseZap, title: "Map product fields", text: "Match source columns to NexStock fields such as SKU, name, stock, price, images, and custom attributes." },
  { icon: RefreshCw, title: "Preview and sync", text: "Review mapped records before pushing updates, then sync products and inventory into your workspace." },
  { icon: BarChart3, title: "Operate with confidence", text: "Use history, logs, webhooks, and API access to keep your storefronts and operations aligned." },
];

const platformItems = [
  "Product catalog and stock management",
  "CSV, XLSX, JSON, Zoho, Shopify, and WooCommerce imports",
  "Custom product fields and reusable mapping templates",
  "API keys for external systems and internal tools",
  "Webhook events for product and inventory changes",
  "Sync history, logs, and operational readiness checks",
];

const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    cadence: "per month",
    description: "Start a workspace and validate the NexStock workflow before upgrading. This is best for testing the product experience, setting up your first product records, and understanding how NexStock fits your business before committing to a paid plan.",
    cta: "Start free",
    href: "/signup?plan=free",
    features: ["Create a product workspace", "Manual product catalog setup", "Basic inventory visibility", "Email verification and secure access"],
  },
  {
    name: "Starter",
    price: "$19",
    cadence: "per month",
    description: "For small teams starting product imports, stock visibility, and cleaner operating workflows. Starter is the first paid plan for businesses that need to move beyond manual product entry and start importing catalog data more consistently.",
    cta: "Choose Starter",
    href: "/billing/checkout?plan=starter",
    highlighted: true,
    features: ["CSV and XLSX product imports", "Reusable product-field mapping", "Inventory movement history", "API keys for connected tools"],
  },
  {
    name: "Growth",
    price: "$59",
    cadence: "per month",
    description: "For growing teams that need APIs, webhooks, integrations, and stronger product operations. Growth is intended for businesses that are connecting NexStock to other systems and need more automation around product and inventory updates.",
    cta: "Choose Growth",
    href: "/billing/checkout?plan=growth",
    features: ["Advanced imports and integration-ready workflows", "Webhooks for product and inventory events", "Team workspace and admin controls", "Priority setup support"],
  },
  {
    name: "Business",
    price: "$149",
    cadence: "per month later",
    description: "A future plan for purchase orders, vendor operations, multi-location stock, audit logs, and advanced automation. Business is shown now to communicate the product direction, but checkout is not enabled for this plan yet.",
    cta: "Coming later",
    href: "/billing/checkout?plan=growth",
    disabled: true,
    features: ["Vendor and purchase workflows", "Multi-location inventory", "Advanced audit logs", "Automation and priority onboarding"],
  },
];

const securityItems = [
  "Organization-based workspaces",
  "Admin-only organization and settings areas",
  "Hashed API keys with revocation controls",
  "Credential-safe integration configuration",
  "Email verification and password recovery flows",
  "Production deployment with environment-based configuration",
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b bg-background/90 px-4 backdrop-blur-xl sm:px-6 lg:px-10">
        <LandingContainer className="flex min-h-16 items-center justify-between gap-6">
          <Link href="/" aria-label="NexStock home" className="flex shrink-0 items-center">
            <NexstockLogo tagline={false} className="px-0 py-0" />
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-semibold text-muted-foreground lg:flex">
            {navLinks.map((item) => (
              <a key={item.href} href={item.href} className="transition hover:text-foreground">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 text-sm md:flex">
            <Link href="/login" className="px-2 py-2 font-semibold text-muted-foreground transition hover:text-foreground">
              Sign in
            </Link>
            <Link href="/signup" className="inline-flex items-center gap-2 bg-primary px-4 py-2.5 font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90">
              Create workspace <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <Link href="/signup" className="inline-flex items-center gap-2 bg-primary px-3 py-2 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 md:hidden">
            Start <ArrowRight className="h-4 w-4" />
          </Link>
        </LandingContainer>

        <div className="border-t bg-background/95 lg:hidden">
          <LandingContainer className="flex gap-4 overflow-x-auto py-2 text-xs font-semibold text-muted-foreground">
            {navLinks.map((item) => (
              <a key={item.href} href={item.href} className="shrink-0 py-1.5 transition hover:text-foreground">
                {item.label}
              </a>
            ))}
            <Link href="/login" className="shrink-0 py-1.5 transition hover:text-foreground">
              Sign in
            </Link>
          </LandingContainer>
        </div>
      </header>

      <section className="border-b bg-[radial-gradient(circle_at_15%_0%,hsl(var(--primary)/0.10),transparent_34rem),linear-gradient(180deg,hsl(var(--card)/0.42),transparent)] px-4 py-16 sm:px-6 lg:px-10 lg:py-20">
        <LandingContainer className="grid gap-10 lg:grid-cols-[1fr_0.92fr] lg:items-center">
          <div className="flex min-h-[440px] flex-col justify-center">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border bg-background/80 px-3 py-2 text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground shadow-sm"><Sparkles className="h-3.5 w-3.5 text-primary" /> Product data · Inventory · Integrations</div>
            <h1 className="mt-7 max-w-4xl text-5xl font-black tracking-[-0.06em] sm:text-6xl lg:text-7xl">Run your product catalog and inventory from one SaaS workspace.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">NexStock helps growing retailers, suppliers, and ecommerce teams centralize product records, import inventory from multiple systems, map messy data, and keep connected channels updated.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link href="/signup" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90">Create workspace <ArrowRight className="h-4 w-4" /></Link><a href="#pricing" className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-6 py-3 text-sm font-semibold transition hover:bg-muted">View pricing</a></div>
          </div>
          <HeroVisual />
        </LandingContainer>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-10"><LandingContainer className="overflow-hidden rounded-2xl border bg-card/95 shadow-sm"><img src="/landing/nexstock-brand-strip.svg" alt="NexStock brand strip" className="aspect-[1200/260] w-full object-cover" /></LandingContainer></section>

      <section id="features" className="border-y bg-card/40 px-4 py-24 sm:px-6 lg:px-10"><LandingContainer><SectionIntro eyebrow="Product" title="A practical operating layer for product data." description="NexStock is built around the daily work your team already does: adding products, cleaning fields, importing stock, managing images, and preparing data for sales channels." /><div className="mt-10 overflow-hidden rounded-2xl border bg-card/95 shadow-sm"><div className="grid auto-rows-fr divide-y md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4">{pillars.map((item) => <FeaturePanel key={item.title} {...item} />)}</div></div></LandingContainer></section>

      <section className="px-4 py-24 sm:px-6 lg:px-10"><LandingContainer className="grid gap-10 lg:grid-cols-2 lg:items-center"><div className="flex min-h-[440px] flex-col justify-center"><SectionIntro eyebrow="Who it is for" title="Built for businesses that manage product data in more than one place." description="Use NexStock when your product information is split between spreadsheets, online stores, supplier files, Zoho, Shopify, WooCommerce, or custom tools. The goal is simple: make your product data easier to control and safer to sync." /></div><section className="flex min-h-[440px] items-center overflow-hidden rounded-2xl border bg-card/95 p-4 shadow-sm"><img src="/landing/nexstock-feature-grid.svg" alt="NexStock feature grid" className="h-full w-full rounded-xl object-contain" /></section></LandingContainer></section>

      <section id="workflow" className="border-y bg-card/40 px-4 py-24 sm:px-6 lg:px-10"><LandingContainer><SectionIntro eyebrow="Workflow" title="From messy source data to clean product operations." description="NexStock gives teams a repeatable process for importing, mapping, reviewing, and syncing product information without losing control of the data." /><div className="mt-10 overflow-hidden rounded-2xl border bg-card/95 shadow-sm"><div className="grid auto-rows-fr divide-y md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4">{workflow.map((step, index) => <WorkflowPanel key={step.title} index={index} {...step} />)}</div></div></LandingContainer></section>

      <section id="platform" className="px-4 py-24 sm:px-6 lg:px-10"><LandingContainer className="grid gap-10 lg:grid-cols-2 lg:items-center"><div className="flex min-h-[320px] flex-col justify-center"><SectionIntro eyebrow="Platform" title="Everything needed to launch a product operations SaaS." description="The platform covers core product records, import workflows, integration configuration, API access, webhook delivery, and the operational history teams need when data changes." /></div><section className="overflow-hidden rounded-2xl border bg-card/95 shadow-sm"><SectionHeader icon={DatabaseZap} title="What NexStock includes" description="Core SaaS capabilities for connected product operations." /><div className="grid divide-y border-t sm:grid-cols-2 sm:divide-x sm:divide-y-0">{platformItems.map((item) => <ListItem key={item} label={item} />)}</div></section></LandingContainer></section>

      <section id="pricing" className="border-y bg-card/40 px-4 py-24 sm:px-6 lg:px-10"><LandingContainer><SectionIntro eyebrow="Subscriptions" title="Choose the workspace plan that matches your product operations." description="Start free, then upgrade when imports, API access, webhooks, and connected workflows become part of your day-to-day operations." /><PricingSection plans={pricingPlans} /><p className="mt-5 text-sm text-muted-foreground">Paid checkout is processed through Lemon Squeezy. Prices are shown in USD. Business is planned for a later release.</p></LandingContainer></section>

      <section id="security" className="px-4 py-24 sm:px-6 lg:px-10"><LandingContainer className="grid gap-10 lg:grid-cols-2 lg:items-center"><div className="flex min-h-[320px] flex-col justify-center"><SectionIntro eyebrow="Security" title="Designed for real teams, not just single-user spreadsheets." description="NexStock separates users by organization, protects sensitive integration details, restricts administrative areas, and gives teams safer ways to connect external systems." icon={LockKeyhole} /></div><section className="overflow-hidden rounded-2xl border bg-card/95 shadow-sm"><SectionHeader icon={ShieldCheck} title="Workspace controls" description="Security and account controls built into the SaaS experience." /><div className="grid divide-y border-t sm:grid-cols-2 sm:divide-x sm:divide-y-0">{securityItems.map((item) => <ListItem key={item} label={item} icon={ShieldCheck} />)}</div></section></LandingContainer></section>

      <section className="border-t bg-card/40 px-4 py-24 text-center sm:px-6 lg:px-10"><LandingNarrowContainer><h2 className="text-4xl font-black tracking-[-0.05em] md:text-6xl">Bring your product data under control.</h2><p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">Create a NexStock workspace, configure your first source, map your fields, and start building cleaner product operations for your business.</p><div className="mt-8"><Link href="/signup" className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90">Create your workspace <Zap className="h-4 w-4" /></Link></div></LandingNarrowContainer></section>

      <AppFooter />
    </main>
  );
}

function HeroVisual() { return <section className="border bg-card/95 shadow-sm"><SectionHeader icon={BarChart3} title="NexStock workspace" description="A cleaner operating view for products, imports, mappings, and sync readiness." /><div className="grid divide-y border-t sm:grid-cols-2 sm:divide-x sm:divide-y-0"><Metric icon={Boxes} label="Catalog" value="Products" helper="Central product records" /><Metric icon={PlugZap} label="Sources" value="Files + APIs" helper="CSV, XLSX, JSON and integrations" /></div><div className="grid divide-y border-t sm:grid-cols-2 sm:divide-x sm:divide-y-0"><Metric icon={DatabaseZap} label="Mapping" value="Reusable" helper="Field templates for every source" /><Metric icon={Cloud} label="Workspace" value="Cloud SaaS" helper="Secure organization access" /></div><div className="divide-y border-t"><ReadinessLine label="Product records ready for review" value="Mapped" /><ReadinessLine label="Import and sync activity" value="Tracked" /><ReadinessLine label="API keys and webhooks" value="Configurable" /></div></section>; }
function Metric({ icon: Icon, label, value, helper }: { icon: LucideIcon; label: string; value: string; helper: string }) { return <div className="flex items-center justify-between gap-4 p-4"><div className="min-w-0"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 truncate text-xl font-semibold">{value}</p><p className="mt-1 truncate text-xs text-muted-foreground">{helper}</p></div><span className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span></div>; }
function ReadinessLine({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm"><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{label}</span><span className="font-medium text-muted-foreground">{value}</span></div>; }
function SectionIntro({ eyebrow, title, description, icon: Icon }: { eyebrow: string; title: string; description: string; icon?: LucideIcon }) { return <div className="max-w-2xl"><p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.22em] text-muted-foreground">{Icon && <Icon className="h-4 w-4 text-primary" />}{eyebrow}</p><h2 className="mt-4 text-4xl font-black tracking-[-0.05em] md:text-5xl">{title}</h2><p className="mt-5 text-lg leading-8 text-muted-foreground">{description}</p></div>; }
function SectionHeader({ icon: Icon, title, description, badge }: { icon: LucideIcon; title: string; description?: string; badge?: string }) { return <div className="flex flex-row items-start justify-between gap-4 p-5"><div><h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><Icon className="h-5 w-5" />{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>{badge && <span className="border bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{badge}</span>}</div>; }
function FeaturePanel({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) { return <div className="flex min-h-[230px] flex-col p-5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span><h3 className="mt-4 text-lg font-semibold tracking-tight">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div>; }
function WorkflowPanel({ icon: Icon, title, text, index }: { icon: LucideIcon; title: string; text: string; index: number }) { return <div className="flex min-h-[230px] flex-col p-5"><span className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">0{index + 1}</span><span className="mt-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span><h3 className="mt-4 text-lg font-semibold tracking-tight">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div>; }
function ListItem({ label, icon: Icon = CheckCircle2 }: { label: string; icon?: LucideIcon }) { return <div className="flex min-h-[74px] items-center gap-3 p-4 text-sm"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span><span className="font-medium leading-5">{label}</span></div>; }
