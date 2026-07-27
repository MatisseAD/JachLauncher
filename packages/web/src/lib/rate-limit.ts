interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Limiteur best-effort par instance. En production multi-instance, la même
 * interface peut être remplacée par Redis/Vercel KV sans toucher aux routes.
 */
export function consumeRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number,
): boolean {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0];
  const address = (forwarded ?? request.headers.get("x-real-ip") ?? "unknown")
    .trim()
    .slice(0, 64);
  const key = `${scope}:${address}`;
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    pruneBuckets(now);
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

function pruneBuckets(now: number): void {
  if (buckets.size < 5_000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}
