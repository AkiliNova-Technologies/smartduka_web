CREATE TABLE "RefundItem" ("id" TEXT NOT NULL, "refundId" TEXT NOT NULL, "orderItemId" TEXT NOT NULL, "quantity" INTEGER NOT NULL, "grossAmount" DECIMAL(18,2) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "RefundItem_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "RefundItem_refundId_orderItemId_key" ON "RefundItem"("refundId", "orderItemId");
CREATE INDEX "RefundItem_orderItemId_idx" ON "RefundItem"("orderItemId");
ALTER TABLE "RefundItem" ADD CONSTRAINT "RefundItem_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RefundItem" ADD CONSTRAINT "RefundItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
