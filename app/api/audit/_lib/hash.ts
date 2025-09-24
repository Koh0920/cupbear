import crypto from 'node:crypto';
import { AuditLogInput, AuditLogStored } from './types';

function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    const items = value.map((item) => canonicalStringify(item));
    return `[${items.join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, val]) => `${JSON.stringify(key)}:${canonicalStringify(val)}`);
  return `{${entries.join(',')}}`;
}

export function canonicalEntryPayload(entry: AuditLogInput): string {
  const clone: Record<string, unknown> = { ...entry };
  delete clone.sig;
  return canonicalStringify(clone);
}

export function hashEntry(entry: AuditLogInput): string {
  const canonical = canonicalEntryPayload(entry);
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

export function computeHmac(prevHash: string | null, currentHash: string, secret: string): string {
  const material = `${prevHash ?? ''}:${currentHash}`;
  return crypto.createHmac('sha256', secret).update(material).digest('hex');
}

export function withoutSignature(entry: AuditLogStored): AuditLogInput {
  const { sig: _sig, ...rest } = entry;
  return rest;
}
