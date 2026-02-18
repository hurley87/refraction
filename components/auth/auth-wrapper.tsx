"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import Image from "next/image";

interface AuthWrapperProps {
  children: React.ReactNode;
  requireUsername?: boolean;
  requireEmail?: boolean;
  unauthenticatedUI?: "default" | "map-onboarding" | "minimal";
}

export default function AuthWrapper({
  children,
  requireUsername = false,
  requireEmail = false,
  unauthenticatedUI = "default",
}: AuthWrapperProps) {
  const { user, ready, linkEmail, login } = usePrivy();
  const [username, setUsername] = useState("");
  const [isCreatingPlayer, setIsCreatingPlayer] = useState(false);
  const [needsUsername, setNeedsUsername] = useState(false);

  useEffect(() => {
    if (!requireUsername || !ready || !user?.wallet?.address) return;

    const walletAddress = user.wallet.address;
    const checkPlayerData = async () => {
      try {
        const response = await fetch(
          `/api/player?walletAddress=${encodeURIComponent(walletAddress)}`,
        );

        if (response.ok) {
          const responseData = await response.json();
          const result = responseData.data || responseData;
          const existingPlayer = result.player;

          if (existingPlayer && !existingPlayer.username) {
            setNeedsUsername(true);
          }
        } else if (response.status === 404) {
          setNeedsUsername(true);
        }
      } catch (error) {
        console.error("Error checking player data:", error);
        setNeedsUsername(true);
      }
    };

    checkPlayerData();
  }, [ready, user?.wallet?.address, requireUsername]);

  const handleCreatePlayer = async () => {
    if (!username.trim() || !user?.wallet?.address) return;

    const walletAddress = user.wallet.address;
    setIsCreatingPlayer(true);
    try {
      const response = await fetch("/api/player", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress,
          email: user.email?.address || "",
          username: username.trim(),
        }),
      });

      const responseData = await response.json();

      if (responseData.success) {
        setNeedsUsername(false);
      } else {
        console.error("Failed to create player:", responseData.error);
      }
    } catch (error) {
      console.error("Error creating player:", error);
    } finally {
      setIsCreatingPlayer(false);
    }
  };

  // Loading state
  if (!ready) {
    return (
      <div className="flex items-center justify-center text-center w-full min-h-dvh font-inktrap text-2xl">
        Loading...
      </div>
    );
  }

  // Email requirement check
  if (requireEmail && ready && user && !user.email) {
    return (
      <div className="flex items-center justify-center w-full min-h-dvh px-4">
        <div className="w-full max-w-md text-center">
          <p className="text-xl font-inktrap mb-6">
            Link your email for updates
          </p>
          <Button
            className="w-full bg-white text-black rounded-full hover:bg-white/90 text-base font-inktrap py-6 flex items-center justify-center px-6"
            onClick={linkEmail}
            aria-label="Link your email"
          >
            Link Email
          </Button>
        </div>
      </div>
    );
  }

  // Username requirement check
  if (requireUsername && ready && user && needsUsername) {
    return (
      <div className="flex flex-col gap-6 w-full justify-center max-w-xl mx-auto min-h-dvh px-4 py-8">
        <div className="flex flex-col gap-6">
          <p className="text-lg font-inktrap text-center">
            Choose your username to start earning points
          </p>

          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
            <p className="text-sm mb-3 font-inktrap uppercase">
              ENTER YOUR USERNAME
            </p>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-white/90 border-0 rounded-full pl-4 pr-4 py-3 text-black placeholder:text-gray-500 font-inktrap focus:outline-none focus:bg-white"
              maxLength={20}
              disabled={isCreatingPlayer}
            />
          </div>

          <Button
            className="w-full bg-white text-black rounded-full hover:bg-white/90 font-inktrap py-6 text-base flex items-center justify-center px-6 disabled:opacity-50 uppercase"
            onClick={handleCreatePlayer}
            disabled={!username.trim() || isCreatingPlayer}
          >
            {isCreatingPlayer ? "CREATING PLAYER..." : "START EARNING"}
            {!isCreatingPlayer && (
              <svg
                className="w-4 h-4 ml-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Unauthenticated UI
  if (ready && !user) {
    if (unauthenticatedUI === "minimal") {
      return <>{children}</>;
    }

    if (unauthenticatedUI === "map-onboarding") {
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
            {/* Map Image with Overlays */}
            <div className="rounded-[26px] overflow-hidden w-full h-[calc(100vh-320px)] max-h-[400px] min-h-[320px] flex items-center justify-center mb-4 relative">
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
                />
              </div>

              {/* Map Marker */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                <img
                  src="/marker.svg"
                  alt="Location marker"
                  className="w-20 h-20 drop-shadow-lg"
                />
              </div>

              {/* Text Below Marker */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-[calc(50%+6rem)] z-20 flex flex-col gap-1 items-center">
                <p className="text-white text-shadow-lg font-medium text-xs tracking-wider uppercase text-center">
                  PUT IT
                </p>
                <h1 className="text-white text-shadow-lg font-inktrap text-4xl font-bold tracking-tight uppercase text-center whitespace-nowrap">
                  ON THE MAP
                </h1>
              </div>
            </div>

            {/* Reward Card */}
            <div className="bg-white/65 backdrop-blur-sm rounded-[26px] p-2 w-full flex-shrink-0">
              <div className="rounded-[18px] p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 flex items-center justify-center">
                    <img
                      src="/guidance.svg"
                      alt="Guidance icon"
                      className="w-4 h-4"
                    />
                  </div>
                  <p className="text-[#4F4F4F] text-[11px] font-medium tracking-[0.44px] uppercase">
                    YOU CAN EARN
                  </p>
                </div>

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

                <p className="text-[#4F4F4F] text-[13px] leading-[16px] tracking-[-0.39px]">
                  towards Rewards, Competitions and Experiences
                </p>
              </div>
            </div>

            <p className="text-white text-[14px] sm:text-[16px] leading-[20px] sm:leading-[22px] tracking-[-0.36px] sm:tracking-[-0.48px] text-left w-full px-2">
              You&apos;ve got great taste. Share your favorite spots around the world and get rewarded when people check them out.
            </p>

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

    // Default unauthenticated UI
    return (
      <div className="font-grotesk flex flex-col max-w-xl mx-auto">
        <div className="flex flex-col items-start py-8 gap-8 flex-1 max-w-md mx-auto">
          <div className="relative w-full max-w-md flex items-center justify-center my-4 mx-auto">
            <h1 className="flex items-center justify-center text-4xl md:text-5xl font-bold uppercase tracking-tight text-center font-inktrap z-10 my-6">
              Welcome to ETHDenver Vibez Lounge
            </h1>
          </div>

          <div className="flex flex-col gap-1 w-full">
            <div className="w-full">
              <Button
                onClick={login}
                className="bg-white text-black rounded-full hover:bg-white/90 w-full font-inktrap py-6 text-base flex items-center justify-between px-6"
              >
                <span>Check in to Earn Points on IRL</span>
                <Image
                  src="/home/arrow-right.svg"
                  alt="arrow-right"
                  width={20}
                  height={20}
                />
              </Button>
            </div>

            <div className="w-full" />

            <div className="flex items-center justify-between w-full">
              <p className="text-xs uppercase tracking-wider font-inktrap opacity-80">
                POWERED BY
              </p>
              <p className="text-lg font-bold font-inktrap">REFRACTION</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated - render children
  if (unauthenticatedUI === "map-onboarding") {
    return <div className="h-screen w-full relative">{children}</div>;
  }

  return <>{children}</>;
}
