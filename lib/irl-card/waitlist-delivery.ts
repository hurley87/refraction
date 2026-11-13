import {
  addIrlCardListSubscriber,
  isIrlCardListConfigured,
  isIrlCardWelcomeEmailConfigured,
  sendIrlCardWelcomeEmail,
} from '@/lib/campaign-monitor/transactional';
import {
  LIST_SYNC_MAX_ATTEMPTS,
  claimWelcomeSend,
  markListFailed,
  markListSynced,
  markWelcomeFailed,
  markWelcomeSent,
  type IrlCardWaitlistSignup,
} from '@/lib/db/irl-card-waitlist';
import { getDefaultMetadataBase } from '@/lib/metadata/request-base';
import { captureHandledException } from '@/lib/monitoring/capture-handled-exception';
import {
  buildIrlCardWaitlistShareUrl,
  buildIrlExploreUrl,
} from './waitlist-urls';

export type WaitlistDeliveryOutcome = {
  welcome: 'sent' | 'failed' | 'skipped';
  list: 'synced' | 'failed' | 'skipped';
};

async function deliverWelcome(
  signup: IrlCardWaitlistSignup,
  origin: string
): Promise<WaitlistDeliveryOutcome['welcome']> {
  // Unconfigured: leave 'pending' without spending an attempt.
  if (!isIrlCardWelcomeEmailConfigured()) return 'skipped';
  if (signup.welcomeEmailStatus === 'sent') return 'skipped';

  const claimed = await claimWelcomeSend(signup.id);
  if (!claimed) return 'skipped';

  const result = await sendIrlCardWelcomeEmail({
    email: claimed.email,
    exploreUrl: buildIrlExploreUrl(origin),
    shareUrl: buildIrlCardWaitlistShareUrl(origin),
  });

  if (result.ok) {
    await markWelcomeSent(claimed.id);
    return 'sent';
  }
  await markWelcomeFailed(claimed.id, result.error);
  return 'failed';
}

async function deliverListSync(
  signup: IrlCardWaitlistSignup
): Promise<WaitlistDeliveryOutcome['list']> {
  if (!signup.marketingConsent) return 'skipped';
  if (
    signup.listSyncStatus !== 'pending' &&
    signup.listSyncStatus !== 'failed'
  ) {
    return 'skipped';
  }
  if (signup.listSyncAttempts >= LIST_SYNC_MAX_ATTEMPTS) return 'skipped';
  if (!isIrlCardListConfigured()) return 'skipped';

  const attempts = signup.listSyncAttempts + 1;
  const result = await addIrlCardListSubscriber({
    email: signup.email,
    city: signup.cityName,
    countryIso2: signup.countryIso2,
    alreadyUsesIrl: signup.alreadyUsesIrl,
  });

  if (result.ok) {
    await markListSynced(signup.id, attempts);
    return 'synced';
  }
  await markListFailed(
    signup.id,
    result.retryable ? attempts : LIST_SYNC_MAX_ATTEMPTS
  );
  return 'failed';
}

/**
 * Sends the welcome email (once) and syncs the update list (if consented).
 * Never throws: a stored signup stays stored and is retried by the cron.
 */
export async function deliverWaitlistFollowUps(
  signup: IrlCardWaitlistSignup,
  origin: string = getDefaultMetadataBase().origin
): Promise<WaitlistDeliveryOutcome> {
  const outcome: WaitlistDeliveryOutcome = {
    welcome: 'skipped',
    list: 'skipped',
  };

  try {
    outcome.welcome = await deliverWelcome(signup, origin);
  } catch (error) {
    outcome.welcome = 'failed';
    captureHandledException(error, {
      route: '/api/irl-card/waitlist',
      operation: 'irl_card_welcome_email',
    });
  }

  try {
    outcome.list = await deliverListSync(signup);
  } catch (error) {
    outcome.list = 'failed';
    captureHandledException(error, {
      route: '/api/irl-card/waitlist',
      operation: 'irl_card_list_sync',
    });
  }

  return outcome;
}
