"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, Building2, Clock3, Loader2, Mail, Pencil, Phone, Plus, Save, Search, SlidersHorizontal, Trash2, Truck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

type SupplierStatus = "active" | "archived";
type CustomFieldRow = { key: string; value: string };

type Supplier = {
  id: string;
  name: string;
  supplierType?: string | null;
  category?: string | null;
  rating?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  country?: string | null;
  province?: string | null;
  city?: string | null;
  postalCode?: string | null;
  currency: string;
  paymentTerms?: string | null;
  paymentMethod?: string | null;
  taxStatus?: string | null;
  taxNumber?: string | null;
  shippingTerms?: string | null;
  incoterm?: string | null;
  accountNumber?: string | null;
  leadTimeDays?: number | null;
  minimumOrderQty?: number | null;
  lastOrderAt?: string | null;
  customFields?: Record<string, unknown> | null;
  notes?: string | null;
  status: SupplierStatus;
  createdAt: string;
  updatedAt: string;
  _count?: { products: number };
};

const supplierTypes = [
  { value: "vendor", label: "Vendor / Reseller" },
  { value: "manufacturer", label: "Manufacturer" },
  { value: "wholesaler", label: "Wholesaler" },
  { value: "distributor", label: "Distributor" },
  { value: "raw_material", label: "Raw material supplier" },
  { value: "dropshipper", label: "Dropshipper" },
  { value: "service_provider", label: "Service provider" },
];

const categories = ["General", "Equipment", "Raw materials", "Packaging", "Parts", "Electronics", "Clothing", "Furniture", "Logistics", "Services"];
const ratings = ["unrated", "preferred", "approved", "backup", "probation", "blocked"];
const paymentTerms = ["COD", "Prepaid", "Net 7", "Net 15", "Net 30", "Net 60", "Deposit + balance", "Consignment"];
const paymentMethods = ["Bank transfer", "Card", "Cash", "EFT", "PayPal", "Wise", "Letter of credit", "Other"];
const taxStatuses = ["unknown", "registered", "not_registered", "exempt"];
const shippingTerms = ["Pickup", "Supplier delivery", "Courier", "Freight", "Dropship", "Customer collection"];
const incoterms = ["", "EXW", "FCA", "CPT", "CIP", "DAP", "DPU", "DDP", "FOB", "CFR", "CIF"];

