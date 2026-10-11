ALTER TABLE "ProductCategory" ADD COLUMN "taxonomyKey" TEXT;
CREATE UNIQUE INDEX "ProductCategory_taxonomyKey_key" ON "ProductCategory"("taxonomyKey");
