export interface SafeCopyChecksum {
  algorithm: 'sha256' | 'crc32c' | 'crc64nvme' | 'sha1';
  value: string;
}

export interface SafeCopyMetadata {
  bucket: string;
  key: string;
  etag: string;
  checksum: SafeCopyChecksum;
  expires_at?: string;
}

export interface WormMetadata {
  retention_until: string;
  legal_hold?: boolean;
}

export interface AuditLogInput {
  ts_iso: string;
  session_id: string;
  actor: string;
  url_sha256: string;
  result: 'allowed' | 'blocked' | 'safe_copied';
  safe_copy: SafeCopyMetadata;
  client_ip?: string;
  asn?: number;
  mime_detected?: string;
  size_bytes?: number;
  reason?: string | null;
  agent_version?: string;
  dpi?: number;
  pages?: number;
  duration_ms?: number;
  worm?: Partial<WormMetadata>;
  version?: 1;
}

export interface AuditLogSignature {
  prev_hash: string | null;
  hmac: string;
}

export interface AuditLogStored extends AuditLogInput {
  sig: AuditLogSignature;
  version: 1;
}

export interface AuditRecord {
  key: string;
  entry: AuditLogStored;
  retention_until: string;
  legal_hold: boolean;
  created_at: string;
}

export interface AppendResult {
  key: string;
  retention_until: string;
  entry: AuditLogStored;
}

export interface VerifyRange {
  start_key?: string;
  end_key?: string;
  limit?: number;
}

export interface ChainDiff {
  key: string;
  reason: 'missing-prev' | 'hash-mismatch' | 'hmac-mismatch';
  expected?: string | null;
  actual?: string | null;
}

export interface VerifyResult {
  valid: boolean;
  checked: number;
  range_start?: string;
  range_end?: string;
  diffs: ChainDiff[];
}

export interface AuditServiceConfig {
  retentionDays: number;
  chainSecret: string;
  legalHoldDefault?: boolean;
}

export interface ListOptions {
  start_key?: string;
  end_key?: string;
  limit?: number;
  cursor?: string;
}

export interface AuditStoreListResult {
  items: AuditRecord[];
  isTruncated: boolean;
  cursor?: string;
}

export interface AuditStore {
  append(record: AuditRecord): Promise<void>;
  get(key: string): Promise<AuditRecord | null>;
  list(options?: ListOptions): Promise<AuditStoreListResult>;
  delete(key: string): Promise<void>;
}
