'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLogin, usePrivy } from '@privy-io/react-auth';
import { CityGuideLocationCard } from '@/components/city-guides/city-guide-location-card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useEvmWalletAddress } from '@/hooks/use-evm-wallet-address';
import {
  clearSignupFromGate,
  markSignupFromGate,
  peekSignupFromGate,
} from '@/lib/analytics/attribution';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { apiClientBearerGet } from '@/lib/api/privy-bearer-client';
import type { CityGuideLocationSection } from '@/lib/db/guides';
import type { CityGuideLocationGateMeta } from '@/lib/guides/city-guide-locations';

/**
 * A closing Radix dialog keeps its focus trap and pointer-events lock until the
 * exit animation ends, so Privy has to open after that.
 */
const GATE_CLOSE_DURATION_MS = 250;

type FullLocationsResponse = {
  locationSections: CityGuideLocationSection[];
  locationContributorByPlaceId: Record<string, string>;
  contributorNames: string[];
};

type CityGuideLocationsSectionProps = {
  slug: string;
  city: string;
  returnPath: string;
  initialLocationSections: CityGuideLocationSection[];
  initialLocationContributorByPlaceId: Record<string, string>;
  initialContributorNames: string[];
  locationGate: CityGuideLocationGateMeta | null;
};

function interactiveMapHrefForLocation(
  returnPath: string,
  placeId: string,
  lat: number,
  lng: number
) {
  const query = new URLSearchParams({
    placeId,
    lat: String(lat),
    lng: String(lng),
    mapCard: '1',
    returnTo: returnPath,
  });
  return `/interactive-map?${query.toString()}`;
}

function contributorLineForLocation(
  placeId: string,
  overrides: Record<string, string>,
  sectionDefaultContributor: string | null,
  guideContributors: readonly string[]
): string {
  const fromOverride = overrides[placeId]?.trim();
  if (fromOverride) return fromOverride;
  const sectionName = sectionDefaultContributor?.trim();
  if (sectionName) return sectionName;
  if (guideContributors.length === 0) return '';
  if (guideContributors.length === 1) return guideContributors[0];
  return guideContributors.join(', ');
}

function locationsUnlockPath(slug: string): string {
  const base = `/api/city-guides/${encodeURIComponent(slug)}/locations`;
  const intent = peekSignupFromGate();
  if (!intent) return base;
  const params = new URLSearchParams({
    from_gate: '1',
    guide_slug: intent.guide_slug,
  });
  return `${base}?${params.toString()}`;
}

