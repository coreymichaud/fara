import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
export function newId(): string {
  return randomBytes(18).toString('base64url');
}
export function newToken(): string {
  return randomBytes(32).toString('base64url');
}
export function hashToken(id: string, token: string): string {
  return createHash('sha256').update(`${id}:${token}`).digest('hex');
}
export function authorized(id: string, token: string, expected: string): boolean {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token) || !/^[a-f0-9]{64}$/.test(expected)) return false;
  return timingSafeEqual(Buffer.from(hashToken(id, token), 'hex'), Buffer.from(expected, 'hex'));
}
const buckets = new Map<string, { count: number; reset: number }>();
/** No IPs or fingerprints: bounded per-instance, per-plan rate limits. */
export function allowRequest(key: string, limit: number, now = Date.now()): boolean {
  if (buckets.size > 2000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
  const entry = buckets.get(key);
  if (!entry || entry.reset <= now) {
    if (buckets.size >= 10000) return false;
    buckets.set(key, { count: 1, reset: now + 60000 });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}
