import { createHash, createHmac } from "node:crypto";
import https from "node:https";
import { promises as fs } from "node:fs";
import path from "node:path";
import { AgentError } from "./errors";

export type SafeCopyUploadResult = {
  bucket: string;
  key: string;
  etag: string;
  checksum: { algorithm: "sha256"; value: string };
};

type UploadOptions = {
  key: string;
  contentType: string;
  body: Uint8Array;
};

const CHECKSUM_ALGORITHM = "sha256";

function sha256Hex(data: Uint8Array | string): string {
  return createHash("sha256").update(data).digest("hex");
}

function sha256Base64(data: Uint8Array | string): string {
  return createHash("sha256").update(data).digest("base64");
}

function md5Hex(data: Uint8Array | string): string {
  return createHash("md5").update(data).digest("hex");
}

function hmac(key: Uint8Array | string, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

function formatAmzDate(date: Date): { amzDate: string; dateStamp: string } {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return {
    amzDate: `${yyyy}${mm}${dd}T${hh}${min}${ss}Z`,
    dateStamp: `${yyyy}${mm}${dd}`,
  };
}

function canonicalHeaders(headers: Record<string, string>): { canonical: string; signedHeaders: string } {
  const entries = Object.entries(headers)
    .map(([name, value]) => [name.toLowerCase(), value.trim().replace(/\s+/g, " ")])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  const canonical = entries.map(([name, value]) => `${name}:${value}\n`).join("");
  const signedHeaders = entries.map(([name]) => name).join(";");
  return { canonical, signedHeaders };
}

function buildSigningKey(secret: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = hmac(`AWS4${secret}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

function encodeKey(key: string): string {
  return key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

async function uploadToLocal(options: UploadOptions): Promise<SafeCopyUploadResult> {
  const baseDir = path.join(process.cwd(), "var", "safe-copies");
  const segments = options.key
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && segment !== "." && segment !== "..");
  const normalizedKey = segments.join("/") || "safe-copy.pdf";
  const destPath = path.join(baseDir, normalizedKey);
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.writeFile(destPath, Buffer.from(options.body));
  const checksum = sha256Base64(options.body);
  const meta = {
    checksumAlgorithm: CHECKSUM_ALGORITHM,
    checksumValue: checksum,
  };
  await fs.writeFile(`${destPath}.meta.json`, JSON.stringify(meta, null, 2));
  return {
    bucket: process.env.R2_BUCKET ?? "local-dev",
    key: normalizedKey,
    etag: md5Hex(options.body),
    checksum: { algorithm: CHECKSUM_ALGORITHM, value: checksum },
  };
}

async function uploadToRemote(options: UploadOptions): Promise<SafeCopyUploadResult> {
  const endpoint = process.env.R2_ENDPOINT;
  const bucket = process.env.R2_BUCKET;
  const accessKey = process.env.R2_ACCESS_KEY_ID;
  const secretKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!endpoint || !bucket || !accessKey || !secretKey) {
    throw new AgentError("R2 configuration is incomplete", { status: 500 });
  }

  const { amzDate, dateStamp } = formatAmzDate(new Date());
  const url = new URL(endpoint.replace(/\/$/, ""));
  url.pathname = `/${bucket}/${encodeKey(options.key)}`;

  const bodyHashHex = sha256Hex(options.body);
  const checksum = sha256Base64(options.body);
  const md5 = md5Hex(options.body);

  const headers: Record<string, string> = {
    host: url.host,
    "content-length": String(options.body.length),
    "content-type": options.contentType,
    "user-agent": "CupBear-Agent/0.1",
    "x-amz-content-sha256": bodyHashHex,
    "x-amz-date": amzDate,
    "x-amz-checksum-sha256": checksum,
    "x-amz-meta-checksum-algorithm": CHECKSUM_ALGORITHM,
    "x-amz-meta-checksum-value": checksum,
  };

  const { canonical, signedHeaders } = canonicalHeaders(headers);
  const canonicalRequest = [
    "PUT",
    url.pathname,
    "",
    canonical,
    signedHeaders,
    bodyHashHex,
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    `${dateStamp}/auto/s3/aws4_request`,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = buildSigningKey(secretKey, dateStamp, "auto", "s3");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${dateStamp}/auto/s3/aws4_request, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const requestOptions: https.RequestOptions = {
    method: "PUT",
    hostname: url.hostname,
    port: url.port ? Number(url.port) : 443,
    path: url.pathname,
    headers: {
      ...headers,
      Authorization: authorization,
    },
  };

  return new Promise<SafeCopyUploadResult>((resolve, reject) => {
    const req = https.request(requestOptions, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        const status = res.statusCode ?? 0;
        if (status < 200 || status >= 300) {
          const bodyText = Buffer.concat(chunks).toString("utf8");
          reject(new AgentError(`R2 upload failed with status ${status}`, { status: 502, detail: bodyText }));
          return;
        }
        const serverChecksum = res.headers["x-amz-checksum-sha256"] as string | undefined;
        if (serverChecksum && serverChecksum !== checksum) {
          reject(new AgentError("Checksum mismatch reported by R2", { status: 502 }));
          return;
        }
        const etagHeader = res.headers["etag"] as string | undefined;
        resolve({
          bucket,
          key: options.key,
          etag: etagHeader ? etagHeader.replace(/"/g, "") : md5,
          checksum: { algorithm: CHECKSUM_ALGORITHM, value: checksum },
        });
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.end(Buffer.from(options.body));
  });
}

export async function uploadSafeCopy(options: UploadOptions): Promise<SafeCopyUploadResult> {
  const endpoint = process.env.R2_ENDPOINT;
  if (!endpoint) {
    return uploadToLocal(options);
  }

  try {
    return await uploadToRemote(options);
  } catch (error) {
    if (process.env.R2_ALLOW_LOCAL_FALLBACK === "1") {
      return uploadToLocal(options);
    }
    throw error;
  }
}
