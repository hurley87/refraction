"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// Button was unused here; removing import to satisfy lint
import { type Perk } from "@/lib/supabase";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import {
  ExternalLink,
  Gift,
  Info,
  MapPin,
  Trophy,
  Copy,
  X,
  Award,
} from "lucide-react";

import { useState, useEffect } from "react";
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
};

export default function PerksPage() {
  const { user, login } = usePrivy();
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

  const queryClient = useQueryClient();
  const [selectedPerk, setSelectedPerk] = useState<Perk | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const selectedPerkId = selectedPerk?.id;

  const { data: selectedAvailableCodesCount = 0, isLoading: selectedCodesLoading } = useQuery({
    queryKey: ["available-codes", selectedPerkId],
    queryFn: async () => {
      const response = await fetch(`/api/perks/${selectedPerkId}/available-count`);
      if (!response.ok) throw new Error("Failed to fetch available codes count");
      const data = await response.json();
      return data.count;
    },
    enabled: isModalOpen && !!selectedPerkId,
  });

  const selectedPerkAffordable = selectedPerk ? (!address || canAfford(selectedPerk)) : false;
  const selectedPerkExpired = selectedPerk?.end_date
    ? new Date(selectedPerk.end_date) < new Date()
    : false;
  /*const selectedPerkExpiringSoon = selectedPerk?.end_date
    ? new Date(selectedPerk.end_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    : false;*/
  const selectedPerkRedeemed = selectedPerk?.id ? hasRedeemed(selectedPerk.id) : false;
  const selectedPerkRedemption = selectedPerk
    ? userRedemptions.find((redemption: any) => redemption.perk_id === selectedPerk.id)
    : undefined;
  const selectedUserDiscountCode = selectedPerkRedemption?.perk_discount_codes?.code;
  const noSelectedCodesAvailable = selectedAvailableCodesCount === 0;

  const redeemPerkMutation = useMutation({
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
  });

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
  };

  const handleCopyCode = async () => {
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
  };

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

  const perkType = selectedPerk?.type?.toLowerCase() ?? "";
  const isDiscountReward = perkType === "discount";
  const selectedPerkIsOnline = selectedPerk?.location
    ? selectedPerk.location.toLowerCase().includes("online")
    : true;

  const claimLabel = (() => {
    if (!selectedPerk) return "Claim Reward";
    if (redeemPerkMutation.isPending) return "Redeeming...";
    if (selectedPerkRedeemed) return "✓ Redeemed";
    if (selectedPerkExpired) return "Expired";
    if (isDiscountReward && noSelectedCodesAvailable) return "Sold Out";
    if (!selectedPerkAffordable) return "Insufficient Points";
    return "Claim Reward";
  })();

  const claimDisabled =
    !selectedPerk ||
    redeemPerkMutation.isPending ||
    selectedPerkRedeemed ||
    selectedPerkExpired ||
    (!selectedPerkAffordable) ||
    (isDiscountReward && noSelectedCodesAvailable);

  const tierLabel = selectedPerk
    ? selectedPerk.points_threshold > 0
      ? `≥ ${selectedPerk.points_threshold.toLocaleString()} pts`
      : "All Members"
    : "All Members";

  const codesAvailabilityLabel = selectedPerk
    ? selectedCodesLoading
      ? "Checking availability..."
      : `${selectedAvailableCodesCount} ${
          selectedAvailableCodesCount === 1 ? "code" : "codes"
        } remaining`
    : "";

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
      }}
      className="min-h-screen p-4 pb-0 font-grotesk"
    >
      <div className="max-w-md mx-auto">
        {/* Status Bar with Header */}
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <MapNav />
          </div>
        </div>

        {/* Main Content */}
        <div className="px-0 pt-4 space-y-1">
          {/* LATEST REWARD Section */}
          {latestReward && !perksLoading && (
            <div className="mb-6">
              <div
                style={{
                  display: "flex",
                  padding: "16px",
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
                      src={latestReward.thumbnail_url}
                      alt={latestReward.title}
                      width={400}
                      height={300}
                      className="w-full h-auto rounded-2xl object-contain"
                      style={{
                        borderRadius: "20px",
                      }}
                    />
                  </div>
                )}

                {/* Reward Title */}
                <h2 className="text-black title2 font-pleasure w-full text-left">
                  {latestReward.title}
                </h2>

                {/* Description */}
                {latestReward.description && (
                  <p className="text-black body-small font-abc-monument-regular w-full text-left mb-4">
                    {latestReward.description}
                  </p>
                )}

                {/* Points, Location, and Date */}
                <div className="flex w-full gap-2 flex-wrap">
                  {/* Points Pill */}
                  <div
                    style={{
                      display: "flex",
                      padding: "4px 8px",
                      alignItems: "center",
                      gap: "8px",
                      alignSelf: "stretch",
                      borderRadius: "1000px",
                      border: "1px solid #000000",
                    }}
                  >
                    <span className="text-black body-small uppercase font-abc-monument-regular">
                      {latestReward.points_threshold.toLocaleString()} pts
                    </span>
                  </div>

                  {/* Location Pill */}
                  {latestReward.location && (
                    <div
                      style={{
                        display: "flex",
                        padding: "4px 8px",
                        alignItems: "center",
                        gap: "8px",
                        alignSelf: "stretch",
                        borderRadius: "1000px",
                        border: "1px solid #000000",
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4 inline-block"
                        fill="#7D7D7D"
                        viewBox="0 0 20 20"
                        stroke="none"
                        aria-hidden="true"
                      >
                        <path d="M10 2C7.24 2 5 4.24 5 7c0 5.25 5 11 5 11s5-5.75 5-11c0-2.76-2.24-5-5-5zm0 7.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                      </svg>
                      <span className="flex items-center gap-1 text-black body-small uppercase font-abc-monument-regular">
                        {latestReward.location}
                      </span>
                    </div>
                  )}

                  {/* Date/Time Left Pill */}
                  {latestReward.end_date && (
                    <div
                      style={{
                        display: "flex",
                        padding: "4px 8px",
                        alignItems: "center",
                        gap: "8px",
                        alignSelf: "stretch",
                        borderRadius: "1000px",
                        border: "1px solid #000000",
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4 inline-block"
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
                </div>

                {/* View Details Button */}
                <button
                  onClick={() => handleOpenPerk(latestReward)}
                  className={`w-full bg-white text-black font-bold rounded-full py-3 px-4 hover:bg-gray-100 transition-colors flex items-center justify-between ${
                    latestRewardRedeemed
                      ? "bg-green-100"
                      : !latestRewardAffordable || latestRewardExpired
                        ? "opacity-50"
                        : ""
                  }`}
                  disabled={!latestRewardAffordable || latestRewardExpired}
                >
                  <span className="font-pleasure text-left">
                    {latestRewardRedeemed
                      ? "✓ Redeemed"
                      : latestRewardExpired
                        ? "Expired"
                        : latestRewardAffordable
                          ? "View Details"
                          : "Insufficient Points"}
                  </span>
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

          {/* Perks List */}
          {!perksLoading && (
            <div className="space-y-1">
              {perks.length > 0 ? (
                perks
                  .filter((perk) => perk.id !== latestReward?.id)
                  .map((perk) => {
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
                        gap: "8px",
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
                          <span
                            style={{
                              display: "flex",
                              padding: "4px 8px",
                              alignItems: "center",
                              gap: "8px",
                              borderRadius: "1000px",
                              border: "1px solid #EDEDED",
                              background: "#EDEDED",
                            }}
                            className="text-black body-small uppercase font-abc-monument-regular"
                          >
                            {perk.type}
                          </span>
                          {isExpiringSoon && !isExpired && (
                            <span
                              style={{
                                display: "flex",
                                padding: "4px 8px",
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
                                padding: "4px 8px",
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
                                padding: "4px 8px",
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
                        <div className="text-right">
                          <span className="text-black title3 font-pleasure">
                            {perk.points_threshold.toLocaleString()}
                          </span>
                          <span className="text-black body-small font-abc-monument-regular ml-1">
                            pts
                          </span>
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
                              width={120}
                              height={120}
                              className="rounded-xl object-cover"
                              style={{
                                width: "120px",
                                height: "120px",
                                borderRadius: "16px",
                              }}
                            />
                          </div>
                        )}

                        {/* Title and Description */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-black title3 font-pleasure text-left w-full">
                            {perk.title}
                          </h3>
                          <p className="text-black body-small font-abc-monument-regular mb-4 line-clamp-2">
                            {perk.description}
                          </p>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="flex w-full gap-2 mb-4 flex-wrap">
                        {perk.location && (
                          <div
                            style={{
                              display: "flex",
                              padding: "4px 8px",
                              alignItems: "center",
                              gap: "8px",
                              alignSelf: "stretch",
                              borderRadius: "1000px",
                              border: "1px solid #EDEDED",
                            }}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="w-4 h-4 text-black inline-block"
                              fill="none"
                              viewBox="0 0 20 20"
                              stroke="#7D7D7D"
                              strokeWidth={1.5}
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M10 18s6-5.686 6-10A6 6 0 1 0 4 8c0 4.314 6 10 6 10Z"
                                className="stroke-current"
                              />
                              <circle
                                cx="10"
                                cy="8"
                                r="2.25"
                                className="stroke-current"
                                strokeWidth={1.5}
                              />
                            </svg>
                            <span className="text-black body-small uppercase font-abc-monument-regular">
                              {perk.location}
                            </span>
                          </div>
                        )}

                        {perk.end_date && (
                          <div
                            style={{
                              display: "flex",
                              padding: "4px 8px",
                              alignItems: "center",
                              gap: "8px",
                              alignSelf: "stretch",
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
                            <TimeLeft
                              endDate={perk.end_date}
                              className={`text-black body-small uppercase font-abc-monument-regular ${
                                isExpired
                                  ? "text-red-600"
                                  : isExpiringSoon
                                    ? "text-orange-600"
                                    : ""
                              }`}
                            />
                          </div>
                        )}

                        {perk.website_url && (
                          <a
                            href={perk.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "flex",
                              padding: "4px 8px",
                              alignItems: "center",
                              gap: "8px",
                              alignSelf: "stretch",
                              borderRadius: "1000px",
                              border: "1px solid #EDEDED",
                            }}
                            className="text-black body-small uppercase font-abc-monument-regular hover:bg-gray-50"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Visit Website
                          </a>
                        )}

                        {perk.id && (
                          <div
                            style={{
                              display: "flex",
                              padding: "4px 8px",
                              alignItems: "center",
                              gap: "8px",
                              alignSelf: "stretch",
                              borderRadius: "1000px",
                              border: "1px solid #EDEDED",
                            }}
                          >
                            <PerkCodeCount perkId={perk.id} />
                          </div>
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
                      <button
                        onClick={() => handleOpenPerk(perk)}
                        className={`w-full bg-[#EDEDED] text-black font-bold rounded-full py-3 px-4 hover:bg-gray-100 transition-colors flex items-center justify-between ${
                          userRedeemed
                            ? "bg-green-100"
                            : !affordable || isExpired
                              ? "opacity-50"
                              : ""
                        }`}
                        disabled={!affordable || isExpired}
                      >
                        <span className="font-pleasure text-left">
                          {userRedeemed
                            ? "✓ Redeemed"
                            : isExpired
                              ? "Expired"
                              : affordable
                                ? "View Details"
                                : "Insufficient Points"}
                        </span>
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
        </div>

        <div style={{ height: "100px" }} />
      </div>

    <Dialog open={isModalOpen} onOpenChange={handleModalOpenChange}>
      <DialogContent className="w-full max-w-lg border-none bg-transparent p-0 shadow-none [&>button]:hidden">
        {selectedPerk && (
          <div className="max-h-[90vh] overflow-y-auto space-y-4">
            {/* Container 1: Close */}
            <div className="w-full rounded-3xl border border-[#131313]/10 bg-white px-4 py-3">
              <DialogClose asChild>
                <button className="mx-auto text-black">
                  <span className="sr-only">Close</span>
                  <X className="h-5 w-5" />
                </button>
              </DialogClose>
            </div>

            {/* Container 2: Media + title */}
            <div className="w-full rounded-3xl border border-[#131313]/10 bg-white p-6 text-center">
              <div className="space-y-4">
                {selectedPerk.thumbnail_url && (
                  <div className="mx-auto flex h-[166px] w-[332px] flex-col items-center justify-center gap-4 rounded-[12px] bg-black">
                    <Image
                      src={selectedPerk.thumbnail_url}
                      alt={selectedPerk.title}
                      width={240}
                      height={120}
                      className="h-auto w-full max-w-[220px] rounded-[10px] object-contain"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <div className="title1 font-grotesk text-black">
                    {selectedPerk.title}
                  </div>
                  
                </div>
              
              </div>
            </div>

            {/* Container 3: Details */}
            <div className="w-full rounded-3xl border border-[#131313]/10 bg-white p-6 space-y-6">
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
                  <span className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#131313]/20 bg-[#131313]/5 px-4 py-2 body-small font-grotesk uppercase tracking-wide">
                    
                    {selectedPerk.type?.length ? selectedPerk.type : "Reward"}
                  </span>
                  <span className="inline-flex w-full items-center justify-center rounded-full border border-[#131313]/20 bg-[#131313]/5 px-4 py-2 body-small font-grotesk uppercase tracking-wide">
                    {selectedPerkIsOnline ? "Online" : "IRL"}
                  </span>
                  <div className="inline-flex w-full items-center justify-center rounded-full border border-[#131313]/20 bg-[#131313]/5 px-4 py-2 text-[#4F4F4F] body-small font-grotesk uppercase tracking-wide">
                    {dateLabel}
                  </div>
                  {selectedPerk.website_url ? (
                    <a
                      href={selectedPerk.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#131313]/20 px-4 py-2 text-[#4F4F4F] body-small font-grotesk uppercase tracking-widehover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View Website
                    </a>
                  ) : (
                    <span className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#131313]/20 px-4 py-2 text-xs font-inktrap uppercase tracking-wide text-gray-400">
                      <ExternalLink className="h-3 w-3" />
                      View Website
                    </span>
                  )}
                </div>
              </div>

              <div className="border-t border-dashed border-[#131313]/20" />
                  <div className="flex items-center gap-2 text-gray-600">
                  <Award className="h-4 w-4" />
                  <div className="body-small uppercase font-grotesk tracking-wide">
                    Claim
                  </div>
                </div>
              <div className="space-y-4">
                {!address ? (
                  <button
                    onClick={login}
                    className="w-full rounded-full border border-[#131313] bg-[#131313] py-3 text-sm font-inktrap font-medium uppercase tracking-wide text-white transition hover:bg-black/90"
                  >
                    Connect Wallet to Claim
                  </button>
                ) : isDiscountReward ? (
                  <div className="flex flex-col gap-3">
                    <div
                      className={`flex items-center justify-between rounded-full border px-4 py-3 font-inktrap text-sm uppercase tracking-wide ${
                        selectedPerkRedeemed && selectedUserDiscountCode
                          ? "border-green-200 bg-green-50 text-green-800"
                          : "border-[#131313]/20 bg-[#131313]/5 text-gray-500"
                      }`}
                    >
                      <span>
                        {selectedPerkRedeemed && selectedUserDiscountCode
                          ? selectedUserDiscountCode
                          : "Redeem to unlock"}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        disabled={!selectedPerkRedeemed || !selectedUserDiscountCode}
                        className={`rounded-full p-2 transition ${
                          selectedPerkRedeemed && selectedUserDiscountCode
                            ? "hover:bg-white/60"
                            : "opacity-40 cursor-not-allowed"
                        }`}
                      >
                        <Copy className="h-4 w-4" />
                        <span className="sr-only">Copy discount code</span>
                      </button>
                    </div>
                    {codesAvailabilityLabel && (
                      <p className="text-xs font-inktrap text-gray-500">
                        {codesAvailabilityLabel}
                      </p>
                    )}
                    <button
                      onClick={handleRedeem}
                      disabled={claimDisabled}
                      className={`rounded-full py-3 text-sm font-inktrap font-medium uppercase tracking-wide transition ${
                        claimDisabled
                          ? "border border-gray-200 bg-gray-100 text-gray-400"
                          : "border border-[#131313] bg-[#131313] text-white hover:bg-black/90"
                      }`}
                    >
                      {claimLabel}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleRedeem}
                    disabled={claimDisabled}
                    className={`w-full rounded-full py-3 text-sm font-inktrap font-medium uppercase tracking-wide transition ${
                      claimDisabled
                        ? "border border-gray-200 bg-gray-100 text-gray-400"
                        : "border border-[#131313] bg-[#131313] text-white hover:bg-black/90"
                    }`}
                  >
                    {claimLabel}
                  </button>
                )}
              </div>

              <div className="border-t border-dashed border-[#131313]/20" />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-inktrap uppercase tracking-wide text-gray-600">
                    <Trophy className="h-4 w-4" />
                    <span>Tier Required</span>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#131313]/20 bg-[#131313]/5 px-3 py-2 text-xs font-inktrap uppercase tracking-wide">
                    {tierLabel}
                  </span>
                </div>
                <a
                  href="/membership"
                  className="flex items-center gap-2 text-sm font-inktrap text-[#131313] underline-offset-4 hover:underline"
                >
                  View all tiers
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  </div>
);
}
