import crypto from 'node:crypto';
import { RetentionViolationError, ValidationError } from './errors';
import {
  AppendResult,
  AuditLogInput,
  AuditLogStored,
  AuditRecord,
  AuditServiceConfig,
  AuditStore,
  ChainDiff,
  ListOptions,
  VerifyRange,
  VerifyResult,
} from './types';
import { computeHmac, hashEntry, withoutSignature } from './hash';
import { InMemoryAuditStore, R2AuditStore, R2AuditStoreConfig } from './stores';

const DAY_MS = 24 * 60 * 60 * 1000;

function assertSafeCopy(entry: AuditLogInput) {
  if (!entry.safe_copy) {
    throw new ValidationError('safe_copy is required');
  }
  const sc = entry.safe_copy;
  if (!sc.bucket || !sc.key || !sc.etag || !sc.checksum) {
    throw new ValidationError('safe_copy must include bucket, key, etag, and checksum');
  }
  if (!sc.checksum.algorithm || !sc.checksum.value) {
    throw new ValidationError('safe_copy.checksum must include algorithm and value');
  }
  const allowedAlgorithms = ['sha256', 'crc32c', 'crc64nvme', 'sha1'];
  if (!allowedAlgorithms.includes(sc.checksum.algorithm)) {
    throw new ValidationError(`Unsupported checksum algorithm: ${sc.checksum.algorithm}`);
  }
}

function ensureIso8601(value: string, field: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`${field} must be an ISO8601 timestamp`);
  }
  return date.toISOString();
}

function cloneInput(input: AuditLogInput): AuditLogInput {
  return JSON.parse(JSON.stringify(input));
}

export class AuditService {
  constructor(private store: AuditStore, private config: AuditServiceConfig) {}

  private async getTail(): Promise<AuditRecord | null> {
    let cursor: string | undefined;
    let latest: AuditRecord | null = null;
    do {
      const { items, isTruncated, cursor: nextCursor } = await this.store.list({ cursor, limit: 100 });
      if (items.length > 0) {
        latest = items[items.length - 1];
      }
      if (!isTruncated) {
        break;
      }
      cursor = nextCursor;
      if (!cursor) {
        break;
      }
    } while (cursor);
    return latest;
  }

  private generateKey(tsIso: string): string {
    const ts = new Date(tsIso);
    const datePart = ts.toISOString().slice(0, 10).replace(/-/g, '/');
    const timePart = ts.toISOString().slice(11, 23).replace(/[:.]/g, '');
    const random = crypto.randomUUID();
    return `${datePart}/${timePart}_${random}.json`;
  }

  private normalizeInput(input: AuditLogInput): AuditLogInput {
    const clone = cloneInput(input);
    clone.ts_iso = ensureIso8601(clone.ts_iso, 'ts_iso');
    assertSafeCopy(clone);
    if (clone.safe_copy.expires_at) {
      clone.safe_copy.expires_at = ensureIso8601(clone.safe_copy.expires_at, 'safe_copy.expires_at');
    }
    if (clone.agent_version && clone.agent_version.length === 0) {
      throw new ValidationError('agent_version cannot be empty when provided');
    }
    clone.version = 1;
    return clone;
  }

  async append(input: AuditLogInput): Promise<AppendResult> {
    const normalized = this.normalizeInput(input);
    const retentionDays = this.config.retentionDays;
    const retentionUntil = new Date(new Date(normalized.ts_iso).getTime() + retentionDays * DAY_MS);
    const retentionIso = retentionUntil.toISOString();
    const legalHold = normalized.worm?.legal_hold ?? this.config.legalHoldDefault ?? false;
    const requestedRetention = normalized.worm?.retention_until;
    const wormRetention = requestedRetention
      ? ensureIso8601(requestedRetention, 'worm.retention_until')
      : retentionIso;
    normalized.worm = {
      retention_until: wormRetention,
      legal_hold: legalHold,
    };
    const prev = await this.getTail();
    const prevHash = prev ? hashEntry(withoutSignature(prev.entry)) : null;
    const currentHash = hashEntry(normalized);
    const hmac = computeHmac(prevHash, currentHash, this.config.chainSecret);
    const stored: AuditLogStored = {
      ...normalized,
      sig: {
        prev_hash: prevHash,
        hmac,
      },
      version: 1,
    };
    const key = this.generateKey(normalized.ts_iso);
    const record: AuditRecord = {
      key,
      entry: stored,
      retention_until: wormRetention,
      legal_hold: legalHold,
      created_at: new Date().toISOString(),
    };
    await this.store.append(record);
    return {
      key,
      retention_until: record.retention_until,
      entry: stored,
    };
  }

  async get(key: string): Promise<AuditRecord | null> {
    return this.store.get(key);
  }

  async list(options?: ListOptions) {
    return this.store.list(options);
  }

