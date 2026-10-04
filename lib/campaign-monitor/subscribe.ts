/**
 * Campaign Monitor (CreateSend) — add a subscriber to a list.
 * @see https://www.campaignmonitor.com/api/v3-3/subscribers/
 */

const CREATESEND_API_BASE = 'https://api.createsend.com/api/v3.3';

/** CreateSend rate-limits repeat adds for the same address; coalesce hot paths. */
const SUBSCRIBE_DEDUPE_MS = 15 * 60 * 1000;
const recentSubscribeAttemptByEmail = new Map<string, number>();
const inFlightSubscribeByEmail = new Map<string, Promise<void>>();

function normalizeEmailKey(email: string): string {
  return email.trim().toLowerCase();
}

function shouldSkipRecentSubscribeAttempt(emailKey: string): boolean {
  const lastAttempt = recentSubscribeAttemptByEmail.get(emailKey);
  if (lastAttempt === undefined) {
    return false;
  }
  return Date.now() - lastAttempt < SUBSCRIBE_DEDUPE_MS;
}

function markSubscribeAttempt(emailKey: string): void {
  recentSubscribeAttemptByEmail.set(emailKey, Date.now());
  if (recentSubscribeAttemptByEmail.size > 500) {
    const cutoff = Date.now() - SUBSCRIBE_DEDUPE_MS;
    for (const [key, at] of recentSubscribeAttemptByEmail) {
      if (at < cutoff) {
        recentSubscribeAttemptByEmail.delete(key);
      }
    }
  }
}

export type AddCampaignMonitorSubscriberInput = {
  email: string;
  /** Maps to CreateSend `Name` (IRL handle). */
  username?: string;
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

  const email = input.email.trim();
  if (!email) {
    logCampaignMonitor('warn', 'campaign_monitor_skip_empty_email', {});
    return;
  }

  const emailKey = normalizeEmailKey(email);
  const inFlight = inFlightSubscribeByEmail.get(emailKey);
  if (inFlight) {
    return inFlight;
  }

  if (shouldSkipRecentSubscribeAttempt(emailKey)) {
    logCampaignMonitor('info', 'campaign_monitor_subscribe_deduped', {
      email: redactEmailForLog(email),
    });
    return;
  }

  const work = addCampaignMonitorSubscriberOnce(input, email, emailKey);
  inFlightSubscribeByEmail.set(emailKey, work);
  try {
    await work;
  } finally {
    inFlightSubscribeByEmail.delete(emailKey);
  }
}

async function addCampaignMonitorSubscriberOnce(
  input: AddCampaignMonitorSubscriberInput,
  email: string,
  emailKey: string
): Promise<void> {
  const apiKey = process.env.CAMPAIGN_MONITOR_API_KEY!.trim();
  const listId = process.env.CAMPAIGN_MONITOR_LIST_ID!.trim();

  const name = input.username?.trim();
  const body: Record<string, unknown> = {
    EmailAddress: email,
    ConsentToTrack: 'Yes',
  };
  if (name) {
    body.Name = name.slice(0, 250);
  }

  const auth = Buffer.from(`${apiKey}:x`, 'utf8').toString('base64');
  const url = `${CREATESEND_API_BASE}/subscribers/${encodeURIComponent(listId)}.json`;

  markSubscribeAttempt(emailKey);

  logCampaignMonitor('info', 'campaign_monitor_subscribe_request', {
    email: redactEmailForLog(email),
    listId: redactListIdForLog(listId),
    apiKeyLen: apiKey.length,
    hasName: Boolean(name),
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
    // Code 204 means the email is on the suppression list (unsubscribed/bounced).
    // This is an expected business case — the user has opted out — not an error.
    const cmCode =
      parsedBody !== null &&
      typeof parsedBody === 'object' &&
      'Code' in (parsedBody as object)
        ? (parsedBody as Record<string, unknown>).Code
        : undefined;

    if (cmCode === 204) {
      logCampaignMonitor('warn', 'campaign_monitor_subscribe_suppressed', {
        status: res.status,
        email: redactEmailForLog(email),
        listId: redactListIdForLog(listId),
        cmCode,
      });
      return;
    }

    if (res.status === 429 || cmCode === 429) {
      logCampaignMonitor('warn', 'campaign_monitor_subscribe_rate_limited', {
        status: res.status,
        email: redactEmailForLog(email),
        listId: redactListIdForLog(listId),
        cmCode,
        responseBody: parsedBody,
      });
      return;
    }

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
