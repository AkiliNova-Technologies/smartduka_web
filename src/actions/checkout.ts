"use server";

import { prisma } from "@/lib/prisma/client";
import {
  PaymentGateway,
  OrderStatus,
  PaymentStatus,
  SubOrderStatus,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/client";
import { getCurrentUserId } from "@/lib/auth/session";
import { withErrorHandling } from "@/lib/api-utils";

// ==========================================
// TYPES
// ==========================================

interface CartItemInput {
  productId: string;
  variantId?: string | null;
  quantity: number;
}

interface CheckoutInput {
  customerId: string;
  cartItems: CartItemInput[];
  paymentGateway: PaymentGateway;
  shippingAddress: string;
  shippingPhone: string;
  shippingEmail: string;
  notes?: string;
}

interface SimpleCheckoutItem {
  productId: string;
  quantity: number;
  price: number;
  vendorId: string;
  variantId?: string | null;
}

// ==========================================
// CORE CHECKOUT ENGINE
// ==========================================

async function processMultiVendorCheckout(input: CheckoutInput) {
  const {
    customerId,
    cartItems,
    paymentGateway,
    shippingAddress,
    shippingPhone,
    shippingEmail,
    notes,
  } = input;

  if (!cartItems || cartItems.length === 0) {
    throw new Error("Your shopping cart cannot be empty.");
  }

  return prisma.$transaction(async (tx) => {
    // 1. Resolve products
    const productIds = cartItems.map((item) => item.productId);
    const dbProducts = await tx.product.findMany({
      where: { id: { in: productIds }, status: "ACTIVE" },
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

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    // 2. Group by vendor with pricing & commission
    const vendorBuckets: Record<
      string,
      {
        vendorId: string;
        commissionRate: number;
        items: {
          productId: string;
          variantId: string | null;
          quantity: number;
          priceAtPurchase: number;
          totalPrice: number;
        }[];
      }
    > = {};

    for (const item of cartItems) {
      const dbProduct = productMap.get(item.productId);
      if (!dbProduct) {
        throw new Error(`Product ${item.productId} is unavailable.`);
      }

      let targetPrice = Number(dbProduct.basePrice);

      if (item.variantId) {
        const variant = dbProduct.variants.find((v) => v.id === item.variantId);
        if (!variant) {
          throw new Error(`Variant not found for ${dbProduct.name}`);
        }
        if (variant.inventoryCount < item.quantity) {
          throw new Error(
            `Only ${variant.inventoryCount} left for "${variant.name}"`
          );
        }
        targetPrice = Number(variant.price);

        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { inventoryCount: { decrement: item.quantity } },
        });
      }

      const vendorId = dbProduct.vendorId;
      const activeSub = dbProduct.vendor.subscriptions[0];
      const commissionRate = activeSub
        ? Number(activeSub.plan.commissionRate)
        : 10.0;

      if (!vendorBuckets[vendorId]) {
        vendorBuckets[vendorId] = { vendorId, commissionRate, items: [] };
      }

      vendorBuckets[vendorId].items.push({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
        priceAtPurchase: targetPrice,
        totalPrice: targetPrice * item.quantity,
      });
    }

    // 3. Compute totals
    let globalSubTotal = 0;
    let globalShippingTotal = 0;
    const orderTimestamp = Date.now();
    const masterOrderNumber = `SD-${orderTimestamp}`;

    const subOrders: {
      vendorId: string;
      subOrderNumber: string;
      vendorSubTotal: number;
      vendorShipping: number;
      vendorTotal: number;
      platformCommission: number;
      items: {
        productId: string;
        variantId: string | null;
        quantity: number;
        priceAtPurchase: number;
        totalPrice: number;
      }[];
    }[] = [];

    let vendorIndex = 1;
    for (const vendorId in vendorBuckets) {
      const bucket = vendorBuckets[vendorId];
      const vendorSubTotal = bucket.items.reduce(
        (sum, item) => sum + item.totalPrice,
        0
      );
      const vendorShipping = 3500;
      const vendorTotal = vendorSubTotal + vendorShipping;
      const platformCommission = (vendorSubTotal * bucket.commissionRate) / 100;

      globalSubTotal += vendorSubTotal;
      globalShippingTotal += vendorShipping;

      subOrders.push({
        vendorId,
        subOrderNumber: `${masterOrderNumber}-V${vendorIndex++}`,
        vendorSubTotal,
        vendorShipping,
        vendorTotal,
        platformCommission,
        items: bucket.items,
      });
    }

    const globalTotalAmount = globalSubTotal + globalShippingTotal;

    // 4. Create master order
    const masterOrder = await tx.order.create({
      data: {
        customerId,
        orderNumber: masterOrderNumber,
        subTotal: new Decimal(globalSubTotal),
        totalShipping: new Decimal(globalShippingTotal),
        taxAmount: new Decimal(0),
        totalAmount: new Decimal(globalTotalAmount),
        status: OrderStatus.PENDING,
        paymentGateway,
        paymentStatus: PaymentStatus.PENDING,
        shippingAddress,
        shippingPhone,
        shippingEmail,
        notes,
      },
    });

    // 5. Create sub-orders and items
    for (const subOrderData of subOrders) {
      const subOrder = await tx.subOrder.create({
        data: {
          orderId: masterOrder.id,
          vendorId: subOrderData.vendorId,
          subOrderNumber: subOrderData.subOrderNumber,
          vendorSubTotal: new Decimal(subOrderData.vendorSubTotal),
          vendorShipping: new Decimal(subOrderData.vendorShipping),
          vendorTotal: new Decimal(subOrderData.vendorTotal),
          platformCommission: new Decimal(subOrderData.platformCommission),
          status: SubOrderStatus.PENDING,
        },
      });

      await tx.orderItem.createMany({
        data: subOrderData.items.map((item) => ({
          orderId: masterOrder.id,
          subOrderId: subOrder.id,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          priceAtPurchase: new Decimal(item.priceAtPurchase),
          totalPrice: new Decimal(item.totalPrice),
        })),
      });

      await tx.notification.create({
        data: {
          vendorId: subOrderData.vendorId,
          type: "ORDER_PLACED",
          title: "New Order Received",
          message: `Order ${subOrderData.subOrderNumber} valued at UGX ${subOrderData.vendorSubTotal.toLocaleString()} requires fulfillment.`,
        },
      });
    }

    return {
      success: true,
      masterOrderId: masterOrder.id,
      orderNumber: masterOrder.orderNumber,
      payableAmount: Number(masterOrder.totalAmount),
      email: masterOrder.shippingEmail,
      phone: masterOrder.shippingPhone,
    };
  });
}

// ==========================================
// PUBLIC ACTION
// ==========================================

export async function placeOrderAction(input: {
  items: SimpleCheckoutItem[];
  shippingAddress: string;
  shippingPhone: string;
  shippingEmail?: string;
  paymentGateway: PaymentGateway;
  notes?: string;
}) {
  return withErrorHandling(async () => {
    const userId = await getCurrentUserId();

    const result = await processMultiVendorCheckout({
      customerId: userId,
      cartItems: input.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId || null, 
        quantity: item.quantity,
      })),
      paymentGateway: input.paymentGateway,
      shippingAddress: input.shippingAddress,
      shippingPhone: input.shippingPhone,
      shippingEmail: input.shippingEmail || "",
      notes: input.notes,
    });

    return { order: result };
  }, "placeOrderAction");
}