import { z } from "zod";
import { BranchInventoryService } from "@/services/branch-inventory";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
const schema = z.object({ requestId: z.string().uuid(), branchId: z.string().uuid(), productId: z.string().uuid(), variantId: z.string().uuid().nullable().optional(), operation: z.enum(["ALLOCATE", "RESTOCK", "ADJUST"]).default("ALLOCATE"), quantity: z.number().int().min(-1_000_000).max(1_000_000).refine((value) => value !== 0), reason: z.string().trim().max(500).optional() }).strict();
export async function GET(request: Request) { try { return v1Data(await BranchInventoryService.list(new URL(request.url).searchParams.get("branchId") ?? undefined)); } catch (error) { return v1Exception(error); } }
export async function POST(request: Request) { try { const result = await BranchInventoryService.mutate(schema.parse(await request.json())); return v1Data(result, result.replayed ? 200 : 201); } catch (error) { return v1Exception(error); } }
export async function PATCH() { try { return v1Data(await BranchInventoryService.enable()); } catch (error) { return v1Exception(error); } }
