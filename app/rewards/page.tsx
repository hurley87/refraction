'use client';

import type { Perk, UserPerkRedemption, PerkDiscountCode } from '@/lib/types';
import Image from 'next/image';
import { usePrivy } from '@privy-io/react-auth';

import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import {
  ExternalLink,
  Gift,
  Info,
  MapPin,
  Trophy,
  Clock,
  Copy,
} from 'lucide-react';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import MapNav, { MAP_NAV_MOBILE_FLUSH_X } from '@/components/map/mapnav';
import { usePerks, useUserRedemptions } from '@/hooks/usePerks';
import { useCurrentPlayer } from '@/hooks/usePlayer';
import { useTiers } from '@/hooks/useTiers';
import { useAnalytics } from '@/hooks/useAnalytics';
import { ANALYTICS_EVENTS } from '@/lib/analytics';

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
  const { user } = usePrivy();
  const address = user?.wallet?.address;
  const searchParams = useSearchParams();
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

  const { data: tiers = [] } = useTiers();

  const findTierForPoints = (points: number) => {
    if (!tiers.length) return null;
    return (
      tiers.find(
        (tier) =>
          points >= tier.min_points &&
          (tier.max_points === null || points < tier.max_points)
      ) ?? null
    );
  };

  const formatTierLabel = (points: number) => {
    const tier = findTierForPoints(points);
    if (!tier) {
      return 'All Members';
    }

    return tier.title;
  };

  const selectedTierInfo = selectedPerk
    ? findTierForPoints(selectedPerk.points_threshold)
    : null;

  const [viewMode, setViewMode] = useState<'rewards' | 'tiers'>('rewards');
  const [sortOption, setSortOption] = useState<'date-desc' | 'date-asc'>(
    'date-desc'
  );

  useEffect(() => {
    if (searchParams.get('tab') === 'tiers') {
      setViewMode('tiers');
    }
  }, [searchParams]);

  const toggleSort = () => {
    setSortOption((prev) => (prev === 'date-desc' ? 'date-asc' : 'date-desc'));
  };

  const selectedPerkAffordable = selectedPerk
    ? !address || canAfford(selectedPerk)
    : false;

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

  const handleModalOpenChange = (open: boolean) => {
    if (!open) {
      setIsModalOpen(false);
      setSelectedPerk(null);
    } else {
      setIsModalOpen(true);
    }
  };

  const handleViewAllTiersClick = () => {
    handleModalOpenChange(false);
    setViewMode('tiers');

    setTimeout(() => {
      const toggleElement = document.getElementById('tiers-toggle');
      if (toggleElement) {
        toggleElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
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

  const getPerkDateRange = (perk: Perk) => {
    const startDate = formatDate(
      (perk as unknown as { start_date?: string })?.start_date
    );
    const endDate = formatDate(perk.end_date);

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

  //const perkType = selectedPerk?.type?.toLowerCase() ?? "";
  //const isDiscountReward = perkType === "discount";
  const selectedPerkIsOnline = selectedPerk?.location
    ? selectedPerk.location.toLowerCase().includes('online')
    : true;

  const tierLabel = selectedPerk
    ? formatTierLabel(selectedPerk.points_threshold)
    : 'All Members';

  // Get the latest reward (most recently created or updated)
  const latestReward =
    perks.length > 0
      ? [...perks].sort((a, b) => {
          const aDate = a.created_at || a.updated_at || '';
          const bDate = b.created_at || b.updated_at || '';
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        })[0]
      : null;

  const sortedRewards = perks
    .filter((perk) => perk.id !== latestReward?.id)
    .sort((a, b) => {
      const aTime = getPerkEndTimestamp(a);
      const bTime = getPerkEndTimestamp(b);

      return sortOption === 'date-asc' ? aTime - bTime : bTime - aTime;
    });

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

  return (
    <div className="min-h-screen bg-white px-4 pb-0 pt-4 font-grotesk">
      <div className="mx-auto max-w-md">
        {/* Status Bar with Header */}
        <div className="flex justify-between items-center">
          <div className="min-w-0 flex-1">
            <MapNav className={MAP_NAV_MOBILE_FLUSH_X} />
          </div>
        </div>

        {/* Main Content */}
        <div className="px-0 pt-2 space-y-1">
          {/* LATEST REWARD Section */}
          {latestReward && !perksLoading && (
            <div className="mb-1">
              {/* Edge-to-edge: ignores page px-4 gutter */}
              {latestReward.thumbnail_url && (
                <div className="relative mb-4 aspect-[86/79] overflow-hidden max-md:left-1/2 max-md:w-screen max-md:max-w-[100vw] max-md:-translate-x-1/2 md:left-auto md:w-full md:translate-x-0">
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
                <h2 className="text-[#171717] self-stretch font-medium w-full text-left">
                  {latestReward.title}
                </h2>

                {/* Description */}
                {latestReward.description && (
                  <p className="text-[#757575] body-small  w-full text-left mb-4">
                    {latestReward.description.split(/[.!?]+/)[0].trim()}
                    {latestReward.description.match(/[.!?]/) ? '.' : ''}
                  </p>
                )}

                {/* Points, Location, and Date — metadata left, Details right */}
                <div className="mb-2 flex h-5 min-w-0 items-center justify-between gap-2 self-stretch">
                  <div className="flex min-w-0 flex-1 flex-nowrap items-center justify-start gap-2 self-stretch">
                    {/* Points Pill */}
                    <div className="flex h-5 shrink-0 items-center justify-center gap-1 border border-[#171717] px-1 text-[#171717] label-small uppercase whitespace-nowrap">
                      {address &&
                        (latestRewardAffordable ? (
                          <Image
                            src="/tier-eligible.svg"
                            alt="Eligible for Tier"
                            width={8}
                            height={8}
                            className="inline-block shrink-0"
                          />
                        ) : (
                          <Image
                            src="/tier-ineligible.svg"
                            alt="Not Eligible for Tier"
                            width={8}
                            height={8}
                            className="inline-block shrink-0"
                          />
                        ))}
                      {
                        formatTierLabel(latestReward.points_threshold).split(
                          ' '
                        )[0]
                      }
                    </div>

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
                      <span className="whitespace-nowrap">{dateLabel}</span>
                    </div>

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
                        Come back when you reach the{' '}
                        <span className="font-bold">
                          {formatTierLabel(latestReward.points_threshold)}
                        </span>{' '}
                        level.
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

          {/* View toggle & sort */}
          {!perksLoading && (
            <div
              id="tiers-toggle"
              className="mb-6 flex h-[52px] w-full shrink-0 items-center gap-2 self-stretch border-t border-[var(--Borders-Heavy-Border,#454545)]"
            >
              <div className="flex h-[52px] min-w-0 flex-1 items-center gap-1 border-b border-t border-[var(--Borders-Light-Border,#DBDBDB)]">
                {[
                  { label: 'Rewards', value: 'rewards' as const },
                  { label: 'Tiers', value: 'tiers' as const },
                ].map((option) => {
                  const selected = viewMode === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setViewMode(option.value)}
                      className={`flex flex-1 basis-0 items-center justify-center gap-2 self-stretch py-1 transition-colors duration-200 ${
                        selected
                          ? 'bg-[var(--Borders-Light-Border,#DBDBDB)]'
                          : 'bg-transparent'
                      }`}
                    >
                      <h4
                        className={selected ? 'text-black' : 'text-[#757575]'}
                      >
                        {option.label}
                      </h4>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => toggleSort()}
                className="box-border flex h-[52px] w-[55px] shrink-0 cursor-pointer flex-col items-start justify-center gap-4 p-4 text-[#171717] transition-colors duration-200 hover:bg-black/5"
                aria-label="Filter rewards"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 23 24"
                  fill="none"
                  className="h-5 w-[19px] shrink-0"
                  aria-hidden
                >
                  <path
                    d="M20 8.15416H2V5.51099H20V8.15416ZM17.0463 10.6784H4.95374V13.3216H17.0463V10.6784ZM13.8711 15.8458H8.13216V18.489H13.8711V15.8458Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </div>
          )}

          {/* Perks List */}
          {!perksLoading && viewMode === 'rewards' && (
            <div className="flex flex-col">
              {perks.length > 0 ? (
                sortedRewards.map((perk) => {
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
                      {/* Thumbnail */}
                      <div className="relative min-h-[107px] w-[107px] shrink-0 self-stretch overflow-hidden rounded-lg bg-[#EDEDED]">
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
                            {isExpiringSoon && !isExpired && (
                              <span className="flex h-5 items-center gap-2 rounded-full border border-[#EDEDED] bg-[#EDEDED] px-2 body-small uppercase font-abc-monument-regular text-black">
                                Ending Soon
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

                        <h2 className="w-full text-left font-medium text-[#171717]">
                          {perk.title}
                        </h2>

                        {perk.description ? (
                          <p className="body-small w-full text-left text-[#757575]">
                            {perk.description.split(/[.!?]+/)[0].trim()}
                            {perk.description.match(/[.!?]/) ? '.' : ''}
                          </p>
                        ) : null}

                        {/* Metadata row — same pattern as LATEST REWARD */}
                        <div className="mb-2 flex h-5 min-w-0 w-full items-center justify-between gap-2 self-stretch">
                          <div className="flex min-w-0 flex-1 flex-nowrap items-center justify-start gap-2 self-stretch">
                            <div className="flex h-5 shrink-0 items-center justify-center gap-1 border border-[#171717] px-1 text-[#171717] label-small uppercase whitespace-nowrap">
                              {address &&
                                (canAfford(perk) ? (
                                  <Image
                                    src="/tier-eligible.svg"
                                    alt="Eligible for Tier"
                                    width={8}
                                    height={8}
                                    className="inline-block shrink-0"
                                  />
                                ) : (
                                  <Image
                                    src="/tier-ineligible.svg"
                                    alt="Not Eligible for Tier"
                                    width={8}
                                    height={8}
                                    className="inline-block shrink-0"
                                  />
                                ))}
                              {
                                formatTierLabel(perk.points_threshold).split(
                                  ' '
                                )[0]
                              }
                            </div>

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
                              <span className="whitespace-nowrap">
                                {getPerkDateRange(perk)}
                              </span>
                            </div>

                            {perk.end_date && (
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
                                    isExpired
                                      ? 'text-red-600'
                                      : isExpiringSoon
                                        ? 'text-orange-600'
                                        : ''
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

          {!perksLoading && viewMode === 'tiers' && (
            <div className="space-y-1">
              {tiers.map((tier) => {
                const tierRange = tier.max_points
                  ? `${tier.min_points.toLocaleString()} - ${tier.max_points.toLocaleString()}`
                  : `${tier.min_points.toLocaleString()}+`;

                const tierPerks = [...perks]
                  .filter(
                    (perk) =>
                      formatTierLabel(perk.points_threshold) === tier.title
                  )
                  .sort((a, b) => {
                    const aDate = getPerkEndTimestamp(a);
                    const bDate = getPerkEndTimestamp(b);
                    return sortOption === 'date-asc'
                      ? aDate - bDate
                      : bDate - aDate;
                  });

                return (
                  <div
                    key={tier.id}
                    className="shadow-sm relative"
                    style={{
                      display: 'flex',
                      width: '100%',
                      padding: '16px',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '16px',
                      borderRadius: '20px',
                      background: '#FFF',
                    }}
                  >
                    <div className="flex w-full items-center justify-between">
                      <h3 className="text-[#313131] font-grotesk text-left">
                        {tier.title}
                      </h3>
                      <div className="flex items-center gap-2 rounded-full border border-[#EDEDED] bg-[#ffffff] px-3 py-1">
                        <Image
                          src="/ep_coin.svg"
                          alt="coin"
                          width={16}
                          height={16}
                          className="h-4 w-4"
                        />
                        <span className="body-small text-[#313131]">
                          {tierRange}
                        </span>
                      </div>
                    </div>
                    <div className="body-medium text-[#7D7D7D] body-medium text-left">
                      {tier.description}
                    </div>
                    <div
                      className="w-full border-t border-solid border-[#E2E2E2]"
                      style={{ marginLeft: '-16px', marginRight: '-16px' }}
                    />
                    <div
                      className="flex items-center gap-2"
                      style={{ marginTop: '1px' }}
                    >
                      <Image
                        src="/guidance_reward.svg"
                        alt="Guidance Reward"
                        width={16}
                        height={16}
                        style={{ width: '16', height: '16' }}
                      />
                      <div className="body-small font-grotesk text-[#7D7D7D] uppercase tracking-wide">
                        TIER REWARDS
                      </div>
                    </div>
                    {tierPerks.length > 0 ? (
                      <div
                        className="w-full overflow-x-auto"
                        style={{ marginTop: '-8px' }}
                      >
                        <div className="flex gap-2 py-2 pr-4">
                          {tierPerks.map((tierPerk) => {
                            const tierPerkAffordable = canAfford(tierPerk);
                            /* const tierPerkExpired =
                              tierPerk.end_date &&
                              new Date(tierPerk.end_date) < new Date(); */

                            return (
                              <div
                                key={tierPerk.id}
                                style={{
                                  display: 'flex',
                                  width: '280px',
                                  padding: '16px',
                                  flexDirection: 'column',
                                  alignItems: 'flex-start',
                                  gap: '12px',
                                  borderRadius: '16px',
                                  border: '1px solid #EDEDED',
                                  background: '#FFF',
                                  flexShrink: 0,
                                  boxShadow:
                                    '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                                }}
                              >
                                <div className="flex w-full items-center gap-3">
                                  {tierPerk.thumbnail_url ? (
                                    <Image
                                      src={tierPerk.thumbnail_url}
                                      alt={tierPerk.title}
                                      width={45}
                                      height={46}
                                      style={{
                                        width: '45px',
                                        height: '46px',
                                        borderRadius: '12px',
                                        objectFit: 'cover',
                                      }}
                                    />
                                  ) : (
                                    <div className="flex h-[46px] w-[45px] items-center justify-center rounded-[12px] bg-[#F4F4F4] text-[10px] uppercase tracking-wide text-[#7D7D7D]">
                                      No image
                                    </div>
                                  )}
                                  <h4 className="text-[#020303] font-grotesk line-clamp-2">
                                    {tierPerk.title}
                                  </h4>
                                </div>
                                <div
                                  className="flex w-full items-center gap-2"
                                  style={{ flexWrap: 'nowrap' }}
                                >
                                  <span className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-[#EDEDED] bg-[#ffffff] px-3 py-1 uppercase tracking-wide text-[#313131] body-small">
                                    {address &&
                                      (tierPerkAffordable ? (
                                        <Image
                                          src="/tier-eligible.svg"
                                          alt="Eligible"
                                          width={12}
                                          height={12}
                                          className="h-3 w-3"
                                        />
                                      ) : (
                                        <Image
                                          src="/tier-ineligible.svg"
                                          alt="Not Eligible"
                                          width={12}
                                          height={12}
                                          className="h-3 w-3"
                                        />
                                      ))}
                                    <div className="body-small">
                                      {formatTierLabel(
                                        tierPerk.points_threshold
                                      )}
                                    </div>
                                  </span>
                                  <span className="flex-1 inline-flex items-center justify-center gap-2 body-small rounded-full border border-[#EDEDED] bg-[#ffffff] px-3 py-1 uppercase tracking-wide text-[#313131]">
                                    <Clock className="h-3 w-3" />
                                    {getPerkDateRange(tierPerk)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="w-full py-4 text-center text-xs font-abc-monument-regular uppercase tracking-wide text-[#7D7D7D]">
                        No rewards yet for this tier. Check back soon.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ height: '100px' }} />
      </div>

      <Dialog open={isModalOpen} onOpenChange={handleModalOpenChange}>
        <DialogContent className="w-full max-w-lg border-none bg-[#313131] p-1 shadow-none [&>button]:hidden">
          {selectedPerk && (
            <div className="max-h-[90vh] overflow-y-auto space-y-1">
              {/* Container 1: Close */}
              <div className="w-full rounded-full border border-[#131313]/10 shadow-none bg-white p-2 flex items-center justify-center">
                <DialogClose asChild>
                  <button
                    className="text-black w-full rounded-full"
                    style={{
                      display: 'flex',
                      height: '48px',
                      width: '48px',
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderRadius: '9999px',
                      background: '#FFF',
                    }}
                    aria-label="Close"
                    type="button"
                  >
                    <Image
                      src="/x-close.svg"
                      alt="Close"
                      width={24}
                      height={24}
                    />
                  </button>
                </DialogClose>
              </div>

              {/* Container 2: Media + title */}
              <div className="w-full rounded-[26px] border border-[#131313]/10 bg-white p-6 text-center">
                <div style={{ gap: '8px' }} className="flex flex-col">
                  {selectedPerk.thumbnail_url && (
                    <div className="mx-auto flex items-center justify-center rounded-[12px] bg-black overflow-hidden">
                      <Image
                        src={selectedPerk.thumbnail_url}
                        alt={selectedPerk.title}
                        width={127}
                        height={129}
                        className="object-cover"
                        style={{
                          width: '127px',
                          height: '129px',
                          aspectRatio: '127/129',
                        }}
                      />
                    </div>
                  )}
                  <div
                    className="title1 font-grotesk text-[#313131]"
                    style={{
                      display: 'flex',
                      padding: '8px 17px',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '8px',
                      alignSelf: 'stretch',
                      borderRadius: '24px',
                    }}
                  >
                    {selectedPerk.title}
                  </div>
                </div>
              </div>

              {/* Container 3: Details */}
              <div className="w-full rounded-[26px] border border-[#131313]/10 bg-white p-6 space-y-6 relative">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Info className="h-4 w-4" />
                    <div className="body-small uppercase font-grotesk tracking-wide">
                      Details
                    </div>
                  </div>
                  <div className="body-medium leading-relaxed text-[#4F4F4F]">
                    {selectedPerk.description?.trim() || 'Details coming soon.'}
                  </div>
                  {selectedPerk.location && !selectedPerkIsOnline && (
                    <p className="flex items-center gap-2 text-xs font-inktrap uppercase tracking-wide text-gray-500">
                      <MapPin className="h-3 w-3" />
                      <span>Location: {selectedPerk.location}</span>
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <span
                      className="inline-flex w-full items-center justify-start gap-2 rounded-full border border-[#131313]/20 bg-[#ffffff]/5 body-small font-grotesk uppercase tracking-wide"
                      style={{
                        padding: '6px 8px',
                        height: '28px',
                      }}
                    >
                      <Info className="h-3 w-3" />
                      {selectedPerk.type?.length ? selectedPerk.type : 'Reward'}
                    </span>
                    <div
                      className="inline-flex w-full items-center justify-start gap-2 rounded-full border border-[#131313]/20 bg-[#ffffff]/5 text-[#4F4F4F] body-small font-grotesk uppercase tracking-wide"
                      style={{
                        padding: '6px 8px',
                        height: '28px',
                      }}
                    >
                      {selectedPerk.location ? (
                        <>
                          <MapPin className="h-3 w-3" />
                          {selectedPerk.location}
                        </>
                      ) : (
                        <>
                          <MapPin className="h-3 w-3" />
                          Not specified
                        </>
                      )}
                    </div>
                    <div
                      className="inline-flex w-full items-center justify-start gap-2 rounded-full border border-[#131313]/20 bg-[#ffffff]/5 text-[#4F4F4F] body-small font-grotesk uppercase tracking-wide"
                      style={{
                        padding: '6px 8px',
                        height: '28px',
                      }}
                    >
                      <Clock className="h-3 w-3" />
                      {dateLabel}
                    </div>

                    {selectedPerk.website_url ? (
                      <a
                        href={selectedPerk.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-full items-center justify-between gap-2 rounded-full border bg-[#EDEDED] border-[#131313]/20 text-[#4F4F4F] body-small font-grotesk uppercase tracking-wide hover:underline"
                        style={{
                          padding: '6px 8px',
                          height: '28px',
                        }}
                      >
                        <span>View Website</span>
                        <Image
                          src="/home/arrow-right.svg"
                          alt="arrow-right"
                          width={16}
                          height={16}
                          className="w-4 h-4"
                        />
                      </a>
                    ) : (
                      <span
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#131313]/20 bg-[#ffffff]/5 text-gray-400 body-small font-grotesk uppercase tracking-wide"
                        style={{
                          padding: '6px 8px',
                          height: '28px',
                        }}
                      >
                        <ExternalLink className="h-3 w-3" />
                        View Website
                      </span>
                    )}
                  </div>
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
                    <div className="space-y-4">
                      {/* Row 1: Header */}
                      <div className="flex items-center gap-2">
                        <Image
                          src="/guidance_reward.svg"
                          alt="Guidance Reward"
                          width={16}
                          height={16}
                          className="h-4 w-4"
                        />
                        <span className="body-small font-abc-monument-regular uppercase tracking-wide text-[#313131]">
                          CLAIM
                        </span>
                      </div>

                      {/* Row 2: Instructions */}
                      <p className="body-medium text-[#4F4F4F]">
                        {codeIsClaimUrl || !hasDiscountCode
                          ? 'Click the link to claim your reward.'
                          : `Click the link and use code ${selectedDiscountCode} to claim your reward.`}
                      </p>

                      {/* Row 3: Pills */}
                      {codeIsClaimUrl || !hasDiscountCode ? (
                        /* Full width claim button when code is a URL */
                        <div className="w-full">
                          {claimUrl ? (
                            <a
                              href={claimUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex w-full items-center justify-between gap-2 rounded-full border border-[#131313]/20 bg-[#131313] px-4 py-2 body-small font-grotesk uppercase tracking-wide text-white hover:bg-[#313131] transition-colors"
                            >
                              <h4 className="text-left">Claim Reward</h4>
                              <Image
                                src="/guidance-up-right.svg"
                                alt="Up Right"
                                width={16}
                                height={16}
                                className="h-4 w-4"
                              />
                            </a>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#131313]/20 bg-gray-300 px-4 py-2 body-small font-grotesk uppercase tracking-wide text-gray-500 cursor-not-allowed"
                            >
                              <h4>Claim Reward</h4>
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
                            className="inline-flex items-center justify-between gap-2 rounded-full border font-grotesk border-[#131313]/20 bg-white px-4 py-2 body-small uppercase tracking-wide text-[#313131] hover:bg-gray-50 transition-colors flex-1"
                          >
                            <span>
                              {selectedDiscountCode?.slice(0, 20) || ''}
                            </span>
                            <Copy className="h-4 w-4" />
                          </button>

                          {/* Pill 2: Claim Reward */}
                          {claimUrl ? (
                            <a
                              href={claimUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-between gap-2 rounded-full border border-[#131313]/20 bg-[#131313] px-4 py-2 body-small font-grotesk uppercase tracking-wide text-white hover:bg-[#313131] transition-colors flex-1"
                            >
                              <span className="text-left">Claim Reward</span>
                              <Image
                                src="/guidance-up-right.svg"
                                alt="Up Right"
                                width={16}
                                height={16}
                                className="h-4 w-4"
                              />
                            </a>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#131313]/20 bg-gray-300 px-4 py-2 body-small font-grotesk uppercase tracking-wide text-gray-500 cursor-not-allowed flex-1"
                            >
                              Claim Reward
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div
                      className="absolute border-t border-solid border-[#131313]/20"
                      style={{
                        left: '-24px',
                        right: '-24px',
                      }}
                    />
                    <div style={{ height: '1px' }} />
                  </>
                )}

                <div style={{ height: '1px' }} />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 body-small font-grotesk uppercase tracking-wide text-[#7D7D7D]">
                    <Trophy className="h-4 w-4" />
                    <span>Tier Required</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#131313]/20 bg-[#131313]/5 px-4 py-2 body-small font-grotesk uppercase tracking-wide">
                    {address &&
                      (selectedPerkAffordable ? (
                        <Image
                          src="/tier-eligible.svg"
                          alt="Eligible"
                          width={12}
                          height={12}
                          className="h-3 w-3"
                        />
                      ) : (
                        <Image
                          src="/tier-ineligible.svg"
                          alt="Not Eligible"
                          width={12}
                          height={12}
                          className="h-3 w-3"
                        />
                      ))}
                    {tierLabel}
                  </div>
                </div>
                {selectedTierInfo && (
                  <p className="text-xs text-gray-500">
                    {selectedTierInfo.description}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleViewAllTiersClick}
                  className="flex items-center justify-center title4 gap-4 font-grotesk text-black underline-offset-4 hover:underline"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    borderBottom: '1px solid #313131',
                    marginInline: 'auto',
                  }}
                >
                  View all tiers
                  <span>
                    <Image
                      src="/arrow-right.svg"
                      alt="Arrow Right"
                      width={16}
                      height={16}
                      className="h-4 w-4 text-black dark:text-white"
                      aria-hidden="true"
                    />
                  </span>
                </button>
              </div>
            </div>
          )}
        </DialogContent>
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
