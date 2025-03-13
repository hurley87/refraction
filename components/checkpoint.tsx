"use client";

import { Button } from "@/components/ui/button";
import { useCheckInStatus } from "@/hooks/useCheckInStatus";
import { usePrivy } from "@privy-io/react-auth";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Auth from "./auth";
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
  const hasAttemptedCheckIn = useRef(false);
  const router = useRouter();

  useEffect(() => {
    // Skip if we've already attempted a check-in in this session
    if (hasAttemptedCheckIn.current) {
      return;
    }

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

        // Mark that we've attempted a check-in to prevent duplicate attempts
        hasAttemptedCheckIn.current = true;

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

        // Make the API call to check in
        await fetch("/api/checkin", {
          method: "POST",
          body: JSON.stringify({ checkpoint: id, walletAddress: address }),
        });

        // Update the status after successful check-in
        setCheckinStatus(true);

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
      } catch (error) {
        console.error("Failed to auto check-in:", error);
        // Reset the attempt flag on error so we can try again if needed
        hasAttemptedCheckIn.current = false;
      } finally {
        setIsCheckingIn(false);
      }
    };

    // Only run the auto check-in if we have a user and the checkinStatus is not null
    // This ensures we don't run before the hook has had a chance to fetch the initial status
    if (user && checkinStatus !== null) {
      autoCheckIn();
    }
  }, [user, address, id, email, checkinStatus]);

  return (
    <Auth>
      {!checkinStatus && (
        <div className="flex justify-center items text-center w-full h-screen font-inktrap text-2xl pt-10">
          Loading ...
        </div>
      )}
      {checkinStatus && (
        <div className="flex flex-col items-center text-center py-10 gap-6">
          <div className="flex flex-col items-center gap-6">
            <div>
              <h1 className="text-4xl font-inktrap justify-center  uppercase text-[#E04220]">
                {`YOU EARNED`}
              </h1>
              <p
                style={{ lineHeight: "70px" }}
                className="text-7xl font-inktrap uppercase text-[#E04220]"
              >
                POINTS
              </p>
            </div>
            <img src="/checkpoint1.svg" className="w-2/3 h-auto mx-auto" />
            <p className=" font-inktrap text-2xl font-light">
              {`You've just gained future access to events, rewards and bespoke experiences.`}
            </p>
          </div>

          <p className=" font-inktrap text-3xl font-light pt-80">
            {`Learn more and be the first to know about the latest IRL network news`}
          </p>
          <Button
            onClick={() => router.push("/")}
            className="text-black  bg-white rounded-lg w-full font-inktrap"
          >
            VISIT IRL.ENERGY
          </Button>
          <img src="/rings.svg" className="h-auto my-20" />
          <img src="/poweredbyrefraction.svg" className="h-auto" />
        </div>
      )}
    </Auth>
  );
}
