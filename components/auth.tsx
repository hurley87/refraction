"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";

interface AuthProps {
  children: React.ReactNode;
}

export default function Auth({ children }: AuthProps) {
  const { user, login, ready, linkEmail } = usePrivy();
  const [username, setUsername] = useState("");
  const [isCreatingPlayer, setIsCreatingPlayer] = useState(false);
  const [needsUsername, setNeedsUsername] = useState(false);
  const [language, setLanguage] = useState<'english' | 'french'>('english');

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
      <div className="flex justify-center w-fit mx-auto">
        <div className="flex flex-col gap-4">
          <p className="text-white font-inktrap">Link your email for updates</p>
          <div>
            <Button
              className="bg-white text-[#F24405] rounded-lg hover:bg-white/80 justify-center w-full max-w-4xl text-xl font-inktrap py-5"
              size="lg"
              onClick={linkEmail}
            >
              Link Email
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show username prompt after login
  if (ready && user && needsUsername) {
    return (
      <div className="flex flex-col gap-6 w-full justify-center max-w-xl mx-auto h-screen">
        <div className="flex flex-col gap-4">
          <h1 className="text-black text-2xl font-inktrap uppercase text-center">
            WELCOME TO THE IRL NETWORK
          </h1>
          <p className="text-black text-lg font-inktrap text-center">
            Choose your username to start earning points
          </p>

          <div className="bg-white rounded-2xl p-4 mb-4">
            <p className="text-sm text-gray-600 mb-3 font-inktrap">
              ENTER YOUR USERNAME
            </p>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-gray-50 border-0 rounded-full pl-4 pr-4 py-3 text-black placeholder:text-gray-500 font-inktrap focus:outline-none"
              maxLength={20}
              disabled={isCreatingPlayer}
            />
          </div>

          <Button
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-inktrap py-3 rounded-full disabled:opacity-50 uppercase"
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

          <div className="flex justify-between items-center mt-8">
            <div className="flex flex-col gap-1">
              <p className="text-black text-sm font-inktrap">Powered by</p>
              <img
                src="/refraction.png"
                alt="Refraction"
                className="w-auto h-[16px]"
              />
            </div>
            <img
              src="/mutek/mutek-logo.svg"
              alt="IRL Side Quest"
              className="w-[46px] h-[46px]"
            />
          </div>
        </div>
      </div>
    );
  }

  if (ready && !user) {
    return (
      <div className="flex flex-col gap-6 w-full justify-center max-w-xl mx-auto">
        <div className="flex flex-col gap-1 p-0 pt-10">
          <h1 className="text-black text-xl font-inktrap uppercase">
            CHECK IN TO
          </h1>
          <p
            style={{ lineHeight: "60px" }}
            className="text-black text-6xl font-inktrap uppercase leading-2.5"
          >
            EARN POINTS & REWARDS
          </p>
          <h1 className="text-black text-3xl font-inktrap uppercase">
            ON THE IRL NETWORK
          </h1>
          <Button
            className="bg-white text-black rounded-full hover:bg-white/80 justify-center w-full max-w-4xl text-xl font-inktrap uppercase my-4"
            onClick={login}
          >
            CHECK IN
          </Button>
        </div>

        <div className="flex justify-between items-center px-4">
          <div className="flex flex-col gap-1">
            <p className="text-black text-sm font-inktrap ">Powered by</p>
            <img
              src="/refraction.png"
              alt="Refraction"
              className="w-auto h-[16px]"
            />
          </div>
          <img
            src="/mutek/mutek-logo.svg"
            alt="IRL Side Quest"
            className="w-[128px] h-[28.75px]"
          />
        </div>
        <div className="flex flex-col gap-3  justify-between">
          <div className="flex flex-col gap-3 justify-between py-10 ">
            <div
              style={{
                backgroundImage: "url('/checkpoint.svg')",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
              className="flex flex-col gap-3 justify-between h-[calc(100dvh-5rem)] p-4 rounded-2xl overflow-hidden"
            >
              <p
                style={{ lineHeight: "40px" }}
                className="text-[#FFE600] text-3xl font-inktrap uppercase leading-2.5 rwr text-right"
              >
                {language === 'english' ? 'BE THE FIRST TO ACCESS THE IRL AIRDROP' : 'SOYEZ LES PREMIERS À ACCÉDER À L\'AIRDROP IRL'}
              </p>
              
              <p className="text-base font-anonymous text-[#FFE600] whitespace-pre-line">
                {language === 'english' 
                  ? `CHECK IN TO THE MUTEK VILLAGE NUMÉRIQUE SCAVENGER HUNT TO EARN POINTS & REWARDS ON THE IRL NETWORK \n\nVISIT ALL 5 IRL CHECKPOINTS FOR A CHANCE TO WIN A 2026 MUTEK PASSPORT \n\nPowered by Refraction, the IRL network uses blockchain technology to reward audiences, artists and fans for creating and engaging with culture. \n\nCheck in to earn IRL, gain exclusive access to experiences and rewards, and help build the new creative economy.`
                  : `ENREGISTREZ-VOUS À LA CHASSE AU TRÉSOR DU VILLAGE NUMÉRIQUE MUTEK POUR GAGNER DES POINTS ET DES RÉCOMPENSES SUR LE RÉSEAU IRL \n\nVISITEZ LES 5 POINTS DE CONTRÔLE IRL POUR TENTER DE GAGNER UN PASSEPORT MUTEK 2026 \n\nPropulsé par Refraction, le réseau IRL utilise la technologie blockchain pour récompenser les publics, les artistes et les fans pour la création et l'engagement avec la culture. \n\nEnregistrez-vous pour gagner des IRL, accéder exclusivement à des expériences et des récompenses, et aider à construire la nouvelle économie créative.`
                }
              </p>
            </div>
          </div>
          {/* Language Toggle */}
          <div className="flex justify-center mb-4">
            <div className="flex bg-gray-800 rounded-full p-1">
              <button
                onClick={() => setLanguage('english')}
                className={`px-4 py-2 rounded-full text-sm font-inktrap transition-colors ${
                  language === 'english'
                    ? 'bg-yellow-400 text-black'
                    : 'text-white hover:text-gray-300'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('french')}
                className={`px-4 py-2 rounded-full text-sm font-inktrap transition-colors ${
                  language === 'french'
                    ? 'bg-yellow-400 text-black'
                    : 'text-white hover:text-gray-300'
                }`}
              >
                FR
              </button>
            </div>
          </div>
          
          <div className="p-4">
            <h1 className="text-black text-4xl text-center font-inktrap uppercase">
              CLAIM
            </h1>
            <p className="text-black text-2xl font-inktrap uppercase leading-2.5 text-center">
              YOUR POINTS
            </p>
          </div>
          <div className="px-4">
            <Button
              className="bg-white text-black rounded-full hover:bg-white/80 justify-center text-xl w-full font-inktrap uppercase "
              onClick={login}
            >
              CHECK IN
            </Button>
          </div>
          <img
            src="/irlfooterlogo.svg"
            alt="irl"
            className="w-full h-auto mt-10"
          />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
