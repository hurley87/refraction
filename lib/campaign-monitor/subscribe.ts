/**
 * Campaign Monitor (CreateSend) — add a subscriber to a list.
 * @see https://www.campaignmonitor.com/api/v3-3/subscribers/
 */

const CREATESEND_API_BASE = 'https://api.createsend.com/api/v3.3';

export type AddCampaignMonitorSubscriberInput = {
  email: string;
  /** Display name (e.g. username until a separate "name" field exists). */
  name?: string;
  /** Optional; sent as a custom field when set (key from env or "City"). */
  city?: string;
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

  const cityKey = process.env.CAMPAIGN_MONITOR_CITY_FIELD_KEY?.trim() || 'City';

  const customFields: { Key: string; Value: string }[] = [];
  const city = input.city?.trim();
  if (city) {
    customFields.push({
      Key: cityKey,
      Value: city.slice(0, 250),
    });
  }

  const body: Record<string, unknown> = {
    EmailAddress: email,
    ConsentToTrack: 'Yes',
  };

  const name = input.name?.trim();
  if (name) {
    body.Name = name.slice(0, 250);
  }

  if (customFields.length > 0) {
    body.CustomFields = customFields;
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
