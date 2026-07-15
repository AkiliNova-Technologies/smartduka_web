import { NextRequest } from "next/server";
import { ProductService } from "@/services/product";
import { successResponse, errorResponse, getErrorMessage } from "@/lib/api-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await ProductService.getProductById(id);

    if (!product) {
      return errorResponse("Product not found", 404);
    }

    return successResponse(product);
  } catch (error: unknown) {
    console.error("[Product API GET]", error);
    return errorResponse(getErrorMessage(error));
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const product = await ProductService.updateProduct({ id, ...body });
    return successResponse(product);
  } catch (error: unknown) {
    console.error("[Product API PUT]", error);
    return errorResponse(getErrorMessage(error));
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await ProductService.deleteProduct(id);
    return successResponse({ message: "Product deleted" });
  } catch (error: unknown) {
    console.error("[Product API DELETE]", error);
    return errorResponse(getErrorMessage(error));
  }
}