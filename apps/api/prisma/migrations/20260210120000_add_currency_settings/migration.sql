-- Organization currency settings
ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "baseCurrency" TEXT NOT NULL DEFAULT 'ZAR',
  ADD COLUMN IF NOT EXISTS "enabledCurrencies" TEXT[] NOT NULL DEFAULT ARRAY['ZAR']::TEXT[],
  ADD COLUMN IF NOT EXISTS "exchangeRates" JSONB;

CREATE INDEX IF NOT EXISTS "Organization_baseCurrency_idx" ON "Organization"("baseCurrency");

-- Product currency/cost conversion fields
ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "priceCurrency" TEXT NOT NULL DEFAULT 'ZAR',
  ADD COLUMN IF NOT EXISTS "costCurrency" TEXT,
  ADD COLUMN IF NOT EXISTS "exchangeRateToBase" DECIMAL(18, 6),
  ADD COLUMN IF NOT EXISTS "convertedCost" DECIMAL(12, 2);

UPDATE "Product"
SET
  "priceCurrency" = COALESCE("priceCurrency", 'ZAR'),
  "costCurrency" = CASE WHEN "cost" IS NULL THEN "costCurrency" ELSE COALESCE("costCurrency", "priceCurrency", 'ZAR') END,
  "exchangeRateToBase" = CASE WHEN "cost" IS NULL THEN "exchangeRateToBase" ELSE COALESCE("exchangeRateToBase", 1) END,
  "convertedCost" = CASE WHEN "cost" IS NULL THEN "convertedCost" ELSE COALESCE("convertedCost", "cost") END;

CREATE INDEX IF NOT EXISTS "Product_organizationId_priceCurrency_idx" ON "Product"("organizationId", "priceCurrency");
CREATE INDEX IF NOT EXISTS "Product_organizationId_costCurrency_idx" ON "Product"("organizationId", "costCurrency");
