import { NextResponse } from "next/server";
import { ProductService } from "@/services/product";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const vendorId = searchParams.get("vendorId") || undefined;
    const categoryId = searchParams.get("categoryId") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : undefined;

    const products = await ProductService.getAllProducts({
      vendorId,
      categoryId,
      status,
      search,
      limit,
      offset,
    });

    return NextResponse.json({ success: true, data: products });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch products.";
    console.error("Products API Error:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.vendorId || !body.name || !body.slug || !body.basePrice) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: vendorId, name, slug, basePrice" },
        { status: 400 }
      );
    }

    const product = await ProductService.createProduct(body);

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create product.";
    console.error("Products API Error:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}