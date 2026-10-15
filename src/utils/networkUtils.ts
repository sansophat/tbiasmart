import { Branch } from '../types';

let cachedClientIp: string | null = null;
let lastFetchedAt: number = 0;

/**
 * Detect client public IP via local backend with fallback to public IP API
 */
export async function detectClientIp(): Promise<string> {
  const now = Date.now();
  if (cachedClientIp && now - lastFetchedAt < 60000) {
    return cachedClientIp;
  }

  // 1. Try local server endpoint
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch('/api/network/my-ip', { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data?.ip) {
        cachedClientIp = String(data.ip).trim();
        lastFetchedAt = now;
        return cachedClientIp;
      }
    }
  } catch {
    // continue to fallback
  }

  // 2. Fallback to public ipify
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data?.ip) {
        cachedClientIp = String(data.ip).trim();
        lastFetchedAt = now;
        return cachedClientIp;
      }
    }
  } catch {
    // continue
  }

  return cachedClientIp || '';
}

/**
 * Check if the client IP matches the branch's registered/whitelisted office IPs
 */
export function isIpInBranchWhitelist(branch?: Branch, clientIp?: string): boolean {
  if (!branch || !clientIp) return false;

  const targetIp = clientIp.trim();
  if (!targetIp) return false;

  // Gather all allowed IPs from branch
  const allowedList: string[] = [];

  if (Array.isArray(branch.allowedIps)) {
    allowedList.push(...branch.allowedIps);
  }

  if (branch.allowedIpText) {
    const fromText = branch.allowedIpText
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    allowedList.push(...fromText);
  }

  if (allowedList.length === 0) {
    return false;
  }

  return allowedList.some((pattern) => {
    const p = pattern.trim();
    if (!p) return false;
    // Exact match
    if (p === targetIp) return true;
    // Prefix / Wildcard match (e.g. 192.168.1.* or 10.0.0.)
    if (p.endsWith('*')) {
      const prefix = p.slice(0, -1);
      return targetIp.startsWith(prefix);
    }
    return false;
  });
}
