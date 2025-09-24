#!/usr/bin/env node
import { createCipheriv, createHmac, randomBytes } from "node:crypto";
import process from "node:process";

const DEFAULTS = {
  port: 3389,
  protocol: "rdp",
  username: "demo",
  password: "demo-password",
  security: "nla",
  connectionId: "viewer-rdp",
  connectionName: "Viewer",
};

const SUPPORTED_PROTOCOLS = new Set(["rdp", "vnc", "ssh"]);

function base64Url(buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function parseArgs(argv) {
  const args = { ...DEFAULTS };

  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (!value.startsWith("--")) continue;
    const key = value.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    i += 1;
    switch (key) {
      case "hostname":
        args.hostname = next;
        break;
      case "user":
        args.user = next;
        break;
      case "expires":
        args.expires = Number.parseInt(next, 10);
        break;
      case "port":
        args.port = Number.parseInt(next, 10);
        break;
      case "protocol":
        if (!SUPPORTED_PROTOCOLS.has(next)) {
          throw new Error(`Unsupported protocol: ${next}`);
        }
        args.protocol = next;
        break;
      case "username":
        args.username = next;
        break;
      case "password":
        args.password = next;
        break;
      case "security":
        args.security = next;
        break;
      case "connection-id":
        args.connectionId = next;
        break;
      case "connection-name":
        args.connectionName = next;
        break;
      default:
        throw new Error(`Unknown flag --${key}`);
    }
  }

  if (!args.hostname) throw new Error("--hostname is required");
  if (!args.user) throw new Error("--user is required");
  if (!args.expires || Number.isNaN(args.expires) || args.expires <= 0) {
    throw new Error("--expires must be a positive integer (seconds)");
  }

  return args;
}

function readKey(env, expectedLength) {
  const value = process.env[env];
  if (!value) {
    throw new Error(`Environment variable ${env} is required`);
  }
  const buffer = Buffer.from(value, "base64");
  if (buffer.length !== expectedLength) {
    throw new Error(
      `${env} must be base64 for ${expectedLength} bytes, got ${buffer.length}`
    );
  }
  return buffer;
}

function buildPayload(args) {
  const now = Math.floor(Date.now() / 1000);
  return {
    username: args.user,
    expires: now + args.expires,
    connections: [
      {
        id: args.connectionId,
        name: args.connectionName,
        protocol: args.protocol,
        attributes: {
          "max-connections": "1",
          "max-connections-per-user": "1",
        },
        parameters: {
          hostname: args.hostname,
          port: String(args.port),
          username: args.username,
          password: args.password,
          security: args.security,
          "ignore-cert": "true",
          "disable-copy": "true",
          "disable-paste": "true",
          "enable-audio": "false",
          "enable-drive": "false",
          "enable-printing": "false",
        },
      },
    ],
  };
}

function mintToken(payload, keys) {
  const json = Buffer.from(JSON.stringify(payload), "utf8");
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-128-cbc", keys.encryptionKey, iv);
  cipher.setAutoPadding(true);
  const ciphertext = Buffer.concat([cipher.update(json), cipher.final()]);

  const mac = createHmac("sha256", keys.signingKey)
    .update(Buffer.concat([iv, ciphertext]))
    .digest();

  const token = `${base64Url(mac)}:${base64Url(iv)}:${base64Url(ciphertext)}`;

  const tamperedCipher = Buffer.from(ciphertext);
  tamperedCipher[0] = tamperedCipher[0] ^ 0b00000001;
  const tamperedToken = `${base64Url(mac)}:${base64Url(iv)}:${base64Url(
    tamperedCipher
  )}`;

  return { token, tamperedToken };
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const payload = buildPayload(args);
    const keys = {
      encryptionKey: readKey("GUAC_JSON_ENCRYPTION_KEY", 16),
      signingKey: readKey("GUAC_JSON_SIGNING_KEY", 32),
    };
    const minted = mintToken(payload, keys);

    const output = {
      payload,
      issuedAt: Math.floor(Date.now() / 1000),
      valid: minted.token,
      tampered: minted.tamperedToken,
      embedUrl: `/guacamole/#/client/${minted.token}`,
    };

    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

main();
