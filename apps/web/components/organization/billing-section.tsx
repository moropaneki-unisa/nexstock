"use client";

import { CreditCard, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OrgPlan } from "./types";

export function OrganizationBillingSection({
  plans,
  loadingPlan,
  onUpgrade,
}: {
  plans: OrgPlan[];
  loadingPlan: string | null;
  onUpgrade: (plan: string) => void;
}) {
  return (
    <div className="space-y-3">
      {plans.map((plan) => (
        <div
          key={plan.name}
          className={`rounded-xl border p-4 ${
            plan.current ? "border-primary/30 bg-primary/5" : "bg-background/70"
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold capitalize">{plan.name}</h3>
            {plan.current && <Badge className="rounded-full">Current</Badge>}
          </div>

          <p className="mt-2 text-2xl font-semibold">
            ${plan.price}
            <span className="text-sm font-normal text-muted-foreground">/mo</span>
          </p>

          <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>

          {!plan.current && plan.name !== "free" && (
            <Button
              onClick={() => onUpgrade(plan.name)}
              disabled={loadingPlan === plan.name}
              className="mt-3 w-full rounded-xl"
            >
              {loadingPlan === plan.name ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              Upgrade
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
