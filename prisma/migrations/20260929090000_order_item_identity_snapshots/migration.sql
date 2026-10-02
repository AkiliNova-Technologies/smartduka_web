-- Preserve the server-resolved identity displayed at checkout for new orders.
-- Nullable columns keep legacy order history truthful; no current-catalogue backfill is performed.
ALTER TABLE "OrderItem" ADD COLUMN "productNameSnapshot" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "variantNameSnapshot" TEXT;
