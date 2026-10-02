ALTER TABLE "ProductCategory"
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "ProductCategory_isActive_sortOrder_name_idx"
  ON "ProductCategory"("isActive", "sortOrder", "name");
