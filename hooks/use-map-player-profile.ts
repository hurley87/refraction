'use client';

import { useEffect, useState } from 'react';

export type MapUserProfileSummary = {
  name: string | null;
  profilePictureUrl: string | null;
  twitterHandle: string | null;
};

/**
 * Fetches the signed-in player's username and profile summary for the map,
 * and whether country/city FKs are missing (location prompt signal).
 */
export function useMapPlayerProfile(walletAddress: string | undefined) {
  const [userUsername, setUserUsername] = useState<string | null>(null);
  const [userProfileSummary, setUserProfileSummary] =
    useState<MapUserProfileSummary | null>(null);
  const [needsLocationPrompt, setNeedsLocationPrompt] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!walletAddress) {
        setUserUsername(null);
        setUserProfileSummary(null);
        setNeedsLocationPrompt(false);
        return;
      }
      try {
        const [playerRes, profileRes] = await Promise.all([
          fetch(
            `/api/player?walletAddress=${encodeURIComponent(walletAddress)}`
          ),
          fetch(
            `/api/profile?wallet_address=${encodeURIComponent(walletAddress)}`
          ),
        ]);

        if (playerRes.ok) {
          const responseData = await playerRes.json();
          const result = responseData.data || responseData;
          if (result.player?.username) {
            setUserUsername(result.player.username);
          }
        }

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          const profile = profileData.data || profileData;
          setUserProfileSummary({
            name: profile?.name ?? null,
            profilePictureUrl: profile?.profile_picture_url ?? null,
            twitterHandle: profile?.twitter_handle ?? null,
          });
          const missingGeo = !profile?.country_id || !profile?.geo_city_id;
          setNeedsLocationPrompt(missingGeo);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    fetchUserData();
  }, [walletAddress]);

  return {
    userUsername,
    userProfileSummary,
    needsLocationPrompt,
    setNeedsLocationPrompt,
  };
}
