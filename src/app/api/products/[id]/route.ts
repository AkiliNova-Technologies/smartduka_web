import { NextRequest } from "next/server";
import { ProductService, type UpdateProductInput } from "@/services/product";
import { prisma } from "@/lib/prisma/client";
import { requireVendorContext, VendorAuthorizationError } from "@/lib/auth/vendor-context";
import { AuthenticationRequiredError } from "@/lib/auth/session";
import { successResponse, errorResponse, getErrorMessage } from "@/lib/api-utils";

function authorizationError(error: unknown) {
  return errorResponse(getErrorMessage(error), error instanceof AuthenticationRequiredError ? 401 : error instanceof VendorAuthorizationError ? 403 : 500);
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const product = await ProductService.getPublicProductById(id);
    if (!product) return errorResponse("Product not found", 404);
    return successResponse(product);
  } catch (error: unknown) {
    console.error("[Product API GET]", error);
    return errorResponse(getErrorMessage(error));
  }
}

async function requireOwnedProduct(id: string) {
  const context = await requireVendorContext("vendor:manage_products");
  const product = await prisma.product.findFirst({ where: { id, vendorId: context.vendorId } });
  if (!product) return null;
  return context;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const context = await requireOwnedProduct(id);
    if (!context) return errorResponse("Product not found", 404);
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return errorResponse("Invalid product payload", 400);
    const product = await ProductService.updateProduct({ ...(body as Omit<UpdateProductInput, "id">), id });
    return successResponse(product);
  } catch (error: unknown) {
    console.error("[Product API PUT]", error);
    return authorizationError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const context = await requireOwnedProduct(id);
    if (!context) return errorResponse("Product not found", 404);
    await ProductService.deleteProduct(id);
    return successResponse({ message: "Product deleted" });
  } catch (error: unknown) {
    console.error("[Product API DELETE]", error);
    return authorizationError(error);
  }
}
