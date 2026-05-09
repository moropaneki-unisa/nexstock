"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Building2, Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Organization, OrganizationProfileForm, toOrganizationProfile } from "@/components/organization/types";
import { apiFetch } from "@/lib/api";

const fields: Array<{ name: keyof OrganizationProfileForm; label: string; placeholder?: string; section: "core" | "business" | "contact" | "address" }> = [
  { name: "name", label: "Workspace name", placeholder: "NexStock", section: "core" },
  { name: "slug", label: "Workspace slug", placeholder: "nexstock", section: "core" },
  { name: "skuPrefix", label: "SKU prefix", placeholder: "NEX", section: "core" },
  { name: "legalName", label: "Legal name", placeholder: "NexStock (Pty) Ltd", section: "business" },
  { name: "tradingName", label: "Trading name", placeholder: "NexStock", section: "business" },
  { name: "registrationNo", label: "Registration no.", section: "business" },
  { name: "vatNumber", label: "VAT number", section: "business" },
  { name: "industry", label: "Industry", placeholder: "Retail, ecommerce, distribution", section: "business" },
  { name: "companySize", label: "Company size", placeholder: "1-10, 11-50, 51-200", section: "business" },
  { name: "website", label: "Website", placeholder: "https://nexstock.co.za", section: "contact" },
  { name: "phone", label: "Phone", section: "contact" },
  { name: "billingEmail", label: "Billing email", placeholder: "billing@nexstock.co.za", section: "contact" },
  { name: "addressLine1", label: "Address line 1", section: "address" },
  { name: "addressLine2", label: "Address line 2", section: "address" },
  { name: "city", label: "City", section: "address" },
  { name: "province", label: "Province", section: "address" },
  { name: "postalCode", label: "Postal code", section: "address" },
  { name: "country", label: "Country", section: "address" },
];

const sectionCopy = {
  core: { title: "Workspace", description: "Primary workspace identity and product defaults." },
  business: { title: "Business details", description: "Legal and operating details for account records." },
  contact: { title: "Contact", description: "Public and billing contact information." },
  address: { title: "Address", description: "Business address used for profile and billing." },
};

const emptyForm: OrganizationProfileForm = {
  name: "",
  slug: "",
  skuPrefix: "",
  legalName: "",
  tradingName: "",
  registrationNo: "",
  vatNumber: "",
  industry: "",
  companySize: "",
  website: "",
  phone: "",
  billingEmail: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  province: "",
  postalCode: "",
  country: "",
};

export default function OrganizationEditPage() {
  const router = useRouter();
  const [form, setForm] = useState<OrganizationProfileForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const org = await apiFetch<Organization>("/api/organization");
        setForm(toOrganizationProfile(org));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load organization");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  function updateField(name: keyof OrganizationProfileForm, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function save() {
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      await apiFetch("/api/organization", {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      setNotice("Company profile updated.");
      router.refresh();
      setTimeout(() => router.push("/organization"), 450);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update organization");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <PageShell>
        <div className="border bg-card/95 p-8 text-sm text-muted-foreground">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading company profile...
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Admin"
        title="Edit company profile"
        description="Update the organization information shown on the admin profile and used by billing, onboarding, and workspace defaults."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/organization"><ArrowLeft className="h-4 w-4" />Back</Link>
            </Button>
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save changes
            </Button>
          </>
        }
      />

      {notice && <div className="border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}
      {error && <div className="border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

      <div className="border bg-card/95">
        {(["core", "business", "contact", "address"] as const).map((section) => (
          <section key={section} className="border-b last:border-b-0">
            <div className="grid gap-5 p-5 lg:grid-cols-[16rem_1fr]">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight"><Building2 className="h-4 w-4" />{sectionCopy[section].title}</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{sectionCopy[section].description}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {fields.filter((field) => field.section === section).map((field) => (
                  <label key={field.name} className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{field.label}</span>
                    <Input value={form[field.name] ?? ""} placeholder={field.placeholder} onChange={(event) => updateField(field.name, event.target.value)} />
                  </label>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
