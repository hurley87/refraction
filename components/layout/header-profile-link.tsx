'use client';

import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import LeaderboardAvatar from '@/components/leaderboard-avatar';
import { useEvmWalletAddress } from '@/hooks/use-evm-wallet-address';
import { cn } from '@/lib/utils';

type HeaderProfileLinkProps = {
  size?: number;
  className?: string;
};

/**
 * Signed-in member avatar that opens their profile (`/dashboard`).
 * Renders nothing until auth and a wallet address are available.
 */
export function HeaderProfileLink({
  size = 40,
  className,
}: HeaderProfileLinkProps) {
  const { authenticated } = usePrivy();
  const walletAddress = useEvmWalletAddress();

  if (!authenticated || !walletAddress) return null;

  return (
    <Link
      href="/dashboard"
      aria-label="Your profile"
      className={cn(
        'block shrink-0 overflow-hidden rounded-full shadow-sm ring-2 ring-white transition-opacity hover:opacity-90',
        className
      )}
    >
      <LeaderboardAvatar walletAddress={walletAddress} size={size} />
    </Link>
  );
}
