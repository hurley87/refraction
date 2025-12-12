"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { X, Clock } from "lucide-react";
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
  dateRange?: string;
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
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingUserStats, setIsLoadingUserStats] = useState(false);
  const [isLoadingChallenges, setIsLoadingChallenges] = useState(false);
  const scrollableContentRef = useRef<HTMLDivElement>(null);

  // Handle menu open/close with transitions
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      // Prevent scrolling
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
      
      setIsMenuMounted(true);
      setTimeout(() => {
        setIsMenuVisible(true);
        // Scroll content to top when menu opens
        if (scrollableContentRef.current) {
          scrollableContentRef.current.scrollTop = 0;
        }
      }, 10);
      
      return () => {
        // Restore scrolling
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        document.body.style.overflow = "";
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    } else {
      setIsMenuVisible(false);
      const timer = setTimeout(() => setIsMenuMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const fetchProfile = useCallback(async () => {
    if (!user?.wallet?.address) return;

    setIsLoadingProfile(true);
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
    } finally {
      setIsLoadingProfile(false);
    }
  }, [user?.wallet?.address, user?.email?.address]);

  const fetchUserStats = useCallback(async () => {
    if (!user?.wallet?.address) return;

    setIsLoadingUserStats(true);
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
    } finally {
      setIsLoadingUserStats(false);
    }
  }, [user?.wallet?.address]);

  const fetchChallenges = useCallback(async () => {
    setIsLoadingChallenges(true);
    try {
      const response = await fetch("/data/challenges/quest-items.json");
      if (response.ok) {
        const data = await response.json();
        // Limit to first 5 challenges for horizontal scroll
        setChallenges(data.slice(0, 5));
      }
    } catch (error) {
      console.error("Error fetching challenges:", error);
    } finally {
      setIsLoadingChallenges(false);
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

  // Helper function to get ordinal suffix
  const getOrdinalSuffix = (num: number): string => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) {
      return "st";
    }
    if (j === 2 && k !== 12) {
      return "nd";
    }
    if (j === 3 && k !== 13) {
      return "rd";
    }
    return "th";
  };

  return (
    <div
      className={`fixed font-inktrap inset-0 bg-[#7d7d7d] z-50 flex flex-col transition-all duration-300 ease-in-out ${
        isMenuVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="max-w-lg mx-auto w-full flex flex-col h-full">
        {/* Section 1: Close Button */}
        <div className="w-full pt-4 px-4 pb-1">
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
        <div ref={scrollableContentRef} className="flex-1 flex flex-col justify-start px-4 pb-2 gap-1 min-h-0 overflow-y-auto">
          {/* Section 2: User Info */}
          <div className="w-full bg-white rounded-3xl border border-gray-200 p-4 flex flex-col items-center space-y-4">
            {/* Row 1: Avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {isLoadingProfile ? (
                  <div className="w-full h-full bg-gray-300 animate-pulse"></div>
                ) : profile.profile_picture_url ? (
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
            {isLoadingProfile ? (
              <div className="w-32 h-6 bg-gray-200 animate-pulse rounded"></div>
            ) : (
              <div className="text-black body-large font-medium">
                @{profile.username || "username"}
              </div>
            )}

            {/* Row 3: Edit Profile Button */}
            <button
              onClick={() => {
                onClose();
                onEditProfile();
              }}
              className="w-full h-[40px] bg-[#EDEDED] hover:bg-gray-100 text-[#313131] px-4 rounded-full font-pleasure transition-colors duration-200 flex items-center justify-between"
            >
              <h4>Edit Profile</h4>
              <Image
                src="/home/arrow-right.svg"
                alt="arrow"
                width={21}
                height={21}
                className="w-[21px] h-[21px]"
              />
            </button>
          </div>

          {/* Section 3: Points and Rank */}
          <div className="w-full bg-white rounded-[26px] p-4">
            <div className="flex flex-col gap-4">
              {/* Points Section */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Image
                    src="/ep_coin.svg"
                    alt="Points"
                    width={12}
                    height={12}
                    className="w-4 h-4"
                  />
                  <div className="body-small font-grotesk text-[#7d7d7d] uppercase tracking-wide">
                    Points
                  </div>
                </div>
                <div className="flex justify-start">
                  {isLoadingUserStats ? (
                    <div className="w-24 h-10 bg-gray-200 animate-pulse rounded"></div>
                  ) : (
                    <div className="flex items-end gap-2">
                      <div className="display1 text-[#313131] font-inktrap">
                        {userStats.total_points.toLocaleString()}
                      </div>
                      <Image
                        src="/pts.svg"
                        alt="points"
                        width={39}
                        height={18}
                        className="mb-1"
                        style={{ width: "auto", height: "auto" }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Solid Line Separator */}
            <div className="h-px bg-gray-300 my-4" style={{ marginLeft: '-1rem', marginRight: '-1rem', width: 'calc(100% + 2rem)' }}></div>

            {/* Rank Section */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Image
                  src="/leaderboard.svg"
                  alt="Place"
                  width={12}
                  height={12}
                  className="w-4 h-4"
                />
                <div className="body-small font-grotesk text-[#7D7D7D] uppercase tracking-wide">
                  Rank
                </div>
              </div>
              <div className="flex items-center justify-between">
                {isLoadingUserStats ? (
                  <div className="w-20 h-8 bg-gray-200 animate-pulse rounded"></div>
                ) : userStats.rank ? (
                  <div className="flex items-end gap-2">
                    <div className="flex items-baseline">
                      <div className="display2 text-[#313131] font-inktrap">
                        {userStats.rank}
                      </div>
                      <h4 className="text-[#313131] font-inktrap font-normal">
                        {getOrdinalSuffix(userStats.rank)}
                      </h4>
                    </div>
                    <div className="w-auto h-auto">
                      <Image
                        src="/place-grey.svg"
                        alt="Place"
                        width={39}
                        height={18}
                        className="mb-1"
                        style={{ width: "auto", height: "auto" }}
                      />
                    </div>
                  </div>
                ) : (
                  <span className="display2 text-[#313131]">?</span>
                )}
                <button
                  onClick={handleLeaderboardClick}
                  className="bg-[#ededed] text-black hover:bg-gray-200 uppercase transition-colors flex items-center justify-between h-8 px-4 rounded-full body-small"
                >
                  Leaderboard
                  <Image
                    src="/home/arrow-right.svg"
                    alt="arrow-right"
                    width={24}
                    height={24}
                    className="w-6 h-6"
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Section 4: Earn More Points */}
          <div className="w-full bg-[#EDEDED] rounded-[26px] p-4">
            <div className="w-full space-y-4">
              {/* Row 1: EARN MORE POINTS */}
              <div className="text-black body-small uppercase font-bold">
                EARN MORE POINTS
              </div>

              {/* Row 2: Horizontal Scroll of Challenges */}
              {isLoadingChallenges ? (
                <div className="overflow-x-auto -mx-4 px-4 pb-2">
                  <div className="flex gap-4">
                    {[...Array(3)].map((_, index) => (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          width: "278px",
                          padding: "24px",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          gap: "8px",
                          borderRadius: "26px",
                          border: "1px solid #EDEDED",
                          background: "#FFF",
                          boxShadow: "0 1px 8px 0 rgba(0, 0, 0, 0.08)",
                          flexShrink: 0,
                        }}
                      >
                        <div className="w-full h-6 bg-gray-200 animate-pulse rounded"></div>
                        <div className="w-full h-4 bg-gray-200 animate-pulse rounded"></div>
                        <div className="w-full h-4 bg-gray-200 animate-pulse rounded mt-2"></div>
                        <div className="w-full h-7 bg-gray-200 animate-pulse rounded mt-auto"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : challenges.length > 0 ? (
                <div className="overflow-x-auto -mx-4 px-4 pb-2">
                  <div className="flex gap-4">
                    {challenges.map((challenge, index) => (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          width: "278px",
                          padding: "24px",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          gap: "8px",
                          borderRadius: "26px",
                          border: "1px solid #EDEDED",
                          background: "#FFF",
                          boxShadow: "0 1px 8px 0 rgba(0, 0, 0, 0.08)",
                          flexShrink: 0,
                        }}
                      >
                        {/* Title */}
                        <div className="title2 text-[#313131]">{challenge.title}</div>

                        {/* Description */}
                        <div className="text-[#4F4F4F] body-medium">
                          {challenge.description}
                        </div>

                        {/* Points and Date Range Pills */}
                        <div className="flex gap-1 w-full mt-auto">
                          {/* Points */}
                          <div 
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              height: '28px',
                              backgroundColor: 'transparent',
                              borderRadius: '16px',
                              padding: '6px 8px',
                              border: '1px solid #e0e0e0',
                              flex: 1
                            }}
                          >
                            <Image
                              src="/ep_coin.svg"
                              alt="coin"
                              width={16}
                              height={16}
                              className="w-4 h-4"
                            />
                            <div className="body-small text-black">{challenge.points}</div>
                          </div>

                          {/* Date Range */}
                          {challenge.dateRange ? (
                            <div 
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                height: '28px',
                                backgroundColor: 'transparent',
                                borderRadius: '16px',
                                padding: '6px 8px',
                                border: '1px solid #e0e0e0',
                                flex: 1
                              }}
                            >
                              <Clock className="w-3 h-3 text-gray-600 flex-shrink-0" />
                              <div className="body-small text-black whitespace-nowrap">{challenge.dateRange}</div>
                            </div>
                          ) : (
                            <div 
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                height: '28px',
                                backgroundColor: 'transparent',
                                borderRadius: '16px',
                                padding: '6px 8px',
                                border: '1px solid #e0e0e0',
                                flex: 1
                              }}
                            >
                              <div className="body-small text-black"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Row 3: Challenges Button */}
              <button
                onClick={handleChallengesClick}
                className="w-full h-[40px] bg-white hover:bg-gray-100 text-[#313131] px-4 rounded-full font-pleasure transition-colors duration-200 flex items-center justify-between"
              >
                <h4>Challenges</h4>
                <Image
                  src="/home/arrow-right.svg"
                  alt="arrow"
                  width={21}
                  height={21}
                  className="w-[21px] h-[21px]"
                />
              </button>
            </div>
          </div>

          {/* Section 5: Website and Social Links */}
          <div className="w-full bg-white rounded-3xl border border-gray-200 p-4 space-y-4">
            {/* Row 1: WEBSITE Header */}
            <div className="flex items-center gap-2">
              <Image
                src="/globe.svg"
                alt="Website"
                width={16}
                height={16}
                className="w-4 h-4"
              />
              <div className="text-[#7d7d7d] body-small uppercase">WEBSITE</div>
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
              <Image
                src="/guidance-user-1.svg"
                alt="Follow"
                width={16}
                height={16}
                className="w-4 h-4"
              />
              <div className="text-[#7d7d7d] body-small uppercase">FOLLOW</div>
            </div>

            {/* Row 5: Social Icons */}
            <div className="flex items-center justify-between w-full">
              {getSocialUrl("twitter", profile.twitter_handle || "") && (
                <a
                  href={getSocialUrl("twitter", profile.twitter_handle || "")!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-70 transition-opacity flex items-center justify-center"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 48 48"
                    fill="none"
                  >
                    <path
                      d="M33.2016 10H38.1088L27.3888 21.8611L40 38H30.1248L22.392 28.2109L13.5424 38H8.6304L20.0976 25.3144L8 10H18.1248L25.1168 18.9476L33.2016 10ZM31.48 35.1564H34.2L16.6464 12.6942H13.728L31.48 35.1564Z"
                      fill="#313131"
                    />
                  </svg>
                </a>
              )}
              {getSocialUrl("towns", profile.towns_handle || "") && (
                <a
                  href={getSocialUrl("towns", profile.towns_handle || "")!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-70 transition-opacity flex items-center justify-center"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 49 48"
                    fill="none"
                  >
                    <path
                      d="M35.0089 9.28809C36.267 9.32062 38.7966 10.0821 38.8488 12.8672C38.9008 15.6525 38.8704 17.7375 38.8488 18.4316C38.6318 19.2993 37.7099 21.0411 35.7579 21.0674C34.1704 21.0674 34.1634 22.1296 34.3585 22.6611V31.9678C34.3802 32.4235 34.2024 33.5885 33.3175 34.6035C32.4325 35.6186 31.0614 36.9566 30.4865 37.499C30.2912 37.9003 29.399 38.7031 27.3947 38.7031H19.9767C18.8813 38.4862 16.6836 37.4212 16.6573 34.8965C16.6248 31.7402 16.6574 29.2015 13.5988 29.0713C11.1519 28.9672 10.0844 26.6205 9.85657 25.46V20.416C9.83498 20.0579 9.94168 19.1603 10.5402 18.4316C11.1389 17.7028 14.6286 13.1382 16.299 10.9473C16.6677 10.3941 17.9979 9.28821 20.3663 9.28809H35.0089ZM20.0743 11.8584C18.6426 11.8584 18.3708 12.6184 18.4142 12.998C18.3925 13.8877 18.3621 15.9071 18.4142 16.8701C18.4665 17.8328 19.2387 18.0304 19.6183 18.0088H22.4171C23.5101 18.009 23.7619 18.8116 23.7511 19.2129V28.4531C23.7511 29.6764 24.5315 29.9396 24.922 29.918C26.0933 29.9288 28.6899 29.944 29.7052 29.918C30.72 29.8919 30.9522 29.0831 30.9415 28.6816V19.2129C30.9415 18.1717 31.7881 17.9762 32.2111 18.0088C32.8186 18.0305 34.2611 18.0608 35.172 18.0088C36.0825 17.9567 36.3318 17.2282 36.3429 16.8701V12.998C36.3429 12.1391 35.5625 11.8802 35.172 11.8584H20.0743Z"
                      fill="#313131"
                    />
                  </svg>
                </a>
              )}
              {getSocialUrl("farcaster", profile.farcaster_handle || "") && (
                <a
                  href={getSocialUrl("farcaster", profile.farcaster_handle || "")!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-70 transition-opacity flex items-center justify-center"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 49 48"
                    fill="none"
                  >
                    <path
                      d="M32.932 8.42285H16.4012C14.3777 8.42285 12.4371 9.22668 11.0063 10.6575C9.57544 12.0883 8.77161 14.0289 8.77161 16.0524L8.77161 31.9474C8.77161 33.9709 9.57544 35.9115 11.0063 37.3423C12.4371 38.7732 14.3777 39.577 16.4012 39.577H32.932C34.9554 39.577 36.8961 38.7732 38.3269 37.3423C39.7577 35.9115 40.5615 33.9709 40.5615 31.9474V16.0524C40.5615 14.0289 39.7577 12.0883 38.3269 10.6575C36.8961 9.22668 34.9554 8.42285 32.932 8.42285ZM34.0128 31.1606V31.8282C34.1026 31.8184 34.1935 31.8275 34.2797 31.8549C34.3658 31.8822 34.4452 31.9273 34.513 31.9871C34.5807 32.047 34.6351 32.1203 34.6728 32.2024C34.7106 32.2845 34.7307 32.3736 34.7321 32.464V33.2164H27.9197V32.4627C27.9212 32.3723 27.9416 32.2832 27.9794 32.2012C28.0173 32.1191 28.0719 32.0459 28.1398 31.9862C28.2076 31.9264 28.2872 31.8815 28.3734 31.8543C28.4596 31.8271 28.5505 31.8182 28.6403 31.8282V31.1606C28.6403 30.8692 28.843 30.6281 29.1145 30.5539L29.1013 24.7735C28.892 22.4727 26.929 20.6699 24.5407 20.6699C22.1525 20.6699 20.1895 22.4727 19.9802 24.7735L19.967 30.546C20.269 30.6016 20.6716 30.8215 20.6822 31.1606V31.8282C20.7721 31.8184 20.863 31.8275 20.9491 31.8549C21.0352 31.8822 21.1147 31.9273 21.1824 31.9871C21.2501 32.047 21.3045 32.1203 21.3423 32.2024C21.38 32.2845 21.4002 32.3736 21.4015 32.464V33.2164H14.5892V32.4627C14.5907 32.3724 14.611 32.2835 14.6488 32.2015C14.6866 32.1196 14.7411 32.0464 14.8088 31.9867C14.8764 31.927 14.9558 31.882 15.0419 31.8548C15.1279 31.8275 15.2187 31.8184 15.3084 31.8282V31.1606C15.3084 30.8255 15.5747 30.5592 15.9098 30.5354V20.0778H15.2607L14.4527 17.3876H17.9509V14.7835H31.1305V17.3876H34.8685L34.0605 20.0765H33.4115V30.5354C33.7452 30.5579 34.0128 30.8268 34.0128 31.1606Z"
                      fill="#313131"
                    />
                  </svg>
                </a>
              )}
              {getSocialUrl("telegram", profile.telegram_handle || "") && (
                <a
                  href={getSocialUrl("telegram", profile.telegram_handle || "")!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-70 transition-opacity flex items-center justify-center"
                >
                  <Image
                    src="/telegram-black.svg"
                    alt="Telegram"
                    width={24}
                    height={24}
                  />
                </a>
              )}
              {!getSocialUrl("twitter", profile.twitter_handle || "") &&
                !getSocialUrl("towns", profile.towns_handle || "") &&
                !getSocialUrl("farcaster", profile.farcaster_handle || "") &&
                !getSocialUrl("telegram", profile.telegram_handle || "") && (
                  <div className="text-gray-400 body-small">
                    No social links
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
