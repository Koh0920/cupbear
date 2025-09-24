import crypto from 'node:crypto';
import { ConflictError, RetentionViolationError } from './errors';
import {
  AuditRecord,
  AuditStore,
  AuditStoreListResult,
  ListOptions,
} from './types';

function compareKeys(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export class InMemoryAuditStore implements AuditStore {
  private items = new Map<string, AuditRecord>();

  async append(record: AuditRecord): Promise<void> {
    if (this.items.has(record.key)) {
      throw new ConflictError(`Object ${record.key} already exists`);
    }
    this.items.set(record.key, record);
  }

  async get(key: string): Promise<AuditRecord | null> {
    return this.items.get(key) ?? null;
  }

  async list(options?: ListOptions): Promise<AuditStoreListResult> {
    const allKeys = Array.from(this.items.keys()).sort(compareKeys);
    const { start_key, end_key, limit, cursor } = options ?? {};
    const afterKey = cursor ?? start_key;
    const filtered = allKeys.filter((key) => {
      if (afterKey && compareKeys(key, afterKey) <= 0) {
        return false;
      }
      if (end_key && compareKeys(key, end_key) > 0) {
        return false;
      }
      return true;
    });
    const slice = typeof limit === 'number' ? filtered.slice(0, limit) : filtered;
    const records = slice.map((key) => this.items.get(key)!).filter(Boolean);
    return {
      items: records,
      isTruncated: Boolean(limit && filtered.length > limit),
      cursor:
        limit && filtered.length > limit
          ? records[records.length - 1]?.key
          : records.length > 0
          ? records[records.length - 1]?.key
          : afterKey,
    };
  }

  async delete(key: string): Promise<void> {
    const record = this.items.get(key);
    if (!record) {
      return;
    }
    const now = new Date();
    const retention = new Date(record.retention_until);
    if (now < retention || record.legal_hold) {
      throw new RetentionViolationError('Object is immutable during retention/legal hold');
    }
    this.items.delete(key);
  }

  reset(): void {
    this.items.clear();
  }
}

export interface R2AuditStoreConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  prefix?: string;
}

interface SignedRequestOptions {
  method: string;
  path: string;
  query?: Record<string, string | undefined>;
  headers?: Record<string, string>;
  body?: string | Buffer;
}

