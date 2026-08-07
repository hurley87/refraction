import type { UserProfile } from '@/lib/types';
import { getUserProfile, getUserProfileByUsername } from '@/lib/db/profiles';
import { getPlayerByWallet } from '@/lib/db/players';
import {
  listPublicCustomListsForProfile,
  type PublicPlayerListCard,
} from '@/lib/db/player-custom-lists';
import { supabase } from '@/lib/db/client';

export type { PublicPlayerListCard };

export type PublicProfileStats = {
  rank: number;
  total_points: number;
};

function isMeaningfulProfile(profile: UserProfile): boolean {
  return Boolean(
    profile.name ||
    profile.username ||
    profile.email ||
    profile.twitter_handle ||
    profile.towns_handle ||
    profile.farcaster_handle ||
    profile.instagram_handle
  );
}

/**
 * Load a public profile by wallet; returns null when missing or empty.
 */
export async function loadPublicProfileByWallet(
  walletAddress: string
): Promise<UserProfile | null> {
  try {
    const profile = await getUserProfile(walletAddress);
    if (!profile || !isMeaningfulProfile(profile)) return null;
    return profile;
  } catch (error) {
    console.error('Error fetching profile by wallet:', error);
    return null;
  }
}

/**
 * Load a public profile by username; returns null when missing or empty.
 */
export async function loadPublicProfileByUsername(
  username: string
): Promise<UserProfile | null> {
  try {
    const profile = await getUserProfileByUsername(username);
    if (!profile || !isMeaningfulProfile(profile)) return null;
    return profile;
  } catch (error) {
    console.error('Error fetching profile by username:', error);
    return null;
  }
}

/**
 * Public (non-private) personal lists for a profile wallet.
 */
export async function getPublicProfileLists(
  walletAddress: string
): Promise<PublicPlayerListCard[]> {
  try {
    const player = await getPlayerByWallet(walletAddress);
    if (!player?.id) return [];
    return await listPublicCustomListsForProfile(player.id);
  } catch (error) {
    console.error('Error fetching public profile lists:', error);
    return [];
  }
}

export async function getPublicProfileStats(
  walletAddress: string
): Promise<PublicProfileStats> {
  try {
    const player = await getPlayerByWallet(walletAddress);
    if (!player) {
      return { rank: 999, total_points: 0 };
    }

    const userPoints = player.total_points ?? 0;

    const { data: allPlayers } = await supabase
      .from('players')
      .select('id, total_points')
      .order('id', { ascending: true });

    const sortedPlayers = (allPlayers || []).sort((a, b) => {
      const aPoints = a.total_points ?? 0;
      const bPoints = b.total_points ?? 0;

      if (bPoints !== aPoints) {
        return bPoints - aPoints;
      }
      return a.id - b.id;
    });

    let currentRank = 1;
    let previousPoints: number | null = null;
    let userRank: number | null = null;

    for (const p of sortedPlayers) {
      const pPoints = p.total_points ?? 0;

      if (previousPoints !== null && pPoints < previousPoints) {
        currentRank++;
      }

      if (p.id === player.id) {
        userRank = currentRank;
        break;
      }

      previousPoints = pPoints;
    }

    return {
      rank: userRank ?? 999,
      total_points: userPoints,
    };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return { rank: 999, total_points: 0 };
  }
}
