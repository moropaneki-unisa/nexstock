"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, ClipboardList, Loader2, Plus, ReceiptText, Search, Truck, Warehouse } from "lucide-react";

import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/api";
import { DEFAULT_CURRENCY, formatMoney, normalizeCurrencyCode } from "@/lib/currencies";
import { cn } from "@/lib/utils";

type PurchaseOrderStatus = "draft" | "ordered" | "partially_received" | "received" | "cancelled";

type PurchaseOrder = {
  id: string;
  poNumber: string;
  status: PurchaseOrderStatus;
  currency: string;
  subtotal: string | number;
  expectedAt?: string | null;
  orderedAt?: string | null;
  receivedAt?: string | null;
  createdAt: string;
  supplier: { id: string; supplierCode: string; name: string; currency: string };
  lines: Array<{ id: string; quantityOrdered: number; quantityReceived: number; product?: { id: string; name: string; sku: string } }>;
};

type OrganizationSummary = { baseCurrency?: string | null };

const statusLabels: Record<PurchaseOrderStatus, string> = {
  draft: "Draft",
  ordered: "Ordered",
  partially_received: "Partially received",
  received: "Received",
  cancelled: "Cancelled",
};

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [organization, setOrganization] = useState<OrganizationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PurchaseOrderStatus | "all">("all");

  const baseCurrency = normalizeCurrencyCode(organization?.baseCurrency || DEFAULT_CURRENCY);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [poList, org] = await Promise.all([
        apiFetch<PurchaseOrder[]>("/api/purchase-orders"),
        apiFetch<OrganizationSummary>("/api/organization").catch(() => null),
      ]);
      setOrders(poList);
      setOrganization(org);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load purchase orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = status === "all" || order.status === status;
      const text = [order.poNumber, order.supplier?.name, order.supplier?.supplierCode, order.status, order.currency].filter(Boolean).join(" ").toLowerCase();
      return matchesStatus && (!term || text.includes(term));
    });
  }, [orders, search, status]);

  const stats = useMemo(() => {
    const open = orders.filter((order) => ["draft", "ordered", "partially_received"].includes(order.status)).length;
    const ordered = orders.filter((order) => order.status === "ordered").length;
    const supplierCount = new Set(orders.map((order) => order.supplier?.id).filter(Boolean)).size;
    return { total: orders.length, open, ordered, supplierCount };
  }, [orders]);

  return (
    <PageShell className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Purchasing"
        title="Purchase orders"
        description="Foundation for buying from suppliers. Draft orders now; receiving stock will come next."
        actions={<Button asChild className="rounded-none shadow-none"><Link href="/purchase-orders/new"><Plus className="h-4 w-4" />New purchase order</Link></Button>}
      />

      {error && <div className="border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

      <section className="border bg-card/95">
        <div className="grid divide-y md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4">
          <Metric icon={ClipboardList} label="Total POs" value={stats.total} />
          <Metric icon={CalendarClock} label="Open" value={stats.open} />
          <Metric icon={Truck} label="Ordered" value={stats.ordered} />
          <Metric icon={Warehouse} label="Suppliers" value={stats.supplierCount} />
        </div>
      </section>

      <Card className="border bg-card/95 shadow-none">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Purchase order workspace</CardTitle>
              <CardDescription>Track supplier orders before we add receiving and stock-in automation.</CardDescription>
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(16rem,1fr)_13rem]">
              <label className="relative min-w-0">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search POs..." className="h-10 rounded-none pl-9" />
              </label>
              <Select value={status} onValueChange={(value) => setStatus(value as PurchaseOrderStatus | "all")}>
                <SelectTrigger className="h-10 rounded-none"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center gap-3 p-8 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading purchase orders...</div>
          ) : filtered.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/25 hover:bg-muted/25">
                    <TableHead>PO</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Lines</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{filtered.map((order) => <PurchaseOrderRow key={order.id} order={order} baseCurrency={baseCurrency} />)}</TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-10 text-center">
              <ReceiptText className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-medium">No purchase orders found</p>
              <p className="mt-1 text-sm text-muted-foreground">Create a purchase order once you are ready to buy stock from a supplier.</p>
              <Button asChild className="mt-5 rounded-none"><Link href="/purchase-orders/new"><Plus className="h-4 w-4" />Create purchase order</Link></Button>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}

function PurchaseOrderRow({ order, baseCurrency }: { order: PurchaseOrder; baseCurrency: string }) {
  const total = Number(order.subtotal ?? 0);
  return <TableRow className="transition hover:bg-muted/25"><TableCell><div className="font-semibold">{order.poNumber}</div><div className="text-xs text-muted-foreground">{order.currency || baseCurrency}</div></TableCell><TableCell><div className="max-w-[18rem] truncate font-medium">{order.supplier?.name ?? "Unknown supplier"}</div><div className="font-mono text-xs text-muted-foreground">{order.supplier?.supplierCode ?? "-"}</div></TableCell><TableCell><StatusBadge status={order.status} /></TableCell><TableCell>{order.lines?.length ?? 0}</TableCell><TableCell className="font-medium">{formatMoney(total, order.currency || baseCurrency)}</TableCell><TableCell>{order.expectedAt ? new Date(order.expectedAt).toLocaleDateString() : "Not set"}</TableCell><TableCell className="text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</TableCell></TableRow>;
}

function StatusBadge({ status }: { status: PurchaseOrderStatus }) {
  return <Badge className={cn("rounded-none", status === "cancelled" && "bg-destructive hover:bg-destructive", status === "received" && "bg-emerald-600 hover:bg-emerald-600")} variant={status === "draft" ? "secondary" : "default"}>{statusLabels[status] ?? status}</Badge>;
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return <div className="p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{label}</p><Icon className="h-4 w-4 text-muted-foreground" /></div><p className="mt-2 text-3xl font-black tracking-[-0.05em]">{value}</p></div>;
}
