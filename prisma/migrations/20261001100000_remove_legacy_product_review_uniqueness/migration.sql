-- The prior review migration attempted to remove this legacy rule as a
-- constraint. It is an index, so it survived. Verified reviews are unique per
-- purchased order item, not per customer/product across all purchases.
DROP INDEX IF EXISTS "ProductReview_productId_userId_key";