function hash(input: string | Buffer): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function hmac(key: Buffer, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function formatAmzDate(date: Date): { amzDate: string; shortDate: string } {
  const shortDate = date.toISOString().slice(0, 10).replace(/-/g, '');
  const amzDate = `${shortDate}${date.toISOString().slice(11, 19).replace(/:/g, '')}Z`;
  return { amzDate, shortDate };
}

function createCanonicalQuery(query?: Record<string, string | undefined>): string {
  if (!query) return '';
  const parts: string[] = [];
  const keys = Object.keys(query).filter((key) => query[key] !== undefined);
  keys.sort();
  for (const key of keys) {
    const value = query[key];
    if (value === undefined) continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  }
  return parts.join('&');
}

function createCanonicalHeaders(headers: Record<string, string>): {
  headerString: string;
  signedHeaders: string;
} {
  const lowerEntries = Object.entries(headers)
    .map(([key, value]) => [key.toLowerCase(), value.trim().replace(/\s+/g, ' ')] as const)
    .sort(([a], [b]) => compareKeys(a, b));
  const headerString = lowerEntries.map(([key, value]) => `${key}:${value}\n`).join('');
  const signedHeaders = lowerEntries.map(([key]) => key).join(';');
  return { headerString, signedHeaders };
}

function signRequest(config: R2AuditStoreConfig, options: SignedRequestOptions): {
  url: string;
  headers: Record<string, string>;
} {
  const region = 'auto';
  const service = 's3';
  const now = new Date();
  const { amzDate, shortDate } = formatAmzDate(now);
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = options.path.startsWith('/') ? options.path : `/${options.path}`;
  const canonicalQuery = createCanonicalQuery(options.query);
  const body = options.body ?? '';
  const payloadHash = hash(typeof body === 'string' ? body : body);
  const baseHeaders: Record<string, string> = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    ...(options.headers ?? {}),
  };
  const { headerString, signedHeaders } = createCanonicalHeaders(baseHeaders);
  const canonicalRequest = [
    options.method,
    canonicalUri,
    canonicalQuery,
    headerString,
    '',
    signedHeaders,
    payloadHash,
  ].join('\n');
  const scope = `${shortDate}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    hash(canonicalRequest),
  ].join('\n');
  const kDate = hmac(Buffer.from(`AWS4${config.secretAccessKey}`), shortDate);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');
  const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const signedHeadersWithAuth = { ...baseHeaders, Authorization: authorization };
  const protocol = 'https://';
  const querySuffix = canonicalQuery ? `?${canonicalQuery}` : '';
  const url = `${protocol}${host}${canonicalUri}${querySuffix}`;
  return { url, headers: signedHeadersWithAuth };
}

export class R2AuditStore implements AuditStore {
  constructor(private config: R2AuditStoreConfig) {}

  private prefixed(key: string): string {
    const prefix = this.config.prefix?.replace(/\/+$/, '') ?? '';
    if (!prefix) return key;
    return `${prefix}/${key}`;
  }

  async append(record: AuditRecord): Promise<void> {
    const path = `/${this.config.bucket}/${this.prefixed(record.key)}`;
    const body = JSON.stringify(record.entry);
    const request = signRequest(this.config, {
      method: 'PUT',
      path,
      headers: {
        'content-type': 'application/json',
        'x-amz-object-lock-mode': 'COMPLIANCE',
        'x-amz-object-lock-retain-until-date': record.retention_until,
        ...(record.legal_hold ? { 'x-amz-object-lock-legal-hold': 'ON' } : {}),
      },
      body,
    });
    const response = await fetch(request.url, {
      method: 'PUT',
      headers: request.headers,
      body,
    });
    if (!response.ok && response.status !== 200) {
      if (response.status === 409) {
        throw new ConflictError(`Object ${record.key} already exists`);
      }
      const text = await response.text();
      throw new Error(`R2 putObject failed: ${response.status} ${text}`);
    }
  }

  async get(key: string): Promise<AuditRecord | null> {
    const path = `/${this.config.bucket}/${this.prefixed(key)}`;
    const request = signRequest(this.config, {
      method: 'GET',
      path,
    });
    const response = await fetch(request.url, { method: 'GET', headers: request.headers });
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`R2 getObject failed: ${response.status} ${text}`);
    }
    const bodyText = await response.text();
    const entry = JSON.parse(bodyText);
    const retentionUntil = response.headers.get('x-amz-object-lock-retain-until-date');
    const legalHold = response.headers.get('x-amz-object-lock-legal-hold');
    const lastModified = response.headers.get('last-modified') ?? new Date().toISOString();
    return {
      key,
      entry,
      retention_until: retentionUntil ?? entry.worm?.retention_until ?? new Date(Date.now()).toISOString(),
      legal_hold: legalHold === 'ON',
      created_at: lastModified,
    };
  }

  async list(options?: ListOptions): Promise<AuditStoreListResult> {
    const query: Record<string, string> = { 'list-type': '2' };
    const startAfterKey = options?.start_key;
    if (startAfterKey) {
      query.startafter = this.prefixed(startAfterKey);
    }
    if (options?.cursor) {
      query['continuation-token'] = options.cursor;
    }
    if (options?.limit) {
      query['max-keys'] = String(options.limit);
    }
    if (this.config.prefix) {
      query.prefix = this.config.prefix.replace(/\/+$/, '') + '/';
    }
    const path = `/${this.config.bucket}`;
    const request = signRequest(this.config, {
      method: 'GET',
      path,
      query,
    });
    const response = await fetch(request.url, { method: 'GET', headers: request.headers });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`R2 listObjects failed: ${response.status} ${text}`);
    }
    const xml = await response.text();
    const items: AuditRecord[] = [];
    const contentMatches = xml.match(/<Contents>[\s\S]*?<\/Contents>/g) ?? [];
    for (const content of contentMatches) {
      const keyMatch = content.match(/<Key>(.*?)<\/Key>/);
      if (!keyMatch) continue;
      const key = keyMatch[1];
      if (this.config.prefix && !key.startsWith(this.config.prefix)) {
        continue;
      }
      const unprefixed = this.config.prefix ? key.substring(this.config.prefix.length + 1) : key;
      const item = await this.get(unprefixed);
      if (item) {
        if (options?.end_key && compareKeys(unprefixed, options.end_key) > 0) {
          break;
        }
        items.push(item);
      }
    }
    const isTruncated = /<IsTruncated>true<\/IsTruncated>/.test(xml);
    return {
      items,
      isTruncated,
      cursor: (() => {
        const match = xml.match(/<NextContinuationToken>(.*?)<\/NextContinuationToken>/);
        if (match) {
          return decodeURIComponent(match[1]);
        }
        if (items.length > 0) {
          return items[items.length - 1]?.key;
        }
        return options?.cursor ?? startAfterKey;
      })(),
    };
  }

  async delete(key: string): Promise<void> {
    const path = `/${this.config.bucket}/${this.prefixed(key)}`;
    const request = signRequest(this.config, {
      method: 'DELETE',
      path,
    });
    const response = await fetch(request.url, { method: 'DELETE', headers: request.headers });
    if (response.status === 404) {
      return;
    }
    if (response.status === 409 || response.status === 403) {
      throw new RetentionViolationError('Object locked by retention policy');
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`R2 deleteObject failed: ${response.status} ${text}`);
    }
  }
}
