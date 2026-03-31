'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ClaimHeader from '@/components/claim/claim-header';
import Footer from '@/components/layout/footer';
import MembersSection from '@/components/members-section';
import ExportWalletButton from '@/components/claim/export-wallet-button';
import Image from 'next/image';
import { usePrivy } from '@privy-io/react-auth';
import { useQuery } from '@tanstack/react-query';

/** Styling-only success UI: any build can use `?preview=1` (no mint). */
function isPreviewModeFromSearch(search: string): boolean {
  return new URLSearchParams(search).get('preview') === '1';
}

export function ClaimSuccessContent() {
  const { authenticated, ready, user, getAccessToken } = usePrivy();
  const router = useRouter();

  /** null = not yet read on client (avoid redirect using stale React Query cache from /claim/nft). */
  const [previewResolved, setPreviewResolved] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  useLayoutEffect(() => {
    const search = typeof window !== 'undefined' ? window.location.search : '';
    setIsPreview(isPreviewModeFromSearch(search));
    setPreviewResolved(true);
  }, []);

  const userAddress = user?.wallet?.address;

  // Wait for Privy — before `ready`, `authenticated` is false and would wrongly send users to /claim.
  useEffect(() => {
    if (!ready) return;
    if (isPreview) return;
    if (!authenticated) {
      router.push('/claim');
    }
  }, [authenticated, ready, isPreview, router]);

  const { data: claimStatus, isLoading } = useQuery({
    queryKey: ['claim-status', userAddress],
    queryFn: async () => {
      if (!userAddress) return null;
      const token = await getAccessToken();
      if (!token) throw new Error('Missing authorization token');

      const response = await fetch(
        `/api/claim-nft?userAddress=${userAddress}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) throw new Error('Failed to fetch claim status');
      return response.json();
    },
    enabled: !!userAddress && authenticated && previewResolved && !isPreview,
  });

  useEffect(() => {
    if (!previewResolved) return;
    if (isPreview) return;
    if (claimStatus && !claimStatus.hasClaimed) {
      router.push('/claim');
    }
  }, [claimStatus, router, isPreview, previewResolved]);

  const showLoading = !isPreview && (!previewResolved || isLoading);

  if (showLoading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#131313]">
        <div className="relative z-10 flex min-h-screen flex-col">
          <header>
            <ClaimHeader />
          </header>
          <main className="relative flex flex-1 items-center justify-center px-4 pb-16 pt-6">
            <p className="text-center text-sm font-grotesk text-[#7D7D7D]">
              Loading...
            </p>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#131313]">
      {isPreview && (
        <div className="fixed left-0 right-0 top-0 z-[100] bg-amber-500/90 px-3 py-2 text-center text-xs font-medium text-black">
          Preview mode — add{' '}
          <code className="rounded bg-black/10 px-1">?preview=1</code> to this
          URL. No mint required.
        </div>
      )}
      <div className="relative z-10 flex min-h-screen flex-col">
        <main className="relative flex flex-1 items-center justify-center px-4 pb-16 pt-6">
          <div className="relative mx-auto flex w-full max-w-[393px] flex-col items-center gap-16 text-center">
            <div className="space-y-6 pt-[100px]">
              <div className="flex w-full max-w-[375px] flex-col items-center gap-4 self-stretch px-4 pt-[34px]">
                <Image
                  src="/wct/walletcon-cannes-poster.jpg"
                  alt="Claimed artwork"
                  width={375}
                  height={375}
                  className="mx-auto w-full max-w-[375px] object-contain"
                  unoptimized
                />
                <div className="h-[50px]" aria-hidden="true"></div>
                <h2
                  className="text-center text-white font-pleasure font-bold"
                  style={{
                    textShadow: '0 0 16px rgba(255, 255, 255, 0.70)',
                    fontSize: '39px',
                    lineHeight: '40px',
                    letterSpacing: '-2.34px',
                  }}
                >
                  CLAIM SUCCESSFUL
                </h2>
                <div className="h-[50px]" aria-hidden="true"></div>
                <p
                  className="text-center text-white font-grotesk"
                  style={{
                    fontSize: '16px',
                    fontWeight: 400,
                    lineHeight: '22px',
                    letterSpacing: '-0.48px',
                  }}
                >
                  You&apos;ve claimed your $USDC, IRL points, and a special
                  edition artwork by Dominique Falcone. Make sure to grab your
                  limited edition artwork print at the checkpoint, and enjoy the
                  rest of the your WalletCon!
                  <br />
                  <br />
                  See you IRL again soon.
                </p>
                <ExportWalletButton className="flex h-10 w-full items-center justify-center gap-4 rounded-full bg-[#EDEDED] px-4 py-2 font-pleasure text-black transition hover:bg-gray-100" />
                {userAddress && (
                  <a
                    href={`https://basescan.org/address/${userAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full h-10 items-center justify-center gap-4 rounded-full bg-[#EDEDED] px-4 py-2 font-pleasure"
                  >
                    View on Basescan
                  </a>
                )}

                <a
                  href="https://irl.energy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full h-10 items-center justify-center gap-4 rounded-full bg-[#EDEDED] px-4 py-2 font-pleasure"
                >
                  Visit IRL.Energy
                </a>
              </div>
            </div>

            <MembersSection variant="centered" />
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
