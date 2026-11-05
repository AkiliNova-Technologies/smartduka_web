import { StorePublicationDestination, StorePublicationKind, StorePublicationStatus, StorePublicationTopic } from "@prisma/client";
import { z } from "zod";

export const storePublicationInputSchema = z.object({
  kind: z.nativeEnum(StorePublicationKind),
  notificationTopic: z.nativeEnum(StorePublicationTopic).optional(),
  title: z.string().min(1).max(160),
  body: z.string().min(1).max(2000),
  imageUrl: z.string().url().max(1000).nullable().optional(),
  destination: z.nativeEnum(StorePublicationDestination).optional(),
  destinationProductId: z.string().uuid().nullable().optional(),
  productIds: z.array(z.string().uuid()).max(20).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
}).strict();

export function storePublicationFilters(params: URLSearchParams) {
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1), pageSize = Math.min(50, Math.max(1, Number(params.get("pageSize") ?? 20) || 20));
  const rawKind = params.get("kind"), rawStatus = params.get("status");
  const kind = rawKind && Object.values(StorePublicationKind).includes(rawKind as StorePublicationKind) ? rawKind as StorePublicationKind : undefined;
  const status = rawStatus && Object.values(StorePublicationStatus).includes(rawStatus as StorePublicationStatus) ? rawStatus as StorePublicationStatus : undefined;
  return { page, pageSize, kind, status };
}