  async verify(range: VerifyRange = {}): Promise<VerifyResult> {
    const results: ChainDiff[] = [];
    let checked = 0;
    let cursor: string | undefined;
    let startKey = range.start_key;
    let endKey: string | undefined;
    let firstKey: string | undefined;

    const prevEntry = startKey ? await this.findPrevious(startKey) : null;
    let expectedPrevHash = prevEntry ? hashEntry(withoutSignature(prevEntry.entry)) : null;

    do {
      const { items, isTruncated, cursor: nextCursor } = await this.store.list({
        start_key: startKey,
        cursor,
        limit: range.limit,
        end_key: range.end_key,
      });
      if (items.length === 0) {
        break;
      }
      for (const record of items) {
        const contentHash = hashEntry(withoutSignature(record.entry));
        if (!firstKey) {
          firstKey = record.key;
        }
        if (record.entry.sig.prev_hash !== expectedPrevHash) {
          results.push({
            key: record.key,
            reason: 'missing-prev',
            expected: expectedPrevHash,
            actual: record.entry.sig.prev_hash,
          });
        }
        const computedHmac = computeHmac(record.entry.sig.prev_hash, contentHash, this.config.chainSecret);
        if (computedHmac !== record.entry.sig.hmac) {
          results.push({
            key: record.key,
            reason: 'hmac-mismatch',
            expected: computedHmac,
            actual: record.entry.sig.hmac,
          });
        }
        expectedPrevHash = contentHash;
        checked += 1;
        endKey = record.key;
        if (range.end_key && record.key === range.end_key) {
          return {
            valid: results.length === 0,
            checked,
            range_start: range.start_key ?? firstKey,
            range_end: endKey,
            diffs: results,
          };
        }
      }
      if (!isTruncated) {
        break;
      }
      cursor = nextCursor;
      startKey = undefined;
      if (!cursor) {
        break;
      }
    } while (true);

    return {
      valid: results.length === 0,
      checked,
      range_start: range.start_key ?? firstKey,
      range_end: endKey,
      diffs: results,
    };
  }

  private async findPrevious(key: string): Promise<AuditRecord | null> {
    const { items } = await this.store.list({ end_key: key, limit: 1000 });
    if (items.length === 0) {
      return null;
    }
    return items[items.length - 1];
  }

  async delete(key: string): Promise<void> {
    try {
      await this.store.delete(key);
    } catch (error) {
      if (error instanceof RetentionViolationError) {
        throw error;
      }
      throw error;
    }
  }
}

export interface EnvConfig {
  AUDIT_CHAIN_SECRET?: string;
  AUDIT_RETENTION_DAYS?: string;
  AUDIT_LEGAL_HOLD_DEFAULT?: string;
  AUDIT_R2_ACCOUNT_ID?: string;
  AUDIT_R2_ACCESS_KEY_ID?: string;
  AUDIT_R2_SECRET_ACCESS_KEY?: string;
  AUDIT_R2_BUCKET?: string;
  AUDIT_R2_PREFIX?: string;
  AUDIT_STORE?: 'memory' | 'r2';
}

export function createAuditServiceFromEnv(env?: EnvConfig): AuditService {
  const configuration = env ?? (process.env as unknown as EnvConfig);
  const secret = configuration.AUDIT_CHAIN_SECRET;
  if (!secret) {
    throw new ValidationError('AUDIT_CHAIN_SECRET must be configured', 500);
  }
  const retentionDays = configuration.AUDIT_RETENTION_DAYS ? Number(configuration.AUDIT_RETENTION_DAYS) : 90;
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) {
    throw new ValidationError('AUDIT_RETENTION_DAYS must be a positive integer', 500);
  }
  const config: AuditServiceConfig = {
    retentionDays,
    chainSecret: secret,
    legalHoldDefault: configuration.AUDIT_LEGAL_HOLD_DEFAULT === 'true',
  };
  if (configuration.AUDIT_STORE === 'memory') {
    const globalAny = globalThis as typeof globalThis & { __auditMemoryStore?: InMemoryAuditStore };
    if (!globalAny.__auditMemoryStore) {
      globalAny.__auditMemoryStore = new InMemoryAuditStore();
    }
    return new AuditService(globalAny.__auditMemoryStore, config);
  }
  const accountId = configuration.AUDIT_R2_ACCOUNT_ID;
  const accessKeyId = configuration.AUDIT_R2_ACCESS_KEY_ID;
  const secretAccessKey = configuration.AUDIT_R2_SECRET_ACCESS_KEY;
  const bucket = configuration.AUDIT_R2_BUCKET;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new ValidationError('R2 credentials are not fully configured', 500);
  }
  const storeConfig: R2AuditStoreConfig = {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    prefix: configuration.AUDIT_R2_PREFIX,
  };
  return new AuditService(new R2AuditStore(storeConfig), config);
}

export function createInMemoryAuditService(config: Partial<AuditServiceConfig> & { chainSecret: string }): AuditService {
  const serviceConfig: AuditServiceConfig = {
    retentionDays: config.retentionDays ?? 90,
    chainSecret: config.chainSecret,
    legalHoldDefault: config.legalHoldDefault ?? false,
  };
  return new AuditService(new InMemoryAuditStore(), serviceConfig);
}

export function resetInMemoryAuditStore(): void {
  const globalAny = globalThis as typeof globalThis & { __auditMemoryStore?: InMemoryAuditStore };
  globalAny.__auditMemoryStore?.reset();
}
