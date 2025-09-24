import { NextRequest, NextResponse } from 'next/server';
import { createAuditServiceFromEnv } from '../_lib/service';
import { RetentionViolationError, ValidationError } from '../_lib/errors';

function authorize(request: NextRequest, token: string | undefined, scope: string) {
  if (!token) {
    return NextResponse.json(
      { error: 'authorization_not_configured', detail: `${scope} token is not configured` },
      { status: 500 },
    );
  }
  const header = request.headers.get('authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'unauthorized', detail: `${scope} token missing` }, { status: 401 });
  }
  const provided = header.slice('Bearer '.length).trim();
  if (provided !== token) {
    return NextResponse.json({ error: 'unauthorized', detail: `${scope} token invalid` }, { status: 401 });
  }
  return null;
}

function extractKey(params: { key?: string[] }): string | null {
  if (!params.key || params.key.length === 0) {
    return null;
  }
  return params.key.join('/');
}

export async function GET(request: NextRequest, context: { params: { key?: string[] } }) {
  const auth = authorize(request, process.env.AUDIT_READ_TOKEN, 'read');
  if (auth) return auth;
  const key = extractKey(context.params);
  if (!key) {
    return NextResponse.json({ error: 'invalid_request', detail: 'key missing' }, { status: 400 });
  }
  const service = createAuditServiceFromEnv();
  try {
    const record = await service.get(key);
    if (!record) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json(record);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: 'invalid_request', detail: error.message }, { status: error.status ?? 400 });
    }
    console.error('audit get error', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: { key?: string[] } }) {
  const auth = authorize(request, process.env.AUDIT_WRITE_TOKEN, 'write');
  if (auth) return auth;
  const key = extractKey(context.params);
  if (!key) {
    return NextResponse.json({ error: 'invalid_request', detail: 'key missing' }, { status: 400 });
  }
  const service = createAuditServiceFromEnv();
  try {
    await service.delete(key);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    if (error instanceof RetentionViolationError) {
      return NextResponse.json(
        { error: 'retention_active', detail: 'Object is locked by retention policy' },
        { status: 409 },
      );
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: 'invalid_request', detail: error.message }, { status: error.status ?? 400 });
    }
    console.error('audit delete error', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
