"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircleIcon, ArrowLeftIcon, CheckCircle2Icon, Loader2Icon, SaveIcon } from "lucide-react"
import { toast } from "sonner"

import { AppSelectContent, AppSelectItem, AppSelectTrigger } from "@/components/core/app-select"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { apiFetch } from "@/lib/api"

type Supplier = {
  id: string
  supplierCode: string
  name: string
  supplierType?: string | null
  category?: string | null
  rating?: string | null
  contactName?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
  addressLine1?: string | null
  addressLine2?: string | null
  country?: string | null
  province?: string | null
  city?: string | null
  postalCode?: string | null
  currency?: string | null
  paymentTerms?: string | null
  paymentMethod?: string | null
  taxStatus?: string | null
  taxNumber?: string | null
  shippingTerms?: string | null
  incoterm?: string | null
  accountNumber?: string | null
  leadTimeDays?: number | null
  minimumOrderQty?: number | null
  lastOrderAt?: string | null
  notes?: string | null
}

type OrganizationSummary = { baseCurrency?: string | null; enabledCurrencies?: string[] | null }

type SupplierForm = {
  name: string
  supplierType: string
  category: string
  rating: string
  contactName: string
  email: string
  phone: string
  website: string
  addressLine1: string
  addressLine2: string
  country: string
  province: string
  city: string
  postalCode: string
  currency: string
  paymentTerms: string
  paymentMethod: string
  taxStatus: string
  taxNumber: string
  shippingTerms: string
  incoterm: string
  accountNumber: string
  leadTimeDays: string
  minimumOrderQty: string
  lastOrderAt: string
  notes: string
}

const DEFAULT_CURRENCY = "USD"
const supplierTypes = ["vendor", "manufacturer", "wholesaler", "distributor", "raw_material", "service_provider"]
const categories = ["General", "Equipment", "Raw materials", "Packaging", "Parts", "Electronics", "Logistics", "Services"]
const ratings = ["unrated", "preferred", "approved", "backup", "probation", "blocked"]
const paymentTerms = ["COD", "Prepaid", "Net 7", "Net 15", "Net 30", "Net 60", "Deposit + balance"]
const paymentMethods = ["Bank transfer", "Card", "Cash", "EFT", "PayPal", "Wise", "Other"]
const taxStatuses = ["unknown", "registered", "not_registered", "exempt"]
const shippingTerms = ["Pickup", "Supplier delivery", "Courier", "Freight", "Dropship", "Customer collection"]
const incoterms = ["none", "EXW", "FCA", "CPT", "CIP", "DAP", "DPU", "DDP", "FOB", "CFR", "CIF"]

const emptyForm: SupplierForm = {
  name: "",
  supplierType: "vendor",
  category: "General",
  rating: "unrated",
  contactName: "",
  email: "",
  phone: "",
  website: "",
  addressLine1: "",
  addressLine2: "",
  country: "",
  province: "",
  city: "",
  postalCode: "",
  currency: DEFAULT_CURRENCY,
  paymentTerms: "Net 30",
  paymentMethod: "Bank transfer",
  taxStatus: "unknown",
  taxNumber: "",
  shippingTerms: "Supplier delivery",
  incoterm: "none",
  accountNumber: "",
  leadTimeDays: "",
  minimumOrderQty: "",
  lastOrderAt: "",
  notes: "",
}

function normalizeCurrency(value?: string | null, fallback = DEFAULT_CURRENCY) {
  const next = String(value || fallback).trim().toUpperCase()
  return /^[A-Z]{3}$/.test(next) ? next : fallback
}

function clean(value: string) {
  const next = value.trim()
  return next || null
}

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

function toDateInput(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 10)
}

function formPath(supplierId?: string) {
  return supplierId ? `/suppliers/${supplierId}` : "/suppliers"
}

