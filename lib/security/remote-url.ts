import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const blockedHostnames = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.google.internal.",
  "169.254.169.254",
]);

const hostnameSafetyCache = new Map<string, boolean>();

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return true;
  }

  const [a, b] = parts;

  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;

  return false;
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase();

  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("fe8") || normalized.startsWith("fe9")) return true;
  if (normalized.startsWith("fea") || normalized.startsWith("feb")) return true;
  if (normalized.startsWith("ff")) return true;

  const mappedV4 = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mappedV4) return isPrivateIpv4(mappedV4[1]);

  return false;
}

function isPrivateIpAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return isPrivateIpv4(address);
  if (family === 6) return isPrivateIpv6(address);
  return true;
}

function isBlockedHostname(hostname: string): boolean {
  if (blockedHostnames.has(hostname)) return true;
  if (hostname.endsWith(".localhost")) return true;
  if (hostname.endsWith(".local")) return true;
  if (hostname.endsWith(".internal")) return true;
  return false;
}

async function isSafeHostname(hostname: string): Promise<boolean> {
  const cached = hostnameSafetyCache.get(hostname);
  if (cached !== undefined) return cached;

  if (isBlockedHostname(hostname)) {
    hostnameSafetyCache.set(hostname, false);
    return false;
  }

  const hostFamily = isIP(hostname);
  if (hostFamily > 0) {
    const safe = !isPrivateIpAddress(hostname);
    hostnameSafetyCache.set(hostname, safe);
    return safe;
  }

  try {
    const records = await lookup(hostname, { all: true, verbatim: true });
    if (records.length === 0) {
      hostnameSafetyCache.set(hostname, false);
      return false;
    }

    const safe = records.every((record) => !isPrivateIpAddress(record.address));
    hostnameSafetyCache.set(hostname, safe);
    return safe;
  } catch {
    hostnameSafetyCache.set(hostname, false);
    return false;
  }
}

export async function isSafeRemoteHttpUrl(rawUrl: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  return isSafeHostname(parsed.hostname.toLowerCase());
}
