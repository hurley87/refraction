"use client";

import { useState, useEffect } from "react";
import ProfileAvatar from "./profile-avatar";

interface LeaderboardAvatarProps {
  walletAddress: string;
  size?: number;
}

export default function LeaderboardAvatar({
  walletAddress,
  size = 16,
}: LeaderboardAvatarProps) {
  const [profileData, setProfileData] = useState<{
    profile_picture_url?: string;
    twitter_handle?: string;
    name?: string;
    username?: string;
  } | null>(null);

  useEffect(() => {
    // Fetch profile data for this wallet address
    const fetchProfile = async () => {
      try {
        const response = await fetch(
          `/api/profile?wallet_address=${encodeURIComponent(walletAddress)}`
        );
        if (response.ok) {
          const result = await response.json();
          // Handle both wrapped and unwrapped responses
          const profile = result.profile || result.data?.profile || result;
          if (profile) {
            setProfileData({
              profile_picture_url: profile.profile_picture_url,
              twitter_handle: profile.twitter_handle,
              name: profile.name,
              username: profile.username,
            });
          }
        }
      } catch (error) {
        console.error("[LeaderboardAvatar] Error fetching profile:", error);
      }
    };

    fetchProfile();
  }, [walletAddress]);

  return (
    <div
      className="rounded-full overflow-hidden flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <ProfileAvatar
        profilePictureUrl={profileData?.profile_picture_url}
        name={profileData?.name}
        username={profileData?.username}
        twitterHandle={profileData?.twitter_handle}
        size={size}
      />
    </div>
  );
}

