import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  Code2,
  PackageSearch,
  ShieldCheck,
  Webhook,
} from "lucide-react";

const features = [
  {
    title: "Product source of truth",
    description: "Manage product records, generated SKUs, pricing, stock levels, images, categories, and organization-specific metadata.",
    icon: Boxes,
  },
  {
    title: "Developer-first API",
    description: "Issue organization API keys, expose product data, and let custom websites or internal tools consume inventory safely.",
    icon: Code2,
  },
  {
    title: "Webhooks and sync",
    description: "Emit product and inventory events so connected systems can react as soon as catalog data changes.",
    icon: Webhook,
  },
];

const stats = [
  { value: "1", label: "Source of truth" },
  { value: "3", label: "Core events" },
  { value: "Zoho", label: "First integration" },
];

const roadmap = [
  ["MVP", "Auth, products, schema fields, API keys, webhooks"],
  ["Next", "Zoho OAuth, import/export, sync jobs, conflict review"],
  ["Scale", "Rate limiting, billing, queues, audit logs, team roles"],
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-neutral-950">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-950 text-white">
            <PackageSearch className="h-4 w-4" />
          </span>
          InventoryHub
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-neutral-600 md:flex">
          <a href="#features" className="transition hover:text-neutral-950">Features</a>
          <a href="#platform" className="transition hover:text-neutral-950">Platform</a>
          <a href="#roadmap" className="transition hover:text-neutral-950">Roadmap</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden text-sm font-medium text-neutral-600 transition hover:text-neutral-950 sm:block">
            Login
          </Link>
          <Link href="/signup" className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800">
            Start free
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pt-24">
        <div className="text-center lg:text-left">
          <div className="mx-auto mb-6 inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-sm text-neutral-600 lg:mx-0">
            Zoho-first inventory and product sync SaaS
          </div>

          <h1 className="mx-auto max-w-4xl text-5xl font-semibold tracking-[-0.04em] text-neutral-950 sm:text-6xl lg:mx-0">
            The single source of truth for products, inventory, and connected apps.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-neutral-600 lg:mx-0">
            InventoryHub helps businesses manage catalog data, expose clean APIs, register webhooks, and prepare for reliable Zoho product synchronization from one focused workspace.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
            <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-full bg-neutral-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-800">
              Create workspace <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="inline-flex items-center justify-center rounded-full border border-neutral-200 px-6 py-3 text-sm font-medium text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50">
              Open dashboard
            </Link>
          </div>
        </div>

        <div className="mx-auto w-full max-w-xl rounded-[2rem] border border-neutral-200 bg-neutral-50 p-3 shadow-sm">
          <div className="rounded-[1.5rem] border border-neutral-200 bg-white p-5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-5">
              <div>
                <p className="text-sm font-medium text-neutral-950">InventoryHub overview</p>
                <p className="mt-1 text-sm text-neutral-500">Catalog, API, and sync readiness</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">MVP ready</span>
            </div>

            <div className="grid gap-3 py-5 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
                  <p className="text-2xl font-semibold tracking-tight">{stat.value}</p>
                  <p className="mt-1 text-xs text-neutral-500">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {[
                ["Product CRUD", "Live"],
                ["API keys", "Live"],
                ["Webhooks", "Live"],
                ["Zoho sync", "Next"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-2xl border border-neutral-100 bg-white px-4 py-3">
                  <span className="text-sm text-neutral-600">{label}</span>
                  <span className="text-sm font-medium text-neutral-950">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-neutral-100 bg-neutral-50 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium text-neutral-500">Core SaaS features</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
              Built for businesses and developers.
            </h2>
            <p className="mt-4 text-neutral-600">
              The app now reflects the actual InventoryHub product direction: multi-tenant inventory, public APIs, webhooks, and Zoho-first integrations.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="rounded-[1.5rem] border border-neutral-200 bg-white p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-950 text-white"><Icon className="h-4 w-4" /></span>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">{feature.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="platform" className="px-6 py-24">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-medium text-neutral-500">Platform architecture</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
              A real SaaS monorepo foundation.
            </h2>
            <p className="mt-4 leading-7 text-neutral-600">
              The web app in <span className="font-medium text-neutral-950">apps/web</span> connects to the NestJS backend in <span className="font-medium text-neutral-950">apps/api</span> through JWT auth, organization-scoped data, API keys, and webhook endpoints.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-neutral-200 bg-white p-6">
            <div className="grid gap-3">
              {[
                ["Next.js App Router", "Dashboard, products, API keys, webhooks"],
                ["NestJS + Prisma", "Products, inventory logs, API keys, webhooks"],
                ["Zoho sync engine", "OAuth and BullMQ worker roadmap"],
              ].map(([path, label]) => (
                <div key={path} className="flex items-center justify-between gap-4 rounded-2xl bg-neutral-50 px-4 py-3">
                  <span className="text-sm font-medium text-neutral-950">{path}</span>
                  <span className="text-right text-sm text-neutral-500">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="roadmap" className="px-6 pb-24">
        <div className="mx-auto max-w-6xl rounded-[2rem] bg-neutral-950 px-6 py-14 text-white">
          <ShieldCheck className="h-8 w-8 text-neutral-300" />
          <h2 className="mt-5 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Ship the MVP, then build the sync moat.
          </h2>
          <p className="mt-4 max-w-2xl text-neutral-300">
            Win the first version with product CRUD, custom schemas, API keys, and webhooks. Then add Zoho sync, imports, exports, queues, conflict resolution, and billing.
          </p>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {roadmap.map(([phase, detail]) => (
              <div key={phase} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold">{phase}</p>
                <p className="mt-2 text-sm leading-6 text-neutral-300">{detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link href="/signup" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-neutral-950 transition hover:bg-neutral-100">
              Start building <CheckCircle2 className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
