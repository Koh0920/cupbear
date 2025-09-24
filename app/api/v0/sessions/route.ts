import { NextRequest, NextResponse } from 'next/server';
import { cacheResponse, getCachedResponse, type CachedResponse } from '../../_lib/idempotency';
import { buildRateLimitHeaders, consumeRateLimit } from '../../_lib/rate-limit';
import { ProblemDetail, problemJson, rateLimitProblem, serverProblem, upstreamProblem, validationProblem } from '../../_lib/problem';

export const runtime = 'nodejs';

const TURNSTILE_ENDPOINT = process.env.TURNSTILE_VERIFY_URL ?? 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const SESSION_EXPIRES_IN = Number(process.env.SESSION_EXPIRES_IN ?? 120);
const EMBED_BASE_URL = process.env.SESSION_EMBED_BASE_URL ?? 'https://viewer.cupbear.example/sessions';

interface CreateSessionRequest {
  url: string;
  email?: string;
  turnstile_token: string;
}

interface TurnstileResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
}

export async function POST(request: NextRequest): Promise<Response> {
  const clientIp = extractClientIp(request);
  const rateLimitKey = clientIp ? `rate:${clientIp}` : 'rate:anonymous';

  const idempotencyKey = request.headers.get('Idempotency-Key');
  if (!idempotencyKey) {
    return respondWithHeaderProblem(rateLimitKey, validationProblem('Missing Idempotency-Key header'));
  }
  if (idempotencyKey.length > 128) {
    return respondWithHeaderProblem(rateLimitKey, validationProblem('Idempotency-Key exceeds 128 characters'));
  }

  const cached = await getCachedResponse(idempotencyKey);
  if (cached) {
    return buildResponseFromCache(cached);
  }

  let rateLimitHeaders: Record<string, string> | null = null;

  try {
    const rateLimitResult = await consumeRateLimit(rateLimitKey);
    const rateLimitHeadersLocal = buildRateLimitHeaders(rateLimitResult);
    rateLimitHeaders = rateLimitHeadersLocal;

    if (rateLimitResult.exceeded) {
      const headers = { ...rateLimitHeadersLocal, 'Retry-After': String(Math.max(rateLimitResult.reset, 1)) };
      const problem = rateLimitProblem('Too many requests. Please retry later.');
      const response = problemJson(problem, { headers });
      await cacheResponse(idempotencyKey, toCachedResponse(response, problem));
      return response;
    }

    let body: CreateSessionRequest;
    try {
      body = (await request.json()) as CreateSessionRequest;
    } catch {
      const problem = validationProblem('Request body must be valid JSON');
      const response = problemJson(problem, { headers: rateLimitHeadersLocal });
      await cacheResponse(idempotencyKey, toCachedResponse(response, problem));
      return response;
    }

    const validationError = validateRequest(body);
    if (validationError) {
      const problem = validationProblem(validationError);
      const response = problemJson(problem, { headers: rateLimitHeadersLocal });
      await cacheResponse(idempotencyKey, toCachedResponse(response, problem));
      return response;
    }

    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (!turnstileSecret) {
      const problem = serverProblem('Turnstile secret is not configured.');
      const response = problemJson(problem, { headers: rateLimitHeadersLocal });
      await cacheResponse(idempotencyKey, toCachedResponse(response, problem));
      return response;
    }

    const verification = await verifyTurnstile(turnstileSecret, body.turnstile_token, clientIp);
    if (verification instanceof Error) {
      const headers = { ...rateLimitHeadersLocal, 'Retry-After': '30' };
      const problem = upstreamProblem(verification.message);
      const response = problemJson(problem, { headers });
      await cacheResponse(idempotencyKey, toCachedResponse(response, problem));
      return response;
    }

    if (!verification.success) {
      const detail = formatTurnstileError(verification['error-codes']);
      const problem = validationProblem(detail);
      const response = problemJson(problem, { headers: rateLimitHeadersLocal });
      await cacheResponse(idempotencyKey, toCachedResponse(response, problem));
      return response;
    }

    const sessionId = crypto.randomUUID();
    const embedUrl = `${EMBED_BASE_URL}/${encodeURIComponent(sessionId)}`;
    const responseBody = {
      session_id: sessionId,
      embed_url: embedUrl,
      expires_in: SESSION_EXPIRES_IN,
    };
    const response = NextResponse.json(responseBody, {
      status: 201,
      headers: rateLimitHeadersLocal,
    });

    await cacheResponse(idempotencyKey, toCachedResponse(response, responseBody));

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    if (!rateLimitHeaders) {
      const fallback = await consumeRateLimit(rateLimitKey);
      rateLimitHeaders = buildRateLimitHeaders(fallback);
    }
    const problem = serverProblem(`Request could not be processed: ${message}`);
    const response = problemJson(problem, { headers: rateLimitHeaders });
    await cacheResponse(idempotencyKey, toCachedResponse(response, problem));
    return response;
  }
}

