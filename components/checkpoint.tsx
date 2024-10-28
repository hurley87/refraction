"use client";

import { Button } from "@/components/ui/button";
import { useCheckInStatus } from "@/hooks/useCheckInStatus";
import { usePrivy } from "@privy-io/react-auth";
import { useState } from "react";

interface CheckpointProps {
  id: string;
}

export default function Checkpoint({ id }: CheckpointProps) {
  const { user, login } = usePrivy();
  const address = user?.wallet?.address as `0x${string}`;
  const { checkinStatus, setCheckinStatus } = useCheckInStatus(address, id);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  if (!address) {
    return (
      <div>
        <p>Please connect your wallet to view your checkpoints</p>
        <Button onClick={login}>Connect Wallet</Button>
      </div>
    );
  }

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
    <div>
      {checkinStatus ? (
        <p>You checked in!</p>
      ) : (
        <Button onClick={handleCheckIn} disabled={isCheckingIn}>
          {isCheckingIn ? "Checking in..." : `Check In #${parseInt(id) + 1}`}
        </Button>
      )}
    </div>
  );
}
