import { store } from './store';

const WINDOW_SECONDS = Number(process.env.SESSION_RATE_LIMIT_WINDOW ?? 60);
const MAX_REQUESTS = Number(process.env.SESSION_RATE_LIMIT_MAX ?? 5);

export type RateLimitResult = {
  limit: number;
  remaining: number;
  reset: number;
  exceeded: boolean;
};

export async function consumeRateLimit(key: string): Promise<RateLimitResult> {
  const count = await store.incr(key);
  let ttl = await store.ttl(key);
  if (ttl === -2 || ttl === -1) {
    await store.expire(key, WINDOW_SECONDS);
    ttl = WINDOW_SECONDS;
  }
  const remaining = Math.max(MAX_REQUESTS - count, 0);
  const exceeded = count > MAX_REQUESTS;
  return {
    limit: MAX_REQUESTS,
    remaining: exceeded ? 0 : remaining,
    reset: ttl,
    exceeded,
  };
}

export function buildRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'RateLimit-Limit': String(result.limit),
    'RateLimit-Remaining': String(result.remaining),
    'RateLimit-Reset': String(result.reset),
  };
}
