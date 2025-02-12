"use client";

import { Button } from "@/components/ui/button";
import { useCheckInStatus } from "@/hooks/useCheckInStatus";
import { usePrivy } from "@privy-io/react-auth";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Auth from "./auth";
import Image from "next/image";
import { AssignedNumber } from "./assigned-number";
interface CheckpointProps {
  id: string;
}

const website = () => {
  window.open("https://irl.energy", "_blank");
};

export default function Checkpoint({ id }: CheckpointProps) {
  const { user, logout } = usePrivy();
  const address = user?.wallet?.address as `0x${string}`;
  const email = user?.email;
  const { checkinStatus, setCheckinStatus } = useCheckInStatus(address, id);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const router = useRouter();

  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    await fetch("/api/checkin", {
      method: "POST",
      body: JSON.stringify({ checkpoint: id, walletAddress: address }),
    });

    if (id === "3") {
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
    setIsCheckingIn(false);
    setCheckinStatus(true);
  };

  return (
    <Auth>
      {id === "1" && !checkinStatus && (
        <div className="flex flex-col gap-6 pb-6">
          <img
            src="/ledger/map1.png"
            alt="ledger logo"
            className="w-full h-auto max-w-4xl"
          />
          <img
            src="/ledger/title1.png"
            alt="ledger logo"
            className="w-full h-auto max-w-4xl"
          />
          <p className="text-base font-inktrap">
            {`Rendered Frequencies reimagines the encounter between art, music and audience by placing physicality and presence at the core of its ethos.`}
            <br />
            <br />
            Digital and physical experiences are no longer diametrically
            opposed— free from this compromise of deriving value from a singular
            realm, artists and audiences are encouraged to construct meaning
            across and between the increasingly indistinct digital-physical
            divide.
            <br />
            <br />
            {`The exhibition, which takes place at Ledger’s newly unveiled and already iconic 106 HQ, features Anna Lucia, Fingacode, Kim Asendorf, Leander Herzog and Linda Dounia, exploring the essential role of seeing, experiencing, and connecting with art, music and beyond in real life. During the night of February 12th, Leander Herzog’s site specific installation of Heatsink, will be displayed in conversation with the music played throughout the evening.`}
          </p>
          <Button
            onClick={handleCheckIn}
            disabled={isCheckingIn}
            className=" text-black  bg-white rounded-lg w-full font-inktrap"
          >
            {isCheckingIn ? "Checking in..." : `CHECK-IN`}
          </Button>
        </div>
      )}
      {id === "1" && checkinStatus && (
        <div className="flex flex-col gap-6 pb-6">
          <img
            src="/ledger/map1done.png"
            alt="ledger logo"
            className="w-full h-auto max-w-4xl"
          />
          <div>
            <img
              src="/ledger/title1done.png"
              alt="ledger logo"
              className="w-full h-auto max-w-4xl"
            />
            <p className="text-base font-inktrap">
              {`Congratulations, you’ve checked in to your first Side Quest and have started earning IRL points. 
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
        <div className="flex flex-col gap-6 pb-6">
          <img
            src="/ledger/art2.png"
            alt="ledger logo"
            className="w-full h-auto max-w-4xl"
          />
          <img
            src="/ledger/title2.png"
            alt="ledger logo"
            className="w-full h-auto max-w-4xl"
          />
          <p className="text-base font-inktrap text-light">
            {`Physicality becomes a defining theme in both form and function. Just as audiences are free from compromise when choosing between digital and physical experience, Ledger doubles down on this promise by building secure products that empower the protection of assets while providing an open platform for the sharing of creativity and culture.`}
            <br />
            <br />
            {`In merging both worlds, a custom display of Ledger Stax’s builds
            into an object that serves as both a screen and a collectible
            artwork in its own right. Ledger Stax embodies the convergence of
            personalisation, uniqueness and materiality—offering not just a
            portal into the digital artwork but also a tangible artifact that
            carries its own distinct identity.`}
          </p>
          <Button
            onClick={handleCheckIn}
            disabled={isCheckingIn}
            className=" text-black  bg-white rounded-lg w-full font-inktrap"
          >
            {isCheckingIn ? "Checking in..." : `CHECK-IN`}
          </Button>
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
            {`Congratulations, you’ve checked in at the Ledger Stax Side Quest checkpoint and have earned more IRL points.`}
            <br />
            <br />
            {`It’s time to head upstairs to the 8th floor— grab a drink and visit the vending machine to collect your Ledger collectible.`}
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
        <div className="flex flex-col gap-6 pb-6">
          <img
            src="/ledger/map3.png"
            alt="ledger logo"
            className="w-full h-auto max-w-4xl"
          />
          <img
            src="/ledger/title3.png"
            alt="ledger logo"
            className="w-full h-auto max-w-4xl"
          />
          <AssignedNumber />
          <p className="text-base font-inktrap text-light">
            {`The importance of the IRL connection is not simply aesthetic but fundamental; it reaffirms art’s ability to anchor us in a tangible reality, where form, texture, and spatial presence can be fully felt. A dynamic choreography of objects, screens, and experiences—each element working to enhance the interplay between digital and physical realms. `}
            <br />
            <br />
            {`Check-in at this Side Quest checkpoint to receive your unique code to claim your collectible embroidery patch, designed by Tabitha Swanson.`}
          </p>
          <Button
            onClick={handleCheckIn}
            disabled={isCheckingIn}
            className=" text-black  bg-white rounded-lg w-full font-inktrap"
          >
            {isCheckingIn ? "Checking in..." : `CHECK-IN`}
          </Button>
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
