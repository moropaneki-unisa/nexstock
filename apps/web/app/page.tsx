import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  PackageSearch,
  ShieldCheck,
  Workflow,
} from "lucide-react";

const features = [
  {
    title: "Products",
    description: "Create, organize, and manage product records from one clear workspace.",
    icon: Boxes,
  },
  {
    title: "Inventory",
    description: "Track stock visibility, movement, and operational status without clutter.",
    icon: BarChart3,
  },
  {
    title: "Workflows",
    description: "Keep the frontend ready for backend services, integrations, and sync flows.",
    icon: Workflow,
  },
];

const stats = [
  { value: "12.4k", label: "Products managed" },
  { value: "48k", label: "Monthly events" },
  { value: "99.9%", label: "Service uptime" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-neutral-950">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-950 text-white">
            <PackageSearch className="h-4 w-4" />
          </span>
          ProductHub
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-neutral-600 md:flex">
          <a href="#features" className="transition hover:text-neutral-950">
            Features
          </a>
          <a href="#platform" className="transition hover:text-neutral-950">
            Platform
          </a>
          <a href="#pricing" className="transition hover:text-neutral-950">
            Pricing
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden text-sm font-medium text-neutral-600 transition hover:text-neutral-950 sm:block">
            Login
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Get started
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pt-24">
        <div className="text-center lg:text-left">
          <div className="mx-auto mb-6 inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-sm text-neutral-600 lg:mx-0">
            Inventory operations, simplified
          </div>

          <h1 className="mx-auto max-w-4xl text-5xl font-semibold tracking-[-0.04em] text-neutral-950 sm:text-6xl lg:mx-0">
            A minimal workspace for modern product teams.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-neutral-600 lg:mx-0">
            ProductHub helps teams manage products, inventory activity, and operational workflows from a clean frontend built for focus.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-neutral-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center rounded-full border border-neutral-200 px-6 py-3 text-sm font-medium text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50"
            >
              View features
            </a>
          </div>
        </div>

        <div className="mx-auto w-full max-w-xl rounded-[2rem] border border-neutral-200 bg-neutral-50 p-3 shadow-sm">
          <div className="rounded-[1.5rem] border border-neutral-200 bg-white p-5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-5">
              <div>
                <p className="text-sm font-medium text-neutral-950">Overview</p>
                <p className="mt-1 text-sm text-neutral-500">Today’s product activity</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                Healthy
              </span>
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
                ["Low stock review", "24 items"],
                ["Products pending sync", "8 items"],
                ["Workspace protection", "Enabled"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-2xl border border-neutral-100 bg-white px-4 py-3"
                >
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
            <p className="text-sm font-medium text-neutral-500">Features</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
              Everything important. Nothing distracting.
            </h2>
            <p className="mt-4 text-neutral-600">
              A focused frontend foundation for product, inventory, and workflow visibility.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <article key={feature.title} className="rounded-[1.5rem] border border-neutral-200 bg-white p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-950 text-white">
                    <Icon className="h-4 w-4" />
                  </span>
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
            <p className="text-sm font-medium text-neutral-500">Platform</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
              Built around your monorepo structure.
            </h2>
            <p className="mt-4 leading-7 text-neutral-600">
              The frontend stays in <span className="font-medium text-neutral-950">apps/web</span>,
              ready to connect with the backend service in{" "}
              <span className="font-medium text-neutral-950">apps/api</span>.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-neutral-200 bg-white p-6">
            <div className="grid gap-3">
              {[
                ["apps/web", "Next.js frontend"],
                ["apps/api", "Backend service"],
                ["NEXT_PUBLIC_API_URL", "Frontend API configuration"],
              ].map(([path, label]) => (
                <div key={path} className="flex items-center justify-between rounded-2xl bg-neutral-50 px-4 py-3">
                  <span className="font-mono text-sm text-neutral-950">{path}</span>
                  <span className="text-sm text-neutral-500">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="px-6 pb-24">
        <div className="mx-auto max-w-6xl rounded-[2rem] bg-neutral-950 px-6 py-14 text-center text-white">
          <ShieldCheck className="mx-auto h-8 w-8 text-neutral-300" />
          <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Launch with a page that feels calm, credible, and professional.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-neutral-300">
            Minimal design, strong alignment, neutral colors, and clear calls to action.
          </p>
          <div className="mt-8">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-neutral-950 transition hover:bg-neutral-100"
            >
              Get started <CheckCircle2 className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
