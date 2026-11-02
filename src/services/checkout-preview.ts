import { Decimal } from "@prisma/client/runtime/client";
import type { FulfillmentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { publicProductWhere } from "@/lib/marketplace-eligibility";
import { PaymentProviderRegistry } from "@/lib/payments/payment-provider";
import { calculateCheckoutTotals, type ResolvedCheckoutLine } from "@/services/order";
import { getBasketBranchAvailability, getPublicFulfillmentOptions } from "@/services/fulfillment-options";

type PreviewInput = { items: Array<{ productId: string; variantId?: string | null; quantity: number }>; addressId?: string; fulfillmentSelections?: Array<{ vendorId: string; method: FulfillmentMethod; branchId?: string }> };

export async function previewCheckout(customerId: string, input: PreviewInput) {
  const address = input.addressId ? await prisma.customerAddress.findFirst({ where: { id: input.addressId, customerId }, select: { id: true, label: true, recipientName: true, recipientPhone: true, district: true, city: true, area: true, street: true, building: true, landmark: true, country: true, deliveryInstructions: true } }) : null;
  if (input.addressId && !address) throw Object.assign(new Error("The selected delivery address is unavailable."), { code: "NOT_FOUND" });
  const products = await prisma.product.findMany({
    where: { ...publicProductWhere, id: { in: input.items.map((item) => item.productId) } },
    select: { id: true, name: true, basePrice: true, inventoryCount: true, vendorId: true, images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } }, variants: { select: { id: true, name: true, price: true, inventoryCount: true, isActive: true, options: true } }, vendor: { select: { storeName: true, paymentAccounts: { where: { status: "VERIFIED", suspendedAt: null }, select: { provider: true } } } } },
  });
  const byId = new Map(products.map((product) => [product.id, product]));
  const issues: Array<{ productId?: string; vendorId?: string; code: string; message: string }> = [];
  const items = input.items.map((item) => {
    const product = byId.get(item.productId);
    if (!product) { issues.push({ productId: item.productId, code: "PRODUCT_UNAVAILABLE", message: "This product is no longer available." }); return null; }
    const variant = item.variantId ? product.variants.find((entry) => entry.id === item.variantId && entry.isActive) : null;
    if ((item.variantId && !variant) || (!item.variantId && product.variants.length)) { issues.push({ productId: item.productId, code: "INVALID_VARIANT", message: "The selected product option is unavailable." }); return null; }
    const available = variant?.inventoryCount ?? product.inventoryCount;
    if (available < item.quantity) issues.push({ productId: item.productId, code: "INSUFFICIENT_STOCK", message: available === 0 ? "This product is out of stock." : `Only ${available} available.` });
    return { productId: product.id, variantId: variant?.id ?? null, name: product.name, image: product.images[0]?.url ?? null, variantName: variant?.name ?? null, variantOptions: variant?.options ?? null, unitPrice: Number(variant?.price ?? product.basePrice), quantity: item.quantity, lineTotal: Number(variant?.price ?? product.basePrice) * item.quantity, availableQuantity: available, vendorId: product.vendorId, vendorName: product.vendor.storeName };
  }).filter(Boolean) as Array<{ productId: string; variantId: string | null; name: string; image: string | null; variantName: string | null; variantOptions: unknown; unitPrice: number; quantity: number; lineTotal: number; availableQuantity: number; vendorId: string; vendorName: string }>;
  const vendorIds = [...new Set(items.map((item) => item.vendorId))];
  const options = await getPublicFulfillmentOptions(vendorIds);
  const optionByVendor = new Map(options.map((option) => [option.id, option]));
  const requested = new Map((input.fulfillmentSelections ?? []).map((selection) => [selection.vendorId, selection]));
  const selections = new Map<string, FulfillmentMethod>();
  const lines: ResolvedCheckoutLine[] = [];
  const vendors = [];
  for (const vendorId of vendorIds) {
    const vendorItems = items.filter((item) => item.vendorId === vendorId);
    const option = optionByVendor.get(vendorId);
    if (!option) { issues.push({ vendorId, code: "VENDOR_UNAVAILABLE", message: "This shop is unavailable." }); continue; }
    const selection = requested.get(vendorId);
    const method = selection?.method ?? (option.fulfillmentMethods.includes("DELIVERY") ? "DELIVERY" : "PICKUP");
    selections.set(vendorId, method);
    const availability = await getBasketBranchAvailability(vendorId, vendorItems.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })), { method, district: address?.district });
    const branchStatus = new Map((availability?.branches ?? []).map((branch) => [branch.id, branch]));
    const eligible = option.branches.filter((branch) => (method === "DELIVERY" ? branch.deliveryEnabled : branch.pickupEnabled) && branchStatus.get(branch.id)?.status === "AVAILABLE");
    const branch = selection?.branchId ? eligible.find((entry) => entry.id === selection.branchId) : eligible.length === 1 ? eligible[0] : eligible.find((entry) => entry.isPrimary);
    if (option.branches.length && !branch) issues.push({ vendorId, code: method === "DELIVERY" && address ? "DELIVERY_AREA_UNSUPPORTED" : "FULFILLMENT_UNAVAILABLE", message: method === "DELIVERY" ? "No eligible delivery location is available." : "Choose an available pickup location." });
    const fee = method === "PICKUP" ? 0 : branch?.deliveryFee ?? option.deliveryFee;
    for (const item of vendorItems) lines.push({ productId: item.productId, variantId: item.variantId, vendorId, quantity: item.quantity, unitPrice: new Decimal(item.unitPrice), commissionRate: new Decimal(0), productNameSnapshot: item.name, variantNameSnapshot: item.variantName, fulfillmentMethods: option.fulfillmentMethods, deliveryFee: new Decimal(fee), deliveryEstimate: branch?.deliveryEstimate ?? option.deliveryEstimate, pickupLocation: branch?.addressLine ?? option.pickupLocation, branchId: branch?.id ?? null, branchName: branch?.name ?? null });
    const product = products.find((entry) => entry.vendorId === vendorId);
    vendors.push({ vendorId, vendorName: option.storeName, fulfillment: option, availability: availability?.branches ?? [], selectedMethod: method, selectedBranchId: branch?.id ?? null, paymentMethods: [...new Set(product?.vendor.paymentAccounts.map((account) => account.provider).filter((provider) => PaymentProviderRegistry.getReadiness(provider).customerPaymentsReady) ?? [])] });
  }
  const valid = issues.length === 0 && lines.length === input.items.length;
  const totals = valid ? calculateCheckoutTotals(lines, selections) : null;
  return { valid, address, items, vendors, issues, totals: totals ? { subtotal: Number(totals.subtotal), deliveryFees: Number(totals.shipping), discount: Number(totals.discount), total: Number(totals.total), currency: "UGX", vendorTotals: totals.vendorGroups.map((group) => ({ vendorId: group.vendorId, subtotal: Number(group.subtotal), deliveryFee: Number(group.shipping), total: Number(group.total) })) } : null };
}
