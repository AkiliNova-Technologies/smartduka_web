-- Bounded related-product lookups filter by an assigned category and public
-- status, then use creation time as their stable recommendation order.
CREATE INDEX "Product_categoryId_status_createdAt_idx" ON "Product"("categoryId", "status", "createdAt");
CREATE INDEX "Product_subCategoryId_status_createdAt_idx" ON "Product"("subCategoryId", "status", "createdAt");
