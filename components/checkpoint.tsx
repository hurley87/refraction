"use client";

import { Button } from "@/components/ui/button";
import { useCheckInStatus } from "@/hooks/useCheckInStatus";
import { usePrivy } from "@privy-io/react-auth";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Auth from "./auth";
import { AssignedNumber } from "./assigned-number";
import { testPublicClient } from "@/lib/publicClient";
import { checkinABI, checkinAddress } from "@/lib/checkin";

interface CheckpointProps {
  id: string;
}

export default function Checkpoint({ id }: CheckpointProps) {
  const { user } = usePrivy();
  const address = user?.wallet?.address as `0x${string}`;
  const email = user?.email;
  const { checkinStatus, setCheckinStatus } = useCheckInStatus(address, id);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const autoCheckIn = async () => {
      // Only proceed if we have the required user data and aren't already checking in
      if (!user || !address || isCheckingIn) {
        return;
      }

      // First verify if the user is already checked in directly from the contract
      try {
        // If checkinStatus is already true, no need to check again
        if (checkinStatus) {
          return;
        }

        // Double-check with the contract to ensure we have the latest status
        const isAlreadyCheckedIn = await testPublicClient.readContract({
          address: checkinAddress,
          abi: checkinABI,
          functionName: "hasUserCheckedIn",
          args: [address, id],
        });

        // If already checked in, update the local state and exit
        if (isAlreadyCheckedIn) {
          setCheckinStatus(true);
          return;
        }

        // If we get here, user is not checked in, so proceed with check-in
        setIsCheckingIn(true);

        await fetch("/api/checkin", {
          method: "POST",
          body: JSON.stringify({ checkpoint: id, walletAddress: address }),
        });

        if (id === "3" && email) {
          await fetch("/api/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email,
            }),
          });
        }
        setCheckinStatus(true);
      } catch (error) {
        console.error("Failed to auto check-in:", error);
      } finally {
        setIsCheckingIn(false);
      }
    };

    autoCheckIn();
  }, [user, address, checkinStatus, id, email, isCheckingIn]);

  return (
    <Auth>
      {id === "1" && !checkinStatus && (
        <div className="flex flex-col gap-6 pb-6 text-center h-screen">
          Loading ...
        </div>
      )}
      {id === "1" && checkinStatus && (
        <div className="flex flex-col gap-6 pb-6">
          <div>
            <img
              src="/ledger/title1done.png"
              alt="ledger logo"
              className="w-full h-auto max-w-4xl"
            />
            <p className="text-base font-inktrap">
              {`Congratulations, you've checked in to your first Side Quest and have started earning IRL points. 
              `}
              <br />
              <br />
              Continue to the back of the lobby to explore the bespoke Stax
              artwork by Emily Edelman and find your next Side Quest checkpoint.
            </p>
          </div>
          <Button
            onClick={() => router.push("/checkpoints")}
            className="text-black  bg-white rounded-lg w-full font-inktrap"
          >
            View Checkpoint Status
          </Button>
        </div>
      )}

      {/* Checkpoint 2 */}

      {id === "2" && !checkinStatus && (
        <div className="flex flex-col gap-6 pb-6  text-center h-screen">
          Loading ...
        </div>
      )}
      {id === "2" && checkinStatus && (
        <div className="flex flex-col gap-6 pb-6">
          <img
            src="/ledger/map2done.png"
            alt="ledger logo"
            className="w-full h-auto max-w-4xl"
          />
          <img
            src="/ledger/title2done.png"
            alt="ledger logo"
            className="w-full h-auto max-w-4xl"
          />
          <p className="text-base font-inktrap">
            {`Congratulations, you've checked in at the Ledger Stax Side Quest checkpoint and have earned more IRL points.`}
            <br />
            <br />
            {`It's time to head upstairs to the 8th floor— grab a drink and visit the vending machine to collect your Ledger collectible.`}
          </p>
          <Button
            onClick={() => router.push("/checkpoints")}
            className="text-black  bg-white rounded-lg w-full font-inktrap"
          >
            View Checkpoint Status
          </Button>
        </div>
      )}

      {/* Checkpoint 3 */}

      {id === "3" && !checkinStatus && (
        <div className="flex flex-col gap-6 pb-6  text-center h-screen">
          Loading ...
        </div>
      )}

      {id === "3" && checkinStatus && (
        <div className="flex flex-col gap-6 pb-6">
          <img
            src="/ledger/map3done.png"
            alt="ledger logo"
            className="w-full h-auto max-w-4xl"
          />
          <img
            src="/ledger/title3done.png"
            alt="ledger logo"
            className="w-full h-auto max-w-4xl"
          />
          <AssignedNumber />
          <p className="text-base font-inktrap">
            {`Congratulations on completing your IRL Side Quest, powered by Refraction and Ledger.`}
            <br />
            <br />
            {`Make sure to collect your exclusive collectible patch at the vending machine using the code provided and learn more about how you can use your IRL points and stay up to date on our token launch on X at @refractionfestival.`}
          </p>
          <Button
            onClick={() => router.push("/checkpoints")}
            className="text-black  bg-white rounded-lg w-full font-inktrap"
          >
            View Checkpoint Status
          </Button>
        </div>
      )}
    </Auth>
  );
}
