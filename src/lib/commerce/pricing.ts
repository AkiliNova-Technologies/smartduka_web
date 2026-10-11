/**
 * Returns a customer-facing whole-number markdown, or null when the prices do
 * not describe a valid positive discount.
 */
export function calculateDiscountPercentage(
  price: number,
  compareAtPrice: number | null | undefined,
): number | null {
  if (
    !Number.isFinite(price) ||
    !Number.isFinite(compareAtPrice) ||
    compareAtPrice == null ||
    compareAtPrice <= 0 ||
    compareAtPrice <= price
  ) {
    return null;
  }

  const percentage = Math.round(
    ((compareAtPrice - price) / compareAtPrice) * 100,
  );
  return Number.isFinite(percentage) && percentage > 0 ? percentage : null;
}
