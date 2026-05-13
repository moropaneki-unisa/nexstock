ALTER TABLE "DocumentTemplate"
ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'pdf';

CREATE INDEX IF NOT EXISTS "DocumentTemplate_org_kind_idx" ON "DocumentTemplate"("organizationId", "kind");
