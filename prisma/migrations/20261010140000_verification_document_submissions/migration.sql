-- Preserve the exact document records submitted for each shop-verification
-- application without duplicating files or document metadata.
CREATE TABLE "ShopVerificationDocument" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "documentId" TEXT,
  "vendorDocumentId" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShopVerificationDocument_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ShopVerificationDocument_exactly_one_source_check"
    CHECK (("documentId" IS NOT NULL)::int + ("vendorDocumentId" IS NOT NULL)::int = 1)
);

CREATE UNIQUE INDEX "ShopVerificationDocument_applicationId_documentId_key"
  ON "ShopVerificationDocument"("applicationId", "documentId");
CREATE UNIQUE INDEX "ShopVerificationDocument_applicationId_vendorDocumentId_key"
  ON "ShopVerificationDocument"("applicationId", "vendorDocumentId");
CREATE INDEX "ShopVerificationDocument_documentId_idx"
  ON "ShopVerificationDocument"("documentId");
CREATE INDEX "ShopVerificationDocument_vendorDocumentId_idx"
  ON "ShopVerificationDocument"("vendorDocumentId");

ALTER TABLE "ShopVerificationDocument"
  ADD CONSTRAINT "ShopVerificationDocument_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "ShopVerificationApplication"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopVerificationDocument"
  ADD CONSTRAINT "ShopVerificationDocument_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "Document"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShopVerificationDocument"
  ADD CONSTRAINT "ShopVerificationDocument_vendorDocumentId_fkey"
  FOREIGN KEY ("vendorDocumentId") REFERENCES "VendorDocument"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Historical applications predate explicit attachment rows. Associate the
-- shop's surviving document records as the best available legacy review set.
INSERT INTO "ShopVerificationDocument" ("id", "applicationId", "documentId", "submittedAt")
SELECT md5(a."id" || ':profile:' || d."id"), a."id", d."id", a."submittedAt"
FROM "ShopVerificationApplication" a
JOIN "Document" d ON d."vendorId" = a."vendorId";

INSERT INTO "ShopVerificationDocument" ("id", "applicationId", "vendorDocumentId", "submittedAt")
SELECT md5(a."id" || ':onboarding:' || d."id"), a."id", d."id", a."submittedAt"
FROM "ShopVerificationApplication" a
JOIN "VendorApplication" va ON va."vendorProfileId" = a."vendorId"
JOIN "VendorDocument" d ON d."applicationId" = va."id";

-- Application-level checks are race-prone. PostgreSQL is the final authority
-- preventing two active review cases for one shop.
CREATE UNIQUE INDEX "ShopVerificationApplication_one_active_per_vendor_key"
  ON "ShopVerificationApplication"("vendorId")
  WHERE "status" IN ('PENDING', 'UNDER_REVIEW', 'NEEDS_INFORMATION');
