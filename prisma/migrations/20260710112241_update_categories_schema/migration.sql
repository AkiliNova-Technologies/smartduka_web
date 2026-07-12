-- AlterTable
ALTER TABLE "ProductCategory" ADD COLUMN     "image" TEXT;

-- CreateIndex
CREATE INDEX "ProductCategory_parentId_idx" ON "ProductCategory"("parentId");
