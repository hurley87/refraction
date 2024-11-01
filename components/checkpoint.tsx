"use client";

import { Button } from "@/components/ui/button";
import { useCheckInStatus } from "@/hooks/useCheckInStatus";
import { usePrivy } from "@privy-io/react-auth";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Auth from "./auth";

interface CheckpointProps {
  id: string;
}

export default function Checkpoint({ id }: CheckpointProps) {
  const { user } = usePrivy();
  const address = user?.wallet?.address as `0x${string}`;
  const { checkinStatus, setCheckinStatus } = useCheckInStatus(address, id);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    await fetch("/api/checkin", {
      method: "POST",
      body: JSON.stringify({ checkpoint: id, walletAddress: address }),
    });
    setIsCheckingIn(false);
    setCheckinStatus(true);
  };

  const checkInMessages = [
    "Check-in: Let’s get started! Click the button below to unlock your first checkpoint. Find and unlock 4 more to claim your prize and qualify for future $IRL perks.",
    "You’ve made it to the bar!\n Grab a drink, check in, and unlock this checkpoint!",
    "Welcome to TEN by RARI! Check out the art and unlock this checkpoint.",
    "Tap your phone to complete your $IRL Side Quest and claim your exclusive Refraction $IRL Bangkok merch collectible",
    "Let loose! Earn bonus $IRL with your dancefloor check-in",
    "Congratulations! You’ve unlocked all checkpoints. Claim your prize and qual$IRL Side Quest complete ify for future $IRL perks.",
  ];
   const checkedInMessages = [
    "Your Side Quest has started. Time to get yourself a drink, and continue your Side Quest to earn more $IRL and exclusive merchandise. ",
    "You’re all set— grab a drink, and continue your $IRL Side Quest at the visual art exhibition by RARI, curated by Refraction.ou’ve made it to the bar!” - “Grab a drink, check in, and unlock this checkpoint!",
    "You’re just one check-in away from claiming your exclusive Refraction $IRL Bangkok merch collectible. Head to the merch station to complete your journey.",
    "Congratulations, you’ve completed your $IRL Side Quest. Show this message to the merch table to claim your Refraction $IRL Bangkok t-shirt. It wouldn’t be a Refraction party without the music, keep your eyes out for a opportunity to earn more $IRL on the dancefloor",
    "Grab your free $IRL T-shirt at the merch stand and stay tuned for your $IRL claim. Join our TOWN to stay on top of the drop and earn more $IRL.",
    "Congratulations! You’ve unlocked all checkpoints. Claim your prize and qualify for future $IRL perks.",
  ];

  return (
    <Auth>
      <div className="container relative  flex-col items-center justify-center md:grid w-full  md:px-0 font-sans">
        <div className="relative   flex flex-col  bg-gradient-to-r from-green-600 from-10% via-blue-300 via-60% to-sky-500 to-90% p-6 text-BLACK dark:border-r justify-between">
          <div className="flex ">
            <div className="flex-none">
              <Image src="/images/$IRL_PRIMARY LOGO_BLACK.svg" alt="IRL" width={100} height={100} />
            </div>
            <div className="flex-auto wd-6 ">
              &nbsp;
            </div>

            <div className="flex flex-col w-64 gap-1 text-sm text-right text-black ">
              <Link
                href="https://x.com/RefractionDAO"
                target="_blank"
                className="nounderline"
              >
                TWITTER &#x2197;
              </Link>
              <Link
                href="https://www.instagram.com/refractionfestival"
                target="_blank"
                className="nounderline"
              >
                INSTAGRAM &#x2197;
              </Link>
              <Link
                href="https://warpcast.com/refraction"
                target="_blank"
                className="nounderline"
              >
                WARPCAST &#x2197;
              </Link>
              <Link
                href="https://orb.ac/@refraction"
                target="_blank"
                className="nounderline"
              >
                ORB &#x2197;
              </Link>
            
            </div>
          </div>
        </div>
        <div className="relative   flex flex-col gap-3 bg-gradient-to-r from-green-600 from-10% via-blue-300 via-60% to-sky-500 to-90% p-6 text-BLACK dark:border-r justify-between">
          
            {checkinStatus ? (
              <p>{checkedInMessages[id]}</p>
            ) : (
              <>
              <div className="flex ">
               <p>{checkInMessages[id]}</p>
              </div>
              <div className="flex-auto">

                <Button onClick={handleCheckIn} disabled={isCheckingIn} className="bg-sky-500 hover:bg-sky-900">
                  {isCheckingIn ? "Checking in..." : `Check In #${parseInt(id) + 1}`}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </Auth>
  );
}
