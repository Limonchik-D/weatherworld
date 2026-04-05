/**
 * Simple in-memory rate limiter.
 * On Cloudflare Workers each isolate handles a subset of traffic,
 * so limits are per-isolate — good enough to prevent accidental hammering.
 * Window: 60 s, default limit: 30 requests per window per IP.
 */

const WINDOW_MS = 60_000;
const store = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  ip: string,
  limit = 30,
): { ok: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  let entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    store.set(ip, entry);
  }

  entry.count += 1;
  const remaining = Math.max(0, limit - entry.count);
  const resetIn = Math.ceil((entry.resetAt - now) / 1000);

  // Prune old entries every ~1000 calls to avoid memory leak
  if (store.size > 1000) {
    for (const [k, v] of store) {
      if (now > v.resetAt) store.delete(k);
    }
  }

  return { ok: entry.count <= limit, remaining, resetIn };
}

export function rateLimitResponse(resetIn: number) {
  return new Response(
    JSON.stringify({ error: 'Too many requests' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(resetIn),
        'X-RateLimit-Limit': '30',
        'X-RateLimit-Remaining': '0',
      },
    },
  );
}
