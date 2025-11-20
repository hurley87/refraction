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

  // Show username prompt after login
  if (ready && user && needsUsername) {
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

  if (ready && !user) {
    return (
      <div className="font-grotesk flex flex-col max-w-xl mx-auto">
        <div className="flex flex-col items-start py-8 gap-8 flex-1 max-w-md mx-auto">
          {/* Main Title with Graphic */}
          <div className="relative w-full max-w-md flex items-center justify-center my-4 mx-auto">
            {/* Yellow Wireframe Box Graphic */}
            {/* Overlapping Title */}
            <h1 className=" flex items-center justify-center text-4xl md:text-5xl font-bold uppercase tracking-tight text-center font-inktrap z-10 my-6">
              {`Welcome to IRL in Buenos Aires”`}
            </h1>
          </div>

          <div className="flex flex-col gap-1 w-full">
            {/* Call to Action Button */}
            <div className="w-full">
              <Button
                onClick={login}
                className="bg-white text-black rounded-full hover:bg-white/90 w-full font-inktrap py-6 text-base flex items-center justify-between px-6"
              >
                <span>Log in to Claim Your Wristband</span>
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

  return <>{children}</>;
}
