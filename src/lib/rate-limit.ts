const windows = new Map<string, { count: number; resetsAt: number }>();

/** Small per-process guard; durable overlap protection remains in PostgreSQL. */
export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = windows.get(key);
  if (!current || current.resetsAt <= now) {
    windows.set(key, { count: 1, resetsAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}
