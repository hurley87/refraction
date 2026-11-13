/**
 * Shared CreateSend (Campaign Monitor) plumbing: auth header and redacted logs.
 */

export const CREATESEND_API_BASE = 'https://api.createsend.com/api/v3.3';

export function createSendAuthHeader(apiKey: string): string {
  return `Basic ${Buffer.from(`${apiKey}:x`, 'utf8').toString('base64')}`;
}

export function getCampaignMonitorApiKey(): string | null {
  return process.env.CAMPAIGN_MONITOR_API_KEY?.trim() || null;
}

export function redactEmailForLog(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf('@');
  if (at <= 0 || at === trimmed.length - 1) {
    return '(invalid-email)';
  }
  return `***@${trimmed.slice(at + 1)}`;
}

export function redactListIdForLog(listId: string): string {
  const s = listId.trim();
  if (s.length <= 8) {
    return '(short-id)';
  }
  return `${s.slice(0, 4)}…${s.slice(-4)} (len=${s.length})`;
}

export function logCampaignMonitor(
  level: 'info' | 'warn' | 'error',
  message: string,
  meta: Record<string, unknown>
): void {
  const line = JSON.stringify({
    source: 'campaign_monitor',
    message,
    ...meta,
  });
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.info(line);
  }
}

/** CreateSend error bodies carry a numeric `Code` (e.g. 204 = suppressed). */
export function readCreateSendErrorCode(body: unknown): unknown {
  return body !== null && typeof body === 'object' && 'Code' in body
    ? (body as Record<string, unknown>).Code
    : undefined;
}

export async function readCreateSendBody(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text.slice(0, 500);
  }
}
