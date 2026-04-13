/**
 * Campaign Monitor (CreateSend) — add a subscriber to a list.
 * @see https://www.campaignmonitor.com/api/v3-3/subscribers/
 */

const CREATESEND_API_BASE = 'https://api.createsend.com/api/v3.3';

export type AddCampaignMonitorSubscriberInput = {
  email: string;
};

function isConfigured(): boolean {
  const key = process.env.CAMPAIGN_MONITOR_API_KEY?.trim();
  const listId = process.env.CAMPAIGN_MONITOR_LIST_ID?.trim();
  return Boolean(key && listId);
}

function redactEmailForLog(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf('@');
  if (at <= 0 || at === trimmed.length - 1) {
    return '(invalid-email)';
  }
  return `***@${trimmed.slice(at + 1)}`;
}

function redactListIdForLog(listId: string): string {
  const s = listId.trim();
  if (s.length <= 8) {
    return '(short-id)';
  }
  return `${s.slice(0, 4)}…${s.slice(-4)} (len=${s.length})`;
}

function logCampaignMonitor(
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

/**
 * POSTs to CreateSend. No-ops when API key / list ID are unset.
 * Throws on HTTP errors so callers can log without blocking user flows.
 */
export async function addCampaignMonitorSubscriber(
  input: AddCampaignMonitorSubscriberInput
): Promise<void> {
  if (!isConfigured()) {
    return;
  }

  const apiKey = process.env.CAMPAIGN_MONITOR_API_KEY!.trim();
  const listId = process.env.CAMPAIGN_MONITOR_LIST_ID!.trim();
  const email = input.email.trim();
  if (!email) {
    logCampaignMonitor('warn', 'campaign_monitor_skip_empty_email', {});
    return;
  }

  const body = {
    EmailAddress: email,
    ConsentToTrack: 'Yes' as const,
  };

  const auth = Buffer.from(`${apiKey}:x`, 'utf8').toString('base64');
  const url = `${CREATESEND_API_BASE}/subscribers/${encodeURIComponent(listId)}.json`;

  logCampaignMonitor('info', 'campaign_monitor_subscribe_request', {
    email: redactEmailForLog(email),
    listId: redactListIdForLog(listId),
    apiKeyLen: apiKey.length,
    endpointHost: 'api.createsend.com',
    pathTemplate: '/api/v3.3/subscribers/{listId}.json',
  });

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    logCampaignMonitor('error', 'campaign_monitor_subscribe_network_error', {
      email: redactEmailForLog(email),
      listId: redactListIdForLog(listId),
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }

  const responseText = await res.text();
  let parsedBody: unknown;
  try {
    parsedBody = responseText ? JSON.parse(responseText) : null;
  } catch {
    parsedBody = responseText.slice(0, 500);
  }

  if (!res.ok) {
    const hint =
      res.status === 404
        ? '404 usually means wrong URL path or invalid list ID — confirm CAMPAIGN_MONITOR_LIST_ID matches List API ID in Campaign Monitor (Settings → list → bottom). Ensure no extra quotes/spaces in env.'
        : res.status === 401
          ? '401 means invalid API key or key not permitted for this list — confirm CAMPAIGN_MONITOR_API_KEY (Basic auth username per CM docs).'
          : undefined;

    logCampaignMonitor('error', 'campaign_monitor_subscribe_http_error', {
      status: res.status,
      statusText: res.statusText,
      email: redactEmailForLog(email),
      listId: redactListIdForLog(listId),
      responseBody: parsedBody,
      hint,
    });

    throw new Error(
      `Campaign Monitor subscriber API failed (${res.status}): ${responseText.slice(0, 300)}`
    );
  }

  logCampaignMonitor('info', 'campaign_monitor_subscribe_ok', {
    status: res.status,
    email: redactEmailForLog(email),
    listId: redactListIdForLog(listId),
  });
}
