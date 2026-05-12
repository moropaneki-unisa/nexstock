"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarClock, ClipboardList, Loader2, PackageCheck, Truck, Warehouse } from "lucide-react";

import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  notes?: string | null;
  createdAt: string;
  supplier: { id: string; supplierCode: string; name: string; currency: string; email?: string | null; phone?: string | null };
  lines: Array<{
    id: string;
    supplierSku?: string | null;
    description?: string | null;
    quantityOrdered: number;
    quantityReceived: number;
    unitCost?: string | number | null;
    lineTotal?: string | number | null;
    notes?: string | null;
    product?: { id: string; name: string; sku: string } | null;
  }>;
};

type OrganizationSummary = { baseCurrency?: string | null };

const statusLabels: Record<PurchaseOrderStatus, string> = {
  draft: "Draft",
  ordered: "Ordered",
  partially_received: "Partially received",
  received: "Received",
  cancelled: "Cancelled",
};

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [organization, setOrganization] = useState<OrganizationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadOrder() {
    if (!params.id) return;
    setLoading(true);
    setError(null);
    try {
      const [po, org] = await Promise.all([
        apiFetch<PurchaseOrder>(`/api/purchase-orders/${params.id}`),
        apiFetch<OrganizationSummary>("/api/organization").catch(() => null),
      ]);
      setOrder(po);
      setOrganization(org);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load purchase order");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadOrder(); }, [params.id]);

  const currency = normalizeCurrencyCode(order?.currency || order?.supplier?.currency || organization?.baseCurrency || DEFAULT_CURRENCY);
  const subtotal = Number(order?.subtotal ?? 0);
  const receivedLines = useMemo(() => order?.lines?.filter((line) => Number(line.quantityReceived ?? 0) >= Number(line.quantityOrdered ?? 0)).length ?? 0, [order?.lines]);
  const totalLines = order?.lines?.length ?? 0;

  return (
    <PageShell className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Purchasing"
        title={order ? order.poNumber : "Purchase order"}
        description="Review supplier order lines, totals, dates, and receiving readiness."
        actions={<Button asChild variant="outline" className="rounded-xl bg-background/70"><Link href="/purchase-orders"><ArrowLeft className="h-4 w-4" />Back to purchase orders</Link></Button>}
      />

      {loading ? <Card className="border bg-card/95 shadow-none"><CardContent className="flex items-center gap-3 p-8 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading purchase order...</CardContent></Card> : error ? <div className="border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">{error}</div> : order ? (
        <>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Metric icon={ClipboardList} label="Status" value={statusLabels[order.status] ?? order.status} />
            <Metric icon={Truck} label="Supplier" value={order.supplier?.supplierCode ?? "-"} />
            <Metric icon={Warehouse} label="Lines" value={`${totalLines}`} />
            <Metric icon={PackageCheck} label="Received" value={`${receivedLines}/${totalLines}`} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_22rem]">
            <main className="space-y-6">
              <Card className="border bg-card/95 shadow-none">
                <CardHeader className="border-b">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5" />Supplier and order details</CardTitle>
                      <CardDescription>{order.supplier?.name ?? "Unknown supplier"}</CardDescription>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                </CardHeader>
                <CardContent className="grid gap-0 p-0 sm:grid-cols-2 xl:grid-cols-4">
                  <Fact label="Supplier code" value={order.supplier?.supplierCode ?? "-"} />
                  <Fact label="Currency" value={currency} />
                  <Fact label="Expected" value={order.expectedAt ? new Date(order.expectedAt).toLocaleDateString() : "Not set"} />
                  <Fact label="Created" value={new Date(order.createdAt).toLocaleDateString()} />
                  <Fact label="Ordered" value={order.orderedAt ? new Date(order.orderedAt).toLocaleDateString() : "Not ordered"} />
                  <Fact label="Received" value={order.receivedAt ? new Date(order.receivedAt).toLocaleDateString() : "Not received"} />
                  <Fact label="Email" value={order.supplier?.email ?? "Not set"} />
                  <Fact label="Phone" value={order.supplier?.phone ?? "Not set"} />
                </CardContent>
              </Card>

              <Card className="border bg-card/95 shadow-none">
                <CardHeader className="border-b">
                  <CardTitle>Order lines</CardTitle>
                  <CardDescription>Products ordered from this supplier.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/25 hover:bg-muted/25">
                          <TableHead>Product</TableHead>
                          <TableHead>Supplier SKU</TableHead>
                          <TableHead className="text-right">Ordered</TableHead>
                          <TableHead className="text-right">Received</TableHead>
                          <TableHead className="text-right">Unit cost</TableHead>
                          <TableHead className="text-right">Line total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(order.lines ?? []).map((line) => {
                          const lineTotal = Number(line.lineTotal ?? (Number(line.quantityOrdered || 0) * Number(line.unitCost || 0)));
                          return (
                            <TableRow key={line.id}>
                              <TableCell><div className="font-medium">{line.product?.name ?? line.description ?? "Unknown product"}</div><div className="font-mono text-xs text-muted-foreground">{line.product?.sku ?? "-"}</div></TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">{line.supplierSku || "-"}</TableCell>
                              <TableCell className="text-right">{line.quantityOrdered}</TableCell>
                              <TableCell className="text-right">{line.quantityReceived ?? 0}</TableCell>
                              <TableCell className="text-right">{formatMoney(Number(line.unitCost ?? 0), currency)}</TableCell>
                              <TableCell className="text-right font-medium">{formatMoney(Number.isFinite(lineTotal) ? lineTotal : 0, currency)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {order.notes && <Card className="border bg-card/95 shadow-none"><CardHeader><CardTitle>Notes</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{order.notes}</p></CardContent></Card>}
            </main>

            <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
              <Card className="border bg-card/95 shadow-none">
                <CardHeader><CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5" />Summary</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Side label="Subtotal" value={formatMoney(subtotal, currency)} />
                  <Side label="Currency" value={currency} />
                  <Side label="Status" value={statusLabels[order.status] ?? order.status} />
                  <Side label="Lines" value={`${totalLines}`} />
                  <div className="rounded-xl border bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">Receiving stock from purchase orders is the next workflow to connect. This page is ready for that action when the API endpoint is added.</div>
                </CardContent>
              </Card>
            </aside>
          </section>
        </>
      ) : <div className="border bg-card/95 p-6 text-sm text-muted-foreground">Purchase order not found.</div>}
    </PageShell>
  );
}

function StatusBadge({ status }: { status: PurchaseOrderStatus }) {
  return <Badge className={cn("rounded-full", status === "cancelled" && "bg-destructive hover:bg-destructive", status === "received" && "bg-emerald-600 hover:bg-emerald-600")} variant={status === "draft" ? "secondary" : "default"}>{statusLabels[status] ?? status}</Badge>;
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return <div className="border bg-card/95 p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{label}</p><Icon className="h-4 w-4 text-muted-foreground" /></div><p className="mt-2 truncate text-2xl font-black tracking-[-0.05em]">{value}</p></div>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="border-b border-r p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className="mt-2 truncate text-sm font-medium">{value}</p></div>;
}

function Side({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div>;
}
