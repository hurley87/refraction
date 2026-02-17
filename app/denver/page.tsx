'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

const CHECKPOINT_PATH = '/c/6a1f26acf2';

export default function DenverPage() {
  const { ready, authenticated, login } = usePrivy();
  const router = useRouter();

  const handleCta = () => {
    if (!ready) return;
    if (authenticated) {
      router.push(CHECKPOINT_PATH);
    } else {
      login();
    }
  };

  const isLoading = !ready;
  const isAuthenticated = ready && authenticated;

  return (
    <div
      className="min-h-dvh w-full flex flex-col items-center p-4 sm:p-6 relative overflow-x-hidden overflow-y-auto"
      style={{
        backgroundImage: "url('/bg-denver.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Subtle dark overlay for readable text/buttons */}
      <div
        className="absolute inset-0 bg-black/30 pointer-events-none"
        aria-hidden
      />

      <div className="relative z-10 flex flex-col items-center w-full max-w-md mx-auto gap-8 pt-6 pb-10">
        {/* Title: Welcome to / High Fidelity IRL */}
        <header className="text-center">
          <p className="font-inktrap text-white/95 text-base sm:text-lg tracking-tight mb-1">
            Welcome to
          </p>
          <h1 className="font-inktrap font-bold text-white text-3xl sm:text-4xl md:text-5xl tracking-tight uppercase leading-tight">
            High Fidelity IRL
          </h1>
        </header>

        {/* Presented By */}
        <div className="flex flex-col items-center gap-2">
          <p className="font-inktrap text-white text-xs uppercase tracking-widest">
            Presented by
          </p>
          <div className="flex items-center justify-center gap-3">
            <span className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white font-inktrap text-sm font-medium">
                p
              </span>
              <span className="font-inktrap text-white text-sm lowercase">
                privy
              </span>
            </span>
            <span className="text-white/70 font-inktrap text-sm">+</span>
            <span className="font-inktrap text-white text-sm">Bridge</span>
          </div>
        </div>

        {/* Body copy */}
        <div className="flex flex-col gap-4 text-left w-full">
          <p className="font-sans text-white text-sm sm:text-base leading-relaxed">
            IRL is a rewards platform that gives you access to global cultural
            intel. Discover curated places and events around the world, and earn
            real rewards for showing up.
          </p>
          <p className="font-sans text-white text-sm sm:text-base leading-relaxed">
            Check in at the IRL touchpoint to access the open bar at this event,
            and receive our Denver city guide featuring 40+ music, art and food
            spots curated by locals – and earn points to spend at underground
            venues in cities around the world.
          </p>
        </div>

        {/* Supported By */}
        <div className="flex flex-col items-center gap-2 w-full">
          <p className="font-inktrap text-white text-xs uppercase tracking-widest">
            Supported by
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <Image
              src="/partner_logos/Aptos_Primary_WHT.svg"
              alt="Aptos"
              width={72}
              height={24}
              className="h-5 w-auto object-contain opacity-95"
            />
            <span className="font-inktrap text-white text-sm">IRL</span>
            <span className="font-inktrap text-white text-sm">REFRACTION</span>
            <Image
              src="/partner_logos/FWB-Lettermark.svg"
              alt="FWB"
              width={40}
              height={24}
              className="h-5 w-auto object-contain opacity-95"
            />
          </div>
        </div>

        {/* CTA */}
        <div className="w-full pt-2">
          {isLoading ? (
            <p className="font-inktrap text-xl text-white text-center">
              Loading...
            </p>
          ) : (
            <Button
              onClick={handleCta}
              className="bg-white text-black rounded-full hover:bg-white/90 w-full font-inktrap py-6 text-base flex items-center justify-center gap-2 px-6 disabled:opacity-50"
              disabled={isLoading}
              aria-label={
                isAuthenticated
                  ? 'Continue to check-in'
                  : 'Authenticate to check in'
              }
            >
              {isAuthenticated
                ? 'Continue to Check-In'
                : 'Authenticate to Check In'}
              <svg
                className="w-5 h-5 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
