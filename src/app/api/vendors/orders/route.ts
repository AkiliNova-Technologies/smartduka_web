import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { AuthenticationRequiredError } from "@/lib/auth/session";
import { requireVendorContext, VendorAuthorizationError } from "@/lib/auth/vendor-context";
import { successResponse, errorResponse, getErrorMessage } from "@/lib/api-utils";

export async function GET(_req: NextRequest) {
  try {
    const context = await requireVendorContext("vendor:view_orders");
    const subOrders = await prisma.subOrder.findMany({
      where: { vendorId: context.vendorId },
      include: {
        order: {
          select: {
            shippingAddress: true,
            shippingPhone: true,
            customer: { select: { name: true } },
          },
        },
        items: { include: { product: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    const orders = subOrders.map((subOrder) => ({
      id: subOrder.id,
      subOrderNumber: subOrder.subOrderNumber,
      status: subOrder.status,
      vendorTotal: Number(subOrder.vendorTotal),
      customerName: subOrder.order.customer.name || "Customer",
      customerPhone: subOrder.order.shippingPhone,
      deliveryAddress: subOrder.order.shippingAddress,
      createdAt: subOrder.createdAt.toISOString(),
      items: subOrder.items.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        price: Number(item.priceAtPurchase),
      })),
    }));

    return successResponse({ orders });
  } catch (error: unknown) {
    console.error("[Vendor Orders API]", error);
    return errorResponse(
      getErrorMessage(error),
      error instanceof AuthenticationRequiredError
        ? 401
        : error instanceof VendorAuthorizationError
          ? 403
          : 500,
    );
  }
}
