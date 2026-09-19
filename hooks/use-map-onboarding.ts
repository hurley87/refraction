'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import {
  LOCATION_INSTRUCTION_STORAGE_KEY,
  LIST_CREATE_MAP_TIP_STORAGE_KEY,
  getWelcomeTourStorageKey,
  readLocalStorageItem,
  writeLocalStorageItem,
} from '@/lib/map/map-storage';

const WELCOME_TOUR_MAX_SHOWS = 1;
const LOCATION_INSTRUCTION_LIMIT = 3;

type UseMapOnboardingArgs = {
  user: unknown;
  walletAddress: string | undefined;
  walletAddressRef: MutableRefObject<string | null | undefined>;
  needsLocationPrompt: boolean;
  setNeedsLocationPrompt: (value: boolean) => void;
};

/**
 * Map welcome tour, search/save/create tips, geo location prompt, and
 * create-location instruction counter. Tours and the geo prompt are sequenced
 * together so they move as one hook.
 */
export function useMapOnboarding({
  user,
  walletAddress,
  walletAddressRef,
  needsLocationPrompt,
  setNeedsLocationPrompt,
}: UseMapOnboardingArgs) {
  const [showListCreateMapTip, setShowListCreateMapTip] = useState(false);
  const [showSearchTourTip, setShowSearchTourTip] = useState(false);
  const [showSaveToListTourTip, setShowSaveToListTourTip] = useState(false);
  const [showCreateListTourTip, setShowCreateListTourTip] = useState(false);
  /** Search tour: offer the SAVE TO LIST tip once a result opens a map card. */
  const pendingSaveToListTourTipRef = useRef(false);

  /** Prevents re-opening the tour in the same session after the user dismisses it. */
  const tourCompletedThisSessionRef = useRef(false);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [, setLocationInstructionShows] = useState(0);

  const dismissSearchTourTip = useCallback(() => {
    setShowSearchTourTip(false);
  }, []);

  const dismissSaveToListTourTip = useCallback(() => {
    pendingSaveToListTourTipRef.current = false;
    setShowSaveToListTourTip(false);
  }, []);

  const dismissCreateListTourTip = useCallback(() => {
    setShowCreateListTourTip(false);
  }, []);

  const dismissListCreateMapTip = useCallback(() => {
    setShowListCreateMapTip((wasShowing) => {
      if (wasShowing) {
        writeLocalStorageItem(LIST_CREATE_MAP_TIP_STORAGE_KEY, '1');
      }
      return false;
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedInstructionCount = readLocalStorageItem(
      LOCATION_INSTRUCTION_STORAGE_KEY
    );
    if (storedInstructionCount) {
      const parsed = parseInt(storedInstructionCount, 10);
      if (!Number.isNaN(parsed)) {
        setLocationInstructionShows(parsed);
      }
    }

    // Guests: Privy first — do not show the tour until after sign-in.
    if (!user) {
      setShowWelcomeBanner(false);
      setShowLocationPrompt(false);
      setNeedsLocationPrompt(false);
      return;
    }

    if (tourCompletedThisSessionRef.current || !walletAddress) {
      setShowWelcomeBanner(false);
      return;
    }

    // Logged-in: show once after wallet creation.
    const welcomeKey = getWelcomeTourStorageKey(walletAddress);
    const storedViews = readLocalStorageItem(welcomeKey);
    const parsedViews = storedViews ? parseInt(storedViews, 10) : 0;
    const views = Number.isNaN(parsedViews) ? 0 : parsedViews;
    setShowWelcomeBanner(views < WELCOME_TOUR_MAX_SHOWS);
  }, [user, walletAddress, setNeedsLocationPrompt]);

  // After tour (or if no tour), prompt for country/city when FKs are missing.
  useEffect(() => {
    if (!user || !walletAddress || !needsLocationPrompt) {
      setShowLocationPrompt(false);
      return;
    }
    if (
      showWelcomeBanner ||
      showSearchTourTip ||
      showSaveToListTourTip ||
      showCreateListTourTip
    ) {
      setShowLocationPrompt(false);
      return;
    }
    setShowLocationPrompt(true);
  }, [
    user,
    walletAddress,
    needsLocationPrompt,
    showWelcomeBanner,
    showSearchTourTip,
    showSaveToListTourTip,
    showCreateListTourTip,
  ]);

  const dismissWelcomeBanner = () => {
    setShowWelcomeBanner(false);
    tourCompletedThisSessionRef.current = true;

    const wallet = walletAddressRef.current;
    if (typeof window !== 'undefined' && wallet) {
      const welcomeKey = getWelcomeTourStorageKey(wallet);
      const storedViews = readLocalStorageItem(welcomeKey);
      const parsedViews = storedViews ? parseInt(storedViews, 10) : 0;
      const current = Number.isNaN(parsedViews) ? 0 : parsedViews;
      writeLocalStorageItem(
        welcomeKey,
        String(Math.min(current + 1, WELCOME_TOUR_MAX_SHOWS))
      );
    }
  };

  const handleWelcomeTourComplete = () => {
    dismissWelcomeBanner();
    setShowSearchTourTip(true);
  };

  const handleLocationPromptComplete = () => {
    setNeedsLocationPrompt(false);
    setShowLocationPrompt(false);
  };

  const remindLocationCreationFlow = () => {
    setLocationInstructionShows((prev) => {
      if (prev >= LOCATION_INSTRUCTION_LIMIT) {
        return prev;
      }
      const next = prev + 1;
      writeLocalStorageItem(LOCATION_INSTRUCTION_STORAGE_KEY, String(next));
      return next;
    });
  };

  return {
    showListCreateMapTip,
    setShowListCreateMapTip,
    showSearchTourTip,
    showSaveToListTourTip,
    setShowSaveToListTourTip,
    showCreateListTourTip,
    setShowCreateListTourTip,
    pendingSaveToListTourTipRef,
    showWelcomeBanner,
    showLocationPrompt,
    dismissSearchTourTip,
    dismissSaveToListTourTip,
    dismissCreateListTourTip,
    dismissListCreateMapTip,
    handleWelcomeTourComplete,
    handleLocationPromptComplete,
    remindLocationCreationFlow,
  };
}
