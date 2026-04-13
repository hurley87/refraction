'use client';

import { usePrivy } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import Image from 'next/image';

interface AuthProps {
  children: React.ReactNode;
}

export default function Auth({ children }: AuthProps) {
  const { user, ready, linkEmail, login } = usePrivy();
  const [username, setUsername] = useState('');
  const [isCreatingPlayer, setIsCreatingPlayer] = useState(false);
  const [needsUsername, setNeedsUsername] = useState(false);

  useEffect(() => {
    const checkPlayerData = async () => {
      if (user?.wallet?.address) {
        try {
          const response = await fetch(
            `/api/player?walletAddress=${encodeURIComponent(
              user.wallet.address
            )}`
          );

          if (response.ok) {
            const responseData = await response.json();
            // Unwrap the apiSuccess wrapper
            const result = responseData.data || responseData;
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
          console.error('Error checking player data:', error);
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
      const response = await fetch('/api/player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: user.wallet.address,
          email: user.email?.address || '',
          username: username.trim(),
        }),
      });

      const responseData = await response.json();

      if (responseData.success) {
        // Player created successfully
        setNeedsUsername(false);
      } else {
        console.error('Failed to create player:', responseData.error);
        // TODO: Show error message to user
      }
    } catch (error) {
      console.error('Error creating player:', error);
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

  // Show username prompt after login (same shell as default AuthWrapper: funky hero background)
  if (ready && user && needsUsername) {
    return (
      <div
        className="font-grotesk flex min-h-dvh w-full flex-col items-center justify-center px-4 py-8"
        style={{
          background: "url('/bg-funky.png') no-repeat center center fixed",
          backgroundSize: 'cover',
        }}
      >
        <div className="flex w-full max-w-md flex-col gap-6">
          <p className="text-center text-lg font-semibold tracking-tight text-foreground font-inktrap md:text-xl">
            Choose your username to start earning points
          </p>

          <div className="rounded-2xl border border-white/30 bg-white/20 p-4 backdrop-blur-sm">
            <p className="mb-3 text-sm font-inktrap uppercase text-foreground">
              ENTER YOUR USERNAME
            </p>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-full border border-border/60 bg-white py-3 pl-4 pr-4 font-inktrap text-foreground placeholder:text-muted-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
              maxLength={20}
              disabled={isCreatingPlayer}
              autoComplete="username"
            />
          </div>

          <Button
            className="flex w-full items-center justify-center rounded-full bg-white px-6 py-6 text-base font-inktrap uppercase text-black hover:bg-white/90 disabled:opacity-50"
            onClick={handleCreatePlayer}
            disabled={!username.trim() || isCreatingPlayer}
          >
            {isCreatingPlayer ? 'CREATING PLAYER...' : 'START EARNING'}
            {!isCreatingPlayer && (
              <svg
                className="ml-2 h-4 w-4"
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
              {`Welcome to IRL`}
            </h1>
          </div>

          <div className="flex flex-col gap-1 w-full">
            {/* Call to Action Button */}
            <div className="w-full">
              <Button
                onClick={login}
                className="bg-white text-black rounded-full hover:bg-white/90 w-full font-inktrap py-6 text-base flex items-center justify-between px-6"
              >
                <span>Check-in</span>
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
