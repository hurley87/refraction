"use client";

import { usePrivy } from "@privy-io/react-auth";

interface AuthOnboardingProps {
  children: React.ReactNode;
}

export default function AuthOnboarding({ children }: AuthOnboardingProps) {
  const { user, ready, login } = usePrivy();

  if (!ready) {
    return (
      <div className="flex items-center justify-center text-center w-full min-h-dvh font-inktrap text-2xl">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 overflow-hidden"
        style={{
          backgroundImage: "url('/bg-green.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="w-full max-w-md mx-auto flex flex-col items-center justify-between h-fit py-6 sm:py-8 gap-6">
          {/* Map Screenshot */}
          <div className="rounded-[26px] overflow-hidden w-full h-[calc(100vh-320px)] max-h-[400px] min-h-[320px]">
            <img
              src="/map-onboarding.png"
              alt="IRL Map showing local spots to explore and check in"
              className="h-full w-full object-cover object-top"
              loading="lazy"
            />
          </div>

          {/* Descriptive Text Block */}
          <p className="text-white text-[14px] sm:text-[16px] leading-[20px] sm:leading-[22px] tracking-[-0.36px] sm:tracking-[-0.48px] text-left w-full px-2">
            IRL Maps are curated by locals shaping the scene. Click on a location to check in and earn points for future rewards at clubs, bars and galleries in your city.
          </p>

          {/* Get Started Button */}
          <button
            onClick={login}
            className="bg-white flex h-12 items-center justify-between px-4 py-2 rounded-full w-full cursor-pointer hover:bg-gray-100 transition-colors"
          >
            <span className="font-pleasure font-medium text-[16px] leading-[16px] text-[#313131] tracking-[-1.28px]">
              Get Started
            </span>
            <img src="/arrow-right.svg" alt="" className="w-6 h-6" />
          </button>
        </div>
      </div>
    );
  }

  return <div className="h-screen w-full relative">{children}</div>;
}
