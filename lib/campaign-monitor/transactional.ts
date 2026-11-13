/**
 * IRL Card waitlist: welcome email (CreateSend smart transactional email) and
 * the opt-in IRL Card update list. Both return a result instead of throwing so
 * the caller can record a retryable status.
 * @see https://www.campaignmonitor.com/api/v3-3/transactional/
 * @see https://www.campaignmonitor.com/api/v3-3/subscribers/
 */

import {
  CREATESEND_API_BASE,
  createSendAuthHeader,
  getCampaignMonitorApiKey,
  logCampaignMonitor,
  readCreateSendBody,
  readCreateSendErrorCode,
  redactEmailForLog,
} from './client';

export type CampaignMonitorResult =
  | { ok: true; suppressed?: boolean }
  | { ok: false; retryable: boolean; error: string; notConfigured?: boolean };

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export function isIrlCardWelcomeEmailConfigured(): boolean {
  return Boolean(
    getCampaignMonitorApiKey() &&
    process.env.CAMPAIGN_MONITOR_IRL_CARD_WELCOME_SMART_EMAIL_ID?.trim()
  );
}

export function isIrlCardListConfigured(): boolean {
  return Boolean(
    getCampaignMonitorApiKey() &&
    process.env.CAMPAIGN_MONITOR_IRL_CARD_LIST_ID?.trim()
  );
}

async function postCreateSend(
  path: string,
  apiKey: string,
  body: Record<string, unknown>
): Promise<{ res: Response; body: unknown } | { networkError: string }> {
  try {
    const res = await fetch(`${CREATESEND_API_BASE}${path}`, {
      method: 'POST',
      headers: {
        Authorization: createSendAuthHeader(apiKey),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    return { res, body: await readCreateSendBody(res) };
  } catch (err) {
    return { networkError: err instanceof Error ? err.message : String(err) };
  }
}

export type IrlCardWelcomeEmailInput = {
  email: string;
  exploreUrl: string;
  shareUrl: string;
};

export async function sendIrlCardWelcomeEmail(
  input: IrlCardWelcomeEmailInput
): Promise<CampaignMonitorResult> {
  const apiKey = getCampaignMonitorApiKey();
  const smartEmailId =
    process.env.CAMPAIGN_MONITOR_IRL_CARD_WELCOME_SMART_EMAIL_ID?.trim();
  if (!apiKey || !smartEmailId) {
    return {
      ok: false,
      retryable: true,
      notConfigured: true,
      error: 'IRL Card welcome email is not configured',
    };
  }

  const result = await postCreateSend(
    `/transactional/smartEmail/${encodeURIComponent(smartEmailId)}/send`,
    apiKey,
    {
      To: [input.email.trim()],
      Data: {
        exploreUrl: input.exploreUrl,
        shareUrl: input.shareUrl,
      },
      AddRecipientsToList: false,
      ConsentToTrack: 'Unchanged',
    }
  );

  const email = redactEmailForLog(input.email);
  if ('networkError' in result) {
    logCampaignMonitor('error', 'irl_card_welcome_network_error', {
      email,
      error: result.networkError,
    });
    return { ok: false, retryable: true, error: 'network_error' };
  }

  if (!result.res.ok) {
    const status = result.res.status;
    logCampaignMonitor('error', 'irl_card_welcome_http_error', {
      email,
      status,
      cmCode: readCreateSendErrorCode(result.body),
    });
    return {
      ok: false,
      retryable: isRetryableStatus(status),
      error: `http_${status}`,
    };
  }

  logCampaignMonitor('info', 'irl_card_welcome_sent', { email });
  return { ok: true };
}

export type IrlCardListSubscriberInput = {
  email: string;
  city: string;
  countryIso2: string;
  alreadyUsesIrl: boolean;
};

/**
 * Adds a consenting signup to the IRL Card update list. Campaign Monitor owns
 * unsubscribe and suppression; a suppressed address (code 204) is not re-added.
 */
export async function addIrlCardListSubscriber(
  input: IrlCardListSubscriberInput
): Promise<CampaignMonitorResult> {
  const apiKey = getCampaignMonitorApiKey();
  const listId = process.env.CAMPAIGN_MONITOR_IRL_CARD_LIST_ID?.trim();
  if (!apiKey || !listId) {
    return {
      ok: false,
      retryable: true,
      notConfigured: true,
      error: 'IRL Card list is not configured',
    };
  }

  const result = await postCreateSend(
    `/subscribers/${encodeURIComponent(listId)}.json`,
    apiKey,
    {
      EmailAddress: input.email.trim(),
      CustomFields: [
        { Key: 'City', Value: input.city },
        { Key: 'Country', Value: input.countryIso2 },
        { Key: 'AlreadyUsesIRL', Value: input.alreadyUsesIrl ? 'Yes' : 'No' },
      ],
      Resubscribe: false,
      ConsentToTrack: 'Yes',
    }
  );

  const email = redactEmailForLog(input.email);
  if ('networkError' in result) {
    logCampaignMonitor('error', 'irl_card_list_network_error', {
      email,
      error: result.networkError,
    });
    return { ok: false, retryable: true, error: 'network_error' };
  }

  if (!result.res.ok) {
    const status = result.res.status;
    const cmCode = readCreateSendErrorCode(result.body);
    if (cmCode === 204) {
      logCampaignMonitor('warn', 'irl_card_list_suppressed', { email });
      return { ok: true, suppressed: true };
    }
    logCampaignMonitor('error', 'irl_card_list_http_error', {
      email,
      status,
      cmCode,
    });
    return {
      ok: false,
      retryable: isRetryableStatus(status) || cmCode === 429,
      error: `http_${status}`,
    };
  }

  logCampaignMonitor('info', 'irl_card_list_subscribed', { email });
  return { ok: true };
}
