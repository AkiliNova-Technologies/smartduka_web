ALTER TABLE "ProductVariant"
  ADD COLUMN "optionKey" TEXT,
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Preserve existing variants without inventing option combinations. Existing
-- rows receive a stable unique legacy key and remain purchasable as before.
UPDATE "ProductVariant" SET "optionKey" = 'legacy:' || "id" WHERE "optionKey" IS NULL;
ALTER TABLE "ProductVariant" ALTER COLUMN "optionKey" SET NOT NULL;
CREATE UNIQUE INDEX "ProductVariant_productId_optionKey_key" ON "ProductVariant"("productId", "optionKey");

ALTER TABLE "OrderItem" ADD COLUMN "variantOptionsSnapshot" JSONB;
