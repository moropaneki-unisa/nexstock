import Link from "next/link"
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  CreditCard,
  DatabaseZap,
  FileSpreadsheet,
  KeyRound,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Truck,
  Webhook,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const features = [
  {
    icon: Boxes,
    title: "Product catalog",
    description:
      "Centralize product names, SKUs, categories, prices, stock levels, images, and custom attributes.",
  },
  {
    icon: Truck,
    title: "Supplier control",
    description:
      "Connect products to suppliers, supplier SKUs, cost prices, currencies, and purchasing rules.",
  },
  {
    icon: PackageCheck,
    title: "Purchase orders",
    description:
      "Create supplier orders and build toward receiving stock directly into inventory movements.",
  },
  {
    icon: DatabaseZap,
    title: "Imports and mapping",
    description:
      "Prepare CSV, spreadsheet, and integration data before it becomes messy product information.",
  },
]

const platform = [
  "Organization workspace and user controls",
  "Strict supplier and product linking",
  "Base currency and supplier currency separation",
  "API keys for connected systems",
  "Webhook-ready product and stock events",
  "Billing and subscription foundation",
]

const plans = [
  {
    name: "Free",
    price: "$0",
    description: "Explore NexStock and create your first workspace.",
    href: "/signup?plan=free",
    features: ["Manual catalog setup", "Basic stock visibility", "Organization workspace"],
  },
  {
    name: "Starter",
    price: "$19",
    description: "For small teams starting structured product operations.",
    href: "/signup?plan=starter",
    highlighted: true,
    features: ["CSV and XLSX imports", "Reusable mapping", "Inventory history"],
  },
  {
    name: "Growth",
    price: "$59",
    description: "For connected teams that need APIs and automation.",
    href: "/signup?plan=growth",
    features: ["Advanced imports", "Webhooks", "Team controls"],
  },
]

export default function Page() {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg border bg-card text-primary">
              <Boxes className="size-4" />
            </span>
            <span className="font-heading text-sm font-semibold tracking-tight">
              NexStock
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">
              Features
            </a>
            <a href="#platform" className="hover:text-foreground">
              Platform
            </a>
            <a href="#pricing" className="hover:text-foreground">
              Pricing
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">
                Start free <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="border-b">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8 lg:py-24">
          <div className="flex flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" /> Inventory, suppliers,
              and purchase operations
            </div>
            <h1 className="font-heading max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Run your product inventory from one clean operating workspace.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              NexStock helps product teams manage catalogs, suppliers,
              purchase orders, imports, currencies, and connected workflows
              without scattered spreadsheets or broken stock data.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/signup">
                  Create workspace <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#pricing">View pricing</a>
              </Button>
            </div>
            <div className="mt-8 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              <TrustItem label="Supplier cost control" />
              <TrustItem label="Base currency pricing" />
              <TrustItem label="API-ready workflow" />
            </div>
          </div>

          <Card className="self-center">
            <CardHeader>
              <CardTitle>NexStock workspace preview</CardTitle>
              <CardDescription>
                One operational view for products, suppliers, and purchasing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <PreviewRow
                icon={Boxes}
                title="Products"
                value="Catalog ready"
                detail="SKU, category, price, stock"
              />
              <PreviewRow
                icon={Truck}
                title="Suppliers"
                value="Linked costs"
                detail="Supplier SKU, currency, lead time"
              />
              <PreviewRow
                icon={PackageCheck}
                title="Purchase orders"
                value="Draft workflow"
                detail="Supplier orders and receiving foundation"
              />
              <PreviewRow
                icon={Webhook}
                title="Automation"
                value="Webhook-ready"
                detail="Product and stock events"
              />
            </CardContent>
            <CardFooter className="justify-between text-xs text-muted-foreground">
              <span>Built for implementation testing</span>
              <span>Contact admin@nexstock.co.za</span>
            </CardFooter>
          </Card>
        </div>
      </section>

      <section id="features" className="border-b py-16 lg:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionIntro
            eyebrow="Core modules"
            title="The pieces every inventory app needs, connected properly."
            description="Products, suppliers, purchase orders, currencies, imports, and automation should not behave like separate islands. NexStock is built to keep them connected."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      <section id="platform" className="border-b py-16 lg:py-20">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <SectionIntro
            eyebrow="Platform"
            title="Strict enough to protect data. Flexible enough to adapt."
            description="NexStock separates base currency selling prices from supplier cost currencies, keeps supplier links controlled, and still allows custom fields where businesses need flexibility."
          />
          <Card>
            <CardHeader>
              <CardTitle>What the workspace includes</CardTitle>
              <CardDescription>
                A clean foundation for real product operations.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {platform.map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="pricing" className="border-b py-16 lg:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionIntro
            eyebrow="Plans"
            title="Start small, then upgrade when operations need more control."
            description="Paid checkouts are handled after the NexStock review step. During implementation, users should use test payment details only."
          />
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={plan.highlighted ? "ring-2 ring-primary" : undefined}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-3">
                    <span>{plan.name}</span>
                    {plan.highlighted ? (
                      <span className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
                        Recommended
                      </span>
                    ) : null}
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-1">
                    <span className="font-heading text-4xl font-semibold tracking-tight">
                      {plan.price}
                    </span>
                    <span className="pb-1 text-sm text-muted-foreground">
                      /month
                    </span>
                  </div>
                  <div className="mt-5 space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full" variant={plan.highlighted ? "default" : "outline"}>
                    <Link href={plan.href}>
                      Choose {plan.name} <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="grid gap-6 py-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-sm font-medium text-primary">Ready to test?</p>
                <h2 className="font-heading mt-2 text-3xl font-semibold tracking-tight">
                  Create your NexStock workspace and start with clean inventory
                  operations.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                  This version is still in implementation. Let us know before
                  importing real launch product data.
                </p>
              </div>
              <Button asChild size="lg">
                <Link href="/signup">
                  Start free <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t py-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© 2026 NexStock. Product operations workspace.</p>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-foreground">
              Sign in
            </Link>
            <a href="mailto:admin@nexstock.co.za" className="hover:text-foreground">
              admin@nexstock.co.za
            </a>
          </div>
        </div>
      </footer>
    </main>
  )
}

function TrustItem({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <ShieldCheck className="size-4 text-primary" />
      <span>{label}</span>
    </div>
  )
}

function PreviewRow({
  icon: Icon,
  title,
  value,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  value: string
  detail: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="font-medium">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{detail}</p>
        </div>
      </div>
      <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
        {value}
      </span>
    </div>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <Card>
      <CardHeader>
        <span className="mb-2 flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-5" />
        </span>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  )
}

function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-sm font-medium text-primary">{eyebrow}</p>
      <h2 className="font-heading mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
        {description}
      </p>
    </div>
  )
}
