ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "supplierPrefix" TEXT DEFAULT 'SUP';
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "nextSupplierNumber" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "supplierCode" TEXT;

WITH numbered AS (
  SELECT
    id,
    "organizationId",
    ROW_NUMBER() OVER (PARTITION BY "organizationId" ORDER BY "createdAt", id) AS rn
  FROM "Supplier"
  WHERE "supplierCode" IS NULL OR TRIM("supplierCode") = ''
)
UPDATE "Supplier" s
SET "supplierCode" = CONCAT('SUP-', LPAD(numbered.rn::text, 5, '0'))
FROM numbered
WHERE s.id = numbered.id;

ALTER TABLE "Supplier" ALTER COLUMN "supplierCode" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Supplier_organizationId_supplierCode_key" ON "Supplier"("organizationId", "supplierCode");

WITH max_codes AS (
  SELECT
    "organizationId",
    COALESCE(MAX(NULLIF(REGEXP_REPLACE("supplierCode", '^.*-([0-9]+)$', '\1'), "supplierCode")::integer), COUNT(*)) + 1 AS next_number
  FROM "Supplier"
  GROUP BY "organizationId"
)
UPDATE "Organization" o
SET "nextSupplierNumber" = GREATEST(o."nextSupplierNumber", max_codes.next_number)
FROM max_codes
WHERE o.id = max_codes."organizationId";
