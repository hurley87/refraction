import { notFound } from 'next/navigation';
import { PublicProfileView } from '@/components/profile/public-profile-view';
import {
  getPublicProfileStats,
  loadPublicProfileByWallet,
} from '@/lib/profile/public-profile-data';

interface ProfilePageProps {
  params: {
    walletAddress: string;
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const profile = await loadPublicProfileByWallet(params.walletAddress);

  if (!profile) {
    notFound();
  }

  const userStats = await getPublicProfileStats(profile.wallet_address);

  return <PublicProfileView profile={profile} userStats={userStats} />;
}
