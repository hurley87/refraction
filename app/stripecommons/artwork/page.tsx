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
  imageUrl?: string | null;
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
  const imageUrl = claimStatus?.imageUrl ?? null;
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
      <div className="flex min-h-dvh items-center justify-center bg-[#f5f0e8]">
        <p className="text-sm text-black/50">Loading...</p>
      </div>
    );
  }

  if (!authenticated) return null;

  const isTransferring = claiming || claimMutation.isPending;

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#f5f0e8]">
      {/* Background gradient layer – match success page */}
      <div
        className="pointer-events-none absolute inset-0 -z-0"
        style={{
          backgroundImage: `
            linear-gradient(135deg, #f7c58a 0%, #fdf1d5 25%, #a9f5c3 50%, #7be2e0 75%, #f7c58a 100%),
            radial-gradient(circle at 15% 20%, rgba(243, 174, 131, 0.75) 0, transparent 40%),
            radial-gradient(circle at 85% 20%, rgba(125, 236, 190, 0.7) 0, transparent 45%),
            radial-gradient(circle at 20% 80%, rgba(247, 203, 120, 0.75) 0, transparent 45%),
            radial-gradient(circle at 80% 80%, rgba(120, 230, 205, 0.75) 0, transparent 45%)
          `,
          backgroundBlendMode: 'soft-light, normal, normal, normal, normal',
        }}
      />

      <div className="relative z-10 flex min-h-dvh flex-col">
        {/* Header – match success page */}
        <header className="flex justify-center px-4 pt-4">
          <div
            className="flex h-[53px] w-full max-w-[393px] items-center justify-between rounded-full border border-black/10 px-4 py-2"
            style={{
              background:
                'linear-gradient(180deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.02) 100%)',
              backdropFilter: 'blur(32px)',
            }}
          >
            <Link
              href="/"
              className="relative flex size-[40px] shrink-0 items-center justify-center rounded-full bg-black/10"
            >
              <Image
                src="/irl-svg/irl-logo-new.svg"
                alt="IRL"
                width={27}
                height={14}
                className="block invert"
              />
            </Link>
            <div className="flex items-center gap-1.5 rounded-full bg-black/10 px-3 py-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-black/60">
                Signed in with
              </span>
              <span className="text-[13px] font-bold tracking-tight text-black">
                Privy
              </span>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="flex flex-1 flex-col items-center justify-center overflow-x-hidden px-4 pb-16 pt-6">
          <div className="mx-auto flex w-full max-w-[393px] flex-col items-center gap-10 text-center">
            {/* Artwork image – show specific NFT when claimed */}
            <div
              className="relative w-full aspect-square max-w-[300px] overflow-hidden rounded-2xl border border-black/10"
              style={{
                boxShadow: hasClaimed
                  ? '0 4px 24px rgba(22, 163, 74, 0.25)'
                  : '0 8px 40px rgba(104, 81, 255, 0.15)',
              }}
            >
              <Image
                src={
                  hasClaimed && imageUrl
                    ? imageUrl
                    : '/stripecommons/master.png'
                }
                alt="Stripe Commons Artwork"
                fill
                className="object-cover"
                unoptimized
              />

              {/* Transfer overlay */}
              {isTransferring && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                  <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-white/20 border-t-[#6851FF]" />
                  <p className="mt-4 title3 font-grotesk text-white/90">
                    Transferring artwork…
                  </p>
                </div>
              )}
            </div>

            {/* Claimed badge – below NFT */}
            {hasClaimed && !isTransferring && (
              <div className="flex items-center gap-2 rounded-full bg-[#16A34A] px-4 py-2 shadow-lg">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M5 13L9 17L19 7"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-sm font-bold text-white">CLAIMED</span>
              </div>
            )}

            {/* Title area – hero-text / title3 typography */}
            <div className="space-y-2">
              <h1 className="hero-text text-black">
                {hasClaimed ? 'Claim Successful' : 'Claim Your Artwork'}
              </h1>
              {hasClaimed && claimedTokenId && (
                <p
                  className="text-[11px] uppercase tracking-widest text-black/50"
                  style={{
                    fontFamily:
                      '"ABC Monument Grotesk Semi-Mono Unlicensed Trial", monospace',
                  }}
                >
                  Token #{claimedTokenId}
                </p>
              )}
            </div>

            {/* Status / Action */}
            {isLoading && (
              <p
                className="text-[11px] uppercase tracking-widest text-black/50"
                style={{
                  fontFamily:
                    '"ABC Monument Grotesk Semi-Mono Unlicensed Trial", monospace',
                }}
              >
                Checking claim status…
              </p>
            )}

            {!hasClaimed && !isLoading && (
              <div className="w-full space-y-3">
                {soldOut ? (
                  <div className="flex h-[52px] w-full items-center justify-center rounded-full bg-black/10 title3 font-grotesk text-black/50">
                    All artwork has been claimed
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleClaim}
                    disabled={isTransferring}
                    className="flex h-[52px] w-full justify-center items-center gap-2.5 rounded-full bg-white hover:bg-gray-100 transition-colors cursor-pointer title3 text-[#313131] font-grotesk whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isTransferring
                      ? 'Claiming…'
                      : 'Claim Artwork + 100 Points'}
                  </button>
                )}
              </div>
            )}

            {/* Post-claim success content */}
            {hasClaimed && (
              <div className="flex w-full flex-col gap-4">
                {/* Success message (no frame) */}
                <p
                  className="mb-0 text-left max-w-[700px] mx-auto md:mx-0 md:max-w-none md:text-[20px] md:leading-[24px] md:tracking-[-0.4px]"
                  style={{
                    color: 'var(--UI-Black, #131313)',
                    fontFamily:
                      '"ABC Monument Grotesk Unlicensed Trial", "ABC-Monument-Grotesk", sans-serif',
                    fontSize: '16px',
                    fontStyle: 'normal',
                    fontWeight: 400,
                    lineHeight: '20px',
                    letterSpacing: '-0.48px',
                  }}
                >
                  Grab your limited edition artwork print at the checkpoint and
                  enjoy the rest of Stripe Commons. See you IRL again soon.
                </p>

                {/* Actions – white button style */}
                {claimStatus?.txHash && (
                  <a
                    href={`https://basescan.org/tx/${claimStatus.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-white hover:bg-gray-100 transition-colors title3 font-grotesk text-[#313131]"
                  >
                    View on Basescan
                  </a>
                )}

                <a
                  href="https://irl.energy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-white hover:bg-gray-100 transition-colors title3 font-grotesk text-[#313131]"
                >
                  Visit IRL.Energy
                </a>
              </div>
            )}

            {/* Staff visual indicator */}
            {hasClaimed && (
              <div className="w-full rounded-2xl border-2 border-[#16A34A]/40 bg-[#16A34A]/10 p-6">
                <div className="flex flex-col items-center gap-2">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M5 13L9 17L19 7"
                      stroke="#16A34A"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <p className="title3 font-grotesk font-bold uppercase tracking-wider text-[#16A34A]">
                    Artwork Claimed
                  </p>
                  <p
                    className="text-[11px] uppercase tracking-widest text-[#16A34A]/70"
                    style={{
                      fontFamily:
                        '"ABC Monument Grotesk Semi-Mono Unlicensed Trial", monospace',
                    }}
                  >
                    Staff: Please hand out the physical print
                  </p>
                </div>
              </div>
            )}

            {/* Footer – match success page (Presented by + logos) */}
            <div className="flex flex-col items-center gap-3 pt-4">
              <span className="text-[10px] font-medium uppercase tracking-widest text-black/40">
                Presented by
              </span>
              <div className="flex items-center gap-6">
                <Image
                  src="/stripecommons/privy-nodot.png"
                  alt="Privy"
                  width={60}
                  height={24}
                  className="h-5 w-auto object-contain opacity-60"
                />
                <span className="text-black/30">·</span>
                <Image
                  src="/irl-svg/irl-logo-new.svg"
                  alt="IRL"
                  width={30}
                  height={24}
                  className="h-7 w-auto object-contain opacity-60"
                />
                <span className="text-black/30">·</span>
                <Image
                  src="/stripecommons/stripe-3.svg"
                  alt="Stripe"
                  width={60}
                  height={28}
                  className="h-6 w-auto object-contain opacity-60"
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
