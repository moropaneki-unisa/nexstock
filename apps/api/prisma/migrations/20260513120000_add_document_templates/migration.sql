CREATE TABLE IF NOT EXISTS "DocumentTemplate" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'purchase_order',
  "description" TEXT,
  "subjectTemplate" TEXT,
  "htmlTemplate" TEXT NOT NULL,
  "emailTemplate" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocumentTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "DocumentTemplate_org_name_key" ON "DocumentTemplate"("organizationId", "name");
CREATE INDEX IF NOT EXISTS "DocumentTemplate_org_type_idx" ON "DocumentTemplate"("organizationId", "type");
CREATE UNIQUE INDEX IF NOT EXISTS "DocumentTemplate_org_type_default_key" ON "DocumentTemplate"("organizationId", "type") WHERE "isDefault" = true;

CREATE TABLE IF NOT EXISTS "GeneratedDocument" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "templateId" TEXT,
  "purchaseOrderId" TEXT,
  "documentType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "htmlSnapshot" TEXT NOT NULL,
  "pdfUrl" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GeneratedDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "GeneratedDocument_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "GeneratedDocument_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "GeneratedDocument_org_type_idx" ON "GeneratedDocument"("organizationId", "documentType");
CREATE INDEX IF NOT EXISTS "GeneratedDocument_po_idx" ON "GeneratedDocument"("purchaseOrderId");

CREATE TABLE IF NOT EXISTS "EmailLog" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "purchaseOrderId" TEXT,
  "generatedDocumentId" TEXT,
  "to" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'resend',
  "providerMessageId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "error" TEXT,
  "sentAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EmailLog_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "EmailLog_generatedDocumentId_fkey" FOREIGN KEY ("generatedDocumentId") REFERENCES "GeneratedDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "EmailLog_org_status_idx" ON "EmailLog"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "EmailLog_po_idx" ON "EmailLog"("purchaseOrderId");
