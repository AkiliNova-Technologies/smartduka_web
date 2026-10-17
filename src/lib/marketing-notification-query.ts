import { AnnouncementStatus, MarketingDestinationType, MarketingNotificationAudience } from "@prisma/client";
import type { MarketingCampaignListInput, MarketingDestinationOptionsInput } from "@/services/marketing-notifications";

export class MarketingNotificationQueryError extends Error {}

const values = <T extends Record<string, string>>(source: T) => Object.values(source) as T[keyof T][];
const single = (query: URLSearchParams, key: string) => {
  const entries = query.getAll(key);
  if (entries.length > 1) throw new MarketingNotificationQueryError(`${key} may only be provided once.`);
  return entries[0];
};
const ensureKeys = (query: URLSearchParams, allowed: string[]) => {
  for (const key of query.keys()) if (!allowed.includes(key)) throw new MarketingNotificationQueryError(`Unsupported query parameter: ${key}.`);
};
const integer = (value: string | undefined, fallback: number, label: string, max: number) => {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value)) throw new MarketingNotificationQueryError(`${label} must be a positive whole number.`);
  const parsed = Number(value);
  if (parsed < 1 || parsed > max) throw new MarketingNotificationQueryError(`${label} must be between 1 and ${max}.`);
  return parsed;
};
const optionalText = (value: string | undefined, label: string, max: number) => {
  if (value === undefined) return undefined;
  const normalized = value.trim().replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ");
  if (!normalized) return undefined;
  if (normalized.length > max) throw new MarketingNotificationQueryError(`${label} must be ${max} characters or fewer.`);
  return normalized;
};

export function parseMarketingCampaignListQuery(query: URLSearchParams): MarketingCampaignListInput {
  ensureKeys(query, ["status", "page", "pageSize", "search"]);
  const rawStatus = single(query, "status");
  if (rawStatus !== undefined && !values(AnnouncementStatus).includes(rawStatus as AnnouncementStatus)) throw new MarketingNotificationQueryError("status must be a valid campaign status.");
  return { status: rawStatus as AnnouncementStatus | undefined, page: integer(single(query, "page"), 1, "page", 10_000), pageSize: integer(single(query, "pageSize"), 25, "pageSize", 100), search: optionalText(single(query, "search"), "search", 100) };
}

export function parseMarketingDestinationQuery(query: URLSearchParams): MarketingDestinationOptionsInput {
  ensureKeys(query, ["destinations", "query", "type"]);
  if (single(query, "destinations") !== "1") throw new MarketingNotificationQueryError("destinations must equal 1.");
  const rawType = single(query, "type");
  if (rawType !== undefined && !values(MarketingDestinationType).includes(rawType as MarketingDestinationType)) throw new MarketingNotificationQueryError("type must be a valid destination type.");
  return { query: optionalText(single(query, "query"), "query", 100), type: rawType as MarketingDestinationType | undefined };
}

export function parseMarketingEstimateQuery(query: URLSearchParams): MarketingNotificationAudience {
  ensureKeys(query, ["estimate"]);
  const audience = single(query, "estimate");
  if (!audience || !values(MarketingNotificationAudience).includes(audience as MarketingNotificationAudience)) throw new MarketingNotificationQueryError("estimate must be a valid marketing audience.");
  return audience as MarketingNotificationAudience;
}
