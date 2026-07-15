import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { successResponse, errorResponse, getErrorMessage } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const vendorId = req.nextUrl.searchParams.get("vendorId");
    if (!vendorId) {
      return errorResponse("vendorId required", 400);
    }

    const subOrders = await prisma.subOrder.findMany({
      where: { vendorId },
      include: {
        order: {
          select: {
            shippingAddress: true,
            shippingPhone: true,
            customer: { select: { name: true } },
          },
        },
        items: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const orders = subOrders.map((so) => ({
      id: so.id,
      subOrderNumber: so.subOrderNumber,
      status: so.status,
      vendorTotal: Number(so.vendorTotal),
      customerName: so.order.customer.name || "Customer",
      customerPhone: so.order.shippingPhone,
      deliveryAddress: so.order.shippingAddress,
      createdAt: so.createdAt.toISOString(),
      items: so.items.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        price: Number(item.priceAtPurchase),
      })),
    }));

    return successResponse({ orders });
  } catch (error: unknown) {
    console.error("[Vendor Orders API]", error);
    return errorResponse(getErrorMessage(error));
  }
}