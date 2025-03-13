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
      {id === "1" && !checkinStatus && (
        <div className="flex justify-center items text-center w-full h-screen font-inktrap text-2xl pt-10">
          Loading ...
        </div>
      )}
      {id === "1" && checkinStatus && (
        <div className="flex flex-col items-center gap-6">
          <div>
            <h1 className="text-3xl font-inktrap justify-center text-black uppercase">
              {`YOU EARNED`}
            </h1>
            <p
              style={{ lineHeight: "70px" }}
              className="text-white text-7xl font-inktrap uppercase"
            >
              POINTS
            </p>
          </div>
          <img src="/checkpoint1.svg" className="w-2/3 h-auto mx-auto" />
          <p className=" font-inktrap text-3xl font-light">
            {`You've just gained future access to events, rewards and bespoke experiences.`}
            <br />
            <br />
            {`Learn more and be the first to know about the latest IRL network news`}
          </p>
          <Button
            onClick={() => router.push("/")}
            className="text-black  bg-white rounded-lg w-full font-inktrap"
          >
            VISIT IRL.ENERGY
          </Button>
          <img src="/rings.svg" className="h-auto" />
          <img src="/poweredbyrefraction.svg" className="h-auto" />
        </div>
      )}

      {/* Checkpoint 2 */}

      {id === "2" && !checkinStatus && (
        <div className="flex justify-center items text-center w-full h-screen font-inktrap text-2xl pt-10">
          Loading ...
        </div>
      )}
      {id === "2" && checkinStatus && (
        <div className="flex flex-col gap-6">
          <img src="/tapphone.png" className="w-2/3 h-auto mx-auto" />
          <div>
            <h1 className="text-3xl font-inktrap text-black uppercase">
              One step
            </h1>
            <p
              style={{ lineHeight: "70px" }}
              className="text-white text-7xl font-inktrap uppercase"
            >
              Closer
            </p>
          </div>
          <img src="/logos.png" className="w-full h-auto" />
          <p className="text-base font-anonymous font-light">
            {`Congratulations, you've checked in at Reset Denver, this week's busiest dance floor at ESP Hifi, with all your friends from Reown, WalletConnect, Refraction and FWB. `}
            <br />
            <br />
            {`Check in to the final Side Quest checkpoint at the Syndicate van. Track it down at `}
            <a
              href="https://communitiesfirst.xyz/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white underline hover:text-gray-200 transition-colors"
            >
              https://communitiesfirst.xyz/
            </a>
          </p>
          <img src="/build.png" className="w-3/4 mx-auto h-auto my-6" />
          <p className="text-base font-anonymous font-light">
            {`In partnership with Reown and Syndicate, and powered by Refraction's global network of artists, creatives and culture institutions, IRL bridges tangible and virtual worlds, forming the connective tissue between decentralized internet and lived reality.`}
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
        <div className="flex justify-center items text-center w-full h-screen font-inktrap text-2xl pt-10">
          Loading ...
        </div>
      )}

      {id === "3" && checkinStatus && (
        <div className="flex flex-col gap-6">
          <img src="/tapphone.png" className="w-2/3 h-auto mx-auto" />
          <div>
            <h1 className="text-3xl font-inktrap text-black uppercase">
              {`You've`}
            </h1>
            <p
              style={{ lineHeight: "60px" }}
              className="text-white text-5xl font-inktrap uppercase"
            >
              Checked In
            </p>
          </div>
          <img src="/logos.png" className="w-full h-auto" />
          <p className="text-base font-anonymous font-light">
            {`You've tracked down the Syndicate van, and have continued to earn IRL points and $WCT.`}
            <br />
            <br />
            {`In partnership with Reown and Syndicate, and powered by Refraction's global network of artists, creatives and culture institutions, IRL bridges tangible and virtual worlds, forming the connective tissue between decentralized internet and lived reality.`}
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
