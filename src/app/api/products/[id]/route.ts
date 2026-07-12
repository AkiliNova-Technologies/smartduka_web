import { NextResponse } from "next/server";
import { ProductService } from "@/services/product";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await ProductService.getProductById(id);

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch product.";
    console.error("Product API Error:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const product = await ProductService.updateProduct({
      id,
      ...body,
    });

    return NextResponse.json({ success: true, data: product });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update product.";
    console.error("Product API Error:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await ProductService.deleteProduct(id);

    return NextResponse.json({ success: true, message: "Product deleted" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete product.";
    console.error("Product API Error:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}