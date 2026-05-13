ALTER TABLE "DocumentTemplate"
ADD COLUMN IF NOT EXISTS "module" TEXT NOT NULL DEFAULT 'purchase_orders';

CREATE INDEX IF NOT EXISTS "DocumentTemplate_org_module_idx" ON "DocumentTemplate"("organizationId", "module");
