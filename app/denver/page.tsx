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
      className="min-h-dvh h-dvh w-full flex flex-col items-center p-4 sm:p-6 relative overflow-x-hidden overflow-y-auto"
      style={{
        backgroundImage: "url('/denver/high-fid-bg.png')",
        backgroundSize: '100% 100%',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Subtle dark overlay for readable text/buttons */}
      <div
        className="absolute inset-0 bg-black/30 pointer-events-none"
        aria-hidden
      />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-between w-full max-w-md mx-auto pt-6 pb-10">
        {/* Title: Welcome to / High Fidelity IRL */}
        <header className="text-center shrink-0">
          <p className="font-inktrap text-white/95 text-base sm:text-lg tracking-tight mb-1">
            Welcome to
          </p>
          <h1 className="font-inktrap font-bold text-white text-3xl sm:text-4xl md:text-5xl tracking-tight uppercase leading-tight">
            High Fidelity IRL
          </h1>
          <h2 className="font-inktrap text-white text-base sm:text-lg tracking-tight mb-1">
            ESP Hi-Fi · ETHDenver 2026
          </h2>
        </header>

        {/* CTA */}
        <div className="w-full shrink-0">
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

        {/* Powered By */}
        <div className="flex flex-col items-center gap-2 w-full shrink-0">
          <p className="font-inktrap text-black text-xs uppercase tracking-widest">
            Powered by
          </p>
          <div className="flex flex-nowrap items-center justify-center gap-4 sm:gap-6">
            <Image
              src="/denver/aptos-apt-logo-full.svg"
              alt="Aptos"
              width={80}
              height={32}
              className="h-6 w-16 object-contain opacity-95 shrink-0"
            />
            <Image
              src="/denver/bridge-black.png"
              alt="Bridge"
              width={80}
              height={32}
              className="h-6 w-16 object-contain opacity-95 shrink-0"
            />
            <Image
              src="/denver/privy.svg"
              alt="Privy"
              width={80}
              height={32}
              className="h-6 w-16 object-contain opacity-95 shrink-0"
            />
            <Image
              src="/refraction-black.svg"
              alt="Refraction"
              width={90}
              height={32}
              className="h-6 w-16 object-contain opacity-95 shrink-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
