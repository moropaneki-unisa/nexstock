CREATE TYPE "PurchaseOrderStatus" AS ENUM ('draft', 'ordered', 'partially_received', 'received', 'cancelled');

ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "nextPurchaseOrderNumber" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "PurchaseOrder" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "poNumber" TEXT NOT NULL,
  "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'draft',
  "currency" TEXT NOT NULL,
  "expectedAt" TIMESTAMP(3),
  "orderedAt" TIMESTAMP(3),
  "receivedAt" TIMESTAMP(3),
  "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PurchaseOrderLine" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "purchaseOrderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "productSupplierId" TEXT,
  "supplierSku" TEXT,
  "description" TEXT,
  "quantityOrdered" INTEGER NOT NULL,
  "quantityReceived" INTEGER NOT NULL DEFAULT 0,
  "unitCost" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL,
  "lineTotal" DECIMAL(12,2) NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PurchaseOrderLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PurchaseOrder_organizationId_poNumber_key" ON "PurchaseOrder"("organizationId", "poNumber");
CREATE INDEX "PurchaseOrder_organizationId_status_idx" ON "PurchaseOrder"("organizationId", "status");
CREATE INDEX "PurchaseOrder_organizationId_supplierId_idx" ON "PurchaseOrder"("organizationId", "supplierId");
CREATE INDEX "PurchaseOrder_organizationId_createdAt_idx" ON "PurchaseOrder"("organizationId", "createdAt");
CREATE INDEX "PurchaseOrderLine_organizationId_purchaseOrderId_idx" ON "PurchaseOrderLine"("organizationId", "purchaseOrderId");
CREATE INDEX "PurchaseOrderLine_organizationId_productId_idx" ON "PurchaseOrderLine"("organizationId", "productId");
CREATE INDEX "PurchaseOrderLine_productSupplierId_idx" ON "PurchaseOrderLine"("productSupplierId");

ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_productSupplierId_fkey" FOREIGN KEY ("productSupplierId") REFERENCES "ProductSupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
