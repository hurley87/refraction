'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useLogin, useLoginWithEmail } from '@privy-io/react-auth';
import { useAnalytics } from '@/hooks/useAnalytics';
import { markSignupFromGate } from '@/lib/analytics/attribution';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import {
  consumeGateViewedOncePerSession,
  gateEventProperties,
} from '@/lib/analytics/gate';

const MAP_GATE_PROPS = gateEventProperties('map');

/**
 * Map login gate Mixpanel: same three events as the city-guide membership gate,
 * with `surface: 'map'`. `gate_viewed` is once per tab session.
 */
export function useMapGateAnalytics({
  ready,
  authenticated,
  isPrivyModalOpen,
}: {
  ready: boolean;
  authenticated: boolean;
  isPrivyModalOpen: boolean;
}): void {
  const { trackEvent } = useAnalytics();
  const { state: emailLoginState } = useLoginWithEmail();
  const signupClickedRef = useRef(false);
  const sawModalThisVisitRef = useRef(false);

  const markSignupClicked = useCallback(() => {
    if (signupClickedRef.current) return;
    signupClickedRef.current = true;
    markSignupFromGate({ surface: 'map' });
    trackEvent(ANALYTICS_EVENTS.GATE_SIGNUP_CLICKED, MAP_GATE_PROPS);
  }, [trackEvent]);

  useLogin({
    onComplete: ({ wasAlreadyAuthenticated }) => {
      if (wasAlreadyAuthenticated) return;
      markSignupClicked();
    },
  });

  useEffect(() => {
    if (!ready || authenticated || !isPrivyModalOpen) return;
    sawModalThisVisitRef.current = true;
    if (!consumeGateViewedOncePerSession('map')) return;
    trackEvent(ANALYTICS_EVENTS.GATE_VIEWED, MAP_GATE_PROPS);
  }, [ready, authenticated, isPrivyModalOpen, trackEvent]);

  useEffect(() => {
    if (!ready || authenticated) return;
    if (
      emailLoginState.status === 'initial' ||
      emailLoginState.status === 'error'
    ) {
      return;
    }
    markSignupClicked();
  }, [ready, authenticated, emailLoginState.status, markSignupClicked]);

  useEffect(() => {
    if (!authenticated || !sawModalThisVisitRef.current) return;
    markSignupClicked();
  }, [authenticated, markSignupClicked]);
}
