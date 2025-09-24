import { store } from './store';

const IDEMPOTENCY_TTL_SECONDS = Number(process.env.SESSION_IDEMPOTENCY_TTL ?? 300);

export type CachedResponse = {
  status: number;
  headers: Record<string, string>;
  body: unknown;
};

export async function getCachedResponse(key: string): Promise<CachedResponse | null> {
  const payload = await store.get(idempotencyKey(key));
  if (!payload) return null;
  try {
    return JSON.parse(payload) as CachedResponse;
  } catch {
    return null;
  }
}

export async function cacheResponse(key: string, response: CachedResponse): Promise<void> {
  await store.setex(idempotencyKey(key), IDEMPOTENCY_TTL_SECONDS, JSON.stringify(response));
}

function idempotencyKey(key: string): string {
  return `idempotency:${key}`;
}
