"use client"

import Link from "next/link"
import { Building2Icon, FileTextIcon, KeyRoundIcon, Settings2Icon, WebhookIcon } from "lucide-react"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const settingsLinks = [
  { title: "Templates", description: "Manage reusable PDF and email templates in one directory.", href: "/settings/templates", icon: FileTextIcon },
  { title: "Product Settings", description: "Configure product layouts and product-specific fields.", href: "/settings/products", icon: Settings2Icon },
  { title: "Organization", description: "Company profile, currency, and workspace details.", href: "/organization", icon: Building2Icon },
  { title: "API Keys", description: "Manage API keys for external systems.", href: "/api-keys", icon: KeyRoundIcon },
  { title: "Webhooks", description: "Configure outbound events for integrations.", href: "/webhooks", icon: WebhookIcon },
]

export function SettingsContent() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div>
        <p className="text-sm text-muted-foreground">Workspace configuration</p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage workspace defaults, templates, product settings, integrations, and developer settings.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {settingsLinks.map((item) => {
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href}>
              <Card className="h-full transition hover:bg-muted/40">
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-muted">
                    <Icon className="size-5 text-muted-foreground" />
                  </div>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )
        })}
      </div>

      <Card className="border-dashed bg-muted/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings2Icon className="size-4" />Settings workflow</CardTitle>
          <CardDescription>
            Templates control customer-facing documents and messages. Product Settings control product layouts and fields.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
