CREATE TYPE "SupplierStatus" AS ENUM ('active', 'archived');

CREATE TABLE "Supplier" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "contactName" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "website" TEXT,
  "country" TEXT,
  "city" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "paymentTerms" TEXT,
  "leadTimeDays" INTEGER,
  "notes" TEXT,
  "status" "SupplierStatus" NOT NULL DEFAULT 'active',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductSupplier" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "supplierSku" TEXT,
  "cost" DECIMAL(12,2),
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "minimumOrderQty" INTEGER,
  "leadTimeDays" INTEGER,
  "isPreferred" BOOLEAN NOT NULL DEFAULT false,
  "lastPurchaseAt" TIMESTAMP(3),
  "notes" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductSupplier_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Supplier_organizationId_name_key" ON "Supplier"("organizationId", "name");
CREATE INDEX "Supplier_organizationId_status_idx" ON "Supplier"("organizationId", "status");
CREATE INDEX "Supplier_organizationId_currency_idx" ON "Supplier"("organizationId", "currency");
CREATE INDEX "Supplier_organizationId_country_idx" ON "Supplier"("organizationId", "country");

CREATE UNIQUE INDEX "ProductSupplier_productId_supplierId_key" ON "ProductSupplier"("productId", "supplierId");
CREATE INDEX "ProductSupplier_organizationId_productId_idx" ON "ProductSupplier"("organizationId", "productId");
CREATE INDEX "ProductSupplier_organizationId_supplierId_idx" ON "ProductSupplier"("organizationId", "supplierId");
CREATE INDEX "ProductSupplier_organizationId_isPreferred_idx" ON "ProductSupplier"("organizationId", "isPreferred");

ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductSupplier" ADD CONSTRAINT "ProductSupplier_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductSupplier" ADD CONSTRAINT "ProductSupplier_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
