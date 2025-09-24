import dns from "node:dns/promises";
import net from "node:net";
import { AgentError } from "./errors";

type CidrBlock = { version: 4 | 6; base: bigint; prefix: number };

const BLOCKED_HOSTNAMES = new Set([
  "metadata.google.internal",
  "metadata",
  "metadata.google",
  "metadata.azure.com",
  "metadata.azure",
  "169.254.169.254",
]);

const BLOCKED_CIDRS: CidrBlock[] = [
  cidr4("0.0.0.0/8"),
  cidr4("10.0.0.0/8"),
  cidr4("100.64.0.0/10"),
  cidr4("127.0.0.0/8"),
  cidr4("169.254.0.0/16"),
  cidr4("172.16.0.0/12"),
  cidr4("192.168.0.0/16"),
  cidr4("198.18.0.0/15"),
  cidr4("224.0.0.0/4"),
  cidr4("240.0.0.0/4"),
  cidr6("::1/128"),
  cidr6("fc00::/7"),
  cidr6("fd00:ec2::254/128"),
  cidr6("fe80::/10"),
];

function cidr4(cidr: string): CidrBlock {
  const [base, prefixStr] = cidr.split("/");
  const prefix = Number.parseInt(prefixStr, 10);
  const value = ipv4ToBigInt(base);
  if (value === null || Number.isNaN(prefix) || prefix < 0 || prefix > 32) {
    throw new Error(`Invalid IPv4 CIDR: ${cidr}`);
  }
  return { version: 4, base: value, prefix };
}

function cidr6(cidr: string): CidrBlock {
  const [base, prefixStr] = cidr.split("/");
  const prefix = Number.parseInt(prefixStr, 10);
  const value = ipv6ToBigInt(base);
  if (value === null || Number.isNaN(prefix) || prefix < 0 || prefix > 128) {
    throw new Error(`Invalid IPv6 CIDR: ${cidr}`);
  }
  return { version: 6, base: value, prefix };
}

function ipv4ToBigInt(address: string): bigint | null {
  if (!net.isIPv4(address)) {
    return null;
  }
  return address.split(".").reduce<bigint>((acc, part) => (acc << 8n) + BigInt(Number(part)), 0n);
}

function ipv6ToBigInt(address: string): bigint | null {
  if (!net.isIPv6(address)) {
    return null;
  }

  const sections = address.split("::");
  let head = sections[0] ? sections[0].split(":").filter(Boolean) : [];
  let tail = sections[1] ? sections[1].split(":").filter(Boolean) : [];

  if (sections.length === 1) {
    tail = [];
  }

  if (head.length + tail.length > 8) {
    return null;
  }

  const fillCount = 8 - (head.length + tail.length);
  const segments = [
    ...head,
    ...Array.from({ length: fillCount }, () => "0"),
    ...tail,
  ];

  return segments.reduce<bigint>((acc, segment) => {
    const value = BigInt(Number.parseInt(segment || "0", 16));
    return (acc << 16n) + value;
  }, 0n);
}

function isBlockedIp(ip: string): boolean {
  const version = net.isIP(ip);
  if (!version) {
    return true;
  }

  if (version === 4) {
    const value = ipv4ToBigInt(ip);
    if (value === null) {
      return true;
    }
    return BLOCKED_CIDRS.some((cidr) => cidr.version === 4 && maskCompareBigInt(value, cidr.base, cidr.prefix, 32));
  }

  const value = ipv6ToBigInt(ip);
  if (value === null) {
    return true;
  }
  return BLOCKED_CIDRS.some((cidr) => cidr.version === 6 && maskCompareBigInt(value, cidr.base, cidr.prefix, 128));
}

function maskCompareBigInt(value: bigint, base: bigint, prefix: number, totalBits: number): boolean {
  if (prefix === 0) {
    return true;
  }
  const shift = BigInt(totalBits - prefix);
  const mask = ((1n << BigInt(prefix)) - 1n) << shift;
  return (value & mask) === (base & mask);
}

export function sanitizeUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch (error) {
    throw new AgentError("Invalid URL", { status: 400, detail: (error as Error).message });
  }

  if (url.protocol !== "https:") {
    throw new AgentError("Only https:// URLs are allowed", { status: 400 });
  }

  if (url.username || url.password) {
    throw new AgentError("Credentials in URL are not permitted", { status: 400 });
  }

  const hostname = url.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new AgentError("Hostname is not permitted", { status: 403 });
  }

  if (net.isIP(hostname) && isBlockedIp(hostname)) {
    throw new AgentError("Target IP is not permitted", { status: 403 });
  }

  return url;
}

export async function resolvePublicIps(hostname: string): Promise<string[]> {
  const unique = new Set<string>();

  try {
    const ipv4Records = await dns.resolve4(hostname);
    for (const record of ipv4Records) {
      if (!isBlockedIp(record)) {
        unique.add(record);
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENODATA" && (error as NodeJS.ErrnoException).code !== "ENOTFOUND") {
      throw new AgentError("DNS resolution failed", { status: 502, detail: (error as Error).message });
    }
  }

  try {
    const ipv6Records = await dns.resolve6(hostname);
    for (const record of ipv6Records) {
      if (!isBlockedIp(record)) {
        unique.add(record);
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENODATA" && (error as NodeJS.ErrnoException).code !== "ENOTFOUND") {
      throw new AgentError("DNS resolution failed", { status: 502, detail: (error as Error).message });
    }
  }

  if (unique.size === 0) {
    throw new AgentError("No routable public IPs for hostname", { status: 403 });
  }

  return Array.from(unique);
}

export function ensureIpsConsistent(first: string[], second: string[]): string[] {
  const intersection = first.filter((ip) => second.includes(ip));
  if (intersection.length === 0) {
    throw new AgentError("DNS answers changed between lookups", { status: 502 });
  }
  return intersection;
}
