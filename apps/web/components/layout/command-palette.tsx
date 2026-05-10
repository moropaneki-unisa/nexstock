"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Boxes,
  Building2,
  CreditCard,
  DatabaseZap,
  KeyRound,
  PackagePlus,
  PlugZap,
  Search,
  Settings2,
  UploadCloud,
  Webhook,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

const actions = [
  { label: "Dashboard", href: "/dashboard", icon: BarChart3, group: "Navigation", shortcut: "D" },
  { label: "Products", href: "/products", icon: Boxes, group: "Navigation", shortcut: "P" },
  { label: "Create product", href: "/products/new", icon: PackagePlus, group: "Actions", shortcut: "N" },
  { label: "Product attributes", href: "/products/fields", icon: DatabaseZap, group: "Actions" },
  { label: "Import products", href: "/imports", icon: UploadCloud, group: "Actions" },
  { label: "Organization", href: "/organization", icon: Building2, group: "Workspace" },
  { label: "Finish organization setup", href: "/organization/edit?setup=1", icon: Settings2, group: "Workspace" },
  { label: "Billing", href: "/billing", icon: CreditCard, group: "Workspace" },
  { label: "Integrations", href: "/integrations", icon: PlugZap, group: "Developer" },
  { label: "API keys", href: "/api-keys", icon: KeyRound, group: "Developer" },
  { label: "Webhooks", href: "/webhooks", icon: Webhook, group: "Developer" },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function runCommand(href: string) {
    setOpen(false);
    router.push(href);
  }

  const groups = Array.from(new Set(actions.map((action) => action.group)));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-9 min-w-[14rem] items-center justify-between rounded-xl border bg-background/80 px-3 text-sm text-muted-foreground shadow-sm transition hover:bg-background hover:text-foreground lg:flex"
      >
        <span className="flex items-center gap-2"><Search className="h-4 w-4" />Search or jump to...</span>
        <kbd className="rounded-md border bg-muted px-1.5 py-0.5 text-[0.68rem] font-medium text-muted-foreground">Ctrl K</kbd>
      </button>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-xl border bg-background/80 text-muted-foreground shadow-sm transition hover:bg-background hover:text-foreground lg:hidden"
        aria-label="Open command palette"
      >
        <Search className="h-4 w-4" />
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search products, actions, settings..." />
        <CommandList>
          <CommandEmpty>No command found.</CommandEmpty>
          {groups.map((group, index) => (
            <div key={group}>
              {index > 0 && <CommandSeparator />}
              <CommandGroup heading={group}>
                {actions.filter((action) => action.group === group).map((action) => {
                  const Icon = action.icon;
                  return (
                    <CommandItem key={action.href} value={`${action.label} ${action.href}`} onSelect={() => runCommand(action.href)}>
                      <Icon className="h-4 w-4" />
                      <span>{action.label}</span>
                      {action.shortcut && <CommandShortcut>{action.shortcut}</CommandShortcut>}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </div>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
