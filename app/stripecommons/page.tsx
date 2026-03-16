'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';

export default function StripeCommonsPage() {
  const { login, authenticated, ready } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (ready && authenticated) {
      router.push('/stripecommons/success');
    }
  }, [ready, authenticated, router]);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#0A0A1A]">
      {/* Background gradient layer */}
      <div
        className="pointer-events-none absolute inset-0 -z-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, #2D1B69 0%, #0A0A1A 70%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-60"
        style={{
          backgroundImage: "url('/stripe-commons/master.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
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
            <a
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
            </a>

            {/* Privy badge */}
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
          <div className="mx-auto flex w-full max-w-[393px] flex-col items-center gap-10 text-center">
            {/* Event badge */}
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 backdrop-blur-md">
              <div className="h-2 w-2 rounded-full bg-[#6851FF] animate-pulse" />
              <span
                className="text-[11px] font-medium uppercase tracking-widest text-white/70"
                style={{ fontFamily: '"ABC Monument Grotesk Semi-Mono Unlicensed Trial", monospace' }}
              >
                March 18 · CDMX
              </span>
            </div>

            {/* Privy logo prominent */}
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                <span className="text-3xl font-bold text-[#6851FF]">P</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white">
                  Privy
                </span>
                <span className="text-lg font-light text-white/50">×</span>
                <span className="text-lg font-bold tracking-tight text-white">
                  IRL
                </span>
              </div>
            </div>

            {/* Hero heading */}
            <div className="space-y-4">
              <h1
                className="font-inktrap text-[42px] font-bold uppercase leading-[42px] tracking-[-3px] text-white"
                style={{
                  textShadow: '0 0 40px rgba(104, 81, 255, 0.3)',
                }}
              >
                Stripe Commons
              </h1>
              <p
                className="font-pleasure text-xl leading-7 text-white/80"
                style={{
                  textShadow: '0 0 16px rgba(255,255,255,0.15)',
                  letterSpacing: '-0.5px',
                }}
              >
                Welcome to Stripe Commons CDMX —{' '}
                <span className="text-white">
                  Claim Your Exclusive Artwork and IRL Points
                </span>
              </p>
            </div>

            {/* Artwork preview */}
            <div
              className="relative w-[280px] h-[280px] mx-auto overflow-hidden rounded-2xl border border-white/10"
              style={{
                boxShadow: '0 8px 40px rgba(104, 81, 255, 0.15)',
              }}
            >
              <Image
                src="/stripe-commons/master.png"
                alt="Stripe Commons Artwork"
                fill
                className="object-cover"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A1A]/60 to-transparent" />
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 backdrop-blur-sm">
                <span className="text-[10px] font-medium text-white/80">
                  Limited Edition · 150 Prints
                </span>
              </div>
            </div>

            {/* CTA button – sign in with Privy */}
            <div className="w-full space-y-3">
              <button
                type="button"
                onClick={login}
                className="flex h-14 w-full items-center justify-between rounded-full px-6 py-2 font-pleasure text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6851FF]"
                style={{
                  background:
                    'linear-gradient(135deg, #6851FF 0%, #8B5CF6 100%)',
                  boxShadow: '0 4px 24px rgba(104, 81, 255, 0.35)',
                }}
              >
                <span className="text-base font-medium tracking-tight">
                  Sign in with Privy
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
              </button>

              <p
                className="text-center text-[11px] uppercase tracking-widest text-white/40"
                style={{
                  fontFamily:
                    '"ABC Monument Grotesk Semi-Mono Unlicensed Trial", monospace',
                }}
              >
                Secure authentication by Privy
              </p>
            </div>

            {/* Partner logos */}
            <div className="flex flex-col items-center gap-3 pt-4">
              <span className="text-[10px] font-medium uppercase tracking-widest text-white/30">
                Presented by
              </span>
              <div className="flex items-center gap-6">
                <span className="text-sm font-bold tracking-tight text-white/50">
                  Privy
                </span>
                <span className="text-white/20">·</span>
                <span className="text-sm font-bold tracking-tight text-white/50">
                  IRL
                </span>
                <span className="text-white/20">·</span>
                <span className="text-sm font-bold tracking-tight text-white/50">
                  Stripe
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
