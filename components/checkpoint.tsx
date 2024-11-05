"use client";

import { Button } from "@/components/ui/button";
import { useCheckInStatus } from "@/hooks/useCheckInStatus";
import { usePrivy } from "@privy-io/react-auth";
import { useState } from "react";
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

  return (
    <Auth>
      <div className="relative flex-col items-center justify-center w-full  md:px-0 font-sans px-6 py-24 h-full">
        <div className="relative flex flex-col gap-3 bg-gradient-to-r from-green-600 from-10% via-blue-300 via-60% to-sky-500 to-90% p-6 text-BLACK dark:border-r justify-between">
          <div className="flex justify-center">
            {checkinStatus ? (
              <p className="text-xl text-center text-black">You checked in!</p>
            ) : (
              <Button
                onClick={handleCheckIn}
                disabled={isCheckingIn}
                className="bg-gradient-to-r from-green-600 from-10% via-blue-300 via-60% to-sky-500 to-90%"
              >
                {isCheckingIn
                  ? "Checking in..."
                  : `Check In #${parseInt(id) + 1}`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Auth>
  );
}
