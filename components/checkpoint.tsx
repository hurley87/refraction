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
      <div className="bg-gradient-to-r from-purple-500 to-pink-500">
        {checkinStatus ? (
          <p>You checked in!</p>
        ) : (
          <Button onClick={handleCheckIn} disabled={isCheckingIn}>
            {isCheckingIn ? "Checking in..." : `Check In #${parseInt(id) + 1}`}
          </Button>
        )}
      </div>
    </Auth>
  );
}
