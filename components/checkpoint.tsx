"use client";

import { Button } from "@/components/ui/button";
import { useCheckInStatus } from "@/hooks/useCheckInStatus";
import { usePrivy } from "@privy-io/react-auth";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
];

const checkedInMessages = [
  "Your Side Quest has started, time to get yourself a drink. Head to the bar to find the next checkpoint to earn more $IRL and exclusive Bangkok merchandise.",
  "You’re all set— grab a drink, and continue your $IRL Side Quest at the visual art exhibition by RARI, curated by Refraction.ou’ve made it to the bar!” - “Grab a drink, check in, and unlock this checkpoint!",
  "You’re just one check-in away from claiming your exclusive Refraction $IRL Bangkok merch collectible. Head to the merch station to complete your journey.",
  "Congratulations, you’ve completed your $IRL Side Quest. Show this message to the merch table to claim your Refraction $IRL Bangkok t-shirt. It wouldn’t be a Refraction party without the music, keep your eyes out for a opportunity to earn more $IRL on the dancefloor",
  "Grab your free $IRL T-shirt at the merch stand and stay tuned for your $IRL claim. Join our TOWN to stay on top of the drop and earn more $IRL.",
];

export default function Checkpoint({ id }: CheckpointProps) {
  const { user } = usePrivy();
  const address = user?.wallet?.address as `0x${string}`;
  const { checkinStatus, setCheckinStatus } = useCheckInStatus(address, id);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const router = useRouter();

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
      <div className="relative flex flex-col gap-3  p-6 text-BLACK dark:border-r justify-between">
        {checkinStatus ? (
          <div className="flex-auto text-black text-lg4">
            {checkedInMessages[id]}
          </div>
        ) : (
          <>
            <div className="flex-auto text-black text-lg4">
              {checkInMessages[id]}
            </div>
            <div className="flex-auto justify-center">
              <Button
                onClick={handleCheckIn}
                disabled={isCheckingIn}
                className=" text-white hover:bg-slate-800 rounded-lg"
              >
                {isCheckingIn
                  ? "Checking in..."
                  : `Check In #${parseInt(id) + 1}`}
              </Button>
            </div>
          </>
        )}
        <p>
          <Button
            onClick={() => router.push("/checkpoints")}
            className=" text-white hover:bg-slate-800 rounded-lg"
          >
            Home
          </Button>
        </p>
      </div>
    </Auth>
  );
}
