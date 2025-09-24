import { NextRequest, NextResponse } from 'next/server';
import { createAuditServiceFromEnv } from '../_lib/service';
import { ValidationError } from '../_lib/errors';

function authorize(request: NextRequest, token: string | undefined) {
  if (!token) {
    return NextResponse.json(
      { error: 'authorization_not_configured', detail: 'read token is not configured' },
      { status: 500 },
    );
  }
  const header = request.headers.get('authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'unauthorized', detail: 'read token missing' }, { status: 401 });
  }
  const provided = header.slice('Bearer '.length).trim();
  if (provided !== token) {
    return NextResponse.json({ error: 'unauthorized', detail: 'read token invalid' }, { status: 401 });
  }
  return null;
}

export async function POST(request: NextRequest) {
  const auth = authorize(request, process.env.AUDIT_READ_TOKEN);
  if (auth) return auth;
  const service = createAuditServiceFromEnv();
  try {
    const payload = await request.json();
    const limit = payload?.limit;
    if (limit !== undefined) {
      if (!Number.isFinite(limit) || limit <= 0 || limit > 5000) {
        return NextResponse.json(
          { error: 'invalid_request', detail: 'limit must be between 1 and 5000' },
          { status: 400 },
        );
      }
    }
    const result = await service.verify({
      start_key: payload?.start_key,
      end_key: payload?.end_key,
      limit,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: 'invalid_request', detail: error.message }, { status: error.status ?? 400 });
    }
    console.error('audit verify error', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
