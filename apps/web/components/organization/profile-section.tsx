"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrganizationProfileForm } from "./types";

export function OrganizationProfileSection({
  profile,
  setProfile,
}: {
  profile: OrganizationProfileForm;
  setProfile: (p: OrganizationProfileForm) => void;
}) {
  function update(key: keyof OrganizationProfileForm, value: string) {
    setProfile({ ...profile, [key]: value });
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[
        ["name", "Company name"],
        ["slug", "Workspace slug"],
        ["legalName", "Legal name"],
        ["tradingName", "Trading name"],
        ["registrationNo", "Registration number"],
        ["vatNumber", "VAT number"],
        ["industry", "Industry"],
        ["companySize", "Company size"],
        ["website", "Website"],
        ["phone", "Phone"],
        ["billingEmail", "Billing email"],
        ["skuPrefix", "SKU prefix"],
        ["addressLine1", "Address line 1"],
        ["addressLine2", "Address line 2"],
        ["city", "City"],
        ["province", "Province"],
        ["postalCode", "Postal code"],
        ["country", "Country"],
      ].map(([key, label]) => (
        <div key={key as string} className="space-y-2">
          <Label>{label}</Label>
          <Input
            value={(profile as any)[key] || ""}
            onChange={(e) => update(key as any, e.target.value)}
            className="rounded-xl"
          />
        </div>
      ))}
    </div>
  );
}
