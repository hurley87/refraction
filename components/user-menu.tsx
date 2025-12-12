"use client";

import { useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { X, Globe, Trophy, User } from "lucide-react";
import Image from "next/image";
import { UserProfile } from "@/lib/supabase";

interface UserMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onEditProfile: () => void;
}

interface Challenge {
  title: string;
  description: string;
  points: number;
  url: string;
  image?: string;
}

export default function UserMenu({
  isOpen,
  onClose,
  onEditProfile,
}: UserMenuProps) {
  const { user } = usePrivy();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>({
    wallet_address: "",
    email: "",
    name: "",
    username: "",
    website: "",
    twitter_handle: "",
    towns_handle: "",
    farcaster_handle: "",
    telegram_handle: "",
    profile_picture_url: "",
  });
  const [userStats, setUserStats] = useState({
    total_points: 0,
    rank: null as number | null,
  });
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isMenuMounted, setIsMenuMounted] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  // Handle menu open/close with transitions
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setIsMenuMounted(true);
      setTimeout(() => setIsMenuVisible(true), 10);
    } else {
      document.body.style.overflow = "";
      setIsMenuVisible(false);
      const timer = setTimeout(() => setIsMenuMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const fetchProfile = useCallback(async () => {
    if (!user?.wallet?.address) return;

    try {
      const response = await fetch(
        `/api/profile?wallet_address=${user.wallet.address}`,
      );
      const data = await response.json();

      setProfile({
        wallet_address: user.wallet.address,
        email: data.email || user.email?.address || "",
        name: data.name || "",
        username: data.username || "",
        website: data.website || "",
        twitter_handle: data.twitter_handle || "",
        towns_handle: data.towns_handle || "",
        farcaster_handle: data.farcaster_handle || "",
        telegram_handle: data.telegram_handle || "",
        profile_picture_url: data.profile_picture_url || "",
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  }, [user?.wallet?.address, user?.email?.address]);

  const fetchUserStats = useCallback(async () => {
    if (!user?.wallet?.address) return;

    try {
      // Fetch user points
      const playerResponse = await fetch(
        `/api/player?walletAddress=${encodeURIComponent(user.wallet.address)}`,
      );
      if (playerResponse.ok) {
        const playerData = await playerResponse.json();
        const totalPoints = playerData.player?.total_points || 0;

        // Fetch user rank
        const rankResponse = await fetch(
          `/api/player/rank?walletAddress=${encodeURIComponent(user.wallet.address)}`,
        );
        let rank = null;
        if (rankResponse.ok) {
          const rankData = await rankResponse.json();
          rank = rankData.rank || null;
        }

        setUserStats({
          total_points: totalPoints,
          rank,
        });
      }
    } catch (error) {
      console.error("Error fetching user stats:", error);
    }
  }, [user?.wallet?.address]);

  const fetchChallenges = useCallback(async () => {
    try {
      const response = await fetch("/data/challenges/quest-items.json");
      if (response.ok) {
        const data = await response.json();
        // Limit to first 5 challenges for horizontal scroll
        setChallenges(data.slice(0, 5));
      }
    } catch (error) {
      console.error("Error fetching challenges:", error);
    }
  }, []);

  // Fetch data when menu opens
  useEffect(() => {
    if (isOpen && user?.wallet?.address) {
      Promise.all([
        fetchProfile(),
        fetchUserStats(),
        fetchChallenges(),
      ]);
    }
  }, [isOpen, user?.wallet?.address, fetchProfile, fetchUserStats, fetchChallenges]);

  if (!user || !isMenuMounted) return null;

  const handleLeaderboardClick = () => {
    onClose();
    router.push("/leaderboard");
  };

  const handleChallengesClick = () => {
    onClose();
    router.push("/challenges");
  };

  const handleWebsiteClick = () => {
    if (profile.website) {
      const url = profile.website.startsWith("http")
        ? profile.website
        : `https://${profile.website}`;
      window.open(url, "_blank");
    }
  };

  const getSocialUrl = (platform: string, handle: string) => {
    if (!handle) return null;
    const handleClean = handle.replace(/^@/, "");
    switch (platform) {
      case "twitter":
        return `https://twitter.com/${handleClean}`;
      case "farcaster":
        return `https://warpcast.com/${handleClean}`;
      case "telegram":
        return `https://t.me/${handleClean}`;
      case "towns":
        return `https://towns.com/${handleClean}`;
      default:
        return null;
    }
  };

  return (
    <div
      className={`fixed font-inktrap inset-0 bg-[#ededed] z-50 flex flex-col transition-all duration-300 ease-in-out ${
        isMenuVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="max-w-lg mx-auto w-full flex flex-col h-full">
        {/* Section 1: Close Button */}
        <div className="w-full p-4">
          <div className="bg-white rounded-3xl">
            <button
              onClick={onClose}
              className="w-full text-black h-10 rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center"
              aria-label="Close menu"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col justify-start px-4 pb-4 gap-2 min-h-0 overflow-y-auto">
          <div className="w-full bg-white overflow-y-auto rounded-3xl border border-gray-200 p-4 flex-1">
            {/* Section 2: User Info */}
            <div className="w-full flex flex-col items-center space-y-4 mb-6">
              {/* Row 1: Avatar */}
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {profile.profile_picture_url ? (
                    <img
                      src={profile.profile_picture_url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                      <span className="text-gray-600 text-2xl font-medium">
                        {(profile.name || profile.username)
                          ? (profile.name || profile.username)!
                              .charAt(0)
                              .toUpperCase()
                          : "?"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: Username */}
              <div className="text-black body-large font-medium">
                @{profile.username || "username"}
              </div>

              {/* Row 3: Edit Profile Button */}
              <button
                onClick={() => {
                  onClose();
                  onEditProfile();
                }}
                className="bg-[#ededed] text-black hover:bg-gray-200 transition-colors flex items-center justify-center h-10 px-6 rounded-full body-small uppercase"
              >
                Edit Profile
              </button>
            </div>

            {/* Section 3: Points and Rank */}
            <div className="w-full space-y-4 mb-6">
              {/* Row 1: POINTS Header */}
              <div className="flex items-center gap-2">
                <Image
                  src="/ep_coin.svg"
                  alt="Points"
                  width={20}
                  height={20}
                  className="object-contain"
                />
                <div className="text-black body-small uppercase">POINTS</div>
              </div>

              {/* Row 2: User Points */}
              <div className="flex items-center gap-2">
                <span className="text-black body-large font-medium">
                  {userStats.total_points.toLocaleString()}
                </span>
                <Image
                  src="/pts.svg"
                  alt="pts"
                  width={33}
                  height={18}
                  className="object-contain"
                />
              </div>

              {/* Row 3: Solid Line Separator */}
              <div className="w-full h-px bg-gray-300"></div>

              {/* Row 4: RANK Header */}
              <div className="flex items-center gap-2">
                <Trophy size={20} className="text-black" />
                <div className="text-black body-small uppercase">RANK</div>
              </div>

              {/* Row 5: User Rank */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-black body-large font-medium">
                    {userStats.rank
                      ? `#${userStats.rank}`
                      : "Unranked"}
                  </span>
                  <Image
                    src="/place.svg"
                    alt="place"
                    width={20}
                    height={20}
                    className="object-contain"
                  />
                </div>
                <button
                  onClick={handleLeaderboardClick}
                  className="bg-[#ededed] text-black hover:bg-gray-200 transition-colors flex items-center justify-center h-8 px-4 rounded-full body-small"
                >
                  Leaderboard
                </button>
              </div>

              {/* Row 6: EARN MORE POINTS */}
              <div className="text-black body-small uppercase font-bold mt-4">
                EARN MORE POINTS
              </div>

              {/* Row 7: Horizontal Scroll of Challenges */}
              {challenges.length > 0 && (
                <div className="overflow-x-auto -mx-4 px-4 pb-2">
                  <div className="flex gap-3">
                    {challenges.map((challenge, index) => (
                      <div
                        key={index}
                        className="flex-shrink-0 w-48 bg-[#ededed] rounded-lg p-3"
                      >
                        {challenge.image && (
                          <div className="w-full h-24 bg-gray-200 rounded mb-2 overflow-hidden">
                            <img
                              src={challenge.image}
                              alt={challenge.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="text-black body-small font-medium line-clamp-2">
                          {challenge.title}
                        </div>
                        <div className="body-small text-gray-600 mt-1">
                          {challenge.points} pts
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Row 8: Challenges Button */}
              <button
                onClick={handleChallengesClick}
                className="w-full bg-[#ededed] text-black hover:bg-gray-200 transition-colors flex items-center justify-center h-10 rounded-full body-small uppercase"
              >
                Challenges
              </button>
            </div>

            {/* Section 4: Website and Social Links */}
            <div className="w-full space-y-4">
              {/* Row 1: WEBSITE Header */}
              <div className="flex items-center gap-2">
                <Globe size={20} className="text-black" />
                <div className="text-black body-small uppercase">WEBSITE</div>
              </div>

              {/* Row 2: Website Button */}
              {profile.website ? (
                <button
                  onClick={handleWebsiteClick}
                  className="w-full bg-white border border-gray-300 text-black hover:bg-gray-50 transition-colors flex items-center justify-center h-10 rounded-full body-small"
                >
                  {profile.website}
                </button>
              ) : (
                <div className="w-full bg-gray-100 text-gray-400 flex items-center justify-center h-10 rounded-full body-small">
                  No website
                </div>
              )}

              {/* Row 3: Dashed Line Separator */}
              <div className="w-full border-t border-dashed border-gray-300"></div>

              {/* Row 4: FOLLOW Header */}
              <div className="flex items-center gap-2">
                <User size={20} className="text-black" />
                <div className="text-black body-small uppercase">FOLLOW</div>
              </div>

              {/* Row 5: Social Icons */}
              <div className="flex items-center gap-3">
                {profile.twitter_handle && (
                  <a
                    href={getSocialUrl("twitter", profile.twitter_handle) || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:opacity-70 transition-opacity"
                  >
                    <Image
                      src="/images/socials/twitter.svg"
                      alt="Twitter"
                      width={24}
                      height={24}
                      className="object-contain"
                    />
                  </a>
                )}
                {profile.towns_handle && (
                  <a
                    href={getSocialUrl("towns", profile.towns_handle) || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:opacity-70 transition-opacity"
                  >
                    <Image
                      src="/logos/towns logo black.svg"
                      alt="Towns"
                      width={24}
                      height={24}
                      className="object-contain"
                    />
                  </a>
                )}
                {profile.farcaster_handle && (
                  <a
                    href={
                      getSocialUrl("farcaster", profile.farcaster_handle) || "#"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:opacity-70 transition-opacity"
                  >
                    <Image
                      src="/images/socials/farcaster.svg"
                      alt="Farcaster"
                      width={24}
                      height={24}
                      className="object-contain"
                    />
                  </a>
                )}
                {profile.telegram_handle && (
                  <a
                    href={
                      getSocialUrl("telegram", profile.telegram_handle) || "#"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:opacity-70 transition-opacity"
                  >
                    <Image
                      src="/images/socials/telegram.svg"
                      alt="Telegram"
                      width={24}
                      height={24}
                      className="object-contain"
                    />
                  </a>
                )}
                {!profile.twitter_handle &&
                  !profile.towns_handle &&
                  !profile.farcaster_handle &&
                  !profile.telegram_handle && (
                    <div className="text-gray-400 body-small">
                      No social links
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
