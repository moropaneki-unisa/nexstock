"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, Building2, Clock3, Loader2, Mail, Pencil, Phone, Plus, Save, Search, Truck } from "lucide-react";

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

type Supplier = {
  id: string;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  country?: string | null;
  city?: string | null;
  currency: string;
  paymentTerms?: string | null;
  leadTimeDays?: number | null;
  notes?: string | null;
  status: SupplierStatus;
  createdAt: string;
  updatedAt: string;
  _count?: { products: number };
};

const emptyForm = {
  name: "",
  contactName: "",
  email: "",
  phone: "",
  website: "",
  country: "",
  city: "",
  currency: "USD",
  paymentTerms: "",
  leadTimeDays: "",
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
  const [form, setForm] = useState(emptyForm);

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
      const text = [supplier.name, supplier.contactName, supplier.email, supplier.phone, supplier.country, supplier.city, supplier.currency].filter(Boolean).join(" ").toLowerCase();
      return matchesStatus && (!term || text.includes(term));
    });
  }, [search, statusFilter, suppliers]);

  const stats = useMemo(() => ({
    total: suppliers.length,
    active: suppliers.filter((supplier) => supplier.status === "active").length,
    archived: suppliers.filter((supplier) => supplier.status === "archived").length,
    products: suppliers.reduce((sum, supplier) => sum + (supplier._count?.products ?? 0), 0),
  }), [suppliers]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
    setError(null);
    setSuccess(null);
  }

  function openEdit(supplier: Supplier) {
    setEditing(supplier);
    setForm({
      name: supplier.name ?? "",
      contactName: supplier.contactName ?? "",
      email: supplier.email ?? "",
      phone: supplier.phone ?? "",
      website: supplier.website ?? "",
      country: supplier.country ?? "",
      city: supplier.city ?? "",
      currency: supplier.currency ?? "USD",
      paymentTerms: supplier.paymentTerms ?? "",
      leadTimeDays: supplier.leadTimeDays == null ? "" : String(supplier.leadTimeDays),
      notes: supplier.notes ?? "",
    });
    setOpen(true);
    setError(null);
    setSuccess(null);
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
      contactName: clean(form.contactName),
      email: clean(form.email),
      phone: clean(form.phone),
      website: clean(form.website),
      country: clean(form.country),
      city: clean(form.city),
      currency: form.currency.trim().toUpperCase(),
      paymentTerms: clean(form.paymentTerms),
      leadTimeDays: form.leadTimeDays === "" ? undefined : Number(form.leadTimeDays),
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
        description="Manage vendors, supplier currencies, lead times, payment terms, and product supply relationships."
        actions={<Button type="button" onClick={openCreate} className="rounded-xl shadow-sm"><Plus className="h-4 w-4" />New supplier</Button>}
      />

      {error && <div className="border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}
      {success && <div className="border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</div>}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Truck} label="Total suppliers" value={stats.total} />
        <Metric icon={Building2} label="Active" value={stats.active} />
        <Metric icon={Archive} label="Archived" value={stats.archived} />
        <Metric icon={Clock3} label="Product links" value={stats.products} />
      </section>

      <section className="border bg-card/95">
        <div className="flex flex-col gap-4 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Supplier directory</h2>
            <p className="mt-1 text-sm text-muted-foreground">Start by adding vendors. Product supplier links and purchase orders will build on this foundation.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative min-w-[16rem]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search suppliers..." className="pl-9" />
            </label>
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
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Update supplier" : "Create supplier"}</DialogTitle>
            <DialogDescription>Add supplier details used for product costing, vendor tracking, and future purchase orders.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2"><Label>Supplier name</Label><Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="ABC Equipment Supplies" /></label>
              <label className="space-y-2"><Label>Contact person</Label><Input value={form.contactName} onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))} placeholder="Jane Smith" /></label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} type="email" placeholder="supplier@example.com" /></label>
              <label className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="+27..." /></label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-2"><Label>Currency</Label><Input value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} maxLength={3} placeholder="USD" /></label>
              <label className="space-y-2"><Label>Country</Label><Input value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))} placeholder="South Africa" /></label>
              <label className="space-y-2"><Label>City</Label><Input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} placeholder="Johannesburg" /></label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-2"><Label>Website</Label><Input value={form.website} onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))} placeholder="https://supplier.com" /></label>
              <label className="space-y-2"><Label>Payment terms</Label><Input value={form.paymentTerms} onChange={(event) => setForm((current) => ({ ...current, paymentTerms: event.target.value }))} placeholder="Net 30, COD..." /></label>
              <label className="space-y-2"><Label>Lead time days</Label><Input value={form.leadTimeDays} onChange={(event) => setForm((current) => ({ ...current, leadTimeDays: event.target.value }))} type="number" min="0" placeholder="7" /></label>
            </div>

            <label className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="min-h-24" placeholder="Preferred supplier notes, bank terms, delivery conditions..." /></label>
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

      {supplier.paymentTerms && <div className="mt-4 border-t pt-3 text-sm"><span className="font-semibold">Payment terms: </span><span className="text-muted-foreground">{supplier.paymentTerms}</span></div>}
      {supplier.notes && <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{supplier.notes}</p>}
    </article>
  );
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