const emptyForm = {
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
  currency: "USD",
  paymentTerms: "Net 30",
  paymentMethod: "Bank transfer",
  taxStatus: "unknown",
  taxNumber: "",
  shippingTerms: "Supplier delivery",
  incoterm: "",
  accountNumber: "",
  leadTimeDays: "",
  minimumOrderQty: "",
  lastOrderAt: "",
  notes: "",
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SupplierStatus | "all">("active");
  const [typeFilter, setTypeFilter] = useState("all");
  const [form, setForm] = useState(emptyForm);
  const [customFields, setCustomFields] = useState<CustomFieldRow[]>([]);

  async function loadSuppliers() {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<Supplier[]>("/api/suppliers");
      setSuppliers(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSuppliers();
  }, []);

  const filteredSuppliers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return suppliers.filter((supplier) => {
      const matchesStatus = statusFilter === "all" || supplier.status === statusFilter;
      const matchesType = typeFilter === "all" || supplier.supplierType === typeFilter;
      const text = [supplier.name, supplier.supplierType, supplier.category, supplier.rating, supplier.contactName, supplier.email, supplier.phone, supplier.country, supplier.city, supplier.currency].filter(Boolean).join(" ").toLowerCase();
      return matchesStatus && matchesType && (!term || text.includes(term));
    });
  }, [search, statusFilter, suppliers, typeFilter]);

  const stats = useMemo(() => ({
    total: suppliers.length,
    active: suppliers.filter((supplier) => supplier.status === "active").length,
    preferred: suppliers.filter((supplier) => supplier.rating === "preferred").length,
    products: suppliers.reduce((sum, supplier) => sum + (supplier._count?.products ?? 0), 0),
  }), [suppliers]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setCustomFields([]);
    setOpen(true);
    setError(null);
    setSuccess(null);
  }

  function openEdit(supplier: Supplier) {
    setEditing(supplier);
    setForm({
      name: supplier.name ?? "",
      supplierType: supplier.supplierType ?? "vendor",
      category: supplier.category ?? "General",
      rating: supplier.rating ?? "unrated",
      contactName: supplier.contactName ?? "",
      email: supplier.email ?? "",
      phone: supplier.phone ?? "",
      website: supplier.website ?? "",
      addressLine1: supplier.addressLine1 ?? "",
      addressLine2: supplier.addressLine2 ?? "",
      country: supplier.country ?? "",
      province: supplier.province ?? "",
      city: supplier.city ?? "",
      postalCode: supplier.postalCode ?? "",
      currency: supplier.currency ?? "USD",
      paymentTerms: supplier.paymentTerms ?? "Net 30",
      paymentMethod: supplier.paymentMethod ?? "Bank transfer",
      taxStatus: supplier.taxStatus ?? "unknown",
      taxNumber: supplier.taxNumber ?? "",
      shippingTerms: supplier.shippingTerms ?? "Supplier delivery",
      incoterm: supplier.incoterm ?? "",
      accountNumber: supplier.accountNumber ?? "",
      leadTimeDays: supplier.leadTimeDays == null ? "" : String(supplier.leadTimeDays),
      minimumOrderQty: supplier.minimumOrderQty == null ? "" : String(supplier.minimumOrderQty),
      lastOrderAt: toDateInput(supplier.lastOrderAt),
      notes: supplier.notes ?? "",
    });
    setCustomFields(objectToRows(supplier.customFields));
    setOpen(true);
    setError(null);
    setSuccess(null);
  }

  function addCustomField() {
    setCustomFields((current) => [...current, { key: "", value: "" }]);
  }

  function updateCustomField(index: number, patch: Partial<CustomFieldRow>) {
    setCustomFields((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  }

  function removeCustomField(index: number) {
    setCustomFields((current) => current.filter((_, rowIndex) => rowIndex !== index));
  }

  async function saveSupplier() {
    if (!form.name.trim()) {
      setError("Supplier name is required");
      return;
    }
    if (!/^[A-Za-z]{3}$/.test(form.currency.trim())) {
      setError("Currency must be a 3-letter code like USD, ZAR, EUR, or CNY");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    const payload = {
      name: form.name.trim(),
      supplierType: clean(form.supplierType) ?? "vendor",
      category: clean(form.category),
      rating: clean(form.rating) ?? "unrated",
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
      currency: form.currency.trim().toUpperCase(),
      paymentTerms: clean(form.paymentTerms),
      paymentMethod: clean(form.paymentMethod),
      taxStatus: clean(form.taxStatus) ?? "unknown",
      taxNumber: clean(form.taxNumber),
      shippingTerms: clean(form.shippingTerms),
      incoterm: clean(form.incoterm),
      accountNumber: clean(form.accountNumber),
      leadTimeDays: form.leadTimeDays === "" ? undefined : Number(form.leadTimeDays),
      minimumOrderQty: form.minimumOrderQty === "" ? undefined : Number(form.minimumOrderQty),
      lastOrderAt: form.lastOrderAt ? new Date(form.lastOrderAt).toISOString() : undefined,
      customFields: rowsToObject(customFields),
      notes: clean(form.notes),
    };

    try {
      if (editing) {
        await apiFetch(`/api/suppliers/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        setSuccess("Supplier updated");
      } else {
        await apiFetch("/api/suppliers", { method: "POST", body: JSON.stringify(payload) });
        setSuccess("Supplier created");
      }
      setOpen(false);
      setEditing(null);
      await loadSuppliers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save supplier");
    } finally {
      setSaving(false);
    }
  }

  async function archiveSupplier(supplier: Supplier) {
    if (!window.confirm(`Archive supplier "${supplier.name}"?`)) return;
    setError(null);
    setSuccess(null);
    try {
      await apiFetch(`/api/suppliers/${supplier.id}`, { method: "DELETE" });
      setSuccess("Supplier archived");
      await loadSuppliers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive supplier");
    }
  }

  return (
    <PageShell className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Supply operations"
        title="Suppliers"
        description="Manage vendors, manufacturers, raw-material suppliers, purchasing terms, tax details, shipping rules, and supplier custom fields."
        actions={<Button type="button" onClick={openCreate} className="rounded-xl shadow-sm"><Plus className="h-4 w-4" />New supplier</Button>}
      />

      {error && <div className="border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}
      {success && <div className="border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</div>}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Truck} label="Total suppliers" value={stats.total} />
        <Metric icon={Building2} label="Active" value={stats.active} />
        <Metric icon={SlidersHorizontal} label="Preferred" value={stats.preferred} />
        <Metric icon={Clock3} label="Product links" value={stats.products} />
      </section>

      <section className="border bg-card/95">
        <div className="flex flex-col gap-4 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Supplier directory</h2>
            <p className="mt-1 text-sm text-muted-foreground">Track supplier operational rules before we add purchase orders, warehouse receiving, and production workflows.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative min-w-[16rem]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search suppliers..." className="pl-9" />
            </label>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="h-10 border bg-background px-3 text-sm">
              <option value="all">All types</option>
              {supplierTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as SupplierStatus | "all")} className="h-10 border bg-background px-3 text-sm">
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="all">All</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 p-8 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading suppliers...</div>
        ) : filteredSuppliers.length ? (
          <div className="grid gap-4 p-4 xl:grid-cols-2">
            {filteredSuppliers.map((supplier) => <SupplierCard key={supplier.id} supplier={supplier} onEdit={() => openEdit(supplier)} onArchive={() => void archiveSupplier(supplier)} />)}
          </div>
        ) : (
          <div className="p-10 text-center text-sm text-muted-foreground">No suppliers found. Add your first supplier to start building purchasing workflows.</div>
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Update supplier" : "Create supplier"}</DialogTitle>
            <DialogDescription>Add supplier details used for product costing, vendor tracking, purchase orders, receiving, and warehouse operations.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-2">
            <FormSection title="Supplier classification" description="These fields are dropdowns so reporting and filtering stay clean.">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Field label="Supplier name"><Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="ABC Equipment Supplies" /></Field>
                <SelectField label="Supplier type" value={form.supplierType} onChange={(value) => setForm((current) => ({ ...current, supplierType: value }))} options={supplierTypes} />
                <SelectField label="Category" value={form.category} onChange={(value) => setForm((current) => ({ ...current, category: value }))} options={categories.map((value) => ({ value, label: value }))} />
                <SelectField label="Rating" value={form.rating} onChange={(value) => setForm((current) => ({ ...current, rating: value }))} options={ratings.map((value) => ({ value, label: titleCase(value) }))} />
              </div>
            </FormSection>

            <FormSection title="Contact and address" description="Keep communication and supplier location details in one place.">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Field label="Contact person"><Input value={form.contactName} onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))} placeholder="Jane Smith" /></Field>
                <Field label="Email"><Input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} type="email" placeholder="supplier@example.com" /></Field>
                <Field label="Phone"><Input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="+27..." /></Field>
                <Field label="Website"><Input value={form.website} onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))} placeholder="https://supplier.com" /></Field>
                <Field label="Country"><Input value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))} placeholder="South Africa" /></Field>
                <Field label="Province / state"><Input value={form.province} onChange={(event) => setForm((current) => ({ ...current, province: event.target.value }))} placeholder="Gauteng" /></Field>
                <Field label="City"><Input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} placeholder="Johannesburg" /></Field>
                <Field label="Postal code"><Input value={form.postalCode} onChange={(event) => setForm((current) => ({ ...current, postalCode: event.target.value }))} placeholder="2001" /></Field>
                <Field label="Address line 1"><Input value={form.addressLine1} onChange={(event) => setForm((current) => ({ ...current, addressLine1: event.target.value }))} /></Field>
                <Field label="Address line 2"><Input value={form.addressLine2} onChange={(event) => setForm((current) => ({ ...current, addressLine2: event.target.value }))} /></Field>
              </div>
            </FormSection>

            <FormSection title="Purchasing, tax, and logistics" description="These are common operational fields real inventory systems need for suppliers.">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Field label="Currency"><Input value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} maxLength={3} placeholder="USD" /></Field>
                <SelectField label="Payment terms" value={form.paymentTerms} onChange={(value) => setForm((current) => ({ ...current, paymentTerms: value }))} options={paymentTerms.map((value) => ({ value, label: value }))} />
                <SelectField label="Payment method" value={form.paymentMethod} onChange={(value) => setForm((current) => ({ ...current, paymentMethod: value }))} options={paymentMethods.map((value) => ({ value, label: value }))} />
                <SelectField label="Tax status" value={form.taxStatus} onChange={(value) => setForm((current) => ({ ...current, taxStatus: value }))} options={taxStatuses.map((value) => ({ value, label: titleCase(value) }))} />
                <Field label="Tax / VAT number"><Input value={form.taxNumber} onChange={(event) => setForm((current) => ({ ...current, taxNumber: event.target.value }))} /></Field>
                <SelectField label="Shipping terms" value={form.shippingTerms} onChange={(value) => setForm((current) => ({ ...current, shippingTerms: value }))} options={shippingTerms.map((value) => ({ value, label: value }))} />
                <SelectField label="Incoterm" value={form.incoterm} onChange={(value) => setForm((current) => ({ ...current, incoterm: value }))} options={incoterms.map((value) => ({ value, label: value || "Not applicable" }))} />
                <Field label="Supplier account no."><Input value={form.accountNumber} onChange={(event) => setForm((current) => ({ ...current, accountNumber: event.target.value }))} /></Field>
                <Field label="Lead time days"><Input value={form.leadTimeDays} onChange={(event) => setForm((current) => ({ ...current, leadTimeDays: event.target.value }))} type="number" min="0" placeholder="7" /></Field>
                <Field label="Minimum order qty"><Input value={form.minimumOrderQty} onChange={(event) => setForm((current) => ({ ...current, minimumOrderQty: event.target.value }))} type="number" min="0" placeholder="10" /></Field>
                <Field label="Last order date"><Input value={form.lastOrderAt} onChange={(event) => setForm((current) => ({ ...current, lastOrderAt: event.target.value }))} type="date" /></Field>
              </div>
            </FormSection>

            <FormSection title="Custom supplier fields" description="Add fields your business needs, for example bank name, import permit number, MOQ notes, B-BBEE level, quality grade, or contract reference.">
              <div className="space-y-3">
                {customFields.map((row, index) => (
                  <div key={index} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                    <Input value={row.key} onChange={(event) => updateCustomField(index, { key: event.target.value })} placeholder="Field name" />
                    <Input value={row.value} onChange={(event) => updateCustomField(index, { value: event.target.value })} placeholder="Value" />
                    <Button type="button" variant="ghost" onClick={() => removeCustomField(index)} className="rounded-xl text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addCustomField} className="rounded-xl bg-background/70"><Plus className="h-4 w-4" />Add custom field</Button>
              </div>
            </FormSection>

            <FormSection title="Notes" description="Use notes for contract conditions, supplier risks, documents needed, or delivery instructions.">
              <Textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="min-h-24" placeholder="Preferred supplier notes, bank terms, delivery conditions..." />
            </FormSection>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="button" onClick={saveSupplier} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{editing ? "Save changes" : "Create supplier"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function SupplierCard({ supplier, onEdit, onArchive }: { supplier: Supplier; onEdit: () => void; onArchive: () => void }) {
  return (
    <article className={cn("border bg-background p-4 transition hover:shadow-sm", supplier.status === "archived" && "opacity-70")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-semibold tracking-tight">{supplier.name}</h3>
            <Badge variant={supplier.status === "active" ? "default" : "secondary"}>{supplier.status}</Badge>
            <Badge variant="outline">{supplier.currency}</Badge>
            <Badge variant="outline">{titleCase(supplier.supplierType || "vendor")}</Badge>
            {supplier.rating && supplier.rating !== "unrated" && <Badge variant={supplier.rating === "blocked" ? "destructive" : "secondary"}>{titleCase(supplier.rating)}</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{[supplier.city, supplier.country].filter(Boolean).join(", ") || "No location set"}</p>
        </div>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={onEdit} className="rounded-xl"><Pencil className="h-4 w-4" /></Button>
          {supplier.status !== "archived" && <Button type="button" variant="ghost" size="sm" onClick={onArchive} className="rounded-xl text-muted-foreground hover:text-destructive"><Archive className="h-4 w-4" /></Button>}
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
        <Info icon={Mail} value={supplier.email || "No email"} />
        <Info icon={Phone} value={supplier.phone || "No phone"} />
        <Info icon={Clock3} value={supplier.leadTimeDays == null ? "No lead time" : `${supplier.leadTimeDays} days lead time`} />
        <Info icon={Truck} value={`${supplier._count?.products ?? 0} product links`} />
      </div>

      <div className="mt-4 grid gap-2 border-t pt-3 text-sm text-muted-foreground sm:grid-cols-2">
        <p><span className="font-semibold text-foreground">Terms:</span> {supplier.paymentTerms || "Not set"}</p>
        <p><span className="font-semibold text-foreground">Shipping:</span> {supplier.shippingTerms || "Not set"}</p>
        <p><span className="font-semibold text-foreground">Tax:</span> {titleCase(supplier.taxStatus || "unknown")}</p>
        <p><span className="font-semibold text-foreground">MOQ:</span> {supplier.minimumOrderQty ?? "Not set"}</p>
      </div>

      {supplier.notes && <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{supplier.notes}</p>}
    </article>
  );
}

function FormSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="border bg-background/70"><div className="border-b p-4"><h3 className="font-semibold tracking-tight">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{description}</p></div><div className="p-4">{children}</div></section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-2"><Label>{label}</Label>{children}</label>;
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return <label className="space-y-2"><Label>{label}</Label><select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full border bg-background px-3 text-sm">{options.map((option) => <option key={option.value || option.label} value={option.value}>{option.label}</option>)}</select></label>;
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return <div className="border bg-card/95 p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{label}</p><Icon className="h-4 w-4 text-muted-foreground" /></div><p className="mt-2 text-3xl font-black tracking-[-0.05em]">{value}</p></div>;
}

function Info({ icon: Icon, value }: { icon: any; value: string }) {
  return <div className="flex min-w-0 items-center gap-2"><Icon className="h-4 w-4 shrink-0" /><span className="truncate">{value}</span></div>;
}

function clean(value: string) {
  const text = value.trim();
  return text || null;
}

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function objectToRows(value?: Record<string, unknown> | null): CustomFieldRow[] {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).map(([key, fieldValue]) => ({ key, value: fieldValue == null ? "" : String(fieldValue) }));
}

function rowsToObject(rows: CustomFieldRow[]) {
  const result: Record<string, string> = {};
  rows.forEach((row) => {
    const key = row.key.trim();
    if (key) result[key] = row.value.trim();
  });
  return result;
}

function toDateInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}
