"use client";

import { useQuery } from "@tanstack/react-query";
// Button was unused here; removing import to satisfy lint
import { type Perk } from "@/lib/supabase";
import type { Tier } from "@/lib/types";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";

import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import {
  ExternalLink,
  Gift,
  Info,
  MapPin,
  Trophy,
  Clock,
  Copy,
} from "lucide-react";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import MapNav from "@/components/mapnav";

// Helper function to calculate time left
const getTimeLeft = (endDate: string) => {
  const now = new Date();
  const end = new Date(endDate);
  const diffMs = end.getTime() - now.getTime();

  if (diffMs <= 0) return { expired: true, text: "Expired" };

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(
    (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
  );
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffDays > 0) {
    return {
      expired: false,
      text: `${diffDays} day${diffDays !== 1 ? "s" : ""} left`,
    };
  } else if (diffHours > 0) {
    return {
      expired: false,
      text: `${diffHours} hour${diffHours !== 1 ? "s" : ""} left`,
    };
  } else if (diffMinutes > 0) {
    return { expired: false, text: `${diffMinutes} min left` };
  } else {
    return { expired: false, text: "Less than 1 min left" };
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
/*
const PerkCodeCount = ({ perkId }: { perkId: string }) => {
  const { data: availableCount = 0 } = useQuery({
    queryKey: ["available-codes", perkId],
    queryFn: async () => {
      const response = await fetch(`/api/perks/${perkId}/available-count`);
      if (!response.ok)
        throw new Error("Failed to fetch available codes count");
      const data = await response.json();
      return data.count;
    },
  });


  return (
    <span className="text-black body-small uppercase font-abc-monument-regular">
      {availableCount} codes available
    </span>
  );
};  */
export default function PerksPage() {
  const { user } = usePrivy();
  const address = user?.wallet?.address;

  // Fetch all active perks
  const { data: perks = [], isLoading: perksLoading } = useQuery({
    queryKey: ["perks"],
    queryFn: async () => {
      const response = await fetch("/api/perks?activeOnly=true");
      if (!response.ok) throw new Error("Failed to fetch perks");
      const data = await response.json();
      return data.perks;
    },
  });

  // Fetch user's points
  const { data: userStats } = useQuery({
    queryKey: ["user-stats", address],
    queryFn: async () => {
      const response = await fetch(`/api/player?walletAddress=${address}`);
      if (!response.ok) throw new Error("Failed to fetch player stats");
      const data = await response.json();
      return data.player;
    },
    enabled: !!address,
  });

  // Fetch user's redemptions
  const { data: userRedemptions = [] } = useQuery({
    queryKey: ["user-redemptions", address],
    queryFn: async () => {
      const response = await fetch(
        `/api/user/redemptions?walletAddress=${address}`,
      );
      if (!response.ok) throw new Error("Failed to fetch user redemptions");
      const data = await response.json();
      return data.redemptions;
    },
    enabled: !!address,
  });

  const userPoints = userStats?.total_points || 0;

  const canAfford = (perk: Perk) => userPoints >= perk.points_threshold;

  const hasRedeemed = (perkId: string) =>
    userRedemptions.some((redemption: any) => redemption.perk_id === perkId);

  //const queryClient = useQueryClient();
  const [selectedPerk, setSelectedPerk] = useState<Perk | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: tiers = [] } = useQuery<Tier[]>({
    queryKey: ["tiers"],
    queryFn: async () => {
      const response = await fetch("/api/tiers");
      if (!response.ok) {
        throw new Error("Failed to fetch tiers");
      }
      const data = await response.json();
      return data.tiers ?? [];
    },
  });

  const findTierForPoints = (points: number) => {
    if (!tiers.length) return null;
    return (
      tiers.find(
        (tier) =>
          points >= tier.min_points &&
          (tier.max_points === null || points < tier.max_points),
      ) ?? null
    );
  };

  const formatTierLabel = (points: number) => {
     const tier = findTierForPoints(points);
     if (!tier) {
      return "All Members";
     }

    return tier.title;
  };

  const selectedTierInfo = selectedPerk
    ? findTierForPoints(selectedPerk.points_threshold)
    : null;

  const [viewMode, setViewMode] = useState<"rewards" | "tiers">("rewards");
  const [sortOption, setSortOption] = useState<"date-desc" | "date-asc">(
    "date-desc",
  );

  const toggleSort = () => {
    setSortOption((prev) => (prev === "date-desc" ? "date-asc" : "date-desc"));
  };

  //const selectedPerkId = selectedPerk?.id;

  /* const { data: selectedAvailableCodesCount = 0 } = useQuery({
    queryKey: ["available-codes", selectedPerkId],
    queryFn: async () => {
      const response = await fetch(`/api/perks/${selectedPerkId}/available-count`);
      if (!response.ok) throw new Error("Failed to fetch available codes count");
      const data = await response.json();
      return data.count;
    },
    enabled: isModalOpen && !!selectedPerkId,
  });
 */
  const selectedPerkAffordable = selectedPerk ? (!address || canAfford(selectedPerk)) : false;

  // Fetch discount codes for the selected perk
  const { data: selectedPerkCodes = [] } = useQuery({
    queryKey: ["perk-codes", selectedPerk?.id],
    queryFn: async () => {
      if (!selectedPerk?.id) return [];
      const response = await fetch(`/api/admin/perks/${selectedPerk.id}/codes`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.codes ?? [];
    },
    enabled: !!selectedPerk?.id && isModalOpen,
  });

  // Get the first available code (or first universal code)
  const selectedDiscountCode = selectedPerkCodes.find(
    (code: any) => code.is_universal || !code.is_claimed
  )?.code || "IRL2026";

  // Check if the code is a URL
  const isCodeUrl = (str: string) => {
    try {
      const url = new URL(str);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  };

  // Determine which URL to use for claim button
  const claimUrl = isCodeUrl(selectedDiscountCode)
    ? selectedDiscountCode
    : selectedPerk?.website_url;

  const handleCopyCode = async () => {
    if (!selectedDiscountCode) return;

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(selectedDiscountCode);
        toast.success("Copied!");
        return;
      }
    } catch (error) {
      console.error(error);
    }

    if (typeof document !== "undefined") {
      const textArea = document.createElement("textarea");
      textArea.value = selectedDiscountCode;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        toast.success("Copied!");
      } catch {
        // Failed to copy
      }
      document.body.removeChild(textArea);
    }
  };
  /* const selectedPerkExpired = selectedPerk?.end_date
    ? new Date(selectedPerk.end_date) < new Date()
    : false; */
  /*const selectedPerkExpiringSoon = selectedPerk?.end_date
    ? new Date(selectedPerk.end_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    : false;*/
 // const selectedPerkRedeemed = selectedPerk?.id ? hasRedeemed(selectedPerk.id) : false;
 /*  const selectedPerkRedemption = selectedPerk
    ? userRedemptions.find((redemption: any) => redemption.perk_id === selectedPerk.id)
    : undefined; */
  /* const selectedUserDiscountCode = selectedPerkRedemption?.perk_discount_codes?.code; */
  //const noSelectedCodesAvailable = selectedAvailableCodesCount === 0;

  /* const redeemPerkMutation = useMutation({
    mutationFn: async (perkId: string) => {
      const response = await fetch("/api/perks/redeem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ perkId, walletAddress: address }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to redeem perk");
      }

      return response.json();
    },
    onSuccess: (_, perkId) => {
      toast.success(
        "Perk redeemed successfully! Your discount code is now available below.",
      );
      queryClient.invalidateQueries({ queryKey: ["user-redemptions", address] });
      queryClient.invalidateQueries({ queryKey: ["user-stats", address] });
      queryClient.invalidateQueries({ queryKey: ["available-codes", perkId] });
      queryClient.invalidateQueries({ queryKey: ["perks"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to redeem perk");
    },
  }); */

  const handleOpenPerk = (perk: Perk) => {
    setSelectedPerk(perk);
    setIsModalOpen(true);
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
    setViewMode("tiers");

    setTimeout(() => {
      const toggleElement = document.getElementById("tiers-toggle");
      if (toggleElement) {
        toggleElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 150);
  };
/* 
  const handleRedeem = () => {
    if (!selectedPerk || !selectedPerkId) return;

    if (!address) {
      toast.error("Please connect your wallet to redeem perks");
      return;
    }

    if (selectedPerkExpired) {
      toast.error("This perk has expired");
      return;
    }

    if (!selectedPerkAffordable) {
      toast.error("Insufficient points to redeem this perk");
      return;
    }

    if (selectedPerkRedeemed) {
      toast.error("You have already redeemed this perk");
      return;
    }

    if (noSelectedCodesAvailable) {
      toast.error("No codes available for this perk");
      return;
    }

    redeemPerkMutation.mutate(selectedPerkId);
  }; */

  /* const handleCopyCode = async () => {
    if (!selectedUserDiscountCode) return;

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(selectedUserDiscountCode);
        toast.success("Discount code copied to clipboard!");
        return;
      }
    } catch (error) {
      {console.error(error)}
    }

    if (typeof document !== "undefined") {
      const textArea = document.createElement("textarea");
      textArea.value = selectedUserDiscountCode;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        toast.success("Discount code copied to clipboard!");
      } catch {
        toast.error("Failed to copy code. Please copy manually.");
      }
      document.body.removeChild(textArea);
    }
  }; */

  const formatDate = (dateString?: string) => {
    if (!dateString) return undefined;
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return undefined;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  const getPerkDateRange = (perk: Perk) => {
    const startDate = formatDate(
      (perk as unknown as { start_date?: string })?.start_date,
    );
    const endDate = formatDate(perk.end_date);

    if (startDate && endDate) {
      return `${startDate} – ${endDate}`;
    }

    if (endDate) {
      return `Ends ${endDate}`;
    }

    return "Ongoing";
  };

  const getPerkEndTimestamp = (perk: Perk) => {
    if (!perk.end_date) return Number.POSITIVE_INFINITY;
    const time = new Date(perk.end_date).getTime();
    return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
  };

  const startDateRaw = selectedPerk
    ? ((selectedPerk as unknown as { start_date?: string })?.start_date ?? undefined)
    : undefined;
  const formattedStartDate = formatDate(startDateRaw);
  const formattedEndDate = formatDate(selectedPerk?.end_date);
  const dateLabel = formattedStartDate && formattedEndDate
    ? `${formattedStartDate} – ${formattedEndDate}`
    : formattedEndDate
      ? `Ends ${formattedEndDate}`
      : "Ongoing";

  //const perkType = selectedPerk?.type?.toLowerCase() ?? "";
  //const isDiscountReward = perkType === "discount";
  const selectedPerkIsOnline = selectedPerk?.location
    ? selectedPerk.location.toLowerCase().includes("online")
    : true;

  /* const claimLabel = (() => {
    if (!selectedPerk) return "Claim Reward";
    if (redeemPerkMutation.isPending) return "Redeeming...";
    if (selectedPerkRedeemed) return "✓ Redeemed";
    if (selectedPerkExpired) return "Expired";
    if (isDiscountReward && noSelectedCodesAvailable) return "Sold Out";
    if (!selectedPerkAffordable) return "Insufficient Points";
    return "Claim Reward";
  })(); */

 /*  const claimDisabled =
    !selectedPerk ||
    redeemPerkMutation.isPending ||
    selectedPerkRedeemed ||
    selectedPerkExpired ||
    (!selectedPerkAffordable) ||
    (isDiscountReward && noSelectedCodesAvailable);
 */
  const tierLabel = selectedPerk
    ? formatTierLabel(selectedPerk.points_threshold)
    : "All Members";

/*   const codesAvailabilityLabel = selectedPerk
    ? selectedCodesLoading
      ? "Checking availability..."
      : `${selectedAvailableCodesCount} ${
          selectedAvailableCodesCount === 1 ? "code" : "codes"
        } remaining`
    : ""; */

    /*
  const statusChips = [
    selectedPerk?.type && {
      label: selectedPerk.type,
      className: "bg-blue-100 text-blue-800",
    },
    selectedPerkExpiringSoon && !selectedPerkExpired
      ? { label: "Ending Soon", className: "bg-orange-100 text-orange-800" }
      : null,
    selectedPerkExpired
      ? { label: "Expired", className: "bg-red-100 text-red-800" }
      : null,
    selectedPerkRedeemed
      ? { label: "✓ Redeemed", className: "bg-green-100 text-green-800" }
      : null,
    isDiscountReward && noSelectedCodesAvailable && !selectedPerkRedeemed && !selectedPerkExpired
      ? { label: "Sold Out", className: "bg-red-100 text-red-800" }
      : null,
  ].filter(Boolean) as { label: string; className: string }[];
*/
  // Get the latest reward (most recently created or updated)
  const latestReward = perks.length > 0
    ? [...perks].sort((a, b) => {
        const aDate = a.created_at || a.updated_at || "";
        const bDate = b.created_at || b.updated_at || "";
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      })[0]
    : null;

  const sortedRewards = perks
     .filter((perk) => perk.id !== latestReward?.id)
     .sort((a, b) => {
      const aTime = getPerkEndTimestamp(a);
      const bTime = getPerkEndTimestamp(b);

      return sortOption === "date-asc" ? aTime - bTime : bTime - aTime;
     });

  const latestRewardAffordable = latestReward
    ? !address || canAfford(latestReward)
    : false;
  const latestRewardExpired =
    latestReward?.end_date &&
    new Date(latestReward.end_date) < new Date();
  const latestRewardExpiringSoon =
    latestReward?.end_date &&
    new Date(latestReward.end_date) <
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const latestRewardRedeemed = latestReward?.id
    ? hasRedeemed(latestReward.id)
    : false;

  return (
    <div
      style={{
        background:
          "var(--Gradients-Rewards-Pink, linear-gradient(0deg, rgba(0, 0, 0, 0.10) 0%, rgba(0, 0, 0, 0.10) 100%), linear-gradient(0deg, #FFE600 0%, #1BA351 36.06%, #61BFD1 65.39%, #EE91B7 100%))",
        padding: "8px",
        paddingBottom: "0",
      }}
      className="min-h-screen font-grotesk"
    >
      <div className="max-w-md mx-auto">
        {/* Status Bar with Header */}
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <MapNav />
          </div>
        </div>

        {/* Main Content */}
        <div className="px-0 pt-2 space-y-1">
          {/* LATEST REWARD Section */}
          {latestReward && !perksLoading && (
            <div className="mb-1">
              <div
                style={{
                  display: "flex",
                  padding: "24px",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "8px",
                  alignSelf: "stretch",
                  borderRadius: "26px",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  background:
                    "linear-gradient(180deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.45) 100%)",
                }}
              >
                {/* Latest Reward Title */}
                <h1 className="text-black body-small font-monument-grotesk mb-4">
                  LATEST REWARD
                </h1>

                {/* Thumbnail for Featured Reward */}
                {latestReward.thumbnail_url && (
                  <div className="w-full mb-4">
                    <Image
                      src={latestReward.hero_image || latestReward.thumbnail_url!}
                      alt={latestReward.title}
                      width={400}
                      height={203}
                      className="w-full"
                      style={{
                        height: "203px",
                        alignSelf: "stretch",
                        aspectRatio: "47/29",
                        borderRadius: "8px",
                        background: `url(${latestReward.thumbnail_url}) lightgray 50% / cover no-repeat`,
                        objectFit: "cover",
                      }}
                    />
                  </div>
                )}

                {/* Reward Title */}
                <h2 className="text-black title2 font-grotesk w-full text-left">
                  {latestReward.title}
                </h2>

                {/* Description */}
                {latestReward.description && (
                  <p className="text-[#4F4F4F] body-medium font-grotesk w-full text-left mb-4">
                    {latestReward.description.split(/[.!?]+/)[0].trim()}
                    {latestReward.description.match(/[.!?]/) ? '.' : ''}
                  </p>
                )}

                {/* Points, Location, and Date */}
                <div className="flex w-full gap-2 mb-2">
                  {/* Points Pill */}
                  <div
                    style={{
                      display: "flex",
                      padding: "6px 8px",
                      height: "28px",
                      alignItems: "center",
                      gap: "8px",
                      alignSelf: "stretch",
                      flex: "1 1 0%",
                      borderRadius: "1000px",
                      border: "1px solid #EDEDED",
                    }}
                    className="text-black body-small uppercase whitespace-nowrap font-abc-monument-regular"
                  >
                    {address && (
                      latestRewardAffordable ? (
                        <Image
                          src="/tier-eligible.svg"
                          alt="Eligible for Tier"
                          width={12}
                          height={12}
                          className="inline-block mr-1"
                        />
                      ) : (
                        <Image
                          src="/tier-ineligible.svg"
                          alt="Not Eligible for Tier"
                          width={12}
                          height={12}
                          className="inline-block mr-1"
                        />
                      )
                    )}
                    {formatTierLabel(latestReward.points_threshold).split(' ')[0]}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      padding: "6px 8px",
                      height: "28px",
                      alignItems: "center",
                      gap: "8px",
                      alignSelf: "stretch",
                      flex: "1 1 0%",
                      borderRadius: "1000px",
                      border: "1px solid #EDEDED",
                      flexWrap: "nowrap",
                    }}
                    className="text-black body-small uppercase font-abc-monument-regular"
                  >
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">{dateLabel}</span>
                  </div>

                  {/* Date/Time Left Pill */}
                  {latestReward.end_date && (
                    <div
                      style={{
                        display: "flex",
                        padding: "6px 8px",
                        height: "28px",
                        alignItems: "center",
                        gap: "8px",
                        alignSelf: "stretch",
                        flex: "1 1 0%",
                        borderRadius: "1000px",
                        border: "1px solid #EDEDED",
                      }}
                    >
                      <Clock className="w-4 h-4 stroke-[#000000]" />
                      <TimeLeft
                        endDate={latestReward.end_date}
                        className={`text-black body-small uppercase font-abc-monument-regular ${
                          latestRewardExpired
                            ? "text-red-600"
                            : latestRewardExpiringSoon
                              ? "text-orange-600"
                              : ""
                        }`}
                      />
                    </div>
                  )}

                  {/* View Details Button Pill */}
                  { latestRewardAffordable && (
                    <button
                      type="button"
                      onClick={() => handleOpenPerk(latestReward)}
                      disabled={latestRewardExpired}
                      style={{
                        display: "flex",
                        padding: "6px 8px",
                        height: "28px",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "8px",
                        alignSelf: "stretch",
                        flex: "1 1 0%",
                        borderRadius: "1000px",
                        border: "1px solid #EDEDED",
                        background: "transparent",
                        cursor: latestRewardExpired ? "not-allowed" : "pointer",
                        opacity: latestRewardExpired ? 0.5 : 1,
                      }}
                      className="text-black body-small uppercase font-abc-monument-regular hover:bg-gray-50 transition-colors"
                    >
                     <span>Details</span>
                      <Image
                        src="/home/arrow-right.svg"
                        alt="arrow-right"
                        width={16}
                        height={16}
                        className="w-4 h-4 flex-shrink-0"
                      />
                    </button>
                  )}
                </div>

                {/* View Details Button or Eligibility Message */}
                {address ? (
                  latestRewardAffordable ? (
                    <button
                      onClick={() => handleOpenPerk(latestReward)}
                      className={`w-full text-black font-bold hover:bg-gray-100 transition-colors ${
                        latestRewardRedeemed
                          ? "bg-green-100"
                          : latestRewardExpired
                            ? "opacity-50"
                            : ""
                      }`}
                      style={{
                        display: "flex",
                        height: "40px",
                        padding: "8px 8px 8px 16px",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flex: "1 0 0",
                        borderRadius: "100px",
                        background: "#EDEDED",
                      }}
                      disabled={latestRewardExpired}
                    >
                      <h4 className="font-pleasure text-left">
                        {latestRewardRedeemed
                          ? "✓ Redeemed"
                          : latestRewardExpired
                            ? "Expired"
                            : "Claim Reward"}
                      </h4>
                      <div>
                        <Image
                          src="/arrow-diag-right.svg"
                          alt="arrow-right"
                          width={20}
                          height={20}
                          className="w-5 h-5"
                        />
                      </div>
                    </button>
                  ) : (
                    <div className="w-full rounded-full bg-white/80 py-3 px-4 text-center">
                      <p className="text-black body-small font-abc-monument-regular">
                        You don&apos;t have the required points to claim this. Come back when you reach the{" "}
                        <span className="font-bold">
                          {formatTierLabel(latestReward.points_threshold)}
                        </span>{" "}
                        level.
                      </p>
                    </div>
                  )
                ) : (
                  <button
                    onClick={() => handleOpenPerk(latestReward)}
                    className="w-full h-[40px] bg-white text-black font-bold rounded-full px-4 hover:bg-gray-100 transition-colors flex items-center justify-between"
                  >
                    <h4 className="font-pleasure text-left">View Details</h4>
                    <div
                      style={{
                        display: "flex",
                        width: "24px",
                        height: "24px",
                        justifyContent: "center",
                        alignItems: "center",
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
                    display: "flex",
                    padding: "16px",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: "8px",
                    alignSelf: "stretch",
                    borderRadius: "26px",
                    border: "1px solid #EDEDED",
                    background: "#FFF",
                    boxShadow: "0 1px 8px 0 rgba(0, 0, 0, 0.08)",
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
                className="mb-6 flex w-full items-center"
                style={{ gap: "8px", height: "40px" }}
                id="tiers-toggle"
              >
              <div className="flex flex-1 items-center gap-2 rounded-full bg-white/20 p-1 backdrop-blur-sm">
                {[
                  { label: "Rewards", value: "rewards" as const },
                  { label: "Tiers", value: "tiers" as const },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setViewMode(option.value)}
                    className={` transition-all duration-200 ${
                      viewMode === option.value
                        ? "text-black"
                        : "text-gray-600 hover:text-black"
                    }`}
                    style={
                      viewMode === option.value
                        ? {
                            display: "flex",
                            height: "40px",
                            padding: "4px 0",
                            justifyContent: "center",
                            alignItems: "center",
                            gap: "8px",
                            flex: "1 0 0",
                            borderRadius: "1000px",
                            background: "#FFF",
                            boxShadow: "0 1px 8px 0 rgba(0, 0, 0, 0.08)",
                          }
                        : {
                            display: "flex",
                            height: "40px",
                            padding: "4px 0",
                            justifyContent: "center",
                            alignItems: "center",
                            gap: "8px",
                            flex: "1 0 0",
                            borderRadius: "1000px",
                          }
                    }
                    type="button"
                  >
                    <h4>{option.label}</h4>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => toggleSort()}
                className="transition-colors duration-200 hover:bg-gray-100 cursor-pointer"
                style={{
                  display: "flex",
                  width: "40px",
                  height: "40px",
                  padding: "10px",
                  justifyContent: "center",
                  alignItems: "center",
                  borderRadius: "20px",
                  background: "#FFF",
                  boxShadow: "0 1px 8px 0 rgba(0, 0, 0, 0.08)",
                }}
                aria-label="Filter rewards"
              >
                <Image
                  src="/events/filter.svg"
                  alt="filter"
                  width={20}
                  height={20}
                  className="h-5 w-5 pointer-events-none"
                />
              </button>
            </div>
          )}

          {/* Perks List */}
          {!perksLoading && viewMode === "rewards" && (
            <div className="space-y-1">
              {perks.length > 0 ? (
                sortedRewards.map((perk) => {
                  const affordable = !address || canAfford(perk);
                  const isExpired =
                    perk.end_date && new Date(perk.end_date) < new Date();
                  const isExpiringSoon =
                    perk.end_date &&
                    new Date(perk.end_date) <
                      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                  const userRedeemed = perk.id ? hasRedeemed(perk.id) : false;

                  return (
                    <div
                      key={perk.id}
                      style={{
                        display: "flex",
                        padding: "16px",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        
                        alignSelf: "stretch",
                        borderRadius: "26px",
                        border: "1px solid #EDEDED",
                        background: "#FFF",
                        boxShadow: "0 1px 8px 0 rgba(0, 0, 0, 0.08)",
                        opacity: !affordable || isExpired ? 0.6 : 1,
                      }}
                    >
                      {/* Header */}
                      <div className="flex justify-between items-start w-full">
                        <div className="flex flex-wrap gap-2 flex-1">
                          
                          {isExpiringSoon && !isExpired && (
                            <span
                              style={{
                                display: "flex",
                                padding: "6px 8px",
                                height: "28px",
                                alignItems: "center",
                                gap: "8px",
                                borderRadius: "1000px",
                                border: "1px solid #EDEDED",
                                background: "#EDEDED",
                              }}
                              className="text-black body-small uppercase font-abc-monument-regular"
                            >
                              Ending Soon
                            </span>
                          )}
                          {isExpired && (
                            <span
                              style={{
                                display: "flex",
                                padding: "6px 8px",
                                height: "28px",
                                alignItems: "center",
                                gap: "8px",
                                borderRadius: "1000px",
                                border: "1px solid #EDEDED",
                                background: "#EDEDED",
                              }}
                              className="text-black body-small uppercase font-abc-monument-regular"
                            >
                              Expired
                            </span>
                          )}
                          {userRedeemed && (
                            <span
                              style={{
                                display: "flex",
                                padding: "6px 8px",
                                height: "28px",
                                alignItems: "center",
                                gap: "8px",
                                borderRadius: "1000px",
                                border: "1px solid #EDEDED",
                                background: "#EDEDED",
                              }}
                              className="text-black body-small uppercase font-abc-monument-regular"
                            >
                              ✓ Redeemed
                            </span>
                          )}
                        </div>
                      
                      </div>

                      {/* Thumbnail and Content */}
                      <div className="flex gap-4 w-full">
                        {/* Thumbnail */}
                        {perk.thumbnail_url && (
                          <div className="flex-shrink-0">
                            <Image
                              src={perk.thumbnail_url}
                              alt={perk.title}
                              width={69}
                              height={69}
                              className="object-cover"
                              style={{
                                width: "69px",
                                height: "69px",
                                borderRadius: "8px",
                              }}
                            />
                          </div>
                        )}

                        {/* Title and Description */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[#020303] title3 font-monument-grotesk text-left w-full">
                            {perk.title}
                          </h3>
                          <p className="text-[#7D7D7D] body-medium font-abc-monument-regular mb-4">
                            {perk.description?.split(/[.!?]+/)[0].trim()}
                            {perk.description?.match(/[.!?]/) ? '.' : ''}
                          </p>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="flex w-full mb-2" style={{ gap: "4px" }}>
                        <div
                          style={{
                            display: "flex",
                            padding: "6px 8px",
                            height: "28px",
                            alignItems: "center",
                            gap: "4px",
                            alignSelf: "stretch",
                            flex: "1 1 0%",
                            borderRadius: "1000px",
                            border: "1px solid #EDEDED",
                          }}
                          className="text-black body-small uppercase whitespace-nowrap font-abc-monument-regular"
                        >
                          {address && (
                            canAfford(perk) ? (
                              <Image
                                src="/tier-eligible.svg"
                                alt="Eligible for Tier"
                                width={12}
                                height={12}
                                className="inline-block"
                              />
                            ) : (
                              <Image
                                src="/tier-ineligible.svg"
                                alt="Not Eligible for Tier"
                                width={12}
                                height={12}
                                className="inline-block"
                              />
                            )
                          )}
                          {formatTierLabel(perk.points_threshold).split(' ')[0]}
                        </div>
                        

                        {perk.end_date && (
                          <div
                            style={{
                              display: "flex",
                              padding: "6px 8px",
                              height: "28px",
                              alignItems: "center",
                              gap: "8px",
                              alignSelf: "stretch",
                              flex: "1 1 0%",
                              borderRadius: "1000px",
                              border: "1px solid #EDEDED",
                            }}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="w-4 h-4 inline-block text-black"
                              fill="#7D7D7D"
                              viewBox="0 0 20 20"
                              stroke="#7D7D7D"
                              strokeWidth={1.5}
                              aria-hidden="true"
                            >
                              <rect
                                x="3"
                                y="4"
                                width="14"
                                height="13"
                                rx="2"
                                className="fill-transparent"
                                stroke="#7D7D7D"
                              />
                              <path
                                d="M3 8h14"
                                stroke="#7D7D7D"
                                strokeLinecap="round"
                              />
                              <path
                                d="M7 2v2M13 2v2"
                                stroke="#7D7D7D"
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className="text-black body-small uppercase font-abc-monument-regular">
                              {getPerkDateRange(perk)}
                            </span>
                          </div>
                        )}

                        <div
                          style={{
                            display: "flex",
                            flexDirection: "row",
                            padding: "6px 8px",
                            height: "28px",
                            alignItems: "center",
                            justifyContent: "flex-start",
                            gap: "8px",
                            alignSelf: "stretch",
                            flex: "1 1 0%",
                            borderRadius: "1000px",
                            border: "1px solid #EDEDED",
                            flexWrap: "nowrap",
                          }}
                          className="text-black body-small uppercase font-abc-monument-regular bg-white"
                        >
                          <Clock className="w-4 h-4 flex-shrink-0"/>
                          <span className="whitespace-nowrap">{dateLabel}</span>
                        </div>

                        {/* View Details Button */}
                        {perk.id && (
                          <button
                            type="button"
                            onClick={() => handleOpenPerk(perk)}
                            disabled={!affordable || isExpired}
                            style={{
                              display: "flex",
                              padding: "6px 8px",
                              height: "28px",
                              alignItems: "center",
                              gap: "8px",
                              flexShrink: 0,
                              borderRadius: "1000px",
                              border: "1px solid #EDEDED",
                              background: "#EDEDED",
                              cursor: (!affordable || isExpired) ? "not-allowed" : "pointer",
                              opacity: (!affordable || isExpired) ? 0.5 : 1,
                            }}
                            className="text-black body-small uppercase font-abc-monument-regular hover:bg-gray-50 transition-colors"
                            aria-label="View Details"
                          >
                            <span className="font-abc-monument-regular">
                              Details
                            </span>
                            <Image
                              src="/home/arrow-right.svg"
                              alt="arrow-right"
                              width={16}
                              height={16}
                              className="w-4 h-4"
                            />
                          </button>
                        )}
                      </div>

                      {/* Status Messages */}
                      {!affordable &&
                        address &&
                        !isExpired &&
                        !userRedeemed && (
                          <div className="text-black body-small font-abc-monument-regular mb-3">
                            Need{" "}
                            {(
                              perk.points_threshold - userPoints
                            ).toLocaleString()}{" "}
                            more points
                          </div>
                        )}

                      {/* Action Button */}
                     
                    </div>
                  );
                })
              ) : (
                <div
                  style={{
                    display: "flex",
                    padding: "16px",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                    alignSelf: "stretch",
                    borderRadius: "26px",
                    border: "1px solid #EDEDED",
                    background: "#FFF",
                    boxShadow: "0 1px 8px 0 rgba(0, 0, 0, 0.08)",
                  }}
                  className="text-center py-8"
                >
                  <Gift className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-black body-small font-abc-monument-regular mb-2">
                    No perks available
                  </p>
                  <p className="text-black body-small font-abc-monument-regular">
                    Check back later for new rewards!
                  </p>
                </div>
              )}
            </div>
          )}

          {!perksLoading && viewMode === "tiers" && (
             <div className="space-y-1">
              {tiers.map((tier) => {
                const tierRange = tier.max_points
                  ? `${tier.min_points.toLocaleString()} - ${tier.max_points.toLocaleString()}`
                  : `${tier.min_points.toLocaleString()}+`;

                const tierPerks = [...perks]
                  .filter(
                    (perk) => formatTierLabel(perk.points_threshold) === tier.title,
                  )
                  .sort((a, b) =>
                    sortOption === "date-asc"
                      ? new Date(a.end_date).getTime() - new Date(b.end_date).getTime()
                      : new Date(b.end_date).getTime() - new Date(a.end_date).getTime(),
                  );

                return (
                  <div
                    key={tier.id}
                    className="shadow-sm relative"
                    style={{
                      display: "flex",
                      width: "100%",
                      padding: "16px",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: "16px",
                      borderRadius: "20px",
                      background: "#FFF",
                    }}
                  >
                    <div className="flex w-full items-center justify-between">
                      <h3 className="text-[#313131] font-pleasure text-left">
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
                        <span className="body-small text-[#313131]">{tierRange}</span>
                      </div>
                    </div>
                    <div className="body-medium text-[#7D7D7D] body-medium text-left">
                      {tier.description}
                    </div>
                    <div 
                      className="w-full border-t border-solid border-[#E2E2E2]" 
                      style={{ marginLeft: '-16px', marginRight: '-16px' }}
                    />
                    <div className="flex items-center gap-2" style={{ marginTop: "1px" }}>
                      <Image
                        src="/guidance_reward.svg"
                        alt="Guidance Reward"
                        width={16}
                        height={16}
                        style={{ width: "16", height: "16" }}
                      />
                      <div className="body-small font-grotesk text-[#7D7D7D] uppercase tracking-wide">
                        TIER REWARDS
                      </div>
                    </div>
                    {tierPerks.length > 0 ? (
                      <div className="w-full overflow-x-auto" style={{ marginTop: "-8px" }}>
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
                                   display: "flex",
                                   width: "280px",
                                   padding: "16px",
                                   flexDirection: "column",
                                   alignItems: "flex-start",
                                   gap: "12px",
                                   borderRadius: "16px",
                                   border: "1px solid #EDEDED",
                                   background: "#FFF",
                                   flexShrink: 0,
                                   boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
                                 }}
                               >
                                <div className="flex w-full items-center gap-3">
                                  {tierPerk.thumbnail_url ? (
                                    <Image
                                      src={tierPerk.thumbnail_url}
                                      alt={tierPerk.title}
                                      width={45}
                                      height={46}
                                      style={{ width: "45px", height: "46px", borderRadius: "12px", objectFit: "cover" }}
                                    />
                                  ) : (
                                    <div className="flex h-[46px] w-[45px] items-center justify-center rounded-[12px] bg-[#F4F4F4] text-[10px] uppercase tracking-wide text-[#7D7D7D]">
                                      No image
                                    </div>
                                  )}
                                  <h4 className="text-[#020303] font-pleasure line-clamp-2">
                                    {tierPerk.title}
                                  </h4>
                                </div>
                                <div className="flex w-full items-center gap-2" style={{ flexWrap: "nowrap" }}>
                                   <span className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-[#EDEDED] bg-[#ffffff] px-3 py-1 uppercase tracking-wide text-[#313131] body-small">
                                     {address && (
                                       tierPerkAffordable ? (
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
                                       )
                                     )}
                                     <div className="body-small">{formatTierLabel(tierPerk.points_threshold)}</div>
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

        <div style={{ height: "100px" }} />
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
                    display: "flex",
                    height: "48px",
                    width: "48px",
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: "9999px",
                    background: "#FFF",
                 
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
              <div style={{ gap: "8px" }} className="flex flex-col">
                 {( selectedPerk.thumbnail_url) && (
                  <div className="mx-auto flex items-center justify-center rounded-[12px] bg-black overflow-hidden">
                    <Image
                      src={selectedPerk.thumbnail_url}
                      alt={selectedPerk.title}
                      width={127}
                      height={129}
                      className="object-cover"
                      style={{
                        width: "127px",
                        height: "129px",
                        aspectRatio: "127/129",
                      }}
                    />
                  </div>
                )}
                <div 
                  className="title1 font-grotesk text-[#313131]"
                  style={{
                    display: "flex",
                    padding: "8px 17px",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "8px",
                    alignSelf: "stretch",
                    borderRadius: "24px",
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
                  {selectedPerk.description?.trim() || "Details coming soon."}
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
                      padding: "6px 8px",
                      height: "28px",
                    }}
                  >
                    <Info className="h-3 w-3" />
                    {selectedPerk.type?.length ? selectedPerk.type : "Reward"}
                  </span>
                  <div 
                    className="inline-flex w-full items-center justify-start gap-2 rounded-full border border-[#131313]/20 bg-[#ffffff]/5 text-[#4F4F4F] body-small font-grotesk uppercase tracking-wide"
                    style={{
                      padding: "6px 8px",
                      height: "28px",
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
                      padding: "6px 8px",
                      height: "28px",
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
                        padding: "6px 8px",
                        height: "28px",
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
                        padding: "6px 8px",
                        height: "28px",
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
                  left: "-24px",
                  right: "-24px"
                }} 
              />
              <div style={{ height: "1px" }} />
              
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
                      {isCodeUrl(selectedDiscountCode)
                        ? "Click the link to claim your reward."
                        : `Click the link and use code ${selectedDiscountCode} to claim your reward.`}
                    </p>

                    {/* Row 3: Pills */}
                    {isCodeUrl(selectedDiscountCode) ? (
                      /* Full width claim button when code is a URL */
                      <div className="w-full">
                        {claimUrl ? (
                          <a
                            href={claimUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex w-full items-center justify-between gap-2 rounded-full border border-[#131313]/20 bg-[#131313] px-4 py-2 body-small font-pleasure uppercase tracking-wide text-white hover:bg-[#313131] transition-colors"
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
                            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#131313]/20 bg-gray-300 px-4 py-2 body-small font-pleasure uppercase tracking-wide text-gray-500 cursor-not-allowed"
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
                          className="inline-flex items-center justify-between gap-2 rounded-full border font-pleasure border-[#131313]/20 bg-white px-4 py-2 body-small uppercase tracking-wide text-[#313131] hover:bg-gray-50 transition-colors flex-1"
                        >
                          <span>{selectedDiscountCode?.slice(0, 20) || ""}</span>
                          <Copy className="h-4 w-4" />
                        </button>

                        {/* Pill 2: Claim Reward */}
                        {claimUrl ? (
                          <a
                            href={claimUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-between gap-2 rounded-full border border-[#131313]/20 bg-[#131313] px-4 py-2 body-small font-pleasure uppercase tracking-wide text-white hover:bg-[#313131] transition-colors flex-1"
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
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#131313]/20 bg-gray-300 px-4 py-2 body-small font-pleasure uppercase tracking-wide text-gray-500 cursor-not-allowed flex-1"
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
                      left: "-24px",
                      right: "-24px"
                    }} 
                  />
                  <div style={{ height: "1px" }} />
                </>
              )}

            
              <div style={{ height: "1px" }} />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 body-small font-grotesk uppercase tracking-wide text-[#7D7D7D]">
                  <Trophy className="h-4 w-4" />
                  <span>Tier Required</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#131313]/20 bg-[#131313]/5 px-4 py-2 body-small font-grotesk uppercase tracking-wide">
                  {address && (
                    selectedPerkAffordable ? (
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
                    )
                  )}
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
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  borderBottom: "1px solid #313131",
                  marginInline: "auto",
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
