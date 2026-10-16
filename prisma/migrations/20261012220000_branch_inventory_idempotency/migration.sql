ALTER TABLE "InventoryMovement" ADD COLUMN "requestId" TEXT;
CREATE UNIQUE INDEX "InventoryMovement_shopId_requestId_key" ON "InventoryMovement"("shopId", "requestId");
