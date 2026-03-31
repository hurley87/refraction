'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import ClaimHeader from '@/components/claim/claim-header';
import ClaimFooter from '@/components/claim/claim-footer';
import { usePrivy } from '@privy-io/react-auth';

export default function ClaimLoginPage() {
  const { login, authenticated, ready } = usePrivy();
  const router = useRouter();

  // Redirect to login success page if already authenticated (only after Privy is ready)
  useEffect(() => {
    if (ready && authenticated) {
      router.push('/claim/login/success');
    }
  }, [ready, authenticated, router]);

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
              className="origin-center scale-[2.25] object-cover object-center"
              sizes="100vw"
              priority
            />
            <div className="absolute inset-0 bg-white/[0.72]" />
          </div>
          <div className="relative mx-auto flex w-full max-w-[393px] flex-col items-center gap-16 text-center md:max-w-[574px]">
            <div className="flex w-full flex-col items-center space-y-6 pt-[100px]">
              <span className="hero-text display2 text-black font-inktrap">
                Welcome to
                <br /> WalletCon Cannes!
              </span>
              <div className="flex min-h-[74px] w-full max-w-[574px] md:w-[574px] flex-col justify-center self-stretch text-black title3 font-grotesk">
                IRL connects you to what’s happening in music and art scenes
                around the world — curated by locals.
                <br />
                <br />
                Discover venues, events, and support independent culture while
                earning rewards.
                <br />
                <br />
                Check in now to unlock a limited-run digital artwork and
                collectible print, created exclusively for WalletCon Cannes by
                Dominique Falcone.
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={login}
                  className="flex w-[260px] h-12 py-2 pl-4 pr-1 justify-between items-center shrink-0 rounded-full bg-[#307FE2]  text-white transition hover:bg-[#307FE2]/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black font-pleasure"
                >
                  <span
                    style={{
                      color: 'var(--UI-White, #FFF)',
                      fontFamily: '"Pleasure"',
                      fontSize: '16px',
                      fontStyle: 'normal',
                      fontWeight: 500,
                      lineHeight: '16px',
                      letterSpacing: '-1.28px',
                    }}
                  >
                    Login With Email
                  </span>
                  <Image
                    src="/wct/walletconnect-button.svg"
                    alt="WalletConnect Button"
                    width={38}
                    height={38}
                    className="h-[38px] w-[38px] z-20"
                  />
                </button>
              </div>

              <div className="mx-auto flex w-full max-w-[375px] flex-col items-center justify-center gap-4 px-4 pt-[34px] text-center">
                <span className="body-small font-grotesk text-black text-center">
                  POWERED BY
                </span>
                <Image
                  src="/logos/walletconnect white 1.svg"
                  alt="WalletConnect"
                  width={221}
                  height={24}
                  className="mx-auto"
                  style={{
                    width: '221px',
                    height: '24px',
                    aspectRatio: '221 / 24',
                  }}
                />

                <Image
                  src="/refraction-black.svg"
                  alt="Refraction"
                  width={200}
                  height={40}
                  className="mx-auto h-auto w-[160px]"
                />
              </div>
            </div>
          </div>
        </main>

        <ClaimFooter />
      </div>
    </div>
  );
}