export function SupplierFormContent({ supplierId }: { supplierId?: string }) {
  const router = useRouter()
  const [form, setForm] = React.useState<SupplierForm>(emptyForm)
  const [supplier, setSupplier] = React.useState<Supplier | null>(null)
  const [organization, setOrganization] = React.useState<OrganizationSummary | null>(null)
  const [loading, setLoading] = React.useState(Boolean(supplierId))
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const enabledCurrencies = React.useMemo(() => {
    const base = normalizeCurrency(organization?.baseCurrency || DEFAULT_CURRENCY)
    return Array.from(new Set([base, ...(organization?.enabledCurrencies || [])].map((code) => normalizeCurrency(code))))
  }, [organization])

  React.useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [org, supplierResult] = await Promise.all([
          apiFetch<OrganizationSummary>("/api/organization").catch(() => null),
          supplierId ? apiFetch<Supplier>(`/api/suppliers/${supplierId}`) : Promise.resolve(null),
        ])
        if (!active) return
        setOrganization(org)
        if (supplierResult) {
          setSupplier(supplierResult)
          setForm({
            name: supplierResult.name || "",
            supplierType: supplierResult.supplierType || "vendor",
            category: supplierResult.category || "General",
            rating: supplierResult.rating || "unrated",
            contactName: supplierResult.contactName || "",
            email: supplierResult.email || "",
            phone: supplierResult.phone || "",
            website: supplierResult.website || "",
            addressLine1: supplierResult.addressLine1 || "",
            addressLine2: supplierResult.addressLine2 || "",
            country: supplierResult.country || "",
            province: supplierResult.province || "",
            city: supplierResult.city || "",
            postalCode: supplierResult.postalCode || "",
            currency: normalizeCurrency(supplierResult.currency, org?.baseCurrency || DEFAULT_CURRENCY),
            paymentTerms: supplierResult.paymentTerms || "Net 30",
            paymentMethod: supplierResult.paymentMethod || "Bank transfer",
            taxStatus: supplierResult.taxStatus || "unknown",
            taxNumber: supplierResult.taxNumber || "",
            shippingTerms: supplierResult.shippingTerms || "Supplier delivery",
            incoterm: supplierResult.incoterm || "none",
            accountNumber: supplierResult.accountNumber || "",
            leadTimeDays: supplierResult.leadTimeDays == null ? "" : String(supplierResult.leadTimeDays),
            minimumOrderQty: supplierResult.minimumOrderQty == null ? "" : String(supplierResult.minimumOrderQty),
            lastOrderAt: toDateInput(supplierResult.lastOrderAt),
            notes: supplierResult.notes || "",
          })
        } else {
          setForm((current) => ({ ...current, currency: normalizeCurrency(org?.baseCurrency || DEFAULT_CURRENCY) }))
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Supplier could not load")
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => { active = false }
  }, [supplierId])

  function updateForm(key: keyof SupplierForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function saveSupplier(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    if (!form.name.trim()) {
      const message = "Supplier name is required"
      setError(message)
      toast.error(message)
      return
    }

    setSaving(true)
    setError(null)
    const payload = {
      name: form.name.trim(),
      supplierType: clean(form.supplierType),
      category: clean(form.category),
      rating: clean(form.rating),
      contactName: clean(form.contactName),
      email: clean(form.email),
      phone: clean(form.phone),
      website: clean(form.website),
      addressLine1: clean(form.addressLine1),
      addressLine2: clean(form.addressLine2),
      country: clean(form.country),
      province: clean(form.province),
      city: clean(form.city),
      postalCode: clean(form.postalCode),
      currency: normalizeCurrency(form.currency, enabledCurrencies[0] || DEFAULT_CURRENCY),
      paymentTerms: clean(form.paymentTerms),
      paymentMethod: clean(form.paymentMethod),
      taxStatus: clean(form.taxStatus),
      taxNumber: clean(form.taxNumber),
      shippingTerms: clean(form.shippingTerms),
      incoterm: form.incoterm === "none" ? null : clean(form.incoterm),
      accountNumber: clean(form.accountNumber),
      leadTimeDays: form.leadTimeDays === "" ? undefined : Number(form.leadTimeDays),
      minimumOrderQty: form.minimumOrderQty === "" ? undefined : Number(form.minimumOrderQty),
      lastOrderAt: form.lastOrderAt ? new Date(form.lastOrderAt).toISOString() : undefined,
      notes: clean(form.notes),
    }

    try {
      const result = supplierId
        ? await apiFetch<Supplier>(`/api/suppliers/${supplierId}`, { method: "PATCH", body: JSON.stringify(payload) })
        : await apiFetch<Supplier>("/api/suppliers", { method: "POST", body: JSON.stringify(payload) })
      toast.success(supplierId ? "Supplier updated" : "Supplier created", { description: result.name })
      router.push(`/suppliers/${result.id}`)
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Supplier could not be saved"
      setError(message)
      toast.error("Could not save supplier", { description: message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Skeleton className="h-12 w-72" />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="grid gap-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={saveSupplier} className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2"><Link href="/suppliers"><ArrowLeftIcon className="size-4" />Suppliers</Link></Button>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{supplierId ? "Edit supplier" : "New supplier"}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {supplier ? `${supplier.supplierCode} · ${supplier.name}` : "Create a controlled supplier record for purchasing and product sourcing. Only supplier name is required."}
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <div className="flex gap-2"><AlertCircleIcon className="mt-0.5 size-4 shrink-0" />{error}</div>
        </div>
      ) : null}

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid min-w-0 gap-4">
          <FormSection title="Classification" description="Core identity and reporting fields. Supplier name is required; the rest can use defaults or stay blank.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Supplier name" required><Input value={form.name} onChange={(event) => updateForm("name", event.target.value)} placeholder="ABC Equipment Supplies" /></Field>
              <SelectField label="Supplier type" value={form.supplierType} onChange={(value) => updateForm("supplierType", value)} options={supplierTypes.map((value) => ({ value, label: titleCase(value) }))} />
              <SelectField label="Category" value={form.category} onChange={(value) => updateForm("category", value)} options={categories.map((value) => ({ value, label: value }))} />
              <SelectField label="Rating" value={form.rating} onChange={(value) => updateForm("rating", value)} options={ratings.map((value) => ({ value, label: titleCase(value) }))} />
            </div>
          </FormSection>

          <FormSection title="Contact and address" description="Optional communication and location details.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Contact person"><Input value={form.contactName} onChange={(event) => updateForm("contactName", event.target.value)} /></Field>
              <Field label="Email"><Input type="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} /></Field>
              <Field label="Phone"><Input value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} /></Field>
              <Field label="Website"><Input value={form.website} onChange={(event) => updateForm("website", event.target.value)} /></Field>
              <Field label="Country"><Input value={form.country} onChange={(event) => updateForm("country", event.target.value)} /></Field>
              <Field label="Province"><Input value={form.province} onChange={(event) => updateForm("province", event.target.value)} /></Field>
              <Field label="City"><Input value={form.city} onChange={(event) => updateForm("city", event.target.value)} /></Field>
              <Field label="Postal code"><Input value={form.postalCode} onChange={(event) => updateForm("postalCode", event.target.value)} /></Field>
              <Field label="Address line 1"><Input value={form.addressLine1} onChange={(event) => updateForm("addressLine1", event.target.value)} /></Field>
              <Field label="Address line 2"><Input value={form.addressLine2} onChange={(event) => updateForm("addressLine2", event.target.value)} /></Field>
            </div>
          </FormSection>

          <FormSection title="Purchasing" description="Optional currency, payment, tax, shipping, and order controls.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SelectField label="Currency" value={form.currency} onChange={(value) => updateForm("currency", value)} options={enabledCurrencies.map((value) => ({ value, label: value }))} />
              <SelectField label="Payment terms" value={form.paymentTerms} onChange={(value) => updateForm("paymentTerms", value)} options={paymentTerms.map((value) => ({ value, label: value }))} />
              <SelectField label="Payment method" value={form.paymentMethod} onChange={(value) => updateForm("paymentMethod", value)} options={paymentMethods.map((value) => ({ value, label: value }))} />
              <SelectField label="Tax status" value={form.taxStatus} onChange={(value) => updateForm("taxStatus", value)} options={taxStatuses.map((value) => ({ value, label: titleCase(value) }))} />
              <Field label="Tax number"><Input value={form.taxNumber} onChange={(event) => updateForm("taxNumber", event.target.value)} /></Field>
              <SelectField label="Shipping terms" value={form.shippingTerms} onChange={(value) => updateForm("shippingTerms", value)} options={shippingTerms.map((value) => ({ value, label: value }))} />
              <SelectField label="Incoterm" value={form.incoterm} onChange={(value) => updateForm("incoterm", value)} options={incoterms.map((value) => ({ value, label: value === "none" ? "Not applicable" : value }))} />
              <Field label="Account number"><Input value={form.accountNumber} onChange={(event) => updateForm("accountNumber", event.target.value)} /></Field>
              <Field label="Lead time days"><Input type="number" min="0" value={form.leadTimeDays} onChange={(event) => updateForm("leadTimeDays", event.target.value)} /></Field>
              <Field label="Minimum order qty"><Input type="number" min="0" value={form.minimumOrderQty} onChange={(event) => updateForm("minimumOrderQty", event.target.value)} /></Field>
              <Field label="Last order date"><Input type="date" value={form.lastOrderAt} onChange={(event) => updateForm("lastOrderAt", event.target.value)} /></Field>
            </div>
          </FormSection>

          <FormSection title="Notes" description="Optional contract rules, delivery instructions, supplier risks, or internal reminders.">
            <Textarea value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} className="min-h-28" />
          </FormSection>

          <div className="sticky bottom-0 z-10 -mx-4 border-t bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:-mx-6 md:px-6">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => router.push(formPath(supplierId))} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}{saving ? "Saving..." : supplierId ? "Save changes" : "Create supplier"}</Button>
            </div>
          </div>
        </div>

        <Card className="h-fit xl:sticky xl:top-[calc(var(--header-height)+1rem)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckCircle2Icon className="size-4" />Review</CardTitle>
            <CardDescription>Supplier code is generated by the API and remains locked after creation.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <ReviewLine label="Name" value={form.name || "Not set"} />
            <ReviewLine label="Type" value={titleCase(form.supplierType)} />
            <ReviewLine label="Currency" value={form.currency} />
            <ReviewLine label="Payment" value={form.paymentTerms} />
            {supplier ? <ReviewLine label="Code" value={supplier.supplierCode} mono /> : null}
          </CardContent>
        </Card>
      </div>
    </form>
  )
}

function FormSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent>{children}</CardContent></Card>
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="grid min-w-0 gap-2"><Label>{label}{required ? <span className="text-destructive"> *</span> : null}</Label>{children}</label>
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return <Field label={label}><Select value={value} onValueChange={onChange}><AppSelectTrigger><SelectValue /></AppSelectTrigger><AppSelectContent>{options.map((option) => <AppSelectItem key={option.value || option.label} value={option.value}>{option.label}</AppSelectItem>)}</AppSelectContent></Select></Field>
}

function ReviewLine({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return <div className="flex items-center justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0"><span className="text-muted-foreground">{label}</span><span className={mono ? "font-mono text-xs font-medium" : "font-medium"}>{value}</span></div>
}
