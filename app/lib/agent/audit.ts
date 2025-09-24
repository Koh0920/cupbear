import { createHash, createHmac } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export type AuditSafeCopy = {
  bucket: string;
  key: string;
  etag: string;
  checksum: { algorithm: "sha256"; value: string };
  expires_at?: string;
};

export type AuditRecordInput = {
  ts_iso: string;
  session_id: string;
  actor: string;
  client_ip?: string;
  asn?: number;
  url_sha256: string;
  mime_detected: string;
  size_bytes: number;
  result: "allowed" | "blocked" | "safe_copied";
  reason?: string | null;
  safe_copy: AuditSafeCopy;
  agent_version: string;
  dpi?: number;
  pages?: number;
  duration_ms?: number;
  worm?: { retention_until?: string; legal_hold?: boolean };
};

export type AuditRecordStored = AuditRecordInput & {
  version: 1;
  sig: { prev_hash: string; hmac: string };
};

function canonicalise(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalise(entry));
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, val]) => val !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    const result: Record<string, unknown> = {};
    for (const [key, val] of entries) {
      result[key] = canonicalise(val);
    }
    return result;
  }
  return value;
}

function canonicalStringify(value: unknown): string {
  return JSON.stringify(canonicalise(value));
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

class AuditLogger {
  private readonly filePath: string;
  private readonly secret: Buffer;
  private prevHash: string | null = null;
  private initialised = false;
  private queue: Promise<void> = Promise.resolve();

  constructor() {
    this.filePath = path.join(process.cwd(), "var", "audit-log.ndjson");
    const secret = process.env.AUDIT_HMAC_SECRET ?? "dev-secret-change-me";
    this.secret = Buffer.from(secret, "utf8");
  }

  private async ensureInitialised() {
    if (this.initialised) {
      return;
    }

    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      const content = await fs.readFile(this.filePath, "utf8");
      const lines = content.trim().split(/\n/).filter(Boolean);
      if (lines.length > 0) {
        const last = JSON.parse(lines[lines.length - 1]) as AuditRecordStored;
        this.prevHash = sha256Hex(canonicalStringify(last));
      } else {
        this.prevHash = "0".repeat(64);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        this.prevHash = "0".repeat(64);
      } else {
        throw error;
      }
    }

    this.initialised = true;
  }

  private async appendInternal(input: AuditRecordInput): Promise<AuditRecordStored> {
    await this.ensureInitialised();
    const prevHash = this.prevHash ?? "0".repeat(64);
    const baseRecord: AuditRecordStored = {
      ...input,
      version: 1,
      sig: {
        prev_hash: prevHash,
        hmac: "",
      },
    };

    const payloadForHmac = canonicalStringify({ ...baseRecord, sig: { prev_hash: prevHash } });
    const hmac = createHmac("sha256", this.secret).update(payloadForHmac).digest("hex");
    baseRecord.sig.hmac = hmac;

    const canonical = canonicalStringify(baseRecord);
    const currentHash = sha256Hex(canonical);

    await fs.appendFile(this.filePath, `${JSON.stringify(baseRecord)}\n`);
    this.prevHash = currentHash;

    return baseRecord;
  }

  async append(input: AuditRecordInput): Promise<AuditRecordStored> {
    let stored: AuditRecordStored | null = null;
    this.queue = this.queue.then(async () => {
      stored = await this.appendInternal(input);
    });
    await this.queue;
    if (!stored) {
      throw new Error("Failed to append audit record");
    }
    return stored;
  }
}

const auditLogger = new AuditLogger();
export default auditLogger;
