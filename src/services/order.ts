import { createHash, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma/client";
import { PLATFORM_CURRENCY } from "@/lib/commerce/currency";
import {
  OrderStatus,
  PaymentGateway,
  PaymentStatus,
  Prisma,
  SubOrderStatus,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/client";
import { isFulfillmentMethod, type FulfillmentMethod } from "@/lib/fulfillment";
import { PaymentProviderRegistry } from "@/lib/payments/payment-provider";
import { MarketplaceEconomicsService } from "@/services/marketplace-economics";
import { deriveParentPaymentProgress } from "@/services/payment-progress";
import { canFulfillSubOrder } from "@/services/payment-fulfillment";
import { publicProductWhere } from "@/lib/marketplace-eligibility";
import { branchSupportsMethod, deliveryAreaSupported } from "@/services/fulfillment-options";
import { lockInventoryIdentity } from "@/services/inventory-integrity";
import { NotificationService } from "@/services/notifications";

const customerOrderInclude = {
  orderItems: { include: {
    productReview: { select: { id: true, rating: true, title: true, comment: true, imageUrls: true } },
    product: { select: { id: true, name: true, images: { take: 1, orderBy: { sortOrder: "asc" as const } }, vendor: { select: { storeName: true } } } },
  } },
  subOrders: { select: {
    id: true, status: true, subOrderNumber: true, vendorSubTotal: true, vendorShipping: true, vendorTotal: true,
    fulfillmentMethod: true, fulfillmentStatus: true, fulfillmentSnapshot: true,
    vendor: { select: { storeName: true, paymentAccounts: { where: { status: "VERIFIED" as const, suspendedAt: null }, select: { provider: true } } } },
    shopReview: { select: { id: true, rating: true, comment: true } },
    paymentIntents: { select: { id: true, provider: true, status: true, amount: true, currency: true, providerReference: true, updatedAt: true }, orderBy: { createdAt: "desc" as const } },
  } },
} satisfies Prisma.OrderInclude;

type CustomerOrderRecord = Prisma.OrderGetPayload<{ include: typeof customerOrderInclude }>;

function serializeCustomerOrder(order: CustomerOrderRecord) {
  return {
    id: order.id, orderNumber: order.orderNumber, status: order.status,
    paymentStatus: deriveParentPaymentProgress(order.subOrders, order.paymentStatus),
    paymentGateway: order.paymentGateway, totalAmount: Number(order.totalAmount), subTotal: Number(order.subTotal),
    totalShipping: Number(order.totalShipping), taxAmount: Number(order.taxAmount),
    discountAmount: Math.max(0, Number(order.subTotal) + Number(order.totalShipping) + Number(order.taxAmount) - Number(order.totalAmount)),
    createdAt: order.createdAt.toISOString(), notes: order.notes,
    items: order.orderItems.map((item) => ({
      id: item.id, productId: item.productId, subOrderId: item.subOrderId, variantName: item.variantNameSnapshot,
      variantOptions: item.variantOptionsSnapshot && typeof item.variantOptionsSnapshot === "object" && !Array.isArray(item.variantOptionsSnapshot) ? item.variantOptionsSnapshot as Record<string, string> : null,
      name: item.productNameSnapshot ?? item.product.name, quantity: item.quantity, price: Number(item.priceAtPurchase),
      lineTotal: Number(item.totalPrice), image: item.product.images[0]?.url || null, vendorName: item.product.vendor.storeName,
      canReview: order.paymentStatus === "COMPLETED" && order.status !== "REFUNDED" && order.status !== "FAILED" && order.subOrders.find((subOrder) => subOrder.id === item.subOrderId)?.status === "DELIVERED",
      review: item.productReview,
    })),
    subOrders: order.subOrders.map((so) => {
      const snapshot = so.fulfillmentSnapshot && typeof so.fulfillmentSnapshot === "object" && !Array.isArray(so.fulfillmentSnapshot) ? so.fulfillmentSnapshot as Record<string, unknown> : {};
      return {
        id: so.id, status: so.status, subOrderNumber: so.subOrderNumber, vendorName: so.vendor.storeName,
        subTotal: Number(so.vendorSubTotal), shipping: Number(so.vendorShipping), total: Number(so.vendorTotal),
        fulfillmentMethod: so.fulfillmentMethod, fulfillmentStatus: so.fulfillmentStatus,
        fulfillmentFee: typeof snapshot.deliveryFee === "string" || typeof snapshot.deliveryFee === "number" ? Number(snapshot.deliveryFee) : Number(so.vendorShipping),
        branchName: typeof snapshot.branchName === "string" ? snapshot.branchName : null,
        deliveryAddress: so.fulfillmentMethod === "DELIVERY" ? (typeof snapshot.deliveryAddress === "string" ? snapshot.deliveryAddress : order.shippingAddress) : null,
        deliveryInstructions: typeof snapshot.deliveryInstructions === "string" ? snapshot.deliveryInstructions : order.notes,
        estimatedDelivery: typeof snapshot.estimatedDelivery === "string" ? snapshot.estimatedDelivery : null,
        fulfillmentContact: typeof snapshot.deliveryContact === "string" ? snapshot.deliveryContact : typeof snapshot.pickupContact === "string" ? snapshot.pickupContact : order.shippingPhone,
        pickupLocation: typeof snapshot.pickupLocation === "string" ? snapshot.pickupLocation : null,
        pickupDirections: typeof snapshot.pickupDirections === "string" ? snapshot.pickupDirections : null,
        pickupInstructions: typeof snapshot.pickupInstructions === "string" ? snapshot.pickupInstructions : null,
        paymentOptions: [...new Set(so.vendor.paymentAccounts.map((account) => account.provider).filter((provider) => PaymentProviderRegistry.isEnabled(provider)))],
        paymentIntents: so.paymentIntents.map((intent) => ({ id: intent.id, provider: intent.provider, status: intent.status, amount: Number(intent.amount), currency: intent.currency, providerReference: intent.providerReference, updatedAt: intent.updatedAt.toISOString() })),
        canReview: order.paymentStatus === "COMPLETED" && order.status !== "REFUNDED" && so.status === "DELIVERED", review: so.shopReview,
      };
    }),
  };
}

export interface CheckoutIntent {
  items: Array<{
    productId: string;
    variantId?: string | null;
    quantity: number;
  }>;
  shippingAddress?: string;
  shippingPhone: string;
  shippingEmail?: string;
  deliveryDistrict?: string;
  fulfillmentSelections?: Array<{ vendorId: string; method: FulfillmentMethod; branchId?: string; pickupContact?: string }>;
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
  READY_FOR_PICKUP: [SubOrderStatus.DELIVERED, SubOrderStatus.CANCELLED],
  SHIPPED: [SubOrderStatus.DELIVERED, SubOrderStatus.CANCELLED],
};

export interface ResolvedCheckoutLine {
  productId: string;
  variantId: string | null;
  vendorId: string;
  vendorOwnerId?: string;
  quantity: number;
  unitPrice: Decimal;
  /** Deprecated compatibility field; direct sales always use zero commission. */
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
  branchId?: string | null;
  branchName?: string | null;
  branchAddress?: string | null;
  branchContactPhone?: string | null;
  openingHours?: Prisma.InputJsonValue | null;
  deliveryAreas?: string[];
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
    commissionRate: Decimal;
    platformCommission: Decimal;
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
/** Retained export for older callers; marketplace purchase commission is always zero. */
export const DEFAULT_MARKETPLACE_COMMISSION_RATE = ZERO;
export function resolveCommissionRate(value: unknown): Decimal { void value; return ZERO; }
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
    shippingAddress: input.shippingAddress?.trim() ?? "",
    shippingPhone: input.shippingPhone.trim(),
    shippingEmail: input.shippingEmail?.trim() ?? "",
    paymentGateway: input.paymentGateway,
    fulfillmentSelections: [...(input.fulfillmentSelections ?? [])]
      .map(({ vendorId, method, branchId, pickupContact }) => ({ vendorId, method, branchId: branchId ?? null, pickupContact: pickupContact?.trim() ?? "" }))
      .sort((a, b) => a.vendorId.localeCompare(b.vendorId)),
    deliveryDistrict: input.deliveryDistrict?.trim() ?? "",
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
      commissionRate: ZERO,
      platformCommission: ZERO,
      vendorNetEntitlement: subtotal.plus(shipping).plus(tax).minus(discount),
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
            ...publicProductWhere,
            id: { in: input.items.map((item) => item.productId) },
          },
          include: {
            variants: true,
        vendor: {
              include: {
                paymentAccounts: { where: { status: "VERIFIED", suspendedAt: null }, select: { id: true, provider: true, isDefault: true }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] },
                branches: { orderBy: [{ isPrimary: "desc" }, { name: "asc" }] },
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
            vendorOwnerId: product.vendor.ownerId,
            quantity: item.quantity,
            unitPrice: new Decimal(
              (variant?.price ?? product.basePrice).toString(),
            ),
            commissionRate: ZERO,
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
          { id: string; productId: string; variantId: string | null; vendorId: string; variant: boolean; quantity: number }
        >();
        for (const line of lines) {
          const key = line.variantId
            ? `variant:${line.variantId}`
            : `product:${line.productId}`;
          const requirement = stockRequirements.get(key) ?? {
            id: line.variantId ?? line.productId,
            productId: line.productId,
            variantId: line.variantId,
            vendorId: line.vendorId,
            variant: Boolean(line.variantId),
            quantity: 0,
          };
          requirement.quantity += line.quantity;
          stockRequirements.set(key, requirement);
        }
        for (const requirement of stockRequirements.values()) {
          await lockInventoryIdentity(tx as unknown as Prisma.TransactionClient, requirement.vendorId, requirement.productId, requirement.variantId);
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
        const selectionDetails = new Map<string, NonNullable<CreateOrderInput["fulfillmentSelections"]>[number]>();
        const branchSales: Array<{ vendorId: string; inventoryId: string; branchId: string; productId: string; variantId: string | null; quantity: number }> = [];
        for (const selection of input.fulfillmentSelections ?? []) {
          if (!selection?.vendorId || !isFulfillmentMethod(selection.method) || selections.has(selection.vendorId))
            throw new CheckoutError("Choose a valid fulfilment option for each shop.", "INVALID_CHECKOUT");
          selections.set(selection.vendorId, selection.method);
          selectionDetails.set(selection.vendorId, selection);
        }
        for (const vendorId of new Set(lines.map((line) => line.vendorId))) {
          const vendor = products.find((product) => product.vendorId === vendorId)?.vendor;
          const selection = selectionDetails.get(vendorId);
          if (!vendor) throw new CheckoutError("A shop in your cart is unavailable.", "INVALID_CHECKOUT");
          const branches = vendor.branches ?? [];
          if (branches.length) {
            const activeBranches = branches.filter((branch) => branch.isActive);
            const configuredMethods: FulfillmentMethod[] = [activeBranches.some((branch) => branch.deliveryEnabled) ? "DELIVERY" : null, activeBranches.some((branch) => branch.pickupEnabled) ? "PICKUP" : null].filter(Boolean) as FulfillmentMethod[];
            if (!configuredMethods.length) throw new CheckoutError("This shop has no active fulfilment location.", "INVALID_CHECKOUT");
            const selectedMethod = selection?.method ?? (configuredMethods.includes("DELIVERY") ? "DELIVERY" : "PICKUP");
            selections.set(vendorId, selectedMethod);
            const eligible = activeBranches.filter((branch) => branchSupportsMethod(branch, selectedMethod));
            const branch = selection?.branchId ? eligible.find((candidate) => candidate.id === selection.branchId) : eligible.length === 1 ? eligible[0] : eligible.find((candidate) => candidate.isPrimary);
            if (!branch) throw new CheckoutError("Choose an active location that supports this fulfilment method.", "INVALID_CHECKOUT");
            if (selectedMethod === "DELIVERY" && !deliveryAreaSupported(branch.deliveryAreas, input.deliveryDistrict)) throw new CheckoutError("The selected location does not deliver to this area.", "INVALID_CHECKOUT");
            for (const line of lines.filter((candidate) => candidate.vendorId === vendorId)) Object.assign(line, {
              fulfillmentMethods: [branch.deliveryEnabled ? "DELIVERY" : null, branch.pickupEnabled ? "PICKUP" : null].filter(Boolean) as FulfillmentMethod[],
              deliveryFee: branch.deliveryFee ?? vendor.deliveryFee,
              deliveryEstimate: branch.deliveryEstimate ?? vendor.deliveryEstimate,
              pickupLocation: branch.addressLine,
              pickupInstructions: branch.pickupInstructions,
              branchId: branch.id,
              branchName: branch.name,
              branchAddress: [branch.addressLine, branch.district, branch.city, branch.country].filter(Boolean).join(", "),
              branchContactPhone: branch.contactPhone,
              openingHours: branch.openingHours as Prisma.InputJsonValue | null,
              deliveryAreas: branch.deliveryAreas,
            });
            if (vendor.branchInventoryEnabled) {
              for (const line of lines.filter((candidate) => candidate.vendorId === vendorId)) {
                const inventory = await tx.branchInventory.findFirst({ where: { branchId: branch.id, productId: line.productId, variantId: line.variantId } });
                if (!inventory) throw new CheckoutError("The selected branch has not been allocated stock for every item.", "INSUFFICIENT_STOCK");
                const changed = await tx.branchInventory.updateMany({ where: { id: inventory.id, onHandQuantity: { gte: line.quantity } }, data: { onHandQuantity: { decrement: line.quantity } } });
                if (!changed.count) throw new CheckoutError("The selected branch does not have enough stock for this basket.", "INSUFFICIENT_STOCK");
                branchSales.push({ vendorId, inventoryId: inventory.id, branchId: branch.id, productId: line.productId, variantId: line.variantId, quantity: line.quantity });
              }
            }
          }
        }
        const calculation = calculateCheckoutTotals(lines, selections);
        // A paid marketplace order is only created for shops with a verified,
        // enabled direct merchant destination. Cash-on-delivery stays outside
        // the electronic payment path.
        if (input.paymentGateway !== PaymentGateway.CASH_ON_DELIVERY) {
          for (const group of calculation.vendorGroups) {
            const vendor = products.find((product) => product.vendorId === group.vendorId)?.vendor;
            if (!vendor?.paymentAccounts.some((account) => PaymentProviderRegistry.isEnabled(account.provider))) throw new CheckoutError("A shop in this cart cannot accept payments until its merchant account is verified.", "INVALID_CHECKOUT");
          }
        }
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
            shippingAddress: input.shippingAddress?.trim() ?? "",
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
              // Direct-to-vendor payments never produce a SmartDuka commission
              // or a payout entitlement. Legacy fields remain as zero snapshots.
              platformCommission: ZERO,
              commissionRate: ZERO,
              vendorNetEntitlement: group.total,
              paymentProcessingFee: ZERO,
              status: SubOrderStatus.PENDING,
              branchId: group.items[0].branchId ?? null,
              fulfillmentMethod: group.fulfillmentMethod,
              fulfillmentSnapshot: {
                method: group.fulfillmentMethod,
                branchId: group.items[0].branchId ?? null,
                branchName: group.items[0].branchName ?? null,
                branchAddress: group.items[0].branchAddress ?? null,
                branchContactPhone: group.items[0].branchContactPhone ?? null,
                openingHours: group.items[0].openingHours ?? null,
                deliveryFee: group.shipping.toString(),
                deliveryEstimate: group.items[0].deliveryEstimate ?? null,
                deliveryAddress: group.fulfillmentMethod === "DELIVERY" ? input.shippingAddress?.trim() ?? "" : null,
                deliveryDistrict: group.fulfillmentMethod === "DELIVERY" ? input.deliveryDistrict?.trim() ?? null : null,
                deliveryContact: group.fulfillmentMethod === "DELIVERY" ? input.shippingPhone.trim() : null,
                pickupLocation: group.items[0].pickupLocation ?? null,
                pickupDirections: group.items[0].pickupDirections ?? null,
                pickupInstructions: group.items[0].pickupInstructions ?? null,
                pickupContact: group.fulfillmentMethod === "PICKUP" ? selectionDetails.get(group.vendorId)?.pickupContact?.trim() || input.shippingPhone.trim() : null,
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
          const sales = branchSales.filter((sale) => sale.vendorId === group.vendorId);
          if (sales.length) await tx.inventoryMovement.createMany({ data: sales.map((sale) => ({ inventoryId: sale.inventoryId, branchId: sale.branchId, shopId: sale.vendorId, productId: sale.productId, variantId: sale.variantId, movementType: "SALE", quantity: -sale.quantity, referenceType: "SUB_ORDER", referenceId: suborder.id, reason: "Checkout sale" })) });
          const ownerUserId = group.items[0].vendorOwnerId;
          if (ownerUserId) await NotificationService.createForVendorOrder({
            event: "ORDER_RECEIVED",
            idempotencyKey: `order:${suborder.id}:received`,
            vendorId: group.vendorId,
            ownerUserId,
            type: "ORDER_PLACED",
            title: "New order received",
            message: `Order ${suborder.subOrderNumber} requires fulfilment.`,
            actionPath: "/vendor/orders",
          }, tx);
        }
        await NotificationService.create({
          event: "ORDER_CREATED",
          idempotencyKey: `order:${order.id}:created:${input.userId}`,
          userId: input.userId,
          type: "SUCCESS",
          title: "Order confirmed",
          message: `Your order ${orderNumber} has been placed and is awaiting payment confirmation.`,
          actionPath: `/orders/${order.id}`,
        }, tx);
        return order;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
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
      include: customerOrderInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    return orders.map(serializeCustomerOrder);
  }

  static async getUserOrdersPage(userId: string, input: { page: number; pageSize: number; filter?: string }) {
    const where: Prisma.OrderWhereInput = {
      customerId: userId,
      ...(input.filter === "awaiting-payment" ? { subOrders: { some: { paymentIntents: { none: { status: { in: ["SUCCESSFUL", "REVERSED"] } } } } } }
        : input.filter === "completed" ? { subOrders: { every: { status: "DELIVERED" }, some: {} } }
        : input.filter === "cancelled" ? { subOrders: { every: { status: "CANCELLED" }, some: {} } }
        : input.filter === "in-progress" ? { subOrders: { some: { status: { in: ["PROCESSING", "READY_FOR_PICKUP", "SHIPPED"] } } } }
        : {}),
    };
    const [total, orders] = await prisma.$transaction([
      prisma.order.count({ where }),
      prisma.order.findMany({ where, include: customerOrderInclude, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (input.page - 1) * input.pageSize, take: input.pageSize }),
    ]);
    return { orders: orders.map(serializeCustomerOrder), total };
  }

  static async getUserOrder(userId: string, orderId: string) {
    const order = await prisma.order.findFirst({ where: { id: orderId, customerId: userId }, include: customerOrderInclude });
    return order ? serializeCustomerOrder(order) : null;
  }

  static async updateSubOrderStatus(
    subOrderId: string,
    status: SubOrderStatus,
    vendorId: string,
  ) {
    const existing = await prisma.subOrder.findFirst({
      where: { id: subOrderId, vendorId },
      select: {
        id: true,
        status: true,
        fulfillmentMethod: true,
        order: { select: { paymentGateway: true } },
        paymentIntents: { select: { status: true } },
      },
    });

    if (!existing) return null;
    if (!SUB_ORDER_ALLOWED_TRANSITIONS[existing.status]?.includes(status))
      throw new CheckoutError("Invalid SubOrder fulfillment status transition.", "INVALID_CHECKOUT");
    const methodTransitionAllowed = status === SubOrderStatus.CANCELLED || (
      existing.fulfillmentMethod === "PICKUP"
        ? (existing.status === SubOrderStatus.PENDING && status === SubOrderStatus.PROCESSING) || (existing.status === SubOrderStatus.PROCESSING && status === SubOrderStatus.READY_FOR_PICKUP) || (existing.status === SubOrderStatus.READY_FOR_PICKUP && status === SubOrderStatus.DELIVERED)
        : (existing.status === SubOrderStatus.PENDING && status === SubOrderStatus.PROCESSING) || (existing.status === SubOrderStatus.PROCESSING && status === SubOrderStatus.SHIPPED) || (existing.status === SubOrderStatus.SHIPPED && status === SubOrderStatus.DELIVERED)
    );
    if (!methodTransitionAllowed)
      throw new CheckoutError("That status is not valid for this order's fulfilment method.", "INVALID_CHECKOUT");
    // This protects both vendor status APIs; UI affordances are only a
    // convenience.  Cancellation remains possible so an unpaid order can be
    // safely stopped.  A later reversal also prevents further fulfilment.
    if (
      status !== SubOrderStatus.CANCELLED &&
      !canFulfillSubOrder({
        paymentGateway: existing.order.paymentGateway,
        paymentIntentStatuses: existing.paymentIntents.map((intent) => intent.status),
      })
    )
      throw new CheckoutError(
        "Customer payment must be confirmed before fulfilment can continue.",
        "INVALID_CHECKOUT",
      );

    const fulfillmentStatus = status === SubOrderStatus.PROCESSING ? "PREPARING" : status === SubOrderStatus.READY_FOR_PICKUP ? "READY_FOR_PICKUP" : status === SubOrderStatus.SHIPPED ? "OUT_FOR_DELIVERY" : status === SubOrderStatus.DELIVERED ? "COMPLETED" : status === SubOrderStatus.CANCELLED ? "CANCELLED" : "PENDING";
    const updated = await prisma.$transaction(async (tx) => {
      const changed = await tx.subOrder.update({
        where: { id: subOrderId },
        data: { status, fulfillmentStatus },
        include: { order: { select: { id: true, customerId: true, orderNumber: true } } },
      });
      const details = status === SubOrderStatus.PROCESSING
        ? { event: "ORDER_PROCESSING" as const, type: "INFO" as const, title: "Order accepted", message: `Order ${changed.subOrderNumber} is now being prepared.` }
        : status === SubOrderStatus.CANCELLED
          ? { event: "ORDER_CANCELLED" as const, type: "WARNING" as const, title: "Order cancelled", message: `Order ${changed.subOrderNumber} has been cancelled.` }
          : status === SubOrderStatus.SHIPPED
            ? { event: "ORDER_DISPATCHED" as const, type: "INFO" as const, title: "Order dispatched", message: `Order ${changed.subOrderNumber} is on the way.` }
            : status === SubOrderStatus.READY_FOR_PICKUP
              ? { event: "ORDER_READY_FOR_PICKUP" as const, type: "SUCCESS" as const, title: "Ready for pickup", message: `Order ${changed.subOrderNumber} is ready for pickup.` }
              : { event: "ORDER_DELIVERED" as const, type: "SUCCESS" as const, title: existing.fulfillmentMethod === "PICKUP" ? "Order collected" : "Order delivered", message: `Order ${changed.subOrderNumber} has been ${existing.fulfillmentMethod === "PICKUP" ? "collected" : "delivered"}.` };
      await NotificationService.create({
        ...details,
        idempotencyKey: `order:${changed.id}:status:${status.toLowerCase()}:${changed.order.customerId}`,
        userId: changed.order.customerId,
        actionPath: `/orders/${changed.order.id}`,
      }, tx);
      return changed;
    });

    if (status === SubOrderStatus.DELIVERED) {
      try {
        await MarketplaceEconomicsService.releaseVendorEarningsForSubOrder(updated.id);
      } catch {
        // Delivery is authoritative; earnings release can be reconciled safely later.
      }
    }

    return updated;
  }
}
