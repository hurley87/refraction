"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useState } from "react";

interface AuthOnboardingProps {
  children: React.ReactNode;
}

export default function AuthOnboarding({ children }: AuthOnboardingProps) {
  const { user, ready, login } = usePrivy();
  const [currentStep, setCurrentStep] = useState(1);

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
          backgroundColor: currentStep === 2 ? "#1a4d3a" : "transparent",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center h-full">
          {currentStep === 1 && (
            <>
              {/* Map Image */}
              <div className="rounded-[26px] overflow-hidden w-full aspect-square flex items-center justify-center mb-8 relative">
                <img
                  src="/map-green.png"
                  alt="Map view"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />

                {/* Text Above Marker */}
                <div className="absolute font-pleasure top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[calc(50%+6rem)] z-20">
                  <p
                    className="text-white text-center whitespace-nowrap"
                    style={{
                      textShadow: "0 0 16px rgba(255, 255, 255, 0.70)",
                      fontSize: "25px",
                      fontWeight: 500,
                      lineHeight: "28px",
                      letterSpacing: "-0.5px",
                    }}
                  >
                    Sign Up For IRL
                  </p>
                </div>

                {/* Map Marker */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                  <img
                    src="/marker.svg"
                    alt="Location marker"
                    className="w-20 h-20 drop-shadow-lg"
                  />
                </div>

                {/* Text Below Marker - Grouped with 4px gap */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-[calc(50%+6rem)] z-20 flex flex-col gap-1 items-center">
                  <p className="text-white text-shadow-lg font-medium text-xs tracking-wider uppercase text-center">
                    PUT YOURSELF
                  </p>
                  <h1 className="text-white text-shadow-lg font-inktrap text-4xl font-bold tracking-tight uppercase text-center whitespace-nowrap">
                    ON THE MAP
                  </h1>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex flex-col gap-8 items-center w-full">
                {/* Reward Card */}
                <div className="bg-white/65 backdrop-blur-sm rounded-[26px] p-2 w-full">
                  <div className="rounded-[18px] p-3 flex flex-col gap-2">
                    {/* Header */}
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 flex items-center justify-center">
                        <img
                          src="/guidance.svg"
                          alt="Guidance icon"
                          className="w-4 h-4"
                        />
                      </div>
                      <p className="text-[#4F4F4F] text-[11px] font-medium tracking-[0.44px] uppercase">
                        You can Earn
                      </p>
                    </div>

                    {/* Points Display */}
                    <div className="flex items-end gap-2 h-[67px]">
                      <div className="flex flex-col h-[44px] justify-center w-[103px]">
                        <div className="font-inktrap text-[61px] font-bold text-[#313131] tracking-[-4.88px] leading-[64px] uppercase">
                          100
                        </div>
                      </div>
                      <img
                        src="/pts.svg"
                        alt="Points"
                        className="w-[33px] h-[18px]"
                      />
                    </div>

                    {/* Description */}
                    <p className="text-[#4F4F4F] text-[13px] leading-[16px] tracking-[-0.39px]">
                      towards Rewards, Competitions and Experiences
                    </p>
                  </div>
                </div>

                {/* Get Started Button */}
                <button
                  onClick={() => setCurrentStep(2)}
                  className="bg-white flex h-12 items-center justify-between px-4 py-2 rounded-full w-full cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <span className="font-pleasure font-medium text-[16px] leading-[16px] text-[#313131] tracking-[-1.28px]">
                    Get Started
                  </span>
                  <img src="/arrow-right.svg" alt="" className="w-6 h-6" />
                </button>
              </div>
            </>
          )}

          {currentStep === 2 && (
            <>
              {/* Map Image */}
              <div className="rounded-[26px] overflow-hidden w-full aspect-square flex items-center justify-center mb-8 relative">
                <img
                  src="/map-white.svg"
                  alt="Map view"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />

                {/* Location Pin */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                  <img
                    src="/marker2.svg"
                    alt="Location marker"
                    className="w-16 h-20 drop-shadow-lg"
                  />
                </div>

                {/* New York Text */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-[calc(50%+4rem)] z-20">
                  <p className="text-white text-center font-medium text-sm">
                    New York
                  </p>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex flex-col gap-8 items-center w-full">
                {/* Headings */}
                <div className="text-center">
                  <h1
                    className="text-white font-pleasure text-[25px] font-medium leading-[28px] tracking-[-0.5px] mb-4"
                    style={{
                      textShadow: "rgba(255,255,255,0.7) 0px 0px 16px",
                    }}
                  >
                    Tag Your City
                  </h1>
                  <h2
                    className="text-white font-pleasure text-[39px] font-medium leading-[40px] tracking-[-2.34px] mb-6"
                    style={{
                      textShadow: "rgba(255,255,255,0.7) 0px 0px 16px",
                    }}
                  >
                    Earn Your First Points
                  </h2>
                  <p className="text-white text-[16px] leading-[22px] tracking-[-0.48px] px-4">
                    Share your city to verify your presence and join a global
                    network of creators, artists, and culture enthusiasts
                    building the future of experiences together.
                  </p>
                </div>

                {/* Search For Your City Button */}
                <button
                  onClick={login}
                  className="bg-white flex h-12 items-center justify-between px-4 py-2 rounded-full w-full cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <span className="font-pleasure font-medium text-[16px] leading-[16px] text-[#313131] tracking-[-1.28px]">
                    Search For Your City
                  </span>
                  <img src="/arrow-right.svg" alt="" className="w-6 h-6" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return <div className="h-screen w-full relative">{children}</div>;
}
