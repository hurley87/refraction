import { notFound } from "next/navigation";
import type { UserProfile } from "@/lib/types";
import Link from "next/link";
import PointsActivity from "@/components/perks/points-activity";

interface ProfilePageProps {
  params: {
    walletAddress: string;
  };
}

async function getProfile(walletAddress: string): Promise<UserProfile | null> {
  try {
    // For server-side fetch, we can use a relative URL or construct the full URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL; // Default for development

    const response = await fetch(
      `${baseUrl}/api/profile?wallet_address=${walletAddress}`,
      {
        cache: "no-store", // Ensure fresh data
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // Check if this is an empty profile (no actual user data)
    if (
      !data.name &&
      !data.username &&
      !data.email &&
      !data.twitter_handle &&
      !data.towns_handle &&
      !data.farcaster_handle &&
      !data.telegram_handle
    ) {
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error fetching profile:", error);
    return null;
  }
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const profile = await getProfile(params.walletAddress);

  if (!profile) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-grotesk">
      {/* Header */}
      <div className="flex items-center justify-center p-4">
        <h1 className="text-black text-lg font-medium font-inktrap uppercase">
          {profile.name || profile.username || "PROFILE"}
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-start px-4 pb-4 gap-6 overflow-y-auto">
        {/* Profile Information */}
        <div className="w-full max-w-sm space-y-4">
          {/* Wallet Address */}
          <div className="space-y-2 mt-6">
            <p className="text-black text-sm font-inktrap uppercase font-semibold">
              WALLET ADDRESS
            </p>
            <div className="bg-gray-100 rounded-full px-4 py-3">
              <p className="text-black text-xs font-mono break-all">
                {profile.wallet_address}
              </p>
            </div>
          </div>

          {/* Social Handles Section */}
          {(profile.twitter_handle ||
            profile.towns_handle ||
            profile.farcaster_handle ||
            profile.telegram_handle) && (
            <>
              <div className="space-y-4">
                {/* X (Twitter) */}
                {profile.twitter_handle && (
                  <div className="space-y-2">
                    <p className="text-black text-sm font-inktrap uppercase font-semibold">
                      X
                    </p>
                    <div className="bg-gray-100 rounded-full px-4 py-3">
                      <p className="text-black text-sm font-inktrap">
                        @{profile.twitter_handle}
                      </p>
                    </div>
                  </div>
                )}

                {/* Towns */}
                {profile.towns_handle && (
                  <div className="space-y-2">
                    <p className="text-black text-sm font-inktrap uppercase font-semibold">
                      TOWNS
                    </p>
                    <div className="bg-gray-100 rounded-full px-4 py-3">
                      <p className="text-black text-sm font-inktrap">
                        @{profile.towns_handle}
                      </p>
                    </div>
                  </div>
                )}

                {/* Farcaster */}
                {profile.farcaster_handle && (
                  <div className="space-y-2">
                    <p className="text-black text-sm font-inktrap uppercase font-semibold">
                      FARCASTER
                    </p>
                    <div className="bg-gray-100 rounded-full px-4 py-3">
                      <p className="text-black text-sm font-inktrap">
                        @{profile.farcaster_handle}
                      </p>
                    </div>
                  </div>
                )}

                {/* Telegram */}
                {profile.telegram_handle && (
                  <div className="space-y-2">
                    <p className="text-black text-sm font-inktrap uppercase font-semibold">
                      TELEGRAM
                    </p>
                    <div className="bg-gray-100 rounded-full px-4 py-3">
                      <p className="text-black text-sm font-inktrap">
                        @{profile.telegram_handle}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Points Activity Section */}
        <PointsActivity walletAddress={profile.wallet_address} />

        {/* Back to Home Button */}
        <div className="w-full max-w-sm mt-4">
          <Link
            href="/leaderboard"
            className="w-full bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors flex items-center justify-center gap-2 font-inktrap py-3"
          >
            <span>Back to Leaderboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
