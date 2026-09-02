'use client';

import type { Perk, UserPerkRedemption, PerkDiscountCode } from '@/lib/types';
import Image from 'next/image';
import { usePrivy } from '@privy-io/react-auth';

import {
  Dialog,
  DialogContent,
  DialogDrawerContent,
  DialogClose,
} from '@/components/ui/dialog';
import { Gift, MapPin, Tag } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  useState,
  useEffect,
  useMemo,
  useRef,
  Suspense,
  type PointerEvent,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import MapNav, { MAP_NAV_SAFE_AREA_X } from '@/components/map/mapnav';
import {
  MapDesktopNav,
  MapDesktopSearchSlot,
} from '@/components/map/map-desktop-nav';
import { usePerks, useUserRedemptions } from '@/hooks/usePerks';
import { useCurrentPlayer } from '@/hooks/usePlayer';
import { useAnalytics } from '@/hooks/useAnalytics';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import { useEvmWalletAddress } from '@/hooks/use-evm-wallet-address';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';

// Perks tagged with this city value apply everywhere; they yield to more
// specific local picks when a city filter is active.
const GLOBAL_CITY = 'Global';

// Turn a stored perk type slug (e.g. "performance-venue") into a readable
// chip label (e.g. "Performance Venue").
const formatTypeLabel = (type: string) =>
  type
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

// Helper function to calculate time left
const getTimeLeft = (endDate: string) => {
  const now = new Date();
  const end = new Date(endDate);
  const diffMs = end.getTime() - now.getTime();

  if (diffMs <= 0) return { expired: true, text: 'Expired' };

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(
    (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffDays > 0) {
    return {
      expired: false,
      text: `${diffDays} day${diffDays !== 1 ? 's' : ''} left`,
    };
  } else if (diffHours > 0) {
    return {
      expired: false,
      text: `${diffHours} hour${diffHours !== 1 ? 's' : ''} left`,
    };
  } else if (diffMinutes > 0) {
    return { expired: false, text: `${diffMinutes} min left` };
  } else {
    return { expired: false, text: 'Less than 1 min left' };
  }
};

// Component for live updating time left
const TimeLeft = ({
  endDate,
  className,
}: {
  endDate: string;
  className?: string;
}) => {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(endDate));

  useEffect(() => {
    const updateTimeLeft = () => {
      setTimeLeft(getTimeLeft(endDate));
    };

    // Update immediately
    updateTimeLeft();

    // Update every minute
    const interval = setInterval(updateTimeLeft, 60000);

    return () => clearInterval(interval);
  }, [endDate]);

  return <span className={className}>{timeLeft.text}</span>;
};

