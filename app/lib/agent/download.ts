import https from "node:https";
import net from "node:net";
import { AgentError } from "./errors";

const MAX_CONTENT_LENGTH = 25 * 1024 * 1024; // 25MB
const CONNECT_TIMEOUT_MS = 1_000;
const READ_TIMEOUT_MS = 15_000;

export type DownloadResult = {
  buffer: Buffer;
  contentType: string;
  detectedMime: string;
  size: number;
  filename?: string;
  finalUrl: string;
};

function parseContentType(header: string | undefined): string {
  if (!header) {
    throw new AgentError("Missing Content-Type header", { status: 415 });
  }
  const [essence] = header.split(";");
  const parts = essence.trim().toLowerCase().split("/");
  if (parts.length !== 2 || parts.some((part) => part === "")) {
    throw new AgentError("Invalid Content-Type header", { status: 415 });
  }
  return `${parts[0]}/${parts[1]}`;
}

function detectMime(buffer: Buffer): string {
  if (buffer.length >= 4 && buffer.slice(0, 4).toString("ascii") === "%PDF") {
    return "application/pdf";
  }
  if (buffer.length >= 2 && buffer.slice(0, 2).toString("binary") === "PK") {
    return "application/zip";
  }
  return "application/octet-stream";
}

function extractFilename(disposition: string | undefined): string | undefined {
  if (!disposition) {
    return undefined;
  }
  const match = /filename\*?=([^;]+)/i.exec(disposition);
  if (!match) {
    return undefined;
  }
  const value = match[1].trim();
  if (value.startsWith("UTF-8''")) {
    return decodeURIComponent(value.slice(7));
  }
  return value.replace(/^["']|["']$/g, "");
}

export async function guardedDownload(url: URL, allowedIps: string[]): Promise<DownloadResult> {
  if (allowedIps.length === 0) {
    throw new AgentError("No approved IPs for download", { status: 500 });
  }

  let lastError: Error | null = null;

  for (const ip of allowedIps) {
    try {
      return await requestOnce(url, ip);
    } catch (error) {
      lastError = error as Error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new AgentError("Unable to fetch content", { status: 502 });
}

function requestOnce(url: URL, ip: string): Promise<DownloadResult> {
  return new Promise<DownloadResult>((resolve, reject) => {
    const options: https.RequestOptions = {
      protocol: url.protocol,
      hostname: url.hostname,
      method: "GET",
      port: url.port ? Number(url.port) : 443,
      path: `${url.pathname}${url.search}`,
      headers: {
        Host: url.host,
        "User-Agent": "CupBear-Agent/0.1",
        Accept: "application/pdf",
        "Accept-Encoding": "identity",
      },
      lookup(hostname, _options, callback) {
        if (hostname !== url.hostname) {
          callback(new AgentError("Unexpected DNS lookup during fetch", { status: 502 }));
          return;
        }
        const family = net.isIP(ip);
        if (!family) {
          callback(new AgentError("Invalid resolved IP", { status: 500 }));
          return;
        }
        callback(null, ip, family);
      },
      timeout: READ_TIMEOUT_MS,
    };

    const req = https.request(options, (res) => {
      if (res.socket.remoteAddress !== ip) {
        req.destroy(new AgentError("Remote IP mismatch", { status: 502 }));
        return;
      }

      const status = res.statusCode ?? 0;
      if (status >= 300 && status < 400) {
        req.destroy(new AgentError("Redirects are not allowed", { status: 502 }));
        return;
      }
      if (status < 200 || status >= 300) {
        req.destroy(new AgentError(`Upstream responded with status ${status}`, { status: 502 }));
        return;
      }

      const lengthHeader = res.headers["content-length"]; // Node lowercases headers
      if (typeof lengthHeader === "string") {
        const length = Number.parseInt(lengthHeader, 10);
        if (Number.isFinite(length) && length > MAX_CONTENT_LENGTH) {
          req.destroy(new AgentError("Content-Length exceeds allowed limit", { status: 413 }));
          return;
        }
      }

      const chunks: Buffer[] = [];
      let downloaded = 0;

      res.on("data", (chunk: Buffer) => {
        downloaded += chunk.length;
        if (downloaded > MAX_CONTENT_LENGTH) {
          req.destroy(new AgentError("File exceeds maximum allowed size", { status: 413 }));
          return;
        }
        chunks.push(chunk);
      });

      res.on("end", () => {
        const buffer = Buffer.concat(chunks);
        const contentType = parseContentType(res.headers["content-type"] as string | undefined);
        const detectedMime = detectMime(buffer);

        if (contentType !== detectedMime) {
          reject(new AgentError("MIME type mismatch", { status: 415, detail: `${contentType} vs ${detectedMime}` }));
          return;
        }

        if (detectedMime !== "application/pdf") {
          reject(new AgentError("Only PDF files are supported", { status: 415 }));
          return;
        }

        resolve({
          buffer,
          contentType,
          detectedMime,
          size: buffer.length,
          filename: extractFilename(res.headers["content-disposition"] as string | undefined),
          finalUrl: url.toString(),
        });
      });

      res.on("error", (error) => {
        reject(error);
      });
    });

    req.on("socket", (socket) => {
      socket.setTimeout(READ_TIMEOUT_MS, () => {
        req.destroy(new AgentError("Read timeout", { status: 504 }));
      });
      const connectTimer = setTimeout(() => {
        req.destroy(new AgentError("Connect timeout", { status: 504 }));
      }, CONNECT_TIMEOUT_MS);
      socket.once("secureConnect", () => {
        clearTimeout(connectTimer);
      });
      socket.once("error", () => {
        clearTimeout(connectTimer);
      });
      socket.once("close", () => {
        clearTimeout(connectTimer);
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.end();
  });
}
