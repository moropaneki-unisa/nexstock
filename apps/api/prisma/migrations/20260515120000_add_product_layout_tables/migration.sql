CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "ProductType" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "kind" TEXT NOT NULL DEFAULT 'physical',
  "trackInventory" BOOLEAN NOT NULL DEFAULT true,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductType_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductType_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductType_organizationId_slug_key" ON "ProductType"("organizationId", "slug");
CREATE INDEX IF NOT EXISTS "ProductType_organizationId_isActive_idx" ON "ProductType"("organizationId", "isActive");
CREATE INDEX IF NOT EXISTS "ProductType_organizationId_isDefault_idx" ON "ProductType"("organizationId", "isDefault");

CREATE TABLE IF NOT EXISTS "ProductTypeField" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "organizationId" TEXT NOT NULL,
  "productTypeId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'text',
  "required" BOOLEAN NOT NULL DEFAULT false,
  "options" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "defaultValue" JSONB,
  "placeholder" TEXT,
  "helpText" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductTypeField_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductTypeField_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProductTypeField_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductTypeField_productTypeId_key_key" ON "ProductTypeField"("productTypeId", "key");
CREATE INDEX IF NOT EXISTS "ProductTypeField_organizationId_productTypeId_idx" ON "ProductTypeField"("organizationId", "productTypeId");
CREATE INDEX IF NOT EXISTS "ProductTypeField_organizationId_isActive_idx" ON "ProductTypeField"("organizationId", "isActive");
