"use client";

import Link from "next/link";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowRight, CheckCircle2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PricingPlan = {
  name: string;
  price: string;
  cadence: string;
  description: string;
  cta: string;
  href: string;
  features: string[];
  highlighted?: boolean;
  disabled?: boolean;
};

export function PricingSection({ plans }: { plans: PricingPlan[] }) {
  return (
    <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan) => (
        <PricingCard key={plan.name} {...plan} />
      ))}
    </div>
  );
}

function PricingCard({ name, price, cadence, description, cta, href, features, highlighted, disabled }: PricingPlan) {
  return (
    <section
      className={cn(
        "flex min-h-[430px] flex-col rounded-2xl border bg-card/95 p-5 shadow-sm",
        highlighted && "ring-2 ring-primary",
        disabled && "opacity-80",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-muted-foreground">{name}</p>
        {highlighted && <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">Popular</span>}
        {disabled && <span className="rounded-full border bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">Later</span>}
      </div>

      <div className="mt-5 flex items-end gap-2">
        <span className="text-5xl font-black tracking-[-0.06em]">{price}</span>
        <span className="pb-2 text-sm text-muted-foreground">{cadence}</span>
      </div>

      <p className="mt-4 text-sm leading-6 text-muted-foreground">{description}</p>

      <DialogPrimitive.Root>
        <DialogPrimitive.Trigger asChild>
          <button type="button" className="mt-3 w-fit text-sm font-semibold text-primary underline-offset-4 hover:underline">
            Read more
          </button>
        </DialogPrimitive.Trigger>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border bg-card p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out sm:rounded-2xl">
            <div className="space-y-2">
              <DialogPrimitive.Title className="text-2xl font-bold tracking-tight">{name} plan</DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm leading-6 text-muted-foreground">
                {description}
              </DialogPrimitive.Description>
            </div>

            <div className="rounded-xl border bg-background/70 p-4">
              <p className="text-sm font-semibold">
                {price} <span className="font-normal text-muted-foreground">{cadence}</span>
              </p>
              <div className="mt-4 grid gap-3">
                {features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3 text-sm leading-6">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {disabled ? (
              <div className="rounded-xl border bg-muted p-4 text-sm text-muted-foreground">
                This plan is planned for a later release. Growth is the highest active checkout plan right now.
              </div>
            ) : (
              <Button asChild className="rounded-full">
                <Link href={href}>
                  {cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}

            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground opacity-80 transition hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <div className="mt-6 grid gap-3">
        {features.map((feature) => (
          <ListItem key={feature} label={feature} />
        ))}
      </div>

      {disabled ? (
        <span className="mt-auto inline-flex items-center justify-center gap-2 rounded-full border bg-muted px-5 py-3 text-sm font-bold text-muted-foreground">
          {cta}
        </span>
      ) : (
        <Link href={href} className="mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90">
          {cta}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </section>
  );
}

function ListItem({ label }: { label: string }) {
  return (
    <div className="flex min-h-[74px] items-center gap-3 p-4 text-sm">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <CheckCircle2 className="h-4 w-4" />
      </span>
      <span className="font-medium leading-5">{label}</span>
    </div>
  );
}
