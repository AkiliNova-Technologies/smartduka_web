import { prisma } from "@/lib/prisma/client";
import { PaymentGateway, SubOrderStatus } from "@prisma/client";

interface CreateOrderInput {
  userId: string;
  items: {
    productId: string;
    quantity: number;
    price: number;
    vendorId: string;
  }[];
  shippingAddress: string;
  shippingPhone: string;
  shippingEmail: string;
  paymentGateway: PaymentGateway;
  notes?: string;
}

export class OrderService {
  static async createOrder(input: CreateOrderInput) {
    const subTotal = input.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const orderNumber = `SD-${Date.now().toString(36).toUpperCase()}`;

    const order = await prisma.order.create({
      data: {
        customerId: input.userId,
        orderNumber,
        totalAmount: subTotal,
        subTotal,
        totalShipping: 0,
        taxAmount: 0,
        status: "PENDING",
        paymentGateway: input.paymentGateway,
        paymentStatus: "PENDING",
        shippingAddress: input.shippingAddress,
        shippingPhone: input.shippingPhone,
        shippingEmail: input.shippingEmail || "",
        notes: input.notes || null,
      },
    });

    const vendorGroups = new Map<string, typeof input.items>();
    for (const item of input.items) {
      const existing = vendorGroups.get(item.vendorId) || [];
      existing.push(item);
      vendorGroups.set(item.vendorId, existing);
    }

    let vendorIndex = 1;
    for (const [vendorId, vendorItems] of vendorGroups) {
      const vendorSubTotal = vendorItems.reduce(
        (sum, i) => sum + i.price * i.quantity,
        0
      );
      const subOrderNumber = `${orderNumber}-V${vendorIndex}`;

      await prisma.subOrder.create({
        data: {
          orderId: order.id,
          vendorId,
          subOrderNumber,
          vendorSubTotal,
          vendorShipping: 0,
          vendorTotal: vendorSubTotal,
          platformCommission: 0,
          status: "PENDING",
          items: {
            create: vendorItems.map((item) => ({
              orderId: order.id,
              productId: item.productId,
              quantity: item.quantity,
              priceAtPurchase: item.price,
              totalPrice: item.price * item.quantity,
            })),
          },
        },
      });

      await prisma.notification.create({
        data: {
          vendorId,
          type: "ORDER_PLACED",
          title: "New Order Received",
          message: `Order ${subOrderNumber} with ${vendorItems.length} item(s) valued at UGX ${vendorSubTotal.toLocaleString()} requires fulfillment.`,
        },
      });

      vendorIndex++;
    }

    return order;
  }

  static async getUserOrders(userId: string) {
    const orders = await prisma.order.findMany({
      where: { customerId: userId },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: { take: 1, orderBy: { sortOrder: "asc" } },
              },
            },
          },
        },
        subOrders: {
          select: {
            id: true,
            status: true,
            subOrderNumber: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      createdAt: order.createdAt.toISOString(),
      items: order.orderItems.map((item) => ({
        productId: item.productId,
        name: item.product.name,
        quantity: item.quantity,
        price: Number(item.priceAtPurchase),
      })),
      subOrders: order.subOrders.map((so) => ({
        id: so.id,
        status: so.status,
        subOrderNumber: so.subOrderNumber,
      })),
    }));
  }

  static async updateSubOrderStatus(subOrderId: string, status: SubOrderStatus) {
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

    if (status === "DELIVERED") {
      await prisma.notification.create({
        data: {
          userId: updated.order.customerId,
          type: "SUCCESS",
          title: "Order Delivered",
          message: `Your order ${updated.order.orderNumber} (${updated.subOrderNumber}) has been delivered.`,
        },
      });
    }

    return updated;
  }
}