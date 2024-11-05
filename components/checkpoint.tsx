"use client";

import { Button } from "@/components/ui/button";
import { useCheckInStatus } from "@/hooks/useCheckInStatus";
import { usePrivy } from "@privy-io/react-auth";
import { useState } from "react";
import { useRouter } from 'next/navigation' 
import Auth from "./auth";

interface CheckpointProps {
  id: string;
}
const checkInMessages = [
    "Check-in: Let’s get started! Click the button below to unlock your first checkpoint. Find and unlock 4 more to claim your prize and qualify for future $IRL perks.",
    "You’ve made it to the bar!\n Grab a drink, check in, and unlock this checkpoint!",
    "Welcome to TEN by RARI! Check out the art and unlock this checkpoint.",
    "Tap your phone to complete your $IRL Side Quest and claim your exclusive Refraction $IRL Bangkok merch collectible",
    "Let loose! Earn bonus $IRL with your dancefloor check-in",
    "Aenean tempor diam in eros tristique mollis. Etiam rutrum augue nec euismod tempor. Integer nec libero velit. Nulla bibendum lacus eu enim lacinia, vel volutpat velit posuere. Suspendisse at iaculis tortor. ",
  ];

  const checkedInMessages = [
    "Your Side Quest has started. Time to get yourself a drink, and continue your Side Quest to earn more $IRL and exclusive merchandise. ",
    "You’re all set— grab a drink, and continue your $IRL Side Quest at the visual art exhibition by RARI, curated by Refraction.ou’ve made it to the bar!” - “Grab a drink, check in, and unlock this checkpoint!",
    "You’re just one check-in away from claiming your exclusive Refraction $IRL Bangkok merch collectible. Head to the merch station to complete your journey.",
    "Congratulations, you’ve completed your $IRL Side Quest. Show this message to the merch table to claim your Refraction $IRL Bangkok t-shirt. It wouldn’t be a Refraction party without the music, keep your eyes out for a opportunity to earn more $IRL on the dancefloor",
    "Grab your free $IRL T-shirt at the merch stand and stay tuned for your $IRL claim. Join our TOWN to stay on top of the drop and earn more $IRL.",
    "Aenean tempor diam in eros tristique mollis. Etiam rutrum augue nec euismod tempor. Integer nec libero velit. Nulla bibendum lacus eu enim lacinia, vel volutpat velit posuere. Suspendisse at iaculis tortor. ",
  ];


export default function Checkpoint({ id }: CheckpointProps) {
  const { user } = usePrivy();
  const address = user?.wallet?.address as `0x${string}`;
  const { checkinStatus, setCheckinStatus } = useCheckInStatus(address, id);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const router = useRouter()

  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    await fetch("/api/checkin", {
      method: "POST",
      body: JSON.stringify({ checkpoint: id, walletAddress: address }),
    });
    setIsCheckingIn(false);
    setCheckinStatus(true);
  };
  

  return (
    <Auth>
      <div className=" flex  flex-col  p-6 bg-gradient-to-r from-green-600 from-10% via-blue-300 via-60% to-sky-500 to-90% items-center justify-center md:grid w-full  md:px-0 font-sans gap-3 text-BLACK dark:border-r">
        
          
            {checkinStatus ? (
              <div >
              <p>{checkedInMessages[id]}</p>
              </div>
            ) : (
              <>
                <div className="justify-center">
                  <p>{checkInMessages[id]}</p>
                </div>
                <div className="justify-center">
                  <Button onClick={handleCheckIn} disabled={isCheckingIn} className="bg-sky-600 hover:bg-sky-300 ">
                  {isCheckingIn ? "Checking in..." : `Check In #${parseInt(id) + 1}`}
                  </Button>
                </div>
              </>
            )}
            <div>
              <Button onClick={() => router.back()} className="bg-sky-600 hover:bg-sky-300 ">
                Back
              </Button>
            </div>
          
        
      </div>
      
    </Auth>
  );
}
