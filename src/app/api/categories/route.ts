import { NextRequest } from "next/server";
import { connection } from "next/server";
import { CategoryService } from "@/services/category";
import { successResponse, errorResponse, getErrorMessage } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  await connection();
  try {
    const { searchParams } = request.nextUrl;
    const mode = searchParams.get("mode");
    const includeInactive = searchParams.get("includeInactive") === "true";

    if (mode === "tree") {
      return successResponse(await CategoryService.getCategoryTree({ activeOnly: !includeInactive }));
    }
    return successResponse(await CategoryService.getAllCategories());
  } catch (error: unknown) {
    console.error("[Categories API]", error);
    return errorResponse(getErrorMessage(error));
  }
}
