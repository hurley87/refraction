'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

type ClaimStatus = {
  hasClaimed: boolean;
  tokenId: number | null;
  txHash: string | null;
  canClaim: boolean;
  remainingTokens: number;
};

export default function StripeCommonsArtworkPage() {
  const { authenticated, user, ready, getAccessToken } = usePrivy();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [claiming, setClaiming] = useState(false);

  const userAddress = user?.wallet?.address;

  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/stripecommons');
    }
  }, [ready, authenticated, router]);

  const { data: claimStatus, isLoading } = useQuery<ClaimStatus | null>({
    queryKey: ['stripe-commons-claim', userAddress],
    queryFn: async () => {
      if (!userAddress) return null;
      const token = await getAccessToken();
      if (!token) throw new Error('Missing authorization token');

      const res = await fetch(
        `/api/stripe-commons/claim?userAddress=${userAddress}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Failed to fetch claim status');
      return res.json();
    },
    enabled: !!userAddress && authenticated,
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.hasClaimed ? false : 5000;
    },
  });

  const hasClaimed = claimStatus?.hasClaimed ?? false;
  const canClaim = claimStatus?.canClaim ?? false;
  const claimedTokenId = claimStatus?.tokenId;
  const soldOut = !canClaim && !hasClaimed;

  const claimMutation = useMutation({
    mutationFn: async (address: string) => {
      const token = await getAccessToken();
      if (!token) throw new Error('Missing authorization token');

      const res = await fetch('/api/stripe-commons/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userAddress: address }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to claim artwork');
      return data;
    },
    onSuccess: (data) => {
      if (data.pending) {
        toast('Transaction submitted – waiting for confirmation…');
        queryClient.invalidateQueries({
          queryKey: ['stripe-commons-claim', userAddress],
        });
        return;
      }
      setClaiming(false);
      toast.success(data.message || 'Artwork claimed!');
      queryClient.invalidateQueries({
        queryKey: ['stripe-commons-claim', userAddress],
      });
    },
    onError: (error: Error) => {
      setClaiming(false);
      toast.error(error.message || 'Failed to claim artwork');
    },
  });

  const handleClaim = async () => {
    if (!userAddress) {
      toast.error('No wallet connected');
      return;
    }
    setClaiming(true);
    try {
      await claimMutation.mutateAsync(userAddress);
    } catch {
      // handled in onError
    }
  };

  useEffect(() => {
    if (hasClaimed && claiming) setClaiming(false);
  }, [hasClaimed, claiming]);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0A0A1A]">
        <p className="text-sm text-white/50">Loading...</p>
      </div>
    );
  }

  if (!authenticated) return null;

  const isTransferring = claiming || claimMutation.isPending;

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#0A0A1A]">
      {/* Background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, #2D1B69 0%, #0A0A1A 70%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-30"
        style={{
          backgroundImage: "url('/stripe-commons/master.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      <div className="relative z-10 flex min-h-dvh flex-col">
        {/* Header */}
        <header className="flex justify-center px-4 pt-4">
          <div
            className="flex h-[53px] w-full max-w-[393px] items-center justify-between rounded-full border border-white/10 px-4 py-2"
            style={{
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
              backdropFilter: 'blur(32px)',
            }}
          >
            <Link
              href="/"
              className="relative flex size-[40px] shrink-0 items-center justify-center rounded-full bg-white/10"
            >
              <Image
                src="/home/IRL.png"
                alt="IRL"
                width={27}
                height={14}
                className="block"
              />
            </Link>
            <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-white/60">
                Powered by
              </span>
              <span className="text-[13px] font-bold tracking-tight text-white">
                Privy
              </span>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="flex flex-1 flex-col items-center justify-center px-4 pb-16 pt-6">
          <div className="mx-auto flex w-full max-w-[393px] flex-col items-center gap-8 text-center">
            {/* Artwork image */}
            <div
              className="relative w-[300px] h-[300px] overflow-hidden rounded-2xl border border-white/10"
              style={{
                boxShadow: hasClaimed
                  ? '0 0 60px rgba(34, 197, 94, 0.2)'
                  : '0 8px 40px rgba(104, 81, 255, 0.15)',
              }}
            >
              <Image
                src="/stripe-commons/master.png"
                alt="Stripe Commons Artwork"
                fill
                className="object-cover"
                unoptimized
              />

              {/* Transfer overlay */}
              {isTransferring && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                  <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-white/20 border-t-[#6851FF]" />
                  <p className="mt-4 font-pleasure text-sm text-white/80">
                    Transferring artwork…
                  </p>
                </div>
              )}

              {/* Claimed badge */}
              {hasClaimed && !isTransferring && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-end bg-gradient-to-t from-black/70 via-transparent to-transparent pb-4">
                  <div className="flex items-center gap-2 rounded-full bg-green-500/90 px-4 py-2 backdrop-blur-sm">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path
                        d="M5 13L9 17L19 7"
                        stroke="white"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="text-sm font-bold text-white">
                      CLAIMED
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Title area */}
            <div className="space-y-2">
              <h1
                className="font-inktrap text-[36px] font-bold uppercase leading-[38px] tracking-[-2.5px] text-white"
                style={{
                  textShadow: '0 0 30px rgba(104, 81, 255, 0.2)',
                }}
              >
                {hasClaimed ? 'Claim Successful' : 'Claim Your Artwork'}
              </h1>

              {hasClaimed && claimedTokenId && (
                <p className="text-xs uppercase tracking-widest text-white/40">
                  Token #{claimedTokenId}
                </p>
              )}
            </div>

            {/* Status / Action */}
            {isLoading && (
              <p className="text-sm text-white/40">
                Checking claim status…
              </p>
            )}

            {!hasClaimed && !isLoading && (
              <>
                {soldOut ? (
                  <div className="flex h-14 w-full items-center justify-center rounded-full bg-white/10 font-pleasure text-white/50">
                    All artwork has been claimed
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleClaim}
                    disabled={isTransferring}
                    className="flex h-14 w-full items-center justify-between rounded-full px-6 py-2 font-pleasure text-white transition hover:opacity-90 disabled:opacity-50"
                    style={{
                      background:
                        'linear-gradient(135deg, #6851FF 0%, #8B5CF6 100%)',
                      boxShadow: '0 4px 24px rgba(104, 81, 255, 0.35)',
                    }}
                  >
                    <span className="text-base font-medium tracking-tight">
                      {isTransferring
                        ? 'Claiming…'
                        : 'Claim Artwork + 100 Points'}
                    </span>
                    {!isTransferring && (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        className="opacity-80"
                      >
                        <path
                          d="M4 10H16M16 10L11 5M16 10L11 15"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                )}
              </>
            )}

            {/* Post-claim success content */}
            {hasClaimed && (
              <div className="flex w-full flex-col gap-4">
                {/* Success message */}
                <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-5">
                  <p
                    className="text-left text-sm leading-[20px] text-white/70"
                    style={{
                      fontFamily:
                        '"ABC Monument Grotesk Semi-Mono Unlicensed Trial", monospace',
                    }}
                  >
                    You showed up and signed in with Privy. Make sure to grab
                    your limited edition artwork print at the checkpoint, and
                    enjoy the rest of your Stripe Commons! See you IRL again
                    soon.
                  </p>
                </div>

                {/* Reward summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                    <p className="font-inktrap text-3xl font-bold text-white">
                      NFT
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-white/40">
                      Digital Artwork
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                    <p className="font-inktrap text-3xl font-bold text-[#6851FF]">
                      +100
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-white/40">
                      IRL Points
                    </p>
                  </div>
                </div>

                {/* Actions */}
                {claimStatus?.txHash && (
                  <a
                    href={`https://basescan.org/tx/${claimStatus.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white/10 font-pleasure text-sm text-white/80 transition hover:bg-white/15"
                  >
                    View on Basescan
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="opacity-60"
                    >
                      <path
                        d="M7 17L17 7M17 7H7M17 7V17"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </a>
                )}

                <a
                  href="https://irl.energy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white/10 font-pleasure text-sm text-white/80 transition hover:bg-white/15"
                >
                  Visit IRL.Energy
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="opacity-60"
                  >
                    <path
                      d="M7 17L17 7M17 7H7M17 7V17"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              </div>
            )}

            {/* Staff visual indicator */}
            {hasClaimed && (
              <div
                className="w-full rounded-2xl border-2 border-green-500/50 p-6"
                style={{ background: 'rgba(34, 197, 94, 0.08)' }}
              >
                <div className="flex flex-col items-center gap-2">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M5 13L9 17L19 7"
                      stroke="#22C55E"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <p className="font-inktrap text-lg font-bold uppercase tracking-wider text-green-400">
                    Artwork Claimed
                  </p>
                  <p className="text-xs text-green-400/60">
                    Staff: Please hand out the physical print
                  </p>
                </div>
              </div>
            )}

            {/* Footer branding */}
            <div className="flex items-center gap-3 pt-4">
              <span className="text-[10px] font-medium uppercase tracking-widest text-white/25">
                Powered by
              </span>
              <span className="text-xs font-bold tracking-tight text-white/40">
                Privy
              </span>
              <span className="text-white/15">·</span>
              <span className="text-xs font-bold tracking-tight text-white/40">
                IRL
              </span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
