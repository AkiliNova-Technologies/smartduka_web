import { NextRequest } from "next/server";
import { CategoryService } from "@/services/category";
import { v1Data, v1Exception } from "@/lib/api/v1/response";

export async function GET(request: NextRequest) {
  try {
    const parentId = request.nextUrl.searchParams.get("parentId");
    const tree = await CategoryService.getCategoryTree({ activeOnly: true });
    if (parentId) {
      const find = (items: typeof tree): typeof tree[number] | undefined => items.find((item) => item.id === parentId) ?? items.map((item) => find(item.children)).find(Boolean);
      const parent = find(tree);
      return v1Data(parent?.children ?? []);
    }
    return v1Data(tree, 200, { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" });
  } catch (error) { return v1Exception(error); }
}
