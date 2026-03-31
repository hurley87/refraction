'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import ClaimHeader from '@/components/claim/claim-header';
import ClaimFooter from '@/components/claim/claim-footer';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';

import { usePrivy } from '@privy-io/react-auth';

export default function LoginSuccessPage() {
  const { authenticated, ready, user, getAccessToken } = usePrivy();
  const router = useRouter();
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [checkinPointsLine, setCheckinPointsLine] = useState<string | null>(
    null
  );
  const walletconPointsRequestedRef = useRef(false);

  // Redirect to login if not authenticated (only after Privy is ready)
  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/claim/login');
    }
  }, [ready, authenticated, router]);

  // One-time 100 IRL points for reaching this screen (server enforces idempotency)
  useEffect(() => {
    if (!ready || !authenticated || !user?.wallet?.address) return;
    if (walletconPointsRequestedRef.current) return;
    walletconPointsRequestedRef.current = true;

    let cancelled = false;

    void (async () => {
      try {
        const token = await getAccessToken();
        const addr = user.wallet?.address;
        if (!token || !addr) {
          walletconPointsRequestedRef.current = false;
          return;
        }
        const res = await fetch('/api/claim/walletcon-checkin-points', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ walletAddress: addr }),
        });
        const json = await res.json();
        if (cancelled) return;
        const data = json.data ?? json;
        if (
          res.ok &&
          data?.success !== false &&
          typeof data?.pointsAwarded === 'number' &&
          data.pointsAwarded > 0
        ) {
          setCheckinPointsLine(
            `You earned ${data.pointsAwarded} IRL points for checking in.`
          );
        }
      } catch {
        walletconPointsRequestedRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, user?.wallet?.address, getAccessToken]);

  // Show loading state while Privy is initializing
  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <p className="text-center text-sm font-grotesk text-[#7D7D7D]">
          Loading...
        </p>
      </div>
    );
  }

  // Redirect if not authenticated (will redirect via useEffect)
  if (!authenticated) {
    return null;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      <div className="relative z-10 flex min-h-screen flex-col">
        <header>
          <ClaimHeader />
        </header>

        <main className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 pb-16 pt-6">
          <div
            className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
            aria-hidden
          >
            <Image
              src="/wct/poster-raster.png"
              alt=""
              fill
              className="origin-center scale-[2.25] object-cover object-[18%_center]"
              sizes="100vw"
              priority
            />
            <div className="absolute inset-0 bg-white/[0.72]" />
          </div>
          <div className="relative mx-auto flex w-full max-w-[393px] flex-col items-center gap-8 text-center">
            <div className="space-y-6 pt-[100px]">
              {/* Row 1: Success! */}
              <p
                className="mx-auto text-center"
                style={{
                  color: 'var(--UI-OffBlack, #131313)',
                  textAlign: 'center',
                  textShadow: '0 0 16px rgba(255, 255, 255, 0.70)',
                  fontFamily: '"Pleasure"',
                  fontSize: '25px',
                  fontStyle: 'normal',
                  fontWeight: 500,
                  lineHeight: '28px',
                  letterSpacing: '-0.5px',
                }}
              >
                Check-in complete!
              </p>

              {/* Row 2: You Showed Up */}
              <h1
                className="mx-auto text-center display1 font-inktrap"
                style={{
                  color: 'var(--UI-OffBlack, #131313)',
                  textShadow: '0 0 16px rgba(255, 255, 255, 0.70)',
                }}
              >
                <b>Welcome to WalletCon</b>
              </h1>

              {checkinPointsLine ? (
                <p
                  className="mx-auto max-w-[340px] text-center"
                  style={{
                    color: 'var(--Dark-Tint-100, #313131)',
                    fontFamily: '"ABC-Monument-Grotesk"',
                    fontSize: '16px',
                    fontStyle: 'normal',
                    fontWeight: 600,
                    lineHeight: '22px',
                    letterSpacing: '-0.48px',
                  }}
                >
                  {checkinPointsLine}
                </p>
              ) : null}

              {/* Row 4: Instruction text */}
              <p
                className="mx-auto text-center"
                style={{
                  color: 'var(--Dark-Tint-100, #313131)',
                  textAlign: 'center',
                  fontFamily: '"ABC-Monument-Grotesk"',
                  fontSize: '16px',
                  fontStyle: 'normal',
                  fontWeight: 400,
                  lineHeight: '22px',
                  letterSpacing: '-0.48px',
                }}
              >
                To claim your $USDC, digital artwork by Dominique Falcone and
                IRL points, head to one of the IRL Checkpoints below.
              </p>

              {/* Row 4: Instruction text */}
              <p
                className="mx-auto text-center"
                style={{
                  color: 'var(--Dark-Tint-100, #313131)',
                  textAlign: 'center',
                  fontFamily: '"ABC-Monument-Grotesk"',
                  fontSize: '16px',
                  fontStyle: 'normal',
                  fontWeight: 400,
                  lineHeight: '22px',
                  letterSpacing: '-0.48px',
                }}
              >
                You can also pick up your physical print at the same Checkpoint.
              </p>
            </div>
          </div>
        </main>

        <ClaimFooter />
      </div>

      {/* Map Modal */}
      <Dialog open={isMapModalOpen} onOpenChange={setIsMapModalOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] h-[95vh] max-h-[95vh] border-none bg-transparent p-0 shadow-none [&>button]:hidden overflow-hidden flex flex-col z-[60]">
          {isMapModalOpen && (
            <div className="relative flex flex-col h-full w-full">
              {/* Close Button */}
              <div className="w-full rounded-3xl border border-[#131313]/10 bg-white px-4 py-3 flex justify-center mb-1 flex-shrink-0">
                <DialogClose asChild>
                  <button className="flex h-10 w-10 items-center justify-center rounded-full text-black hover:bg-gray-100 transition-colors">
                    <span className="sr-only">Close</span>
                    <X className="h-5 w-5" />
                  </button>
                </DialogClose>
              </div>

              {/* Full Size Map */}
              <div className="w-full rounded-3xl border border-[#131313]/10 bg-white p-6 flex-1 min-h-0 overflow-auto flex items-center justify-center">
                <div className="w-full h-full flex justify-center items-center">
                  <Image
                    src="/wct/venue-map.png"
                    alt="Venue map - Full Size"
                    width={1200}
                    height={900}
                    className="max-w-full max-h-full w-auto h-auto object-contain rounded-xl"
                    unoptimized
                    priority
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
