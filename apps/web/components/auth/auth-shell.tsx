import Link from "next/link"
import { Boxes, CheckCircle2 } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string
  title: string
  description: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <main className="grid min-h-svh bg-background lg:grid-cols-[0.95fr_1.05fr]">
      <section className="hidden border-r bg-muted/30 p-8 lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg border bg-card text-primary">
            <Boxes className="size-4" />
          </span>
          <span className="font-heading text-sm font-semibold tracking-tight">
            NexStock
          </span>
        </Link>

        <div className="max-w-xl">
          <p className="text-sm font-medium text-primary">{eyebrow}</p>
          <h1 className="font-heading mt-3 text-4xl font-semibold tracking-tight xl:text-5xl">
            {title}
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            {description}
          </p>
          <div className="mt-8 grid gap-3 text-sm text-muted-foreground">
            <TrustLine label="Products, suppliers, and purchase orders in one workspace" />
            <TrustLine label="Strict currency and supplier linking foundations" />
            <TrustLine label="Clean shadcn interface for the rebuilt app" />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          © 2026 NexStock · admin@nexstock.co.za
        </p>
      </section>

      <section className="flex min-h-svh items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-lg border bg-card text-primary">
              <Boxes className="size-4" />
            </span>
            <span className="font-heading text-sm font-semibold tracking-tight">
              NexStock
            </span>
          </Link>
          <Card>
            <CardHeader>
              <CardTitle>{eyebrow}</CardTitle>
              <CardDescription>{title}</CardDescription>
            </CardHeader>
            <CardContent>{children}</CardContent>
          </Card>
          {footer ? (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              {footer}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  )
}

function TrustLine({ label }: { label: string }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
      <span>{label}</span>
    </div>
  )
}
