"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, Loader2, Star, Truck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/api";
import { formatMoney, normalizeCurrencyCode } from "@/lib/currencies";
import { cn } from "@/lib/utils";

type Supplier = {
  id: string;
  supplierCode: string;
  name: string;
  currency: string;
  city?: string | null;
  country?: string | null;
};

type ProductSupplierLink = {
  id: string;
  supplierId: string;
  supplierSku?: string | null;
  cost?: string | number | null;
  currency: string;
  minimumOrderQty?: number | null;
  leadTimeDays?: number | null;
  isPreferred: boolean;
  supplier: Supplier;
};

type ProductCostingSummaryProps = {
  productId: string;
  sellingPrice: string | number;
  sellingCurrency: string;
  productCost?: string | number | null;
  costCurrency?: string | null;
  convertedCost?: string | number | null;
  baseCurrency: string;
};

export function ProductCostingSummary({ productId, sellingPrice, sellingCurrency, productCost, costCurrency, convertedCost, baseCurrency }: ProductCostingSummaryProps) {
  const [links, setLinks] = useState<ProductSupplierLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    apiFetch<ProductSupplierLink[]>(`/api/products/${productId}/suppliers`)
      .then((result) => { if (active) setLinks(result); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Failed to load supplier costing"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [productId]);

  const preferred = useMemo(() => links.find((link) => link.isPreferred) ?? links[0], [links]);
  const normalizedSellingCurrency = normalizeCurrencyCode(sellingCurrency || baseCurrency);
  const normalizedBaseCurrency = normalizeCurrencyCode(baseCurrency);
  const normalizedCostCurrency = normalizeCurrencyCode(preferred?.currency || costCurrency || normalizedBaseCurrency);
  const sellingPriceNumber = Number(sellingPrice ?? 0);
  const preferredCost = preferred?.cost == null ? (productCost == null ? undefined : Number(productCost)) : Number(preferred.cost);
  const convertedCostNumber = convertedCost == null ? undefined : Number(convertedCost);
  const margin = convertedCostNumber == null || !sellingPriceNumber ? undefined : ((sellingPriceNumber - convertedCostNumber) / sellingPriceNumber) * 100;

  return (
    <Card className="border bg-card/95 shadow-sm">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" />Preferred supplier costing</CardTitle>
            <CardDescription>Shows the supplier cost source that drives product cost, converted cost, and margin.</CardDescription>
          </div>
          {preferred ? <Badge className="w-fit gap-1"><Star className="h-3 w-3" />Preferred source</Badge> : <Badge variant="secondary" className="w-fit">No supplier source</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-5">
        {loading ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading supplier costing...</div>
        ) : error ? (
          <div className="border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <CostMetric label="Selling price" value={formatMoney(sellingPriceNumber, normalizedSellingCurrency)} detail={`${normalizedSellingCurrency} base selling currency`} />
              <CostMetric label="Preferred supplier" value={preferred?.supplier?.supplierCode ?? "Not linked"} detail={preferred?.supplier?.name ?? "No supplier selected"} />
              <CostMetric label="Supplier cost" value={preferredCost == null || Number.isNaN(preferredCost) ? "Not set" : formatMoney(preferredCost, normalizedCostCurrency)} detail={`${normalizedCostCurrency} supplier currency`} />
              <CostMetric label="Converted cost" value={convertedCostNumber == null || Number.isNaN(convertedCostNumber) ? "Not set" : formatMoney(convertedCostNumber, normalizedBaseCurrency)} detail={margin == null || Number.isNaN(margin) ? "Margin not available" : `${Math.round(margin)}% margin`} />
            </div>

            {links.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Supplier SKU</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>MOQ</TableHead>
                      <TableHead>Lead time</TableHead>
                      <TableHead>Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {links.map((link) => <SupplierCostRow key={link.id} link={link} />)}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed bg-muted/15 p-6 text-center text-sm text-muted-foreground">
                No supplier is linked to this product yet. Add suppliers from the edit product flow or the Suppliers section.
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CostMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-xl border bg-background/70 p-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p><p className="mt-2 truncate text-lg font-semibold">{value}</p><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{detail}</p></div>;
}

function SupplierCostRow({ link }: { link: ProductSupplierLink }) {
  const currency = normalizeCurrencyCode(link.currency || link.supplier.currency);
  const cost = link.cost == null ? undefined : Number(link.cost);
  return (
    <TableRow className={cn(link.isPreferred && "bg-primary/5")}>
      <TableCell>
        <div className="flex items-center gap-2 font-medium"><Truck className="h-4 w-4 text-muted-foreground" />{link.supplier.name}</div>
        <div className="mt-1 font-mono text-xs text-muted-foreground">{link.supplier.supplierCode}</div>
      </TableCell>
      <TableCell className="font-mono text-xs">{link.supplierSku || "-"}</TableCell>
      <TableCell>{cost == null || Number.isNaN(cost) ? "Not set" : formatMoney(cost, currency)}</TableCell>
      <TableCell>{link.minimumOrderQty ?? "-"}</TableCell>
      <TableCell>{link.leadTimeDays == null ? "-" : `${link.leadTimeDays} days`}</TableCell>
      <TableCell>{link.isPreferred ? <Badge className="gap-1"><Star className="h-3 w-3" />Preferred</Badge> : <Badge variant="secondary">Alternative</Badge>}</TableCell>
    </TableRow>
  );
}
