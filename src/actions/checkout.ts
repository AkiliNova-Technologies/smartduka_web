"use server";

import { prisma } from "@/lib/prisma/client";
import { PaymentGateway, OrderStatus, PaymentStatus, SubOrderStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/client";

// ==========================================
// INTERFACES FOR INPUT & INTERNAL DATA SHAPES
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

// Define the exact structural shape of the items grouped per vendor
interface ComputedVendorLineItem {
  productId: string;
  variantId: string | null;
  quantity: number;
  priceAtPurchase: number;
  totalPrice: number;
}

// Define the structural shape of a compiled vendor split-order
interface ComputedVendorSubOrder {
  vendorId: string;
  subOrderNumber: string;
  vendorSubTotal: number;
  vendorShipping: number;
  vendorTotal: number;
  platformCommission: number;
  items: ComputedVendorLineItem[];
}

/**
 * Validates, compiles, and splits a multi-vendor shopping cart into isolated 
 * sub-orders per vendor with dynamic subscription-based platform commission calculation.
 */
export async function processMultiVendorCheckout(input: CheckoutInput) {
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
    throw new Error("Checkout Failure: Your shopping cart cannot be empty.");
  }

  // Execute inside an isolated database interactive transaction
  return await prisma.$transaction(async (tx) => {
    
    // 1. Resolve and validate all products and variants from the DB
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

    // Create a fast lookup map for our items
    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    // 2. Group cart items into vendor-specific structures
    const vendorBuckets: Record<
      string,
      {
        vendorId: string;
        commissionRate: number;
        items: ComputedVendorLineItem[];
      }
    > = {};

    for (const item of cartItems) {
      const dbProduct = productMap.get(item.productId);
      if (!dbProduct) {
        throw new Error(`Checkout Failure: Product with ID ${item.productId} is unavailable or unverified.`);
      }

      let targetPrice = Number(dbProduct.basePrice);
      
      // Handle variant configuration if applicable
      if (item.variantId) {
        const variant = dbProduct.variants.find((v) => v.id === item.variantId);
        if (!variant) {
          throw new Error(`Checkout Failure: Selected variant configuration was not found for item: ${dbProduct.name}`);
        }
        if (variant.inventoryCount < item.quantity) {
          throw new Error(`Inventory Deficit: Only ${variant.inventoryCount} items left for variant "${variant.name}" of "${dbProduct.name}".`);
        }
        targetPrice = Number(variant.price);

        // Track and decrement inventory stock values safely inside the current database node
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { inventoryCount: { decrement: item.quantity } },
        });
      } else {
        if (dbProduct.status !== "ACTIVE") {
          throw new Error(`Inventory Deficit: "${dbProduct.name}" is currently out of stock.`);
        }
      }

      const vendorId = dbProduct.vendorId;

      // Extract vendor platform commission rate dynamically from their subscription profile
      const activeSub = dbProduct.vendor.subscriptions[0];
      const commissionRate = activeSub ? Number(activeSub.plan.commissionRate) : 10.00;

      if (!vendorBuckets[vendorId]) {
        vendorBuckets[vendorId] = {
          vendorId,
          commissionRate,
          items: [],
        };
      }

      vendorBuckets[vendorId].items.push({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
        priceAtPurchase: targetPrice,
        totalPrice: targetPrice * item.quantity,
      });
    }

    // 3. Compute structural totals for Master Order & Vendor Sub-Orders
    let globalSubTotal = 0;
    let globalShippingTotal = 0;
    
    // Hard type applied to the sub-orders calculation array instead of any[]
    const computedVendorSubOrders: ComputedVendorSubOrder[] = [];

    const orderTimestamp = Date.now();
    const cleanMasterOrderNumber = `SD-${orderTimestamp}`;

    let vendorIndex = 1;
    for (const vendorId in vendorBuckets) {
      const bucket = vendorBuckets[vendorId];
      
      const vendorSubTotal = bucket.items.reduce((sum, item) => sum + item.totalPrice, 0);
      const vendorShipping = 3500; // Flat UGX 3,500 shipping fee per vendor warehouse split
      const vendorTotal = vendorSubTotal + vendorShipping;
      
      // platformCommission cut formula matching subscription plan criteria
      const platformCommission = (vendorSubTotal * bucket.commissionRate) / 100;

      globalSubTotal += vendorSubTotal;
      globalShippingTotal += vendorShipping;

      computedVendorSubOrders.push({
        vendorId,
        subOrderNumber: `${cleanMasterOrderNumber}-V${vendorIndex++}`,
        vendorSubTotal,
        vendorShipping,
        vendorTotal,
        platformCommission,
        items: bucket.items,
      });
    }

    const globalTaxAmount = 0.00; 
    const globalTotalAmount = globalSubTotal + globalShippingTotal + globalTaxAmount;

    // 4. Persist Tier 1: Create Global Master Order
    const masterOrder = await tx.order.create({
      data: {
        customerId,
        orderNumber: cleanMasterOrderNumber,
        subTotal: new Decimal(globalSubTotal),
        totalShipping: new Decimal(globalShippingTotal),
        taxAmount: new Decimal(globalTaxAmount),
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

    // 5. Persist Tier 2 & Tier 3: Create Vendor Sub-Orders and Line Items
    for (const subOrderData of computedVendorSubOrders) {
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

      // Completely type-safe line item registration mapping
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
          title: "New Incoming Split Order Received",
          message: `Order reference ${subOrderData.subOrderNumber} containing items valued at UGX ${subOrderData.vendorSubTotal.toLocaleString()} requires validation and fulfillment dispatch.`,
        },
      });
    }

    // 6. Return compiled order variables ready to initialize merchant tokenization fields
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