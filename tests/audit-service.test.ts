import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import { POST as appendPost, GET as listGet } from '../app/api/audit/route';
import { DELETE as deleteHandler } from '../app/api/audit/[...key]/route';
import { POST as verifyPost } from '../app/api/audit/verify/route';
import { resetInMemoryAuditStore } from '../app/api/audit/_lib/service';

function setupEnv() {
  process.env.AUDIT_STORE = 'memory';
  process.env.AUDIT_CHAIN_SECRET = 'test-secret-key';
  process.env.AUDIT_RETENTION_DAYS = '90';
  process.env.AUDIT_WRITE_TOKEN = 'write-token';
  process.env.AUDIT_READ_TOKEN = 'read-token';
}

function makeAuditPayload(overrides: Partial<Record<string, unknown>> = {}) {
  const ts = new Date();
  return {
    ts_iso: ts.toISOString(),
    session_id: crypto.randomUUID(),
    actor: 'auditor@example.com',
    url_sha256: 'a'.repeat(64),
    result: 'safe_copied',
    safe_copy: {
      bucket: 'demo-bucket',
      key: `logs/${crypto.randomUUID()}.json`,
      etag: '"etag-value"',
      checksum: {
        algorithm: 'sha256',
        value: 'deadbeef'.padEnd(64, '0'),
      },
      expires_at: new Date(ts.getTime() + 3600 * 1000).toISOString(),
    },
    agent_version: 'audit-agent/1.0.0',
    ...overrides,
  };
}

test.beforeEach(() => {
  setupEnv();
  resetInMemoryAuditStore();
});

test('append endpoint stores immutable audit log', async () => {
  const payload = makeAuditPayload();
  const request = new Request('http://localhost/api/audit', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer write-token',
    },
    body: JSON.stringify(payload),
  });
  const response = await appendPost(request as any);
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.ok(body.key);
  assert.equal(body.entry.safe_copy.etag, payload.safe_copy.etag);
  assert.equal(body.entry.sig.prev_hash, null);

  const listRequest = new Request('http://localhost/api/audit?limit=10', {
    headers: { authorization: 'Bearer read-token' },
  });
  const listResponse = await listGet(listRequest as any);
  assert.equal(listResponse.status, 200);
  const listBody = await listResponse.json();
  assert.equal(listBody.items.length, 1);
  assert.equal(listBody.items[0].entry.safe_copy.key, payload.safe_copy.key);
});

test('delete during retention returns 409 conflict', async () => {
  const payload = makeAuditPayload();
  const createRequest = new Request('http://localhost/api/audit', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer write-token',
    },
    body: JSON.stringify(payload),
  });
  const createResponse = await appendPost(createRequest as any);
  const created = await createResponse.json();
  const keySegments = (created.key as string).split('/');

  const deleteRequest = new Request(`http://localhost/api/audit/${created.key}`, {
    method: 'DELETE',
    headers: { authorization: 'Bearer write-token' },
  });
  const deleteResponse = await deleteHandler(deleteRequest as any, { params: { key: keySegments } });
  assert.equal(deleteResponse.status, 409);
  const deleteBody = await deleteResponse.json();
  assert.equal(deleteBody.error, 'retention_active');
});

test('chain verification succeeds from arbitrary start key', async () => {
  const firstPayload = makeAuditPayload();
  const secondPayload = makeAuditPayload({
    ts_iso: new Date(Date.now() + 1000).toISOString(),
    session_id: crypto.randomUUID(),
    url_sha256: 'b'.repeat(64),
  });

  const firstRequest = new Request('http://localhost/api/audit', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer write-token',
    },
    body: JSON.stringify(firstPayload),
  });
  const firstResponse = await appendPost(firstRequest as any);
  const firstBody = await firstResponse.json();

  const secondRequest = new Request('http://localhost/api/audit', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer write-token',
    },
    body: JSON.stringify(secondPayload),
  });
  await appendPost(secondRequest as any);

  const verifyRequest = new Request('http://localhost/api/audit/verify', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer read-token',
    },
    body: JSON.stringify({ start_key: firstBody.key }),
  });
  const verifyResponse = await verifyPost(verifyRequest as any);
  assert.equal(verifyResponse.status, 200);
  const verifyBody = await verifyResponse.json();
  assert.equal(verifyBody.valid, true);
  assert.ok(verifyBody.checked >= 1);
  assert.equal(verifyBody.diffs.length, 0);
});
