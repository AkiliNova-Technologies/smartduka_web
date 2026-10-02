import { marketingClient } from "@/lib/marketing-client";

export const ADMIN_MARKETING_CACHE_TTL_MS = 60_000;

type CacheValue = {
  promotions: Awaited<ReturnType<typeof marketingClient.getAdminPromotions>>;
  featured: Awaited<ReturnType<typeof marketingClient.getAdminFeatured>>;
  pickers: Awaited<ReturnType<typeof marketingClient.getPickers>>;
};

export type AdminMarketingCacheGroup = keyof CacheValue;

type CacheEntry<K extends AdminMarketingCacheGroup> = {
  version: number;
  data?: CacheValue[K];
  fetchedAt?: number;
  inFlightPromise?: Promise<CacheValue[K]>;
};

const entries: { [K in AdminMarketingCacheGroup]: CacheEntry<K> } = {
  promotions: { version: 0 },
  featured: { version: 0 },
  pickers: { version: 0 },
};

let cacheIdentity: string | null = null;
let cacheGeneration = 0;

const fetchers: { [K in AdminMarketingCacheGroup]: () => Promise<CacheValue[K]> } = {
  promotions: marketingClient.getAdminPromotions,
  featured: marketingClient.getAdminFeatured,
  pickers: marketingClient.getPickers,
};

export function setAdminMarketingCacheIdentity(identity: string | null) {
  if (cacheIdentity === identity) return;
  cacheIdentity = identity;
  cacheGeneration += 1;
  for (const entry of Object.values(entries)) {
    entry.data = undefined;
    entry.fetchedAt = undefined;
    entry.inFlightPromise = undefined;
    entry.version += 1;
  }
}

export function getAdminMarketingCacheEntry<K extends AdminMarketingCacheGroup>(
  group: K,
  identity: string | null,
) {
  if (!identity || cacheIdentity !== identity) return undefined;
  return entries[group] as CacheEntry<K>;
}

export function isAdminMarketingCacheEntryFresh(
  entry: CacheEntry<AdminMarketingCacheGroup> | undefined,
) {
  return Boolean(entry?.data && entry.fetchedAt && Date.now() - entry.fetchedAt < ADMIN_MARKETING_CACHE_TTL_MS);
}

export function loadAdminMarketingCacheGroup<K extends AdminMarketingCacheGroup>(
  group: K,
  { force = false }: { force?: boolean } = {},
): Promise<CacheValue[K]> {
  const entry = entries[group] as CacheEntry<K>;
  if (entry.inFlightPromise) return entry.inFlightPromise;
  if (!force && isAdminMarketingCacheEntryFresh(entry)) return Promise.resolve(entry.data as CacheValue[K]);

  const generation = cacheGeneration;
  const version = entry.version;
  const request = fetchers[group]() as Promise<CacheValue[K]>;
  const inFlightPromise = request.then((data) => {
    if (generation === cacheGeneration && entry.version === version) {
      entry.data = data;
      entry.fetchedAt = Date.now();
    }
    return entry.data ?? data;
  }).finally(() => {
    if (entry.inFlightPromise === inFlightPromise) entry.inFlightPromise = undefined;
  });
  entry.inFlightPromise = inFlightPromise;
  return inFlightPromise;
}

export function writeAdminMarketingCacheGroup<K extends AdminMarketingCacheGroup>(group: K, data: CacheValue[K]) {
  const entry = entries[group] as CacheEntry<K>;
  entry.version += 1;
  entry.data = data;
  entry.fetchedAt = Date.now();
}

export function __resetAdminMarketingCacheForTests() {
  cacheIdentity = null;
  cacheGeneration += 1;
  for (const entry of Object.values(entries)) {
    entry.data = undefined;
    entry.fetchedAt = undefined;
    entry.inFlightPromise = undefined;
    entry.version += 1;
  }
}