export function CityGuideLocationsSection({
  slug,
  city,
  returnPath,
  initialLocationSections,
  initialLocationContributorByPlaceId,
  initialContributorNames,
  locationGate,
}: CityGuideLocationsSectionProps) {
  const { authenticated, ready, getAccessToken } = usePrivy();
  const walletAddress = useEvmWalletAddress();
  const { trackEvent } = useAnalytics();
  const [fullLocations, setFullLocations] =
    useState<FullLocationsResponse | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isGateOpen, setIsGateOpen] = useState(false);
  const requestedRef = useRef(false);
  const gateSentinelRef = useRef<HTMLDivElement | null>(null);
  /** Blocks re-opening until the sentinel has left the viewport again. */
  const gateArmedRef = useRef(true);
  /** Brings the gate back if the reader abandons the Privy flow it opened. */
  const reopenGateAfterPrivyRef = useRef(false);
  const loginTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gateViewTrackedForOpenRef = useRef(false);

  const { login } = useLogin({
    onComplete: () => {
      reopenGateAfterPrivyRef.current = false;
    },
    onError: () => {
      // Do not clear gate intent here. Privy can emit errors during modal
      // teardown after a successful login, which previously wiped attribution
      // before the unlock API could fire signup_from_gate.
      if (!reopenGateAfterPrivyRef.current) return;
      reopenGateAfterPrivyRef.current = false;
      setIsGateOpen(true);
    },
  });

  useEffect(
    () => () => {
      if (loginTimeoutRef.current) clearTimeout(loginTimeoutRef.current);
    },
    []
  );

  /**
   * Wait for an EVM wallet so the unlock API can upsert `players` with the
   * Privy login email and fire `signup_from_gate` for net-new players
   * (guides never force username / POST /api/player).
   */
  useEffect(() => {
    if (
      !ready ||
      !authenticated ||
      !locationGate ||
      !walletAddress ||
      requestedRef.current
    ) {
      return;
    }

    requestedRef.current = true;
    setIsUnlocking(true);
    void (async () => {
      try {
        const token = await getAccessToken();
        if (!token) throw new Error('Missing access token');
        const hadGateIntent = Boolean(peekSignupFromGate());
        const response = await apiClientBearerGet<FullLocationsResponse>(
          token,
          locationsUnlockPath(slug)
        );
        setFullLocations(response);
        // Intent was delivered to the unlock API; clear regardless of whether
        // the server created a new player (returning users should not keep it).
        if (hadGateIntent) clearSignupFromGate();
      } catch {
        requestedRef.current = false;
      } finally {
        setIsUnlocking(false);
      }
    })();
  }, [authenticated, getAccessToken, locationGate, ready, slug, walletAddress]);

  const sections = fullLocations?.locationSections ?? initialLocationSections;
  const overrides =
    fullLocations?.locationContributorByPlaceId ??
    initialLocationContributorByPlaceId;
  const contributorNames =
    fullLocations?.contributorNames ?? initialContributorNames;
  const nonEmptySections = useMemo(
    () => sections.filter((section) => section.locations.length > 0),
    [sections]
  );
  const totalVisibleCount = nonEmptySections.reduce(
    (total, section) => total + section.locations.length,
    0
  );
  const showGate = Boolean(locationGate && !fullLocations);
  /**
   * Members never see the prompt: wait for Privy to resolve the session before
   * arming it, so a signed-in reader does not get a flash of the gate while
   * their full location list is still loading.
   */
  const canPromptGate = showGate && ready && !authenticated;

  /**
   * Prompt membership whenever the reader reaches the end of the free
   * locations. Dismissing re-arms the prompt only after the sentinel scrolls
   * out of view, so closing the modal never re-opens it immediately.
   */
  useEffect(() => {
    if (!canPromptGate) return;

    const sentinel = gateSentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === 'undefined') {
      setIsGateOpen(true);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      const isIntersecting = entries.some((entry) => entry.isIntersecting);
      if (!isIntersecting) {
        gateArmedRef.current = true;
        return;
      }
      if (!gateArmedRef.current) return;
      gateArmedRef.current = false;
      setIsGateOpen(true);
    });
    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [canPromptGate]);

  useEffect(() => {
    if (authenticated) setIsGateOpen(false);
  }, [authenticated]);

  useEffect(() => {
    if (!isGateOpen) {
      gateViewTrackedForOpenRef.current = false;
      return;
    }
    if (gateViewTrackedForOpenRef.current) return;
    gateViewTrackedForOpenRef.current = true;
    trackEvent(ANALYTICS_EVENTS.GATE_VIEWED, { guide_slug: slug });
  }, [isGateOpen, slug, trackEvent]);

  const gateContributorName = locationGate?.primaryContributorName || 'IRL';

  /**
   * The gate is a modal dialog, which traps focus and locks pointer events on
   * the rest of the document. Privy renders its login modal in a separate
   * portal, so it stays unusable — its email field cannot even be typed into —
   * while the gate is mounted. Close the gate first, then open Privy.
   */
  const handleGateSignupClick = () => {
    reopenGateAfterPrivyRef.current = true;
    markSignupFromGate(slug);
    trackEvent(ANALYTICS_EVENTS.GATE_SIGNUP_CLICKED, { guide_slug: slug });
    setIsGateOpen(false);
    loginTimeoutRef.current = setTimeout(login, GATE_CLOSE_DURATION_MS);
  };

  return (
    <>
      {totalVisibleCount === 0 && !showGate ? (
        <p className="body-medium mt-6 text-[#757575]">
          No venues linked to this guide yet. Assign each contributor a venue
          list in Admin → Guides, or add venues in Admin → Location Lists.
        </p>
      ) : (
        nonEmptySections.map((section, sectionIndex) => {
          const isLastSection = sectionIndex === nonEmptySections.length - 1;
          return (
            <div key={`venue-section-${sectionIndex}`}>
              {section.locations.map((entry, index) => {
                const location = entry.location;
                const description =
                  location.description?.trim() ||
                  location.address?.trim() ||
                  '—';
                const isLast =
                  isLastSection && index === section.locations.length - 1;

                return (
                  <CityGuideLocationCard
                    key={entry.membership_id}
                    name={location.name}
                    description={description}
                    imageSrc={location.coin_image_url ?? null}
                    imageAlt={`${location.name} — location photo`}
                    contributorName={contributorLineForLocation(
                      location.place_id,
                      overrides,
                      section.defaultContributorName,
                      contributorNames
                    )}
                    mapHref={interactiveMapHrefForLocation(
                      returnPath,
                      location.place_id,
                      location.latitude,
                      location.longitude
                    )}
                    isLast={isLast}
                  />
                );
              })}
            </div>
          );
        })
      )}

      {showGate ? (
        <div ref={gateSentinelRef} className="h-px w-full" aria-hidden />
      ) : null}

      {locationGate ? (
        <Dialog open={isGateOpen} onOpenChange={setIsGateOpen}>
          <DialogContent className="max-w-[361px] gap-6 rounded-none border border-white/10 bg-[#171717] p-6 text-white">
            <DialogHeader className="space-y-2 text-left">
              <p className="label-small uppercase text-[#DBDBDB]">
                {gateContributorName} • {locationGate.totalCount} RECCOS
              </p>
              <DialogTitle className="title3 uppercase text-white">
                THE REST OF THIS LIST IS MEMBERS ONLY
              </DialogTitle>
            </DialogHeader>

            <DialogDescription asChild>
              <div className="flex flex-col gap-4 text-left">
                <span className="body-medium text-white">
                  Unlock the other {locationGate.hiddenCount} of{' '}
                  {gateContributorName}&apos;s spots
                  {locationGate.teaserSummary
                    ? ` including ${locationGate.teaserSummary}.`
                    : '.'}
                </span>
                <span className="body-medium text-[#DBDBDB]">
                  IRL membership is free, and unlocks every city guide, the full
                  map, and member rewards.
                </span>
              </div>
            </DialogDescription>

            <button
              type="button"
              onClick={handleGateSignupClick}
              disabled={isUnlocking}
              className="label-large flex h-11 w-full items-center justify-between bg-[var(--IRL-Yellow,#FFF200)] px-4 py-2 uppercase text-[#171717] transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              <span>{isUnlocking ? 'UNLOCKING…' : 'BECOME A MEMBER'}</span>
              <svg
                width={24}
                height={24}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="size-6 shrink-0"
                aria-hidden
              >
                <path
                  d="M14.0822 4L11.8239 6.28605L16 10.1453H2V13.8547H15.9812L11.8239 17.7139L14.0822 20L22 11.9846L14.0822 4Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
