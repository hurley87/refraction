'use client';

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  Suspense,
} from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import {
  initMixpanel,
  identifyUser,
  setUserProperties,
  trackPageView,
  resetUser,
  isInitialized,
  waitForInitialization,
  trackEvent as trackEventClient,
  resolveDistinctId,
} from '@/lib/analytics';
import { useCurrentPlayer } from '@/hooks/usePlayer';
import { useTiers } from '@/hooks/useTiers';
import type { UserProperties } from '@/lib/analytics/types';

interface AnalyticsContextType {
  trackEvent: (eventName: string, properties?: Record<string, any>) => void;
  trackPage: (pageName?: string, properties?: Record<string, any>) => void;
  identify: (distinctId: string, properties?: UserProperties) => void;
  setProperties: (properties: UserProperties) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(
  undefined
);

function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Track pageviews on route changes
  useEffect(() => {
    // Wait for initialization to complete before tracking
    // This ensures we don't miss pageviews due to async initialization race condition
    waitForInitialization().then(() => {
      if (isInitialized()) {
        const queryString = searchParams.toString();

        // Extract checkpoint_id from /c/[id] routes
        const checkpointMatch = pathname.match(/^\/c\/([^/]+)$/);
        const checkpointId = checkpointMatch ? checkpointMatch[1] : undefined;

        trackPageView(undefined, {
          pathname,
          query: queryString || undefined,
          ...(checkpointId && { checkpoint_id: checkpointId }),
        });
      }
    });
  }, [pathname, searchParams]);

  return null;
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { user, authenticated } = usePrivy();
  const { data: player } = useCurrentPlayer();
  const { data: tiers = [] } = useTiers();

  // Initialize Mixpanel on mount
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
    if (token && !isInitialized()) {
      // initMixpanel is async but we don't need to await it
      initMixpanel(token).catch((error) => {
        console.error('Failed to initialize Mixpanel:', error);
      });
    }
  }, []);

  // Identify user when authenticated
  useEffect(() => {
    if (!authenticated || !user || !isInitialized()) return;

    const walletAddress =
      user.wallet?.address ||
      user.linkedAccounts?.find((acc) => acc.type === 'wallet')?.address;

    if (!walletAddress) return;

    const { distinctId } = resolveDistinctId({
      email: user.email?.address,
      walletAddress,
      playerId: player?.id,
    });

    let walletType: 'EVM' | 'Solana' | 'Stellar' | 'Aptos' = 'EVM';
    if (user.linkedAccounts) {
      const solanaAccount = user.linkedAccounts.find(
        (acc) =>
          acc.type === 'wallet' &&
          'chainType' in acc &&
          acc.chainType === 'solana'
      );
      const stellarAccount = user.linkedAccounts.find(
        (acc) =>
          acc.type === 'wallet' &&
          'chainType' in acc &&
          acc.chainType === 'stellar'
      );
      const aptosAccount = user.linkedAccounts.find(
        (acc) =>
          acc.type === 'wallet' &&
          'chainType' in acc &&
          (acc as { chainType: string }).chainType === 'aptos'
      );
      if (solanaAccount) walletType = 'Solana';
      if (stellarAccount) walletType = 'Stellar';
      if (aptosAccount) walletType = 'Aptos';
    }

    const cohort: 'new' | 'returning' | 'power' = 'new';

    const properties: UserProperties = {
      $email: user.email?.address,
      $name: player?.username,
      wallet_type: walletType,
      total_points: player?.total_points,
      wallet_address: walletAddress,
      cohort,
    };

    // Only include tier when we can actually resolve it; avoids overwriting
    // a server-set value with undefined when tiers haven't loaded yet
    if (player?.total_points !== undefined && tiers.length > 0) {
      const userTier = tiers.find(
        (t) =>
          player.total_points >= t.min_points &&
          (t.max_points === null || player.total_points < t.max_points)
      );
      if (userTier) {
        properties.tier = userTier.title;
      }
    }

    identifyUser(distinctId, properties);
  }, [authenticated, user, player, tiers]);

  // Reset on logout
  useEffect(() => {
    if (!authenticated && isInitialized()) {
      resetUser();
    }
  }, [authenticated]);

  const trackEvent = useCallback(
    (eventName: string, properties?: Record<string, any>) => {
      if (!isInitialized()) return;
      trackEventClient(eventName, properties);
    },
    []
  );

  const trackPage = useCallback(
    (pageName?: string, properties?: Record<string, any>) => {
      if (!isInitialized()) return;
      trackPageView(pageName, properties);
    },
    []
  );

  const identify = useCallback(
    (distinctId: string, properties?: UserProperties) => {
      if (!isInitialized()) return;
      identifyUser(distinctId, properties);
    },
    []
  );

  const setProperties = useCallback((properties: UserProperties) => {
    if (!isInitialized()) return;
    setUserProperties(properties);
  }, []);

  return (
    <AnalyticsContext.Provider
      value={{ trackEvent, trackPage, identify, setProperties }}
    >
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics(): AnalyticsContextType {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalytics must be used within AnalyticsProvider');
  }
  return context;
}
