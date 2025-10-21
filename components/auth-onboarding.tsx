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
        className="h-screen w-full flex items-center justify-center p-6 overflow-hidden"
        style={{
          backgroundImage: "url('/bg-green.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center h-full py-8">
          {/* Map Image */}
          <div className="rounded-[26px] overflow-hidden w-full max-w-sm aspect-square flex items-center justify-center mb-8 relative">
            <img
              src="/map-green.png"
              alt="Map view"
              className="h-full w-full object-cover"
              loading="lazy"
            />
            {/* Map Marker */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
              <img
                src="/marker.svg"
                alt="Location marker"
                className="w-20 h-20 drop-shadow-lg"
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="flex flex-col gap-8 items-center w-full">
            {/* Title */}
            <div className="text-center text-white uppercase">
              <p className="text-shadow-lg font-medium text-xs tracking-wider mb-1">
                Put Yourself
              </p>
              <h1 className="font-inktrap text-6xl font-bold tracking-tight leading-tight">
                ON THE MAP
              </h1>
            </div>

            {/* Reward Card */}
            <div className="bg-white/65 backdrop-blur-sm rounded-[26px] p-2 w-full">
              <div className="bg-white rounded-[18px] p-3 flex flex-col gap-2">
                {/* Header */}
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M8 1L10.5 5.5L15 6L11.5 9.5L12.5 14L8 11.5L3.5 14L4.5 9.5L1 6L5.5 5.5L8 1Z"
                        fill="#4F4F4F"
                      />
                    </svg>
                  </div>
                  <p className="text-[#4F4F4F] text-xs font-medium tracking-wider uppercase">
                    You can Earn
                  </p>
                </div>

                {/* Points Display */}
                <div className="flex items-end gap-2">
                  <div className="font-inktrap text-6xl font-bold text-[#313131] tracking-tight leading-none">
                    100
                  </div>
                  <div className="bg-[#313131] rounded-full px-2 py-1 mb-2">
                    <span className="text-white text-xs font-medium">PTS</span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-[#4F4F4F] text-sm leading-relaxed">
                  towards Rewards, Competitions and Experiences
                </p>
              </div>
            </div>

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
      </div>
    );
  }

  return <div className="h-screen w-full relative">{children}</div>;
}
