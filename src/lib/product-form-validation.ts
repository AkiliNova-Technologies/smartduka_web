export type ProductFormErrors = Record<string, string>;

export function validateProductStep(
  step: number,
  values: { title?: string; price?: string; categoryId?: string; image?: string; inventoryCount?: string },
): ProductFormErrors {
  const errors: ProductFormErrors = {};
  if (step === 1) {
    if (!values.title?.trim()) errors.title = "Product title is required.";
    const price = Number(values.price);
    if (!values.price?.trim() || !Number.isFinite(price) || price < 0) errors.price = "Enter a valid selling price.";
    if (!values.categoryId) errors.categoryId = "Select a category.";
    const stock = Number(values.inventoryCount);
    if (values.inventoryCount && (!Number.isInteger(stock) || stock < 0)) errors.inventoryCount = "Stock quantity must be zero or greater.";
  }
  if (step === 2 && !values.image?.trim()) errors.image = "Upload a primary product image.";
  return errors;
}
