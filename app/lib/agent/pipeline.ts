import { createHash } from "node:crypto";
import { sanitizeUrl, resolvePublicIps, ensureIpsConsistent } from "./network";
import { guardedDownload } from "./download";
import { sanitizePdf } from "./cdr";
import { uploadSafeCopy } from "./r2";
import auditLogger, { type AuditRecordStored } from "./audit";
import { AgentError } from "./errors";

const AGENT_VERSION = "cupbear-agent/0.1.0";
const SAFE_COPY_TTL_SECONDS = 300;

export type ProcessOptions = {
  rawUrl: string;
  sessionId: string;
  actor: string;
  clientIp?: string;
};

export type ProcessResult = {
  audit: AuditRecordStored;
  safeCopyExpiresAt: string;
  pages: number;
  dpi: number;
  mime: string;
  size: number;
  filename?: string;
};

function computeUrlHash(url: string): string {
  return createHash("sha256").update(url).digest("hex");
}

function computeExpiresAt(): string {
  const expires = new Date(Date.now() + SAFE_COPY_TTL_SECONDS * 1000);
  return expires.toISOString();
}

function computeRetentionUntil(): string {
  const days = Number.parseInt(process.env.AUDIT_RETENTION_DAYS ?? "365", 10);
  const retentionMs = Number.isFinite(days) ? days * 24 * 60 * 60 * 1000 : 31536000000;
  return new Date(Date.now() + retentionMs).toISOString();
}

export async function processUrl(options: ProcessOptions): Promise<ProcessResult> {
  const start = Date.now();
  const url = sanitizeUrl(options.rawUrl);

  const firstIps = await resolvePublicIps(url.hostname);
  const secondIps = await resolvePublicIps(url.hostname);
  const allowedIps = ensureIpsConsistent(firstIps, secondIps);

  const download = await guardedDownload(url, allowedIps);
  if (download.detectedMime !== "application/pdf") {
    throw new AgentError("Only PDF files are supported", { status: 415 });
  }

  const sanitised = await sanitizePdf(download.buffer);
  const safeKey = `${options.sessionId}/safe.pdf`;
  const upload = await uploadSafeCopy({
    key: safeKey,
    contentType: "application/pdf",
    body: sanitised.pdf,
  });

  const expiresAt = computeExpiresAt();
  const duration = Date.now() - start;

  const auditRecord = await auditLogger.append({
    ts_iso: new Date().toISOString(),
    session_id: options.sessionId,
    actor: options.actor,
    client_ip: options.clientIp,
    url_sha256: computeUrlHash(url.toString()),
    mime_detected: download.detectedMime,
    size_bytes: download.size,
    result: "safe_copied",
    reason: null,
    safe_copy: {
      bucket: upload.bucket,
      key: upload.key,
      etag: upload.etag,
      checksum: upload.checksum,
      expires_at: expiresAt,
    },
    agent_version: AGENT_VERSION,
    dpi: sanitised.dpi,
    pages: sanitised.pages,
    duration_ms: duration,
    worm: {
      retention_until: computeRetentionUntil(),
      legal_hold: false,
    },
  });

  return {
    audit: auditRecord,
    safeCopyExpiresAt: expiresAt,
    pages: sanitised.pages,
    dpi: sanitised.dpi,
    mime: download.detectedMime,
    size: download.size,
    filename: download.filename,
  };
}
