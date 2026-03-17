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
      <div className="flex min-h-dvh items-center justify-center bg-[#f5f0e8]">
        <p className="text-sm text-black/50">Loading...</p>
      </div>
    );
  }

  if (!authenticated) return null;

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#f5f0e8]">
      {/* Background gradient layer – match stripecommons/page.tsx */}
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
        {/* Header – match stripecommons/page.tsx */}
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
                src="/home/IRL.png"
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
            {/* Success icon */}
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full bg-[#16A34A]"
              style={{
                boxShadow: '0 4px 24px rgba(22, 163, 74, 0.25)',
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

            {/* Hero heading – match stripecommons typography */}
            <div className="space-y-4">
             
              <p className="hero-text self-stretch text-cemter text-black">
                Check-in complete!
                <br />
              </p>
           
            </div>

            {/* Success message */}
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

           

            {/* CTA – match stripecommons button style */}
            <div className="w-full space-y-3">
              <Link
                href="/stripecommons/artwork"
                className="flex h-[52px] w-full justify-center items-center gap-2.5 rounded-full bg-white hover:bg-gray-100 transition-colors cursor-pointer title3 text-[#313131] font-grotesk whitespace-nowrap"
              >
                Claim Your Artwork + Points
              </Link>
             
            </div>

            {/* Partner logos – match stripecommons/page.tsx */}
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
                  src="/IRL-SVG/$IRL_SECONDARY LOGO ICON_BLACK.svg"
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
