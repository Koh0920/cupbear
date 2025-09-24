import { NextRequest, NextResponse } from 'next/server';
import { createAuditServiceFromEnv } from './_lib/service';
import { ValidationError } from './_lib/errors';

function authorize(request: NextRequest, token: string | undefined, scope: string) {
  if (!token) {
    return NextResponse.json(
      { error: 'authorization_not_configured', detail: `${scope} token is not configured` },
      { status: 500 },
    );
  }
  const header = request.headers.get('authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'unauthorized', detail: `${scope} token missing` },
      { status: 401 },
    );
  }
  const provided = header.slice('Bearer '.length).trim();
  if (provided !== token) {
    return NextResponse.json(
      { error: 'unauthorized', detail: `${scope} token invalid` },
      { status: 401 },
    );
  }
  return null;
}

export async function POST(request: NextRequest) {
  const auth = authorize(request, process.env.AUDIT_WRITE_TOKEN, 'write');
  if (auth) return auth;
  const service = createAuditServiceFromEnv();
  try {
    const payload = await request.json();
    const result = await service.append(payload);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: 'invalid_request', detail: error.message }, { status: error.status ?? 400 });
    }
    console.error('audit append error', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = authorize(request, process.env.AUDIT_READ_TOKEN, 'read');
  if (auth) return auth;
  const service = createAuditServiceFromEnv();
  const url = new URL(request.url);
  const limitParam = url.searchParams.get('limit');
  const startKey = url.searchParams.get('start_key') ?? undefined;
  const endKey = url.searchParams.get('end_key') ?? undefined;
  const cursorParam = url.searchParams.get('cursor') ?? undefined;
  let limit: number | undefined;
  if (limitParam !== null) {
    limit = Number(limitParam);
    if (!Number.isFinite(limit) || limit <= 0 || limit > 1000) {
      return NextResponse.json(
        { error: 'invalid_request', detail: 'limit must be between 1 and 1000' },
        { status: 400 },
      );
    }
  }
  try {
    const { items, cursor, isTruncated } = await service.list({
      start_key: startKey ?? undefined,
      end_key: endKey ?? undefined,
      limit,
      cursor: cursorParam,
    });
    return NextResponse.json({ items, cursor, is_truncated: isTruncated });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: 'invalid_request', detail: error.message }, { status: error.status ?? 400 });
    }
    console.error('audit list error', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
