"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";
import Image from "next/image";

interface AuthProps {
  children: React.ReactNode;
}

export default function Auth({ children }: AuthProps) {
  const { user, ready, linkEmail, login } = usePrivy();
  const [username, setUsername] = useState("");
  const [isCreatingPlayer, setIsCreatingPlayer] = useState(false);
  const [needsUsername, setNeedsUsername] = useState(false);

  //console.log("user", user);

  // Check for existing player data when user is ready and has wallet
  useEffect(() => {
    const checkPlayerData = async () => {
      if (user?.wallet?.address) {
        try {
          const response = await fetch(
            `/api/player?walletAddress=${encodeURIComponent(
              user.wallet.address,
            )}`,
          );

          if (response.ok) {
            const result = await response.json();
            const existingPlayer = result.player;

            // If player exists but has no username, prompt for username
            if (existingPlayer && !existingPlayer.username) {
              setNeedsUsername(true);
            }
          } else if (response.status === 404) {
            // New player, needs username
            setNeedsUsername(true);
          }
        } catch (error) {
          console.error("Error checking player data:", error);
          // Assume new player if error occurs
          setNeedsUsername(true);
        }
      }
    };

    if (ready && user?.wallet?.address) {
      checkPlayerData();
    }
  }, [ready, user?.wallet?.address]);

  const handleCreatePlayer = async () => {
    if (!username.trim() || !user?.wallet?.address) return;

    setIsCreatingPlayer(true);
    try {
      const response = await fetch("/api/player", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: user.wallet.address,
          email: user.email?.address || "",
          username: username.trim(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Player created successfully
        setNeedsUsername(false);
      } else {
        console.error("Failed to create player:", result.error);
        // TODO: Show error message to user
      }
    } catch (error) {
      console.error("Error creating player:", error);
      // TODO: Show error message to user
    } finally {
      setIsCreatingPlayer(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex items-center justify-center text-center w-full min-h-dvh font-inktrap text-2xl">
        Loading...
      </div>
    );
  }

  if (ready && user && !user.email) {
    return (
      <div className="flex items-center justify-center w-full min-h-dvh px-4">
        <div className="w-full max-w-md text-center">
          <p className="text-white text-xl font-inktrap mb-6">
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

  // Show username prompt after login
  if (ready && user && needsUsername) {
    return (
      <div className="flex flex-col gap-6 w-full justify-center max-w-xl mx-auto min-h-dvh px-4 py-8">
        <div className="flex flex-col gap-6">
          <h1 className="text-white text-2xl font-inktrap uppercase text-center">
            WELCOME TO THE IRL NETWORK
          </h1>
          <p className="text-white text-lg font-inktrap text-center">
            Choose your username to start earning points
          </p>

          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
            <p className="text-sm text-white mb-3 font-inktrap uppercase">
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

          <div className="flex items-center justify-between w-full mt-8">
            <p className="text-white text-xs uppercase tracking-wider font-inktrap opacity-80">
              POWERED BY
            </p>
            <p className="text-white text-lg font-bold font-inktrap">
              REFRACTION
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (ready && !user) {
    return (
      <div className="font-grotesk flex flex-col">
        <div className="flex flex-col items-start py-8 gap-8 flex-1">
          {/* Main Title with Graphic */}
          <div className="relative w-full max-w-md flex items-center justify-center my-4 mx-auto">
            {/* Yellow Wireframe Box Graphic */}
            <img
              src="/yellow-points.png"
              alt="Points earned graphic"
              className="w-full h-auto object-contain"
            />
            {/* Overlapping Title */}
            <h1 className="absolute inset-0 flex items-center justify-center text-5xl md:text-6xl font-bold text-white uppercase tracking-tight text-center font-inktrap z-10">
              YOU EARNED POINTS
            </h1>
          </div>

          {/* Points Display */}
          <div className="flex gap-3 w-full mt-2 justify-between">
            <p className="text-white text-xs uppercase tracking-wider font-grotesk pt-1">
              YOU EARNED
            </p>
            <div className="flex items-start gap-2">
              <span
                style={{ lineHeight: "0.6" }}
                className="text-7xl md:text-8xl font-bold text-white font-inktrap "
              >
                {100}
              </span>
              <div className="text-xs text-white font-grotesk uppercase flex flex-col items-end justify-end h-full">
                <span className="text-xs text-white font-grotesk uppercase bg-gray-500/40 rounded-full px-2.5 py-1 flex flex-col items-end justify-end h-fit">
                  PTS
                </span>
              </div>
            </div>
          </div>

          {/* Descriptive Text */}
          <div className="">
            <p className="text-white text-sm leading-relaxed font-grotesk">
              You&apos;ve just gained access to events, rewards and bespoke
              experiences. Sign Up to save these points and join a global
              network lorem ipsum.
            </p>
          </div>

          <div className="flex flex-col gap-1 w-full">
            {/* Call to Action Button */}
            <div className="w-full">
              <Button
                onClick={login}
                className="bg-white text-black rounded-full hover:bg-white/90 w-full font-inktrap py-6 text-base flex items-center justify-between px-6"
              >
                <span>Create Your Profile and Save</span>
                <Image
                  src="/home/arrow-right.svg"
                  alt="arrow-right"
                  width={20}
                  height={20}
                />
              </Button>
            </div>

            {/* Spacer to push footer down */}
            <div className="w-full" />

            {/* Footer - Powered by Refraction */}
            <div className="flex items-center justify-between w-full">
              <p className="text-white text-xs uppercase tracking-wider font-inktrap opacity-80">
                POWERED BY
              </p>
              <p className="text-white text-lg font-bold font-inktrap">
                REFRACTION
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
