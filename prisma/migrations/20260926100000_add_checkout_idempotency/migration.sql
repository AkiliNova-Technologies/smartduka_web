-- Database-backed checkout retry identity. Existing historical orders remain null.
ALTER TABLE "Order" ADD COLUMN "checkoutRequestId" TEXT;
ALTER TABLE "Order" ADD COLUMN "checkoutRequestHash" TEXT;
CREATE UNIQUE INDEX "Order_customerId_checkoutRequestId_key" ON "Order"("customerId", "checkoutRequestId");
