/**
 * Campaign Monitor (CreateSend) — add a subscriber to a list.
 * @see https://www.campaignmonitor.com/api/v3-3/subscribers/
 */

const CREATESEND_API_BASE = 'https://api.createsend.com/api/v3.3';

export type AddCampaignMonitorSubscriberInput = {
  email: string;
  /** Maps to CreateSend `Name` (IRL handle). */
  username?: string;
};

function isConfigured(): boolean {
  return Boolean(
    process.env.CAMPAIGN_MONITOR_API_KEY && process.env.CAMPAIGN_MONITOR_LIST_ID
  );
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

  const apiKey = process.env.CAMPAIGN_MONITOR_API_KEY as string;
  const listId = process.env.CAMPAIGN_MONITOR_LIST_ID as string;
  const email = input.email.trim();
  if (!email) {
    return;
  }

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

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(
      `Campaign Monitor subscriber API failed (${res.status}): ${detail}`
    );
  }
}