function PerksPageInner() {
  const { login } = usePrivy();
  const router = useRouter();
  const searchParams = useSearchParams();
  const address = useEvmWalletAddress();
  const { trackEvent, trackPage } = useAnalytics();

  // Track page view on mount
  useEffect(() => {
    trackPage('rewards');
  }, [trackPage]);

  // Fetch all active perks
  const { data: perks = [], isLoading: perksLoading } = usePerks(true);

  // Fetch user's points
  const { data: player } = useCurrentPlayer();

  // Fetch user's redemptions
  const { data: userRedemptions = [] } = useUserRedemptions(address);

  const userPoints = player?.total_points || 0;

  const canAfford = (perk: Perk) => userPoints >= perk.points_threshold;

  const hasRedeemed = (perkId: string) =>
    userRedemptions.some(
      (redemption: UserPerkRedemption) => redemption.perk_id === perkId
    );

  //const queryClient = useQueryClient();
  const [selectedPerk, setSelectedPerk] = useState<Perk | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInPersonClaiming, setIsInPersonClaiming] = useState(false);

  // Filter chips: city + type, both AND-combined. "all" means no filter.
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  const clearFilters = () => {
    setSelectedCity('all');
    setSelectedType('all');
  };

  // Universal codes only; individual codes come from redemption after /api/perks/redeem
  const { data: universalCodes = [] } = useQuery({
    queryKey: ['perk-codes-public', selectedPerk?.id],
    queryFn: async () => {
      if (!selectedPerk?.id) return [];
      const response = await fetch(`/api/perks/${selectedPerk.id}/codes`);
      if (!response.ok) return [];
      const responseData = await response.json();
      const data = responseData.data || responseData;
      return (data.codes ?? []) as PerkDiscountCode[];
    },
    enabled: !!selectedPerk?.id && isModalOpen,
  });

  const redemptionForSelected =
    selectedPerk?.id != null
      ? userRedemptions.find(
          (r: UserPerkRedemption) => r.perk_id === selectedPerk.id
        )
      : undefined;

  const universalDiscountCode = universalCodes[0]?.code?.trim() || undefined;
  const individualDiscountCode =
    redemptionForSelected?.perk_discount_codes?.code?.trim() || undefined;

  const selectedDiscountCode =
    universalDiscountCode ?? individualDiscountCode ?? undefined;
  const hasDiscountCode = Boolean(selectedDiscountCode);

  // Check if the code is a URL
  const isCodeUrl = (str: string) => {
    try {
      const url = new URL(str);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const codeIsClaimUrl =
    hasDiscountCode && isCodeUrl(selectedDiscountCode as string);

  // Partner site, or a code field that stores a full claim URL
  const claimUrl = codeIsClaimUrl
    ? selectedDiscountCode
    : selectedPerk?.website_url?.trim() || undefined;

  const heroImageUrl =
    selectedPerk?.hero_image?.trim() ||
    selectedPerk?.thumbnail_url?.trim() ||
    '';

  const isInPersonPerk = Boolean(selectedPerk && !claimUrl);

  const { data: inPersonClaimStatus, refetch: refetchInPersonClaimStatus } =
    useQuery({
      queryKey: ['in-person-claim-status', selectedPerk?.id, address],
      queryFn: async () => {
        if (!selectedPerk?.id || !address) return null;
        return apiClient<{
          claimed_today: boolean;
          claim_count_today: number;
          max_claims_per_member_per_day: number | null;
        }>(
          `/api/perks/in-person-claim?perkId=${encodeURIComponent(selectedPerk.id)}&walletAddress=${encodeURIComponent(address)}`
        );
      },
      enabled: Boolean(
        isModalOpen && isInPersonPerk && selectedPerk?.id && address
      ),
      staleTime: 30_000,
    });

  const claimedToday = Boolean(inPersonClaimStatus?.claimed_today);

  const handleCopyCode = async () => {
    if (!selectedDiscountCode) return;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(selectedDiscountCode);
        toast.success('Copied!');
        return;
      }
    } catch (error) {
      console.error(error);
    }

    if (typeof document !== 'undefined') {
      const textArea = document.createElement('textarea');
      textArea.value = selectedDiscountCode;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        toast.success('Copied!');
      } catch {
        // Failed to copy
      }
      document.body.removeChild(textArea);
    }
  };

  const handleOpenPerk = (perk: Perk) => {
    setSelectedPerk(perk);
    setIsModalOpen(true);
    // Track reward page view
    trackEvent(ANALYTICS_EVENTS.REWARD_PAGE_VIEWED, {
      reward_id: perk.id,
      reward_type: perk.type,
      points_required: perk.points_threshold,
    });
  };

  const deepLinkPerkId = searchParams.get('perkId')?.trim() || '';
  const deepLinkOpenedRef = useRef(false);

  useEffect(() => {
    if (deepLinkOpenedRef.current || !deepLinkPerkId || perksLoading) return;
    const perk = perks.find((item) => item.id === deepLinkPerkId);
    if (!perk) return;
    deepLinkOpenedRef.current = true;
    setSelectedPerk(perk);
    setIsModalOpen(true);
    trackEvent(ANALYTICS_EVENTS.REWARD_PAGE_VIEWED, {
      reward_id: perk.id,
      reward_type: perk.type,
      points_required: perk.points_threshold,
    });
  }, [deepLinkPerkId, perks, perksLoading, trackEvent]);

  // Online: partner URL / code-as-URL. In-person: POST claim then success screen.
  const handleClaimClick = () => {
    if (!selectedPerk) return;
    trackEvent(ANALYTICS_EVENTS.REWARD_CLAIM_CLICKED, {
      reward_id: selectedPerk.id,
      reward_type: selectedPerk.type,
      partner: selectedPerk.location || undefined,
      points_required: selectedPerk.points_threshold,
      perk_type: 'online',
    });
  };

  const handleInPersonClaim = async () => {
    if (!selectedPerk?.id || !address || claimedToday || isInPersonClaiming) {
      return;
    }

    trackEvent(ANALYTICS_EVENTS.REWARD_CLAIM_CLICKED, {
      reward_id: selectedPerk.id,
      reward_type: selectedPerk.type,
      partner: selectedPerk.location || undefined,
      points_required: selectedPerk.points_threshold,
      perk_type: 'in_person',
    });

    setIsInPersonClaiming(true);
    try {
      const result = await apiClient<{
        claim_count_today: number;
      }>('/api/perks/in-person-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perkId: selectedPerk.id,
          walletAddress: address,
        }),
      });

      setIsModalOpen(false);
      setSelectedPerk(null);
      router.push(
        `/rewards/claim/success?perkId=${encodeURIComponent(selectedPerk.id)}&claimCount=${result.claim_count_today}`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to claim reward';
      if (/CLAIMED TODAY/i.test(message)) {
        await refetchInPersonClaimStatus();
        toast.error('Already claimed today');
      } else {
        toast.error(message);
      }
    } finally {
      setIsInPersonClaiming(false);
    }
  };

  const handleModalOpenChange = (open: boolean) => {
    if (!open) {
      setIsModalOpen(false);
      setSelectedPerk(null);
    } else {
      setIsModalOpen(true);
    }
  };

  const [isDesktop, setIsDesktop] = useState(false);
  const [drawerDragY, setDrawerDragY] = useState(0);
  const [isDrawerDragging, setIsDrawerDragging] = useState(false);
  const drawerDragRef = useRef<{ pointerId: number; startY: number } | null>(
    null
  );

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');
    const sync = () => setIsDesktop(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!isModalOpen) {
      drawerDragRef.current = null;
      setDrawerDragY(0);
      setIsDrawerDragging(false);
    }
  }, [isModalOpen]);

  const DRAWER_DISMISS_PX = 80;

  const onDrawerHandlePointerDown = (
    event: PointerEvent<HTMLButtonElement>
  ) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drawerDragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
    };
    setIsDrawerDragging(true);
  };

  const onDrawerHandlePointerMove = (
    event: PointerEvent<HTMLButtonElement>
  ) => {
    const drag = drawerDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setDrawerDragY(Math.max(0, event.clientY - drag.startY));
  };

  const onDrawerHandlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = drawerDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    drawerDragRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // already released
    }
    const deltaY = Math.max(0, event.clientY - drag.startY);
    setIsDrawerDragging(false);
    if (deltaY >= DRAWER_DISMISS_PX) {
      handleModalOpenChange(false);
      return;
    }
    setDrawerDragY(0);
  };

  // A modal Radix dialog locks pointer events on the rest of the page, which makes
  // Privy's login modal (rendered in its own portal) appear behind an invisible
  // interaction lock and unclickable. Close the perk dialog first, then open Privy.
  const handleLoginClick = () => {
    setIsModalOpen(false);
    setSelectedPerk(null);
    setTimeout(() => login(), 0);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return undefined;
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return undefined;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  // Compact dd/mm/yyyy for the metadata pills; the long "Mon D, YYYY" format
  // overlaps adjacent pills on narrow viewports.
  const formatDateNumeric = (dateString?: string) => {
    if (!dateString) return undefined;
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return undefined;
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    }).format(date);
  };

  const getPerkDateRange = (perk: Perk) => {
    const startDate = formatDateNumeric(
      (perk as unknown as { start_date?: string })?.start_date
    );
    const endDate = formatDateNumeric(perk.end_date);

    if (startDate && endDate) {
      return `${startDate} – ${endDate}`;
    }

    if (endDate) {
      return `Ends ${endDate}`;
    }

    return 'Ongoing';
  };

  const getPerkEndTimestamp = (perk: Perk) => {
    if (!perk.end_date) return Number.POSITIVE_INFINITY;
    const time = new Date(perk.end_date).getTime();
    return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
  };

  const startDateRaw = selectedPerk
    ? ((selectedPerk as unknown as { start_date?: string })?.start_date ??
      undefined)
    : undefined;
  const formattedStartDate = formatDate(startDateRaw);
  const formattedEndDate = formatDate(selectedPerk?.end_date);
  const dateLabel =
    formattedStartDate && formattedEndDate
      ? `${formattedStartDate} – ${formattedEndDate}`
      : formattedEndDate
        ? `Ends ${formattedEndDate}`
        : 'Ongoing';

  // Featured reward for the LATEST REWARD slot: a manually featured perk wins;
  // otherwise fall back to the most recently created/updated perk. When multiple
  // perks are featured, the most recently updated featured perk is used.
  const latestReward =
    perks.length > 0
      ? [...perks].sort((a, b) => {
          const aFeatured = a.is_featured ? 1 : 0;
          const bFeatured = b.is_featured ? 1 : 0;
          if (aFeatured !== bFeatured) return bFeatured - aFeatured;

          const aDate = a.updated_at || a.created_at || '';
          const bDate = b.updated_at || b.created_at || '';
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        })[0]
      : null;

  const isPerkExpiringSoon = (perk: Perk) =>
    Boolean(
      perk.end_date &&
      new Date(perk.end_date) >= new Date() &&
      new Date(perk.end_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );

  // Shared ordering: ending-soon (not yet expired) rewards float to the top,
  // then by end date according to the active sort direction.
  const compareRewards = (a: Perk, b: Perk) => {
    const aSoon = isPerkExpiringSoon(a);
    const bSoon = isPerkExpiringSoon(b);
    if (aSoon !== bSoon) return aSoon ? -1 : 1;

    const aTime = getPerkEndTimestamp(a);
    const bTime = getPerkEndTimestamp(b);

    // Within the ending-soon group, soonest to expire comes first.
    if (aSoon && bSoon) return aTime - bTime;

    // Default ordering: latest end date first (further-out perks on top).
    return bTime - aTime;
  };

  const sortedRewards = perks
    .filter((perk) => perk.id !== latestReward?.id)
    .sort(compareRewards);

  const perkCity = (perk: Perk) => perk.location?.trim() ?? '';

  // City/type values present in the feed power the chip dropdowns (no empties).
  const cityOptions = useMemo(() => {
    const values = new Set<string>();
    perks.forEach((perk) => {
      const city = perk.location?.trim();
      if (city) values.add(city);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [perks]);

  const typeOptions = useMemo(() => {
    const values = new Set<string>();
    perks.forEach((perk) => {
      const type = perk.type?.trim();
      if (type) values.add(type);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [perks]);

  const hasActiveFilters = selectedCity !== 'all' || selectedType !== 'all';

  // Filtered + ordered list shown when any chip is active. City rule:
  // a specific city surfaces local perks first, then Global perks; "Global"
  // shows only Global perks; "all" applies no city restriction. Type ANDs in.
  const filteredRewards = useMemo(() => {
    const matchesType = (perk: Perk) =>
      selectedType === 'all' || perk.type === selectedType;

    const matchesCity = (perk: Perk) => {
      if (selectedCity === 'all') return true;
      const city = perkCity(perk);
      if (selectedCity === GLOBAL_CITY) return city === GLOBAL_CITY;
      return city === selectedCity || city === GLOBAL_CITY;
    };

    const result = perks.filter(
      (perk) => matchesType(perk) && matchesCity(perk)
    );

    if (selectedCity !== 'all' && selectedCity !== GLOBAL_CITY) {
      // Local picks before Global fallbacks; each group keeps the date ordering.
      return result.sort((a, b) => {
        const aGlobal = perkCity(a) === GLOBAL_CITY ? 1 : 0;
        const bGlobal = perkCity(b) === GLOBAL_CITY ? 1 : 0;
        if (aGlobal !== bGlobal) return aGlobal - bGlobal;
        return compareRewards(a, b);
      });
    }

    return result.sort(compareRewards);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perks, selectedCity, selectedType]);

  const displayedRewards = hasActiveFilters ? filteredRewards : sortedRewards;

  const latestRewardAffordable = latestReward
    ? !address || canAfford(latestReward)
    : false;
  const latestRewardExpired = Boolean(
    latestReward?.end_date && new Date(latestReward.end_date) < new Date()
  );
  const latestRewardExpiringSoon = Boolean(
    latestReward?.end_date &&
    new Date(latestReward.end_date) <
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  );
  const latestRewardRedeemed = latestReward?.id
    ? hasRedeemed(latestReward.id)
    : false;

  const DetailsShell = isDesktop ? DialogContent : DialogDrawerContent;

  return (
    <div className="min-h-screen bg-white pb-0 font-grotesk">
      <header className="hidden bg-white pt-4 xl:block">
        <MapDesktopNav searchSlot={<MapDesktopSearchSlot />} />
      </header>

      <div className="px-4 pt-4 md:px-2 xl:hidden">
        <div className="mx-auto max-w-md">
          {/* Status Bar with Header */}
          <div className="flex justify-between items-center">
            <div className="min-w-0 flex-1">
              <MapNav className={cn(MAP_NAV_SAFE_AREA_X, 'max-w-none')} />
            </div>
          </div>
        </div>
      </div>

      <section
        className="hidden w-full items-start justify-center gap-4 bg-[var(--Backgrounds-Highlight,#FFF200)] p-[var(--sds-size-space-400)] xl:flex"
        aria-label="Rewards page introduction"
      >
        <div className="flex max-w-[1440px] flex-1 basis-0 items-center gap-[var(--sds-size-space-800)]">
          <h2 className="h-8 shrink-0 text-[#171717]">Rewards</h2>
          <p className="title4 flex h-8 min-w-0 flex-1 basis-0 flex-col justify-end text-[#171717]">
            Curated perks from our partners across the IRL Venue Network. From
            free drinks to hotel stays to guest list spots, we got you.
          </p>
        </div>
      </section>

      <section
        className="flex w-full items-start justify-center gap-4 bg-[var(--Backgrounds-Highlight,#FFF200)] px-[var(--sds-size-space-400)] py-[var(--sds-size-space-200)] xl:hidden"
        aria-label="Rewards page introduction"
      >
        <h3 className="shrink-0 text-[#171717]">Rewards</h3>
        <p className="title6 min-w-0 flex-1 text-[#171717]">
          Curated perks from our partners across the IRL Venue Network. From
          free drinks to hotel stays to guest list spots, we got you.
        </p>
      </section>

      <div className="mx-auto max-w-md px-4 pt-0 md:px-2 md:pt-3">
        {/* Main Content */}
        <div className="space-y-1 px-0 pt-0 md:pt-2">
          {/* LATEST REWARD Section */}
          {latestReward && !perksLoading && !hasActiveFilters && (
            <div className="mb-1">
              {/* Edge-to-edge: ignores page px-4 gutter */}
              {latestReward.thumbnail_url && (
                <div className="relative left-1/2 mb-4 aspect-[86/79] w-screen max-w-[100vw] -translate-x-1/2 overflow-hidden md:left-auto md:w-full md:translate-x-0">
                  <Image
                    src={latestReward.hero_image || latestReward.thumbnail_url!}
                    alt={latestReward.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 767px) 100vw, 448px"
                  />
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  padding: latestReward.thumbnail_url ? '0 0 24px 0' : '24px',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '8px',
                  alignSelf: 'stretch',
                  borderRadius: '26px',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  background:
                    'linear-gradient(180deg, rgba(255, 255, 255, 0.58) 0%, rgba(255, 255, 255, 0.92) 100%)',
                }}
              >
                <p className="label-small self-stretch text-left text-black">
                  LATEST REWARD
                </p>

                {/* Reward Title */}
                <h2 className="text-[#171717] self-stretch font-medium w-full break-words text-left">
                  {latestReward.title}
                </h2>

                {/* Description */}
                {latestReward.description && (
                  <p className="text-[#757575] body-small  w-full break-words text-left mb-4">
                    {latestReward.description.split(/[.!?]+/)[0].trim()}
                    {latestReward.description.match(/[.!?]/) ? '.' : ''}
                  </p>
                )}

                {/* Points, Location, and Date — metadata left, Details right */}
                <div className="mb-2 flex h-5 min-w-0 items-center justify-between gap-2 self-stretch">
                  <div className="flex min-w-0 flex-1 flex-nowrap items-center justify-start gap-2 self-stretch overflow-hidden">
                    {/* Category Pill */}
                    <div className="flex h-5 shrink-0 items-center justify-center gap-1 border border-[#171717] px-1 text-[#171717] label-small uppercase whitespace-nowrap">
                      {latestReward.type
                        ? formatTypeLabel(latestReward.type)
                        : 'Reward'}
                    </div>

                    {!latestReward.end_date && (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          padding: '0 8px',
                          height: '20px',
                          alignItems: 'center',
                          gap: '8px',
                          alignSelf: 'stretch',
                          flexWrap: 'nowrap',
                        }}
                        className="shrink-0 text-[#171717] label-small uppercase"
                      >
                        <span className="whitespace-nowrap">Ongoing</span>
                      </div>
                    )}

                    {latestReward.end_date && (
                      <div
                        style={{
                          display: 'flex',
                          padding: '0 8px',
                          height: '20px',
                          alignItems: 'center',
                          gap: '8px',
                          alignSelf: 'stretch',
                        }}
                        className="shrink-0"
                      >
                        <TimeLeft
                          endDate={latestReward.end_date}
                          className={`text-black body-small uppercase font-abc-monument-regular ${
                            latestRewardExpired
                              ? 'text-red-600'
                              : latestRewardExpiringSoon
                                ? 'text-orange-600'
                                : ''
                          }`}
                        />
                      </div>
                    )}
                  </div>

                  {latestRewardAffordable && (
                    <button
                      type="button"
                      onClick={() => handleOpenPerk(latestReward)}
                      disabled={latestRewardExpired}
                      style={{
                        background: 'transparent',
                        cursor: latestRewardExpired ? 'not-allowed' : 'pointer',
                        opacity: latestRewardExpired ? 0.5 : 1,
                      }}
                      className="inline-flex h-5 shrink-0 items-center gap-2  text-[#171717] label-medium uppercase transition-colors hover:bg-gray-50 border-b border-black"
                    >
                      <span>Details</span>
                      <svg
                        width={12}
                        height={12}
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3 shrink-0"
                        aria-hidden
                      >
                        <path
                          d="M14.0822 4L11.8239 6.28605L16 10.1453H2V13.8547H15.9812L11.8239 17.7139L14.0822 20L22 11.9846L14.0822 4Z"
                          fill="#171717"
                        />
                      </svg>
                    </button>
                  )}
                </div>

                {/* View Details Button or Eligibility Message */}
                {address ? (
                  latestRewardAffordable ? (
                    <button
                      type="button"
                      onClick={() => handleOpenPerk(latestReward)}
                      className={`label-large  uppercase flex h-[44px] w-full cursor-pointer items-center justify-between bg-black py-2 pr-2 pl-4 text-white transition-colors hover:bg-neutral-900 ${
                        latestRewardExpired
                          ? 'cursor-not-allowed opacity-50'
                          : ''
                      }`}
                      disabled={latestRewardExpired}
                    >
                      <span className="whitespace-nowrap">
                        {latestRewardRedeemed
                          ? '✓ Redeemed'
                          : latestRewardExpired
                            ? 'Expired'
                            : 'Claim Reward'}
                      </span>
                      <Image
                        src="/guidance_up-right-2-short-arrow.svg"
                        alt=""
                        width={24}
                        height={24}
                        className="h-6 w-6 shrink-0"
                        aria-hidden
                      />
                    </button>
                  ) : (
                    <div className="w-full rounded-full bg-white/80 py-3 px-4 text-center">
                      <p className="text-black body-small font-abc-monument-regular">
                        You don&apos;t have the required points to claim this.
                        Come back when you reach{' '}
                        <span className="font-bold">
                          {latestReward.points_threshold.toLocaleString()}{' '}
                          points
                        </span>
                        .
                      </p>
                    </div>
                  )
                ) : (
                  <button
                    onClick={() => handleOpenPerk(latestReward)}
                    className="w-full h-[40px] bg-white text-black font-bold rounded-full px-4 hover:bg-gray-100 transition-colors flex items-center justify-between"
                  >
                    <h4 className="font-grotesk text-left">View Details</h4>
                    <div
                      style={{
                        display: 'flex',
                        width: '24px',
                        height: '24px',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Image
                        src="/home/arrow-right.svg"
                        alt="arrow-right"
                        width={20}
                        height={20}
                        className="w-5 h-5"
                      />
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Loading State */}
          {perksLoading && (
            <div className="space-y-1">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    padding: '16px',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '8px',
                    alignSelf: 'stretch',
                    borderRadius: '26px',
                    border: '1px solid #EDEDED',
                    background: '#FFF',
                    boxShadow: '0 1px 8px 0 rgba(0, 0, 0, 0.08)',
                  }}
                  className="animate-pulse"
                >
                  <div className="flex justify-between items-start mb-3 w-full">
                    <div className="w-16 h-6 bg-gray-200 rounded-full"></div>
                    <div className="w-20 h-6 bg-gray-200 rounded"></div>
                  </div>
                  <div className="w-3/4 h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="w-full h-4 bg-gray-200 rounded mb-4"></div>
                  <div className="w-full h-10 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          )}

          {/* Filter chips — city + type, derived from the perk feed */}
          {!perksLoading &&
            (cityOptions.length > 0 || typeOptions.length > 0) && (
              <div className="mb-4 flex flex-col gap-2">
                <div className="flex items-stretch gap-2">
                  {cityOptions.length > 0 && (
                    <Select
                      value={selectedCity}
                      onValueChange={setSelectedCity}
                    >
                      <SelectTrigger
                        aria-label="Filter rewards by city"
                        className="flex h-10 flex-1 items-center justify-between rounded-none border-0 bg-[#a9a9a9] px-4 shadow-none transition-colors hover:bg-[#9a9a9a] focus:ring-0 focus:ring-offset-0 [&>svg:last-child]:hidden"
                      >
                        <span className="truncate label-small uppercase tracking-wide text-black">
                          <SelectValue placeholder="All cities" />
                        </span>
                        <MapPin
                          className="size-5 shrink-0 text-black"
                          aria-hidden
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All cities</SelectItem>
                        {cityOptions.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {typeOptions.length > 0 && (
                    <Select
                      value={selectedType}
                      onValueChange={setSelectedType}
                    >
                      <SelectTrigger
                        aria-label="Filter rewards by type"
                        className="flex h-10 flex-1 items-center justify-between rounded-none border-0 bg-[#a9a9a9] px-4 shadow-none transition-colors hover:bg-[#9a9a9a] focus:ring-0 focus:ring-offset-0 [&>svg:last-child]:hidden"
                      >
                        <span className="truncate label-small uppercase tracking-wide text-black">
                          <SelectValue placeholder="All types" />
                        </span>
                        <Tag
                          className="size-5 shrink-0 text-black"
                          aria-hidden
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        {typeOptions.map((type) => (
                          <SelectItem key={type} value={type}>
                            {formatTypeLabel(type)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="self-start label-small uppercase tracking-wide text-[#757575] underline hover:text-black"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}

          {/* Perks List */}
          {!perksLoading && (
            <div className="flex flex-col">
              {displayedRewards.length > 0 ? (
                displayedRewards.map((perk) => {
                  const affordable = !address || canAfford(perk);
                  const isExpired = Boolean(
                    perk.end_date && new Date(perk.end_date) < new Date()
                  );
                  const isExpiringSoon = Boolean(
                    perk.end_date &&
                    new Date(perk.end_date) <
                      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                  );
                  const userRedeemed = perk.id ? hasRedeemed(perk.id) : false;

                  return (
                    <div
                      key={perk.id}
                      className={`flex items-stretch gap-4 self-stretch border-t border-[var(--Text-Secondary-Text,#757575)] bg-[var(--Backgrounds-Background,#FFF)] py-6 ${
                        !affordable || isExpired ? 'opacity-60' : ''
                      }`}
                    >
                      {/* Thumbnail — fixed square, top-aligned so right-column height never stretches it */}
                      <div className="relative h-[107px] w-[107px] shrink-0 self-start overflow-hidden rounded-lg bg-[#EDEDED]">
                        {perk.thumbnail_url ? (
                          <Image
                            src={perk.thumbnail_url}
                            alt={perk.title}
                            fill
                            className="object-cover"
                            sizes="107px"
                          />
                        ) : null}
                      </div>

                      {/* Content — aligned with featured / latest reward */}
                      <div className="flex min-w-0 flex-1 flex-col items-start gap-2 self-stretch">
                        {(isExpiringSoon && !isExpired) ||
                        isExpired ||
                        userRedeemed ? (
                          <div className="flex w-full flex-wrap gap-2">
                            {isExpiringSoon && !isExpired && perk.end_date && (
                              <span className="flex h-5 items-center gap-2 rounded-full border border-[#EDEDED] bg-[#EDEDED] px-2 body-small uppercase font-abc-monument-regular text-red-600">
                                <TimeLeft endDate={perk.end_date} />
                              </span>
                            )}
                            {isExpired && (
                              <span className="flex h-5 items-center gap-2 rounded-full border border-[#EDEDED] bg-[#EDEDED] px-2 body-small uppercase font-abc-monument-regular text-black">
                                Expired
                              </span>
                            )}
                            {userRedeemed && (
                              <span className="flex h-5 items-center gap-2 rounded-full border border-[#EDEDED] bg-[#EDEDED] px-2 body-small uppercase font-abc-monument-regular text-black">
                                ✓ Redeemed
                              </span>
                            )}
                          </div>
                        ) : null}

                        <h2 className="w-full break-words text-left font-medium text-[#171717]">
                          {perk.title}
                        </h2>

                        {perk.description ? (
                          <p className="body-small w-full break-words text-left text-[#757575]">
                            {perk.description.split(/[.!?]+/)[0].trim()}
                            {perk.description.match(/[.!?]/) ? '.' : ''}
                          </p>
                        ) : null}

                        {/* Metadata row — same pattern as LATEST REWARD */}
                        <div className="mb-2 flex h-5 min-w-0 w-full items-center justify-between gap-2 self-stretch">
                          <div className="flex min-w-0 flex-nowrap items-center justify-start gap-2 self-stretch overflow-hidden">
                            <div className="flex h-5 shrink-0 items-center justify-center gap-1 border border-[#171717] px-1 text-[#171717] label-small uppercase whitespace-nowrap">
                              {perk.type
                                ? formatTypeLabel(perk.type)
                                : 'Reward'}
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'row',
                                padding: '0 8px 0 0',
                                height: '20px',
                                alignItems: 'center',
                                gap: '8px',
                                alignSelf: 'stretch',
                                flexWrap: 'nowrap',
                              }}
                              className="shrink-0 text-[#171717] label-small uppercase"
                            >
                              <span className="whitespace-nowrap">
                                {getPerkDateRange(perk)}
                              </span>
                            </div>

                            {perk.end_date &&
                              !(isExpiringSoon && !isExpired) && (
                                <div
                                  style={{
                                    display: 'flex',
                                    padding: '0 8px',
                                    height: '20px',
                                    alignItems: 'center',
                                    gap: '8px',
                                    alignSelf: 'stretch',
                                  }}
                                  className="shrink-0"
                                >
                                  <TimeLeft
                                    endDate={perk.end_date}
                                    className={`text-black body-small uppercase font-abc-monument-regular ${
                                      isExpired ? 'text-red-600' : ''
                                    }`}
                                  />
                                </div>
                              )}
                          </div>

                          {perk.id && (
                            <button
                              type="button"
                              onClick={() => handleOpenPerk(perk)}
                              disabled={!affordable || isExpired}
                              style={{
                                background: 'transparent',
                                cursor:
                                  !affordable || isExpired
                                    ? 'not-allowed'
                                    : 'pointer',
                                opacity: !affordable || isExpired ? 0.5 : 1,
                              }}
                              className="inline-flex h-5 shrink-0 items-center gap-2 text-[#171717] label-medium uppercase transition-colors hover:bg-gray-50 border-b border-black disabled:pointer-events-none"
                              aria-label="View Details"
                            >
                              <span>Details</span>
                              <svg
                                width={12}
                                height={12}
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3 w-3 shrink-0"
                                aria-hidden
                              >
                                <path
                                  d="M14.0822 4L11.8239 6.28605L16 10.1453H2V13.8547H15.9812L11.8239 17.7139L14.0822 20L22 11.9846L14.0822 4Z"
                                  fill="#171717"
                                />
                              </svg>
                            </button>
                          )}
                        </div>

                        {!affordable &&
                          address &&
                          !isExpired &&
                          !userRedeemed && (
                            <div className="body-small font-abc-monument-regular text-black">
                              Need{' '}
                              {(
                                perk.points_threshold - userPoints
                              ).toLocaleString()}{' '}
                              more points
                            </div>
                          )}
                      </div>
                    </div>
                  );
                })
              ) : hasActiveFilters ? (
                <div className="flex flex-col items-center gap-2 self-stretch border-t border-[var(--Text-Secondary-Text,#757575)] bg-[var(--Backgrounds-Background,#FFF)] py-8 text-center">
                  <Gift className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                  <p className="body-small mb-2 font-abc-monument-regular text-black">
                    No perks match your filters
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="label-small uppercase tracking-wide text-[#757575] underline hover:text-black"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 self-stretch border-t border-[var(--Text-Secondary-Text,#757575)] bg-[var(--Backgrounds-Background,#FFF)] py-8 text-center">
                  <Gift className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                  <p className="body-small mb-2 font-abc-monument-regular text-black">
                    No perks available
                  </p>
                  <p className="body-small font-abc-monument-regular text-black">
                    Check back later for new rewards!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ height: '100px' }} />
      </div>

      <Dialog open={isModalOpen} onOpenChange={handleModalOpenChange}>
        <DetailsShell
          hideCloseButton
          style={
            !isDesktop && drawerDragY > 0
              ? { transform: `translateY(${drawerDragY}px)` }
              : undefined
          }
          className={
            isDesktop
              ? 'w-full max-w-[393px] gap-0 border-none bg-white p-0 shadow-none'
              : `inset-0 h-dvh max-h-none gap-0 overflow-hidden border-none bg-white p-0 ${
                  isDrawerDragging
                    ? 'transition-none'
                    : 'transition-transform duration-200'
                }`
          }
        >
          {!isDesktop ? (
            <button
              type="button"
              onPointerDown={onDrawerHandlePointerDown}
              onPointerMove={onDrawerHandlePointerMove}
              onPointerUp={onDrawerHandlePointerUp}
              onPointerCancel={onDrawerHandlePointerUp}
              className="absolute inset-x-0 top-0 z-20 flex touch-none items-center justify-center py-3"
              aria-label="Drag down to close"
            >
              <span className="h-[3px] w-8 rounded-full bg-white/70" />
            </button>
          ) : null}
          {selectedPerk && (
            <div
              className={
                isDesktop
                  ? 'max-h-[90vh] overflow-y-auto'
                  : 'h-full overflow-y-auto'
              }
            >
              {/* Hero: blurred reward image + centered thumb + logo + close */}
              <div
                className="relative flex h-[212px] w-full items-start justify-center gap-2 overflow-hidden"
                style={{
                  background:
                    'linear-gradient(0deg, rgba(0, 0, 0, 0.20) 0%, rgba(0, 0, 0, 0.20) 100%), #454545',
                }}
              >
                {heroImageUrl ? (
                  <div
                    className="pointer-events-none absolute inset-0 overflow-hidden"
                    aria-hidden
                  >
                    <Image
                      src={heroImageUrl}
                      alt=""
                      fill
                      className="scale-125 object-cover"
                      style={{ filter: 'blur(18.15px)' }}
                      sizes="393px"
                    />
                    <div className="absolute inset-0 bg-black/20" />
                  </div>
                ) : null}

                <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between p-2">
                  <Image
                    src="/irl-svg/irl-logo-new-white.svg"
                    alt="IRL"
                    width={70}
                    height={56}
                    className="-mt-2 block h-[56px] w-[70px] shrink-0 object-contain object-top"
                  />
                  <DialogClose asChild>
                    <button
                      type="button"
                      className="flex size-10 shrink-0 items-center justify-center rounded-[179px] border border-[var(--Borders-Light-Border,#DBDBDB)] bg-[var(--Backgrounds-Background,#FFF)] p-[var(--sds-size-space-200)] shadow-[0_1px_8px_0_rgba(0,0,0,0.08)] transition-opacity hover:opacity-90"
                      aria-label="Close"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width={24}
                        height={24}
                        viewBox="0 0 24 24"
                        fill="none"
                        className="size-6 shrink-0 aspect-square"
                        aria-hidden
                      >
                        <path
                          d="M19.9987 7.32025L16.7199 4L12.0122 8.69045L7.32171 4L4.00146 7.32025L8.69538 11.9969L4.00146 16.6735L7.32171 19.9938L12.0122 15.3033L16.7199 19.9938L19.9987 16.6735L15.3186 11.9969L19.9987 7.32025Z"
                          fill="#757575"
                        />
                      </svg>
                    </button>
                  </DialogClose>
                </div>

                {heroImageUrl ? (
                  <div className="relative z-[1] flex h-full w-full items-center justify-center p-2">
                    <Image
                      src={heroImageUrl}
                      alt={selectedPerk.title}
                      width={127}
                      height={129}
                      className="object-cover rounded-[24px]"
                      style={{
                        width: '127px',
                        height: '129px',
                        aspectRatio: '127/129',
                      }}
                    />
                  </div>
                ) : null}
              </div>

              {/* Container 3: Details */}
              <div className="w-full  border border-[#131313]/10 bg-white p-6 relative">
                <div className="space-y-4">
                  <h3 className="flex h-9 grow basis-0 shrink-0 flex-col justify-center text-[#171717]">
                    {selectedPerk.title}
                  </h3>

                  <div className="flex items-center gap-2">
                    <span className="label-small inline-flex items-center justify-center gap-[var(--sds-size-space-050)] border border-[var(--Tint-Ink-Black,#171717)] px-[var(--sds-size-space-100)] py-[var(--sds-size-space-050)] text-[#171717]">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        aria-hidden
                      >
                        <path
                          d="M8 14C4.69123 14 2 11.3088 2 8C2 4.69123 4.69123 2 8 2C11.3088 2 14 4.69123 14 8C14 11.3088 11.3088 14 8 14ZM8 4.00974C5.80024 4.00974 4.00974 5.80024 4.00974 8C4.00974 10.1998 5.80024 11.9903 8 11.9903C10.1998 11.9903 11.9903 10.1998 11.9903 8C11.9903 5.80024 10.1998 4.00974 8 4.00974Z"
                          fill="#757575"
                        />
                        <path
                          d="M7.26495 10.7386V6.62662H8.75295V10.7386H7.26495ZM7.27295 6.13862V5.01862H8.75295V6.13862H7.27295Z"
                          fill="#757575"
                        />
                      </svg>
                      {selectedPerk.type?.length ? selectedPerk.type : 'Reward'}
                    </span>
                    <span className="label-small inline-flex items-center justify-center gap-[var(--sds-size-space-050)] border border-[var(--Tint-Ink-Black,#171717)] px-[var(--sds-size-space-100)] py-[var(--sds-size-space-050)] text-[#171717]">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        aria-hidden
                      >
                        <path
                          d="M8.00008 13.9795C4.70261 13.9795 2.02057 11.2974 2.02057 7.99996C2.02057 4.70249 4.70261 2.02045 8.00008 2.02045C11.2976 2.02045 13.9796 4.70249 13.9796 7.99996C13.9796 11.2974 11.2976 13.9795 8.00008 13.9795ZM8.00008 4.02333C5.80784 4.02333 4.02345 5.80772 4.02345 7.99996C4.02345 10.1922 5.80784 11.9766 8.00008 11.9766C10.1923 11.9766 11.9767 10.1922 11.9767 7.99996C11.9767 5.80772 10.1923 4.02333 8.00008 4.02333Z"
                          fill="#757575"
                        />
                        <path
                          d="M9.68496 10.8095L7.2724 8.27861V5.27246H8.72904V7.69595L10.7392 9.80444L9.68496 10.8095Z"
                          fill="#757575"
                        />
                      </svg>
                      {dateLabel}
                    </span>

                    {selectedPerk.website_url ? (
                      <a
                        href={selectedPerk.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="label-medium uppercase border-b border-[#171717] ml-auto inline-flex shrink-0 items-center gap-1 text-[#171717] transition-opacity hover:opacity-80"
                      >
                        View Website
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          aria-hidden
                        >
                          <path
                            d="M9.38812 2.66669L7.88264 4.19072L10.6667 6.76352H1.33334V9.23652H10.6542L7.88264 11.8093L9.38812 13.3334L14.6667 7.98972L9.38812 2.66669Z"
                            fill="#171717"
                          />
                        </svg>
                      </a>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <div className="body-small uppercase  tracking-wide">
                      {selectedPerk.location?.trim() || 'Not specified'}
                    </div>
                  </div>
                  <div className="flex items-start gap-2 body-small leading-relaxed text-[#757575]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="mt-0.5 shrink-0"
                      aria-hidden
                    >
                      <path
                        d="M8 14C4.69123 14 2 11.3088 2 8C2 4.69123 4.69123 2 8 2C11.3088 2 14 4.69123 14 8C14 11.3088 11.3088 14 8 14ZM8 4.00974C5.80024 4.00974 4.00974 5.80024 4.00974 8C4.00974 10.1998 5.80024 11.9903 8 11.9903C10.1998 11.9903 11.9903 10.1998 11.9903 8C11.9903 5.80024 10.1998 4.00974 8 4.00974Z"
                        fill="#A9A9A9"
                      />
                      <path
                        d="M7.26495 10.7386V6.62662H8.75295V10.7386H7.26495ZM7.27295 6.13862V5.01862H8.75295V6.13862H7.27295Z"
                        fill="#A9A9A9"
                      />
                    </svg>
                    <span>
                      {selectedPerk.description?.trim() ||
                        'Details coming soon.'}
                    </span>
                  </div>
                  <div style={{ height: '16px' }} />
                </div>
                <div
                  className="absolute border-t border-solid border-[#131313]/20"
                  style={{
                    left: '-24px',
                    right: '-24px',
                  }}
                />
                <div style={{ height: '1px' }} />

                {/* Claim Section - Only visible if user is logged in and eligible */}
                {address && selectedPerk && canAfford(selectedPerk) && (
                  <>
                    <div className="space-y-4 pt-4">
                      <div className="flex items-center gap-2">
                        <div className="h-4" aria-hidden />
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          aria-hidden
                        >
                          <path
                            d="M3.05003 8.71842C3.5299 8.26921 4.16073 8.01809 4.81745 8.01592C6.33902 8.01051 8.74808 7.97696 8.74808 7.97696H9.69811C10.2535 7.97696 10.7042 8.42941 10.7042 8.98685C10.7042 9.5443 10.2535 9.99675 9.69811 9.99675H6.28079C6.08669 9.99675 5.92925 10.1548 5.92925 10.3496C5.92925 10.5445 6.08669 10.7025 6.28079 10.7025H9.74665C10.6428 10.7025 11.3696 9.97294 11.3696 9.07345V8.62316C11.3696 8.51384 11.4116 8.40776 11.4882 8.32874L12.8955 6.79062C13.2891 6.35982 13.962 6.34683 14.3717 6.76356C14.7438 7.14133 14.7664 7.74099 14.4246 8.14581L11.6597 11.418C11.2607 11.8899 10.6751 12.1616 10.0583 12.1616H5.5777L4.29337 13.0373C4.25347 13.0773 1.56512 10.1093 1.56512 10.1093L3.05111 8.71842H3.05003ZM8.6823 3.33337C7.55326 3.33337 6.6388 4.25126 6.6388 5.38456C6.6388 6.51785 7.55326 7.43575 8.6823 7.43575C9.81135 7.43575 10.7258 6.51785 10.7258 5.38456C10.7258 4.25126 9.81135 3.33337 8.6823 3.33337Z"
                            fill="#757575"
                          />
                        </svg>
                        <span className="label-small uppercase tracking-wide text-[#757575]">
                          CLAIM
                        </span>
                      </div>

                      {/* Row 2: Instructions */}
                      <p className="body-small text-[#757575]">
                        {codeIsClaimUrl || !hasDiscountCode
                          ? 'Click the button to claim your reward.'
                          : `Click the button and use code ${selectedDiscountCode} to claim your reward.`}
                      </p>

                      {/* Row 3: Pills */}
                      {codeIsClaimUrl || !hasDiscountCode ? (
                        /* Full width claim button when code is a URL or in-person */
                        <div className="w-full">
                          {claimUrl ? (
                            <a
                              href={claimUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={handleClaimClick}
                              className="label-large flex h-11 min-h-11 w-full items-center justify-between bg-[#171717] px-[var(--sds-size-space-400)] py-[var(--sds-size-space-200)] text-white transition-opacity hover:opacity-95"
                            >
                              Claim Reward
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                className="shrink-0"
                                aria-hidden
                              >
                                <path
                                  d="M14.0822 4L11.8239 6.28605L16 10.1453H2V13.8547H15.9812L11.8239 17.7139L14.0822 20L22 11.9846L14.0822 4Z"
                                  fill="#FFFFFF"
                                />
                              </svg>
                            </a>
                          ) : claimedToday ? (
                            <button
                              type="button"
                              disabled
                              className="label-large flex h-11 min-h-11 w-full cursor-not-allowed items-center justify-center bg-gray-300 px-[var(--sds-size-space-400)] py-[var(--sds-size-space-200)] text-gray-500"
                            >
                              CLAIMED TODAY
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleInPersonClaim}
                              disabled={isInPersonClaiming}
                              className="label-large flex h-11 min-h-11 w-full items-center justify-between bg-[#171717] px-[var(--sds-size-space-400)] py-[var(--sds-size-space-200)] text-white transition-opacity hover:opacity-95 disabled:opacity-50"
                            >
                              {isInPersonClaiming ? '...' : 'Claim Reward'}
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                className="shrink-0"
                                aria-hidden
                              >
                                <path
                                  d="M14.0822 4L11.8239 6.28605L16 10.1453H2V13.8547H15.9812L11.8239 17.7139L14.0822 20L22 11.9846L14.0822 4Z"
                                  fill="#FFFFFF"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      ) : (
                        /* Two pills when code is not a URL */
                        <div className="flex gap-2">
                          {/* Pill 1: Code with Copy */}
                          <button
                            type="button"
                            onClick={handleCopyCode}
                            className="label-medium flex h-11 grow basis-0 shrink-0 items-center justify-center gap-[var(--sds-size-space-050)] border border-[var(--Borders-Light-Border,#DBDBDB)] bg-white px-[var(--sds-size-space-100)] py-[var(--sds-size-space-050)] text-[#171717] transition-colors hover:bg-gray-50"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                              className="shrink-0"
                              aria-hidden
                            >
                              <path
                                d="M4.73331 9.40004H3.33331V3.33337H9.39998V4.73337M6.59998 6.60004H12.6666V12.6667H6.59998V6.60004Z"
                                stroke="#171717"
                                strokeWidth="2.5"
                                strokeLinejoin="bevel"
                              />
                            </svg>
                            <span>
                              {selectedDiscountCode?.slice(0, 20) || ''}
                            </span>
                          </button>

                          {/* Pill 2: Claim Reward */}
                          {claimUrl ? (
                            <a
                              href={claimUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={handleClaimClick}
                              className="label-large flex h-11 min-h-11 w-[212px] shrink-0 items-center justify-between bg-[#171717] px-[var(--sds-size-space-400)] py-[var(--sds-size-space-200)] text-white transition-opacity hover:opacity-95"
                            >
                              Claim Reward
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                className="shrink-0"
                                aria-hidden
                              >
                                <path
                                  d="M14.0822 4L11.8239 6.28605L16 10.1453H2V13.8547H15.9812L11.8239 17.7139L14.0822 20L22 11.9846L14.0822 4Z"
                                  fill="#FFFFFF"
                                />
                              </svg>
                            </a>
                          ) : claimedToday ? (
                            <button
                              type="button"
                              disabled
                              className="label-large flex h-11 min-h-11 w-[212px] shrink-0 cursor-not-allowed items-center justify-center bg-gray-300 px-[var(--sds-size-space-400)] py-[var(--sds-size-space-200)] text-gray-500"
                            >
                              CLAIMED TODAY
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleInPersonClaim}
                              disabled={isInPersonClaiming}
                              className="label-large flex h-11 min-h-11 w-[212px] shrink-0 items-center justify-between bg-[#171717] px-[var(--sds-size-space-400)] py-[var(--sds-size-space-200)] text-white transition-opacity hover:opacity-95 disabled:opacity-50"
                            >
                              {isInPersonClaiming ? '...' : 'Claim Reward'}
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                className="shrink-0"
                                aria-hidden
                              >
                                <path
                                  d="M14.0822 4L11.8239 6.28605L16 10.1453H2V13.8547H15.9812L11.8239 17.7139L14.0822 20L22 11.9846L14.0822 4Z"
                                  fill="#FFFFFF"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {!address && (
                  <>
                    <div style={{ height: '1px' }} />
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div>
                        <h4 className="title4 font-grotesk text-black">
                          IRL members only
                        </h4>
                        <p className="mt-1 body-small text-[#4F4F4F]">
                          Create an account to claim this reward.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleLoginClick}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#131313]/20 bg-[#131313] px-4 py-2 body-small font-grotesk uppercase tracking-wide text-white transition-colors hover:bg-[#313131]"
                      >
                        Join IRL
                      </button>
                      <button
                        type="button"
                        onClick={handleLoginClick}
                        className="body-small font-grotesk text-[#313131] underline underline-offset-4 hover:text-black"
                      >
                        Already a member? Sign in
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </DetailsShell>
      </Dialog>
    </div>
  );
}

export default function PerksPage() {
  return (
    <Suspense fallback={null}>
      <PerksPageInner />
    </Suspense>
  );
}
