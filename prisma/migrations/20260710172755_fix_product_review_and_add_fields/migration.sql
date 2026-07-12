/*
  Warnings:

  - You are about to drop the column `customerId` on the `ProductReview` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[slug]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[productId,userId]` on the table `ProductReview` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `ProductReview` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "ProductStatus" ADD VALUE 'PUBLISHED';

-- DropForeignKey
ALTER TABLE "ProductReview" DROP CONSTRAINT "ProductReview_customerId_fkey";

-- DropIndex
DROP INDEX "ProductReview_productId_customerId_key";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "brand" TEXT,
ADD COLUMN     "colors" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "inventoryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sizes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "specs" JSONB,
ADD COLUMN     "subCategoryId" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "ProductReview" DROP COLUMN "customerId",
ADD COLUMN     "userId" TEXT NOT NULL,
ADD COLUMN     "verifiedPurchase" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_subCategoryId_idx" ON "Product"("subCategoryId");

-- CreateIndex
CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");

-- CreateIndex
CREATE INDEX "ProductReview_userId_idx" ON "ProductReview"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductReview_productId_userId_key" ON "ProductReview"("productId", "userId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
