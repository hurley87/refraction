'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { WelcomeEllipse } from '@/components/shared/welcome-ellipse';
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
    <div className="relative min-h-dvh overflow-hidden bg-[#f5f0e8]">
      {/* Background gradient layer inspired by reference image */}
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
        {/* Header */}
        <header className="flex justify-center px-4 pt-4">
          <div
            className="flex h-[53px] w-full max-w-[393px] items-center justify-between rounded-full border border-black/10 px-4 py-2"
            style={{
              background:
                'linear-gradient(180deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.02) 100%)',
              backdropFilter: 'blur(32px)',
            }}
          >
            <a
              href="/"
              className="relative flex size-[40px] shrink-0 items-center justify-center rounded-full bg-black/10"
            >
              <Image
                src="/home/IRL.png"
                alt="IRL"
                width={27}
                height={14}
                className="block invert"
              />
            </a>

            {/* Privy badge */}
            <div className="flex items-center gap-1.5 rounded-full bg-black/10 px-3 py-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-black/60">
                Powered by
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
            {/* Event badge – styled like hero "Welcome to IRL" */}

            {/* Privy logo prominent */}
            <div className="flex flex-col items-center gap-3 py-10">
              <div className="w-full max-w-[393px]">
                <Image
                  src="/stripecommons/privy-black.png"
                  alt="Privy"
                  width={393}
                  height={80}
                  className="h-auto w-full object-contain"
                />
              </div>
            </div>

            {/* Hero heading */}

            <div className="space-y-4">
              <div className="flex items-center gap-2 self-start">
                <WelcomeEllipse />
                <span className="title5 font-grotesk text-black">
                  March 18 2026
                </span>
              </div>
              <p className="hero-text self-stretch text-left text-black">
                Welcome to Stripe Commons CDMX
                <br />
              </p>
              <p className="title3 font-grotesk text-black text-center">
                Claim Your Exclusive Artwork and IRL Points
              </p>
            </div>

            {/* Artwork preview + subcopy – full width on mobile, same as content on desktop */}
            <div className="flex w-screen max-w-none flex-col items-center gap-2 relative px-4 md:w-full">
              <div
                className="relative w-full aspect-square overflow-hidden rounded-2xl border border-black/10"
                style={{
                  boxShadow: '0 8px 40px rgba(104, 81, 255, 0.15)',
                }}
              >
                <Image
                  src="/stripecommons/master.png"
                  alt="Stripe Commons Artwork"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <p
                className="text-center text-[11px] uppercase tracking-widest text-black/50"
                style={{
                  fontFamily:
                    '"ABC Monument Grotesk Semi-Mono Unlicensed Trial", monospace',
                }}
              >
                Limited Edition · 150 Prints
              </p>
            </div>

            {/* CTA button – sign in with Privy (match homepage hero CTA) */}
            <div className="w-full space-y-3">
              <button
                type="button"
                onClick={login}
                className="flex h-[52px] w-full justify-center items-center gap-2.5 rounded-full bg-white hover:bg-gray-100 transition-colors cursor-pointer title3 text-[#313131] font-grotesk whitespace-nowrap"
              >
                Sign In
              </button>

              <p
                className="text-center text-[11px] uppercase tracking-widest text-black/50"
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
                  src="/irl-svg/$IRL_SECONDARY LOGO ICON_BLACK.svg"
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
