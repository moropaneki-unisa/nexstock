"use client"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { TrendingUpIcon, TrendingDownIcon } from "lucide-react"

export type SectionCardMetrics = {
  inventoryValue: string
  activeProducts: number
  activeSuppliers: number
  openPurchaseOrders: number
  lowStockProducts: number
  outOfStockProducts: number
  totalProducts: number
  totalSuppliers: number
  totalPurchaseOrders: number
}

const fallbackMetrics: SectionCardMetrics = {
  inventoryValue: "$0",
  activeProducts: 0,
  activeSuppliers: 0,
  openPurchaseOrders: 0,
  lowStockProducts: 0,
  outOfStockProducts: 0,
  totalProducts: 0,
  totalSuppliers: 0,
  totalPurchaseOrders: 0,
}

export function SectionCards({ metrics = fallbackMetrics }: { metrics?: SectionCardMetrics }) {
  const hasStockRisk = metrics.lowStockProducts + metrics.outOfStockProducts > 0

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Inventory Value</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {metrics.inventoryValue}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUpIcon />
              Live
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Product catalog valuation <TrendingUpIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Based on active product stock and selling price
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Products</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {metrics.activeProducts.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {hasStockRisk ? <TrendingDownIcon /> : <TrendingUpIcon />}
              {metrics.totalProducts.toLocaleString()} total
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {hasStockRisk ? "Stock needs attention" : "Catalog looks healthy"}{" "}
            {hasStockRisk ? <TrendingDownIcon className="size-4" /> : <TrendingUpIcon className="size-4" />}
          </div>
          <div className="text-muted-foreground">
            {metrics.lowStockProducts} low stock · {metrics.outOfStockProducts} out of stock
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Suppliers</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {metrics.activeSuppliers.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUpIcon />
              {metrics.totalSuppliers.toLocaleString()} total
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Supplier base connected <TrendingUpIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">Supports costs, currencies, and purchasing</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Open Purchase Orders</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {metrics.openPurchaseOrders.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUpIcon />
              {metrics.totalPurchaseOrders.toLocaleString()} total
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Purchasing pipeline <TrendingUpIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">Draft, ordered, and partially received POs</div>
        </CardFooter>
      </Card>
    </div>
  )
}