function extractClientIp(request: NextRequest): string | null {
  if (request.ip) return request.ip;
  const forwarded = request.headers.get('x-forwarded-for');
  if (!forwarded) return null;
  return forwarded.split(',')[0]?.trim() ?? null;
}

function validateRequest(body: Partial<CreateSessionRequest>): string | null {
  if (!body || typeof body !== 'object') {
    return 'Request body must be an object.';
  }
  if (!body.url || typeof body.url !== 'string') {
    return 'Field "url" is required.';
  }
  try {
    const parsed = new URL(body.url);
    if (parsed.protocol !== 'https:') {
      return 'Only https URLs are supported.';
    }
  } catch {
    return 'Field "url" must be a valid URI.';
  }
  if (body.email) {
    if (typeof body.email !== 'string') {
      return 'Field "email" must be a string if provided.';
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(body.email)) {
      return 'Field "email" must be a valid email address.';
    }
  }
  if (!body.turnstile_token || typeof body.turnstile_token !== 'string') {
    return 'Field "turnstile_token" is required.';
  }
  return null;
}

async function verifyTurnstile(secret: string, token: string, ip: string | null): Promise<TurnstileResponse | Error> {
  const form = new URLSearchParams();
  form.set('secret', secret);
  form.set('response', token);
  if (ip) {
    form.set('remoteip', ip);
  }

  let response: globalThis.Response;
  try {
    response = await fetch(TURNSTILE_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: form,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to contact Turnstile.';
    return new Error(message);
  }

  if (!response.ok) {
    return new Error(`Turnstile verification failed with status ${response.status}.`);
  }

  try {
    return (await response.json()) as TurnstileResponse;
  } catch {
    return new Error('Turnstile verification response was not valid JSON.');
  }
}

function formatTurnstileError(errorCodes?: string[]): string {
  if (!errorCodes || errorCodes.length === 0) {
    return 'Turnstile challenge failed.';
  }
  return `Turnstile challenge failed: ${errorCodes.join(', ')}`;
}

function buildResponseFromCache(cached: CachedResponse): Response {
  const headers = new Headers(cached.headers);
  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  return new Response(JSON.stringify(cached.body), {
    status: cached.status,
    headers,
  });
}

function toCachedResponse<T>(response: NextResponse, body: T) {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return {
    status: response.status,
    headers,
    body,
  };
}

async function respondWithHeaderProblem(rateLimitKey: string, problem: ProblemDetail): Promise<Response> {
  const rateLimitResult = await consumeRateLimit(rateLimitKey);
  const rateLimitHeaders = buildRateLimitHeaders(rateLimitResult);
  if (rateLimitResult.exceeded) {
    const headers = { ...rateLimitHeaders, 'Retry-After': String(Math.max(rateLimitResult.reset, 1)) };
    const rlProblem = rateLimitProblem('Too many requests. Please retry later.');
    return problemJson(rlProblem, { headers });
  }
  return problemJson(problem, { headers: rateLimitHeaders });
}
