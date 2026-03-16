'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';

export default function StripeCommonsSuccessPage() {
  const { authenticated, ready } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/stripecommons');
    }
  }, [ready, authenticated, router]);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0A0A1A]">
        <p className="text-sm text-white/50">Loading...</p>
      </div>
    );
  }

  if (!authenticated) return null;

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#0A0A1A]">
      {/* Background gradient */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 30%, #1a3a2a 0%, #0A0A1A 70%)',
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
                Signed in with
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
            {/* Success icon */}
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full"
              style={{
                background:
                  'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                boxShadow: '0 4px 24px rgba(34, 197, 94, 0.3)',
              }}
            >
              <svg
                width="36"
                height="36"
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
            </div>

            {/* Heading */}
            <div className="space-y-3">
              <p className="font-pleasure text-xl text-white/70">
                Check-in complete!
              </p>
              <h1
                className="font-inktrap text-[36px] font-bold uppercase leading-[38px] tracking-[-2.5px] text-white"
                style={{ textShadow: '0 0 30px rgba(34, 197, 94, 0.2)' }}
              >
                Welcome to Stripe Commons
              </h1>
            </div>

            {/* Success message */}
            <p
              className="leading-[22px] text-white/70"
              style={{
                fontFamily: '"ABC Monument Grotesk Semi-Mono Unlicensed Trial", monospace',
                fontSize: '14px',
                letterSpacing: '-0.28px',
              }}
            >
              You showed up and signed in with Privy. Make sure to grab your
              limited edition artwork print at the checkpoint, and enjoy the rest
              of your Stripe Commons! See you IRL again soon.
            </p>

            {/* CTA → artwork claim */}
            <Link
              href="/stripecommons/artwork"
              className="flex h-14 w-full items-center justify-between rounded-full px-6 py-2 font-pleasure text-white transition hover:opacity-90"
              style={{
                background:
                  'linear-gradient(135deg, #6851FF 0%, #8B5CF6 100%)',
                boxShadow: '0 4px 24px rgba(104, 81, 255, 0.35)',
              }}
            >
              <span className="text-base font-medium tracking-tight">
                Claim Your Artwork + Points
              </span>
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
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
            </Link>

            {/* Info card */}
            <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[#6851FF]" />
                  <span
                    className="text-[11px] font-medium uppercase tracking-widest text-white/50"
                    style={{
                      fontFamily:
                        '"ABC Monument Grotesk Semi-Mono Unlicensed Trial", monospace',
                    }}
                  >
                    What you&apos;ll receive
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-white/5 p-3 text-center">
                    <p className="font-inktrap text-2xl font-bold text-white">
                      NFT
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-white/40">
                      Artwork
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3 text-center">
                    <p className="font-inktrap text-2xl font-bold text-white">
                      100
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-white/40">
                      Points
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3 text-center">
                    <p className="font-inktrap text-2xl font-bold text-white">
                      1/1
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-white/40">
                      Print
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Partner footer */}
            <div className="flex items-center gap-3 pt-2">
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
