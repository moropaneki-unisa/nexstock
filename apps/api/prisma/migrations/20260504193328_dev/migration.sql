-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'member');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('free', 'pro', 'business');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('active', 'archived', 'draft');

-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('adjustment', 'sale', 'purchase', 'import', 'sync', 'manual');

-- CreateEnum
CREATE TYPE "WebhookEvent" AS ENUM ('product_created', 'product_updated', 'inventory_updated', 'webhook_test');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('pending', 'delivered', 'failed', 'dead');

-- CreateEnum
CREATE TYPE "CustomFieldType" AS ENUM ('text', 'number', 'boolean', 'select', 'date', 'json');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "userAgent" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'free',
    "stripeCustomerId" TEXT,
    "skuPrefix" TEXT,
    "nextSkuNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "cost" DECIMAL(12,2),
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "lowStockLevel" INTEGER NOT NULL DEFAULT 5,
    "category" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "status" "ProductStatus" NOT NULL DEFAULT 'active',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomField" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "CustomFieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "defaultValue" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCustomFieldValue" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCustomFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "size" TEXT,
    "color" TEXT,
    "price" DECIMAL(12,2),
    "cost" DECIMAL(12,2),
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "type" "InventoryMovementType" NOT NULL,
    "quantityBefore" INTEGER NOT NULL,
    "quantityAfter" INTEGER NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT,
    "source" TEXT,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY['products:read', 'products:write']::TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Webhook" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" "WebhookEvent"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'pending',
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "statusCode" INTEGER,
    "response" TEXT,
    "nextRetryAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_stripeCustomerId_key" ON "Organization"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Organization_slug_idx" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_skuPrefix_idx" ON "Organization"("skuPrefix");

-- CreateIndex
CREATE INDEX "Membership_organizationId_idx" ON "Membership"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_organizationId_key" ON "Membership"("userId", "organizationId");

-- CreateIndex
CREATE INDEX "Product_organizationId_status_idx" ON "Product"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Product_organizationId_sku_idx" ON "Product"("organizationId", "sku");

-- CreateIndex
CREATE INDEX "Product_organizationId_category_idx" ON "Product"("organizationId", "category");

-- CreateIndex
CREATE INDEX "Product_organizationId_createdAt_idx" ON "Product"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Product_organizationId_sku_key" ON "Product"("organizationId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "Product_id_organizationId_key" ON "Product"("id", "organizationId");

-- CreateIndex
CREATE INDEX "CustomField_organizationId_idx" ON "CustomField"("organizationId");

-- CreateIndex
CREATE INDEX "CustomField_organizationId_type_idx" ON "CustomField"("organizationId", "type");

-- CreateIndex
CREATE INDEX "CustomField_organizationId_isActive_idx" ON "CustomField"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "CustomField_organizationId_order_idx" ON "CustomField"("organizationId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "CustomField_organizationId_key_key" ON "CustomField"("organizationId", "key");

-- CreateIndex
CREATE INDEX "ProductCustomFieldValue_productId_idx" ON "ProductCustomFieldValue"("productId");

-- CreateIndex
CREATE INDEX "ProductCustomFieldValue_fieldId_idx" ON "ProductCustomFieldValue"("fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCustomFieldValue_productId_fieldId_key" ON "ProductCustomFieldValue"("productId", "fieldId");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_productId_sku_key" ON "ProductVariant"("productId", "sku");

-- CreateIndex
CREATE INDEX "InventoryLog_organizationId_createdAt_idx" ON "InventoryLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryLog_productId_createdAt_idx" ON "InventoryLog"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryLog_variantId_idx" ON "InventoryLog"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_organizationId_idx" ON "ApiKey"("organizationId");

-- CreateIndex
CREATE INDEX "ApiKey_keyPrefix_idx" ON "ApiKey"("keyPrefix");

-- CreateIndex
CREATE INDEX "Webhook_organizationId_isActive_idx" ON "Webhook"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "WebhookDelivery_webhookId_status_idx" ON "WebhookDelivery"("webhookId", "status");

-- CreateIndex
CREATE INDEX "WebhookDelivery_status_nextRetryAt_idx" ON "WebhookDelivery"("status", "nextRetryAt");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomField" ADD CONSTRAINT "CustomField_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCustomFieldValue" ADD CONSTRAINT "ProductCustomFieldValue_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCustomFieldValue" ADD CONSTRAINT "ProductCustomFieldValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "CustomField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLog" ADD CONSTRAINT "InventoryLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLog" ADD CONSTRAINT "InventoryLog_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLog" ADD CONSTRAINT "InventoryLog_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "Webhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
