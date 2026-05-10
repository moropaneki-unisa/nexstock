"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Building2, CircleDollarSign, Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { CurrencyRate, Organization, OrganizationProfileForm, toOrganizationProfile } from "@/components/organization/types";
import { apiFetch } from "@/lib/api";
import { currencyOptions, getCurrencyLabel, normalizeCurrencyList } from "@/lib/currencies";

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
  baseCurrency: "ZAR",
  enabledCurrencies: ["ZAR"],
  exchangeRates: [],
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
  const [setupMode, setSetupMode] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSetupMode(params.get("setup") === "1");
  }, []);

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

  const enabledCurrencies = useMemo(() => normalizeCurrencyList(form.baseCurrency, form.enabledCurrencies), [form.baseCurrency, form.enabledCurrencies]);
  const additionalCurrencies = enabledCurrencies.filter((currency) => currency !== form.baseCurrency);

  function updateField(name: keyof OrganizationProfileForm, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function updateBaseCurrency(value: string) {
    setForm((current) => {
      const enabled = normalizeCurrencyList(value, current.enabledCurrencies);
      return { ...current, baseCurrency: value, enabledCurrencies: enabled, exchangeRates: normalizeRates(enabled, value, current.exchangeRates) };
    });
  }

  function toggleCurrency(code: string) {
    setForm((current) => {
      if (code === current.baseCurrency) return current;
      const enabled = current.enabledCurrencies.includes(code)
        ? current.enabledCurrencies.filter((currency) => currency !== code)
        : [...current.enabledCurrencies, code];
      const normalized = normalizeCurrencyList(current.baseCurrency, enabled);
      return { ...current, enabledCurrencies: normalized, exchangeRates: normalizeRates(normalized, current.baseCurrency, current.exchangeRates) };
    });
  }

  function updateRate(code: string, value: string) {
    const rate = Number(value || 0);
    setForm((current) => ({
      ...current,
      exchangeRates: normalizeRates(enabledCurrencies, current.baseCurrency, current.exchangeRates).map((item) => item.code === code ? { ...item, rateToBase: rate } : item),
    }));
  }

  async function save() {
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      const normalizedCurrencies = normalizeCurrencyList(form.baseCurrency, form.enabledCurrencies);
      await apiFetch("/api/organization", {
        method: "PATCH",
        body: JSON.stringify({
          ...form,
          enabledCurrencies: normalizedCurrencies,
          exchangeRates: normalizeRates(normalizedCurrencies, form.baseCurrency, form.exchangeRates),
          onboardingComplete: true,
        }),
      });
      setNotice(setupMode ? "Organization setup complete. Redirecting to dashboard..." : "Company profile updated.");
      router.refresh();
      setTimeout(() => router.push(setupMode ? "/dashboard" : "/organization"), 450);
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
        eyebrow={setupMode ? "Setup" : "Admin"}
        title={setupMode ? "Finish organization setup" : "Edit company profile"}
        description={setupMode ? "Add the company information NexStock needs before opening your dashboard. You can update these details later from Organization settings." : "Update the organization information shown on the admin profile and used by billing, onboarding, and workspace defaults."}
        actions={
          <>
            {!setupMode && (
              <Button asChild variant="outline">
                <Link href="/organization"><ArrowLeft className="h-4 w-4" />Back</Link>
              </Button>
            )}
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {setupMode ? "Finish setup" : "Save changes"}
            </Button>
          </>
        }
      />

      {setupMode && <div className="border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">Payment successful. Complete your organization profile, then you will be taken to the dashboard.</div>}
      {notice && <div className="border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}
      {error && <div className="border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

      <div className="border bg-card/95">
        <section className="border-b">
          <div className="grid gap-5 p-5 lg:grid-cols-[16rem_1fr]">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight"><CircleDollarSign className="h-4 w-4" />Currency settings</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Set the selling/reporting currency and additional buying currencies for vendors and international costs.</p>
            </div>
            <div className="space-y-5">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Base currency</span>
                <select value={form.baseCurrency} onChange={(event) => updateBaseCurrency(event.target.value)} className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25">
                  {currencyOptions.map((currency) => <option key={currency.code} value={currency.code}>{currency.code} · {currency.name}</option>)}
                </select>
                <p className="text-xs text-muted-foreground">Used for selling prices, dashboard totals, reporting, and converted inventory value.</p>
              </label>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Enabled currencies</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {currencyOptions.map((currency) => {
                    const checked = enabledCurrencies.includes(currency.code);
                    const locked = currency.code === form.baseCurrency;
                    return (
                      <label key={currency.code} className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border bg-background px-3 py-2 text-sm transition hover:bg-muted/40 ${checked ? "border-primary ring-1 ring-primary" : ""}`}>
                        <span className="min-w-0"><span className="block truncate font-medium">{currency.code}</span><span className="block truncate text-xs text-muted-foreground">{currency.name}</span></span>
                        <input type="checkbox" checked={checked} disabled={locked} onChange={() => toggleCurrency(currency.code)} className="h-4 w-4 rounded border-muted-foreground" />
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="border bg-muted/15">
                <div className="border-b p-4">
                  <p className="text-sm font-semibold">Manual exchange rates to {form.baseCurrency}</p>
                  <p className="mt-1 text-xs text-muted-foreground">For MVP, rates are manual. Example: if 1 USD equals 18.50 ZAR, enter 18.50 for USD.</p>
                </div>
                {additionalCurrencies.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">Select additional currencies to add exchange rates.</div>
                ) : (
                  <div className="divide-y">
                    {additionalCurrencies.map((currency) => {
                      const rate = normalizeRates(enabledCurrencies, form.baseCurrency, form.exchangeRates).find((item) => item.code === currency)?.rateToBase ?? 1;
                      return (
                        <label key={currency} className="grid gap-3 p-4 md:grid-cols-[1fr_12rem] md:items-center">
                          <span className="text-sm"><span className="font-medium">1 {currency}</span><span className="text-muted-foreground"> to {form.baseCurrency}</span></span>
                          <Input type="number" min={0} step="0.0001" value={rate} onChange={(event) => updateRate(currency, event.target.value)} className="rounded-xl" />
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

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
                    <Input value={String(form[field.name] ?? "")} placeholder={field.placeholder} onChange={(event) => updateField(field.name, event.target.value)} />
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

function normalizeRates(enabledCurrencies: string[], baseCurrency: string, rates: CurrencyRate[]) {
  const rateMap = new Map(rates.map((rate) => [rate.code, Number(rate.rateToBase || 1)]));
  return normalizeCurrencyList(baseCurrency, enabledCurrencies)
    .filter((currency) => currency !== baseCurrency)
    .map((currency) => ({ code: currency, rateToBase: rateMap.get(currency) ?? 1 }));
}
