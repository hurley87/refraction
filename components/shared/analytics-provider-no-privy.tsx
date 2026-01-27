'use client';

import { createContext, useContext, useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  initMixpanel,
  trackPageView,
  isInitialized,
  waitForInitialization,
  trackEvent as trackEventClient,
} from '@/lib/analytics';

interface AnalyticsContextType {
  trackEvent: (eventName: string, properties?: Record<string, any>) => void;
  trackPage: (pageName?: string, properties?: Record<string, any>) => void;
  identify: (distinctId: string, properties?: any) => void;
  setProperties: (properties: any) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(
  undefined
);

function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Track pageviews on route changes
  useEffect(() => {
    waitForInitialization().then(() => {
      if (isInitialized()) {
        const queryString = searchParams.toString();
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

/**
 * AnalyticsProvider without Privy dependency
 * Used for routes that don't need Privy (e.g., Stellar wallet page)
 */
export function AnalyticsProviderNoPrivy({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize Mixpanel on mount
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
    if (token && !isInitialized()) {
      initMixpanel(token).catch((error) => {
        console.error('Failed to initialize Mixpanel:', error);
      });
    }
  }, []);

  const contextValue: AnalyticsContextType = {
    trackEvent: (eventName: string, properties?: Record<string, any>) => {
      waitForInitialization().then(() => {
        if (isInitialized()) {
          trackEventClient(eventName, properties);
        }
      });
    },
    trackPage: (pageName?: string, properties?: Record<string, any>) => {
      waitForInitialization().then(() => {
        if (isInitialized()) {
          trackPageView(pageName, properties);
        }
      });
    },
    identify: (distinctId: string, properties?: any) => {
      // No-op for routes without Privy
      console.log('[Analytics] Identify called without Privy:', distinctId);
    },
    setProperties: (properties: any) => {
      // No-op for routes without Privy
      console.log(
        '[Analytics] SetProperties called without Privy:',
        properties
      );
    },
  };

  return (
    <AnalyticsContext.Provider value={contextValue}>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalytics must be used within AnalyticsProvider');
  }
  return context;
}
