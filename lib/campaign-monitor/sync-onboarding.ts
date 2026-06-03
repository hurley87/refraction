import { addCampaignMonitorSubscriber } from './subscribe';
import { captureHandledException } from '@/lib/monitoring/capture-handled-exception';

export type SyncCampaignMonitorOnboardingInput = {
  email?: string | null;
  username?: string | null;
  /** Route or handler name for error reporting. */
  source: string;
  walletAddressSuffix?: string;
};

/**
 * Non-blocking Campaign Monitor Onboarding list sync when an email is present.
 * Safe to call from signup and first check-in paths (CreateSend dedupes subscribers).
 */
export async function syncCampaignMonitorOnboarding(
  input: SyncCampaignMonitorOnboardingInput
): Promise<void> {
  const email = input.email?.trim();
  if (!email) {
    return;
  }

  try {
    await addCampaignMonitorSubscriber({
      email,
      username: input.username ?? undefined,
    });
  } catch (campaignMonitorError) {
    console.error(
      JSON.stringify({
        source: input.source,
        message: 'campaign_monitor_sync_exception',
        walletAddressSuffix: input.walletAddressSuffix,
        error:
          campaignMonitorError instanceof Error
            ? campaignMonitorError.message
            : String(campaignMonitorError),
      })
    );
    captureHandledException(campaignMonitorError, {
      route: input.source,
      operation: 'campaign_monitor_subscribe',
      statusCode: 500,
      extra: {
        hasEmail: true,
      },
    });
  }
}
