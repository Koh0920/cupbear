import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import sessionStore from "../../lib/session-store";
import { processUrl } from "../../lib/agent/pipeline";
import { toProblem } from "../../lib/agent/errors";

export const runtime = "nodejs";

const EMBED_BASE = process.env.EMBED_BASE_URL ?? "https://viewer.cupbear.example";
const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;
const idempotencyCache = new Map<string, { sessionId: string; expiresAt: number }>();

function pruneIdempotency() {
  const now = Date.now();
  for (const [key, entry] of idempotencyCache) {
    if (entry.expiresAt < now) {
      idempotencyCache.delete(key);
    }
  }
}

function problem(status: number, title: string, detail?: string) {
  const body = {
    type: "about:blank",
    title,
    status,
    ...(detail ? { detail } : {}),
  };
  return NextResponse.json(body, {
    status,
    headers: { "Content-Type": "application/problem+json" },
  });
}

function extractClientIp(request: NextRequest): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const [first] = forwarded.split(",");
    if (first) {
      return first.trim();
    }
  }
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) {
    return cf;
  }
  return request.ip ?? undefined;
}

export async function POST(request: NextRequest) {
  pruneIdempotency();

  const idempotencyKey = request.headers.get("idempotency-key");
  if (!idempotencyKey) {
    return problem(400, "Missing Idempotency-Key header");
  }
  if (idempotencyKey.length > 128) {
    return problem(400, "Idempotency-Key exceeds 128 characters");
  }

  const cached = idempotencyCache.get(idempotencyKey);
  if (cached) {
    const existing = sessionStore.get(cached.sessionId);
    if (existing) {
      return NextResponse.json({
        session_id: existing.session_id,
        embed_url: existing.embed_url,
        expires_in: 300,
      });
    }
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    return problem(400, "Invalid JSON payload", (error as Error).message);
  }

  if (!payload || typeof payload !== "object") {
    return problem(400, "Payload must be an object");
  }

  const { url, email } = payload as { url?: unknown; email?: unknown };

  if (typeof url !== "string") {
    return problem(400, "Field 'url' must be a string");
  }

  const actor = typeof email === "string" && email.length > 0 ? email : "anonymous";
  const sessionId = randomUUID();
  const embedUrl = `${EMBED_BASE.replace(/\/$/, "")}/embed/${sessionId}`;

  sessionStore.create(sessionId, embedUrl);
  sessionStore.update(sessionId, { state: "connecting" });
  idempotencyCache.set(idempotencyKey, { sessionId, expiresAt: Date.now() + IDEMPOTENCY_TTL_MS });

  try {
    const result = await processUrl({
      rawUrl: url,
      sessionId,
      actor,
      clientIp: extractClientIp(request),
    });

    sessionStore.update(sessionId, {
      state: "finished",
      reason: null,
      safe_copy: {
        bucket: result.audit.safe_copy.bucket,
        key: result.audit.safe_copy.key,
        etag: result.audit.safe_copy.etag,
        checksum: result.audit.safe_copy.checksum,
        expires_at: result.safeCopyExpiresAt,
      },
    });

    return NextResponse.json(
      {
        session_id: sessionId,
        embed_url: embedUrl,
        expires_in: 300,
      },
      { status: 201 },
    );
  } catch (error) {
    const problemDetail = toProblem(error);
    sessionStore.update(sessionId, {
      state: "failed",
      reason: problemDetail.title,
    });
    return NextResponse.json(problemDetail, {
      status: problemDetail.status,
      headers: { "Content-Type": "application/problem+json" },
    });
  }
}
