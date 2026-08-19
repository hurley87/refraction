import { notFound } from 'next/navigation';
import { PublicProfileView } from '@/components/profile/public-profile-view';
import {
  getPublicProfileLists,
  loadPublicProfileByUsername,
} from '@/lib/profile/public-profile-data';
import { isReservedUsername, normalizeUsername } from '@/lib/username';

interface UsernameProfilePageProps {
  params: {
    username: string;
  };
}

export default async function UsernameProfilePage({
  params,
}: UsernameProfilePageProps) {
  const username = normalizeUsername(params.username);

  if (!username || isReservedUsername(username)) {
    notFound();
  }

  const profile = await loadPublicProfileByUsername(username);

  if (!profile) {
    notFound();
  }

  const lists = await getPublicProfileLists(profile.wallet_address);

  return <PublicProfileView profile={profile} lists={lists} />;
}
