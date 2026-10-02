import { createHash, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma/client";
import { PLATFORM_CURRENCY } from "@/lib/commerce/currency";
import {
  OrderStatus,
  PaymentGateway,
  PaymentStatus,
  Prisma,
  ProductStatus,
  SubOrderStatus,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/client";
import { MarketplaceEconomicsService } from "@/services/marketplace-economics";
import { isFulfillmentMethod, type FulfillmentMethod } from "@/lib/fulfillment";

export interface CheckoutIntent {
  items: Array<{
    productId: string;
    variantId?: string | null;
    quantity: number;
  }>;
  shippingAddress: string;
  shippingPhone: string;
  shippingEmail?: string;
  fulfillmentSelections?: Array<{ vendorId: string; method: FulfillmentMethod }>;
  paymentGateway: PaymentGateway;
  checkoutRequestId: string;
  notes?: string;
}
interface CreateOrderInput extends CheckoutIntent {
  userId: string;
}
export class CheckoutError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "INVALID_CHECKOUT"
      | "PRODUCT_UNAVAILABLE"
      | "VARIANT_UNAVAILABLE"
      | "INSUFFICIENT_STOCK"
      | "IDEMPOTENCY_KEY_REQUIRED"
      | "IDEMPOTENCY_CONFLICT"
      | "CHECKOUT_FAILED",
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}
export const SUB_ORDER_ALLOWED_TRANSITIONS: Partial<Record<SubOrderStatus, SubOrderStatus[]>> = {
  PENDING: [SubOrderStatus.PROCESSING, SubOrderStatus.CANCELLED],
  PROCESSING: [SubOrderStatus.READY_FOR_PICKUP, SubOrderStatus.SHIPPED, SubOrderStatus.CANCELLED],
  READY_FOR_PICKUP: [SubOrderStatus.SHIPPED, SubOrderStatus.CANCELLED],
  SHIPPED: [SubOrderStatus.DELIVERED, SubOrderStatus.CANCELLED],
};

export interface ResolvedCheckoutLine {
  productId: string;
  variantId: string | null;
  vendorId: string;
  quantity: number;
  unitPrice: Decimal;
  commissionRate: Decimal;
  productNameSnapshot?: string;
  variantNameSnapshot?: string | null;
  variantOptionsSnapshot?: Prisma.InputJsonValue | null;
  fulfillmentMethods?: FulfillmentMethod[];
  deliveryFee?: Decimal;
  deliveryEstimate?: string | null;
  pickupLocation?: string | null;
  pickupDirections?: string | null;
  pickupInstructions?: string | null;
  returnWindowDays?: number;
  returnPolicy?: string | null;
  returnInstructions?: string | null;
  returnAddress?: string | null;
  acceptsExchanges?: boolean;
  exchangePolicy?: string | null;
}
export interface CheckoutCalculation {
  items: Array<ResolvedCheckoutLine & { lineSubtotal: Decimal }>;
  vendorGroups: Array<{
    vendorId: string;
    fulfillmentMethod: FulfillmentMethod;
    subtotal: Decimal;
    shipping: Decimal;
    tax: Decimal;
    discount: Decimal;
    total: Decimal;
    platformCommission: Decimal;
    commissionRate: Decimal;
    vendorNetEntitlement: Decimal;
    items: Array<ResolvedCheckoutLine & { lineSubtotal: Decimal }>;
  }>;
  subtotal: Decimal;
  shipping: Decimal;
  tax: Decimal;
  discount: Decimal;
  total: Decimal;
}
const ZERO = new Decimal(0);
export const DEFAULT_MARKETPLACE_COMMISSION_RATE = new Decimal("10");
export function resolveCommissionRate(value: unknown): Decimal {
  let rate: Decimal;
  try {
    rate = value == null ? DEFAULT_MARKETPLACE_COMMISSION_RATE : new Decimal(String(value));
  } catch {
    throw new CheckoutError("Vendor commission configuration is invalid.", "INVALID_CHECKOUT");
  }
  if (!rate.isFinite() || rate.lessThan(0) || rate.greaterThan(100)) throw new CheckoutError("Vendor commission configuration is invalid.", "INVALID_CHECKOUT");
  return rate;
}
const SHIPPING_PER_VENDOR = new Decimal(3500); // Backward-compatible default for shops created before fulfilment settings.
const paymentGateways = new Set(Object.values(PaymentGateway));

function validateCheckoutIntent(input: CreateOrderInput) {
  if (!input.userId || !Array.isArray(input.items) || input.items.length === 0)
    throw new CheckoutError(
      "Your shopping cart cannot be empty.",
      "INVALID_CHECKOUT",
    );
  if (!input.shippingPhone?.trim())
    throw new CheckoutError(
      "A phone number is required.",
      "INVALID_CHECKOUT",
    );
  if (
    !input.checkoutRequestId ||
    input.checkoutRequestId.length > 128 ||
    !/^[A-Za-z0-9_-]{16,128}$/.test(input.checkoutRequestId)
  )
    throw new CheckoutError(
      "A valid checkout request ID is required.",
      "IDEMPOTENCY_KEY_REQUIRED",
    );
  if (!paymentGateways.has(input.paymentGateway))
    throw new CheckoutError(
      "Select a supported payment method.",
      "INVALID_CHECKOUT",
    );
  for (const item of input.items)
    if (
      !item?.productId ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity <= 0
    )
      throw new CheckoutError(
        "Your cart contains an invalid item.",
        "INVALID_CHECKOUT",
      );
}

export function checkoutRequestHash(input: CheckoutIntent) {
  const intent = {
    items: [...input.items]
      .map(({ productId, variantId, quantity }) => ({
        productId,
        variantId: variantId ?? null,
        quantity,
      }))
      .sort((a, b) =>
        `${a.productId}:${a.variantId ?? ""}`.localeCompare(
          `${b.productId}:${b.variantId ?? ""}`,
        ),
      ),
    shippingAddress: input.shippingAddress.trim(),
    shippingPhone: input.shippingPhone.trim(),
    shippingEmail: input.shippingEmail?.trim() ?? "",
    paymentGateway: input.paymentGateway,
    fulfillmentSelections: [...(input.fulfillmentSelections ?? [])]
      .map(({ vendorId, method }) => ({ vendorId, method }))
      .sort((a, b) => a.vendorId.localeCompare(b.vendorId)),
    notes: input.notes?.trim() ?? "",
  };
  return createHash("sha256").update(JSON.stringify(intent)).digest("hex");
}

function isCheckoutIdempotencyP2002(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002")
    return false;

  const target = error.meta?.target;
  if (Array.isArray(target))
    return target.length === 2 && target.includes("customerId") && target.includes("checkoutRequestId");

  return typeof target === "string" && target.includes("Order_customerId_checkoutRequestId_key");
}

/** Deterministic money calculation over server-resolved catalogue lines only. */
export function calculateCheckoutTotals(
  lines: ResolvedCheckoutLine[],
  selections: Map<string, FulfillmentMethod> = new Map(),
): CheckoutCalculation {
  const byVendor = new Map<
    string,
    Array<ResolvedCheckoutLine & { lineSubtotal: Decimal }>
  >();
  const items = lines.map((line) => {
    if (!line.unitPrice.isFinite() || line.unitPrice.lessThanOrEqualTo(ZERO))
      throw new CheckoutError(
        "A product has an invalid current price.",
        "INVALID_CHECKOUT",
      );
    const lineSubtotal = line.unitPrice.times(line.quantity);
    if (!lineSubtotal.isFinite())
      throw new CheckoutError(
        "Checkout amount is invalid.",
        "INVALID_CHECKOUT",
      );
    const calculated = { ...line, lineSubtotal };
    const group = byVendor.get(line.vendorId) ?? [];
    group.push(calculated);
    byVendor.set(line.vendorId, group);
    return calculated;
  });
  const vendorGroups = [...byVendor.entries()].map(([vendorId, groupItems]) => {
    const subtotal = groupItems.reduce(
      (sum, item) => sum.plus(item.lineSubtotal),
      ZERO,
    );
    const availableMethods = groupItems[0].fulfillmentMethods ?? ["DELIVERY"];
    const requestedMethod = selections.get(vendorId);
    const method = requestedMethod ?? (availableMethods.includes("DELIVERY") ? "DELIVERY" : "PICKUP");
    if (!availableMethods.includes(method))
      throw new CheckoutError("This shop no longer offers the selected fulfilment method.", "INVALID_CHECKOUT");
    if (method === "PICKUP" && !groupItems[0].pickupLocation?.trim())
      throw new CheckoutError("This shop's pickup location is unavailable. Choose delivery or try again later.", "INVALID_CHECKOUT");
    const shipping = method === "PICKUP" ? ZERO : groupItems[0].deliveryFee ?? SHIPPING_PER_VENDOR;
    const tax = ZERO; // TAX ENGINE NOT YET IMPLEMENTED
    const discount = ZERO; // No order discount engine or schema field.
    return {
      vendorId,
      fulfillmentMethod: method,
      subtotal,
      shipping,
      tax,
      discount,
      total: subtotal.plus(shipping).plus(tax).minus(discount),
      commissionRate: groupItems[0].commissionRate,
      platformCommission: subtotal.times(groupItems[0].commissionRate).dividedBy(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
      vendorNetEntitlement: subtotal.minus(subtotal.times(groupItems[0].commissionRate).dividedBy(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)),
      items: groupItems,
    };
  });
  const subtotal = vendorGroups.reduce(
    (sum, group) => sum.plus(group.subtotal),
    ZERO,
  );
  const shipping = vendorGroups.reduce(
    (sum, group) => sum.plus(group.shipping),
    ZERO,
  );
  const tax = vendorGroups.reduce((sum, group) => sum.plus(group.tax), ZERO);
  const discount = vendorGroups.reduce(
    (sum, group) => sum.plus(group.discount),
    ZERO,
  );
  const total = subtotal.plus(shipping).plus(tax).minus(discount);
  if (total.lessThan(ZERO))
    throw new CheckoutError("Checkout total is invalid.", "INVALID_CHECKOUT");
  return { items, vendorGroups, subtotal, shipping, tax, discount, total };
}
function createOrderNumber() {
  return `SD-${randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`;
}

export class OrderService {
  static async createOrder(input: CreateOrderInput) {
    validateCheckoutIntent(input);
    const requestHash = checkoutRequestHash(input);
    const existing = await prisma.order.findFirst({
      where: {
        customerId: input.userId,
        checkoutRequestId: input.checkoutRequestId,
      },
    });
    if (existing) {
      if (existing.checkoutRequestHash !== requestHash)
        throw new CheckoutError(
          "This checkout request ID was already used for different details.",
          "IDEMPOTENCY_CONFLICT",
        );
      return existing;
    }
    const reusablePendingOrder = await prisma.order.findFirst({
      where: {
        customerId: input.userId,
        checkoutRequestHash: requestHash,
        paymentGateway: input.paymentGateway,
        paymentStatus: PaymentStatus.PENDING,
        status: OrderStatus.PENDING,
      },
      orderBy: { createdAt: "desc" },
    });
    if (reusablePendingOrder) return reusablePendingOrder;
    try {
      return await prisma.$transaction(async (tx) => {
        const products = await tx.product.findMany({
          where: {
            status: { in: [ProductStatus.ACTIVE, ProductStatus.PUBLISHED] },
            deletedAt: null,
          },
          include: {
            variants: true,
        vendor: {
              include: {
                subscriptions: {
                  where: { status: "ACTIVE" },
                  include: { plan: true },
                  take: 1,
                },
              },
            },
          },
        });
        const productById = new Map(
          products.map((product) => [product.id, product]),
        );
        const lines: ResolvedCheckoutLine[] = input.items.map((item) => {
          const product = productById.get(item.productId);
          if (!product)
            throw new CheckoutError(
              "A product in your cart is no longer available.",
              "PRODUCT_UNAVAILABLE",
            );
          const variant = item.variantId
            ? product.variants.find(
                (candidate) => candidate.id === item.variantId,
              )
            : null;
          if (item.variantId && !variant)
            throw new CheckoutError(
              "A selected product option is no longer available.",
              "VARIANT_UNAVAILABLE",
            );
          if (variant && variant.isActive === false)
            throw new CheckoutError("A selected product option is no longer available.", "VARIANT_UNAVAILABLE");
          // Any persisted variant record makes this a variant product.  In particular,
          // a product whose variants were all retired must not fall back to base price
          // and parent stock as if it were a genuine simple product.
          if (!item.variantId && product.variants.length > 0)
            throw new CheckoutError("Select a product option before checkout.", "VARIANT_UNAVAILABLE");
          return {
            productId: product.id,
            variantId: variant?.id ?? null,
            vendorId: product.vendorId,
            quantity: item.quantity,
            unitPrice: new Decimal(
              (variant?.price ?? product.basePrice).toString(),
            ),
            commissionRate: resolveCommissionRate(product.vendor.subscriptions[0]?.plan.commissionRate),
            productNameSnapshot: product.name,
            variantNameSnapshot: variant?.name ?? null,
            variantOptionsSnapshot: variant?.options ?? null,
            fulfillmentMethods: product.vendor.fulfillmentMethods,
            deliveryFee: product.vendor.deliveryFee,
            deliveryEstimate: product.vendor.deliveryEstimate,
            pickupLocation: product.vendor.pickupLocation,
            pickupDirections: product.vendor.pickupDirections,
            pickupInstructions: product.vendor.pickupInstructions,
            returnWindowDays: product.vendor.returnWindowDays,
            returnPolicy: product.vendor.returnPolicy,
            returnInstructions: product.vendor.returnInstructions,
            returnAddress: product.vendor.returnAddress,
            acceptsExchanges: product.vendor.acceptsExchanges,
            exchangePolicy: product.vendor.exchangePolicy,
          };
        });
        const stockRequirements = new Map<
          string,
          { id: string; variant: boolean; quantity: number }
        >();
        for (const line of lines) {
          const key = line.variantId
            ? `variant:${line.variantId}`
            : `product:${line.productId}`;
          const requirement = stockRequirements.get(key) ?? {
            id: line.variantId ?? line.productId,
            variant: Boolean(line.variantId),
            quantity: 0,
          };
          requirement.quantity += line.quantity;
          stockRequirements.set(key, requirement);
        }
        for (const requirement of stockRequirements.values()) {
          const result = requirement.variant
            ? await tx.productVariant.updateMany({
                where: {
                  id: requirement.id,
                  inventoryCount: { gte: requirement.quantity },
                },
                data: { inventoryCount: { decrement: requirement.quantity } },
              })
            : await tx.product.updateMany({
                where: {
                  id: requirement.id,
                  inventoryCount: { gte: requirement.quantity },
                },
                data: { inventoryCount: { decrement: requirement.quantity } },
              });
          if (result.count !== 1)
            throw new CheckoutError(
              "A selected item no longer has enough stock.",
              "INSUFFICIENT_STOCK",
            );
        }
        const selections = new Map<string, FulfillmentMethod>();
        for (const selection of input.fulfillmentSelections ?? []) {
          if (!selection?.vendorId || !isFulfillmentMethod(selection.method) || selections.has(selection.vendorId))
            throw new CheckoutError("Choose a valid fulfilment option for each shop.", "INVALID_CHECKOUT");
          selections.set(selection.vendorId, selection.method);
        }
        const calculation = calculateCheckoutTotals(lines, selections);
        if (calculation.vendorGroups.some((group) => group.fulfillmentMethod === "DELIVERY") && !input.shippingAddress?.trim())
          throw new CheckoutError("A delivery address is required for delivery orders.", "INVALID_CHECKOUT");
        const orderNumber = createOrderNumber();
        const order = await tx.order.create({
          data: {
            customerId: input.userId,
            orderNumber,
            subTotal: calculation.subtotal,
            totalShipping: calculation.shipping,
            taxAmount: calculation.tax,
            totalAmount: calculation.total,
            status: OrderStatus.PENDING,
            paymentGateway: input.paymentGateway,
            paymentStatus: PaymentStatus.PENDING,
            checkoutRequestId: input.checkoutRequestId,
            currency: PLATFORM_CURRENCY,
            checkoutRequestHash: requestHash,
            shippingAddress: input.shippingAddress.trim(),
            shippingPhone: input.shippingPhone.trim(),
            shippingEmail: input.shippingEmail?.trim() || "",
            notes: input.notes?.trim() || null,
          },
        });
        for (const [index, group] of calculation.vendorGroups.entries()) {
          const suborder = await tx.subOrder.create({
            data: {
              orderId: order.id,
              vendorId: group.vendorId,
              subOrderNumber: `${orderNumber}-V${index + 1}`,
              vendorSubTotal: group.subtotal,
              vendorShipping: group.shipping,
              vendorTotal: group.total,
              platformCommission: group.platformCommission,
              commissionRate: group.commissionRate,
              vendorNetEntitlement: group.vendorNetEntitlement,
              paymentProcessingFee: ZERO,
              status: SubOrderStatus.PENDING,
              fulfillmentMethod: group.fulfillmentMethod,
              fulfillmentSnapshot: {
                method: group.fulfillmentMethod,
                deliveryFee: group.shipping.toString(),
                deliveryEstimate: group.items[0].deliveryEstimate ?? null,
                pickupLocation: group.items[0].pickupLocation ?? null,
                pickupDirections: group.items[0].pickupDirections ?? null,
                pickupInstructions: group.items[0].pickupInstructions ?? null,
              },
              refundPolicySnapshot: {
                returnWindowDays: group.items[0].returnWindowDays ?? 7,
                policy: group.items[0].returnPolicy ?? null,
                instructions: group.items[0].returnInstructions ?? null,
                returnAddress: group.items[0].returnAddress ?? null,
                acceptsExchanges: group.items[0].acceptsExchanges ?? false,
                exchangePolicy: group.items[0].exchangePolicy ?? null,
              },
            },
          });
          await tx.orderItem.createMany({
            data: group.items.map((item) => ({
              orderId: order.id,
              subOrderId: suborder.id,
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
              priceAtPurchase: item.unitPrice,
              totalPrice: item.lineSubtotal,
              productNameSnapshot: item.productNameSnapshot,
              variantNameSnapshot: item.variantNameSnapshot,
              variantOptionsSnapshot: item.variantOptionsSnapshot ?? undefined,
            })),
          });
          await tx.notification.create({
            data: {
              vendorId: group.vendorId,
              type: "ORDER_PLACED",
              title: "New Order Received",
              message: `Order ${suborder.subOrderNumber} requires fulfillment.`,
            },
          });
        }
        return order;
      });
    } catch (error) {
      if (isCheckoutIdempotencyP2002(error)) {
        const winningOrder = await prisma.order.findFirst({
          where: {
            customerId: input.userId,
            checkoutRequestId: input.checkoutRequestId,
          },
        });
        if (!winningOrder) throw error;
        if (winningOrder.checkoutRequestHash !== requestHash)
          throw new CheckoutError(
            "This checkout request ID was already used for different details.",
            "IDEMPOTENCY_CONFLICT",
          );
        return winningOrder;
      }
      if (error instanceof CheckoutError) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
        throw error;
      throw new CheckoutError(
        "We could not place your order. Please try again.",
        "CHECKOUT_FAILED",
      );
    }
  }

  static async getUserOrders(userId: string) {
    const orders = await prisma.order.findMany({
      where: { customerId: userId },
      include: {
        orderItems: {
          include: {
            productReview: { select: { id: true, rating: true, title: true, comment: true, imageUrls: true } },
            product: {
              select: {
                id: true,
                name: true,
                images: { take: 1, orderBy: { sortOrder: "asc" } },
                vendor: { select: { storeName: true } },
              },
            },
          },
        },
        subOrders: {
          select: {
            id: true,
            status: true,
            subOrderNumber: true,
            vendor: { select: { storeName: true } },
            shopReview: { select: { id: true, rating: true, comment: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentGateway: order.paymentGateway,
      totalAmount: Number(order.totalAmount),
      subTotal: Number(order.subTotal),
      totalShipping: Number(order.totalShipping),
      createdAt: order.createdAt.toISOString(),
      items: order.orderItems.map((item) => ({
        id: item.id,
        productId: item.productId,
        subOrderId: item.subOrderId,
        variantName: item.variantNameSnapshot,
        name: item.productNameSnapshot ?? item.product.name,
        quantity: item.quantity,
        price: Number(item.priceAtPurchase),
        image: item.product.images[0]?.url || null,
        vendorName: item.product.vendor.storeName,
        canReview: order.paymentStatus === "COMPLETED" && order.status !== "REFUNDED" && order.status !== "FAILED" && order.subOrders.find((subOrder) => subOrder.id === item.subOrderId)?.status === "DELIVERED",
        review: item.productReview,
      })),
      subOrders: order.subOrders.map((so) => ({
        id: so.id,
        status: so.status,
        subOrderNumber: so.subOrderNumber,
        vendorName: so.vendor.storeName,
        canReview: order.paymentStatus === "COMPLETED" && order.status !== "REFUNDED" && so.status === "DELIVERED",
        review: so.shopReview,
      })),
    }));
  }

  static async updateSubOrderStatus(
    subOrderId: string,
    status: SubOrderStatus,
    vendorId: string,
  ) {
    const existing = await prisma.subOrder.findFirst({
      where: { id: subOrderId, vendorId },
      select: { id: true, status: true },
    });

    if (!existing) return null;
    if (!SUB_ORDER_ALLOWED_TRANSITIONS[existing.status]?.includes(status))
      throw new CheckoutError("Invalid SubOrder fulfillment status transition.", "INVALID_CHECKOUT");

    const updated = await prisma.subOrder.update({
      where: { id: subOrderId },
      data: { status },
      include: {
        order: {
          select: {
            id: true,
            customerId: true,
            orderNumber: true,
          },
        },
      },
    });

    if (status === SubOrderStatus.DELIVERED) {
      await prisma.notification.create({
        data: {
          userId: updated.order.customerId,
          type: "SUCCESS",
          title: "Order Delivered",
          message: `Your order ${updated.order.orderNumber} (${updated.subOrderNumber}) has been delivered.`,
        },
      });
      try {
        await MarketplaceEconomicsService.releaseVendorEarningsForSubOrder(updated.id);
      } catch {
        // Delivery is authoritative; earnings release can be reconciled safely later.
      }
    }

    return updated;
  }
}
