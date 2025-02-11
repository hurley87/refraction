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

const checkpointImage = [
  "",
  "/images/checkpoint1-image.png",
  "/images/checkpoint2-image.png",
  "/images/checkpoint3-image.png",
  "/images/checkpoint4-image.png",
]
const checkpointBlockText = [
  "",
  "/images/checkpoint1-blockText.png",
  "/images/checkpoint2-blockText.png",
  "/images/checkpoint3-blockText.png",
  "/images/checkpoint4-blockText.png",
]

const checkpointCompletedImage = [
  "",
  "/images/checkpoint1-completedImage.png",
  "/images/checkpoint2-completedImage.png",
  "/images/checkpoint3-completedImage.png",
  "/images/checkpoint4-completedImage.png",
]
const checkpointCompletedText = [
  "",
  "/images/checkpoint1-completedText.png",
  "/images/checkpoint2-completedText.png",
  "/images/checkpoint3-completedText.png",
  "/images/checkpoint4-completedText.png",
]

const checkInTitles = [
  "",
  "Welcome to Rendered Frequencies @ Ledger 106",
  "Ledger Stax Installation",
  "Free from Compromise",
];


const checkInMessages = [
  "",
  "Rendered Frequencies reimagines the encounter between art, music and audience by placing physicality and presence at the core of its ethos. \n\nDigital and physical experiences are no longer diametrically opposed— free from this compromise of deriving value from a singular realm, artists and audiences are encouraged to construct meaning across and between the increasingly indistinct digital-physical divide. \n\nThe exhibition, which takes place at Ledger’s newly unveiled and already iconic 106 HQ, features Anna Lucia, Fingacode, Kim Asendorf, Leander Herzog and Linda Dounia, exploring the essential role of seeing, experiencing, and connecting with art, music and beyond in real life. During the night of February 12th, Leander Herzog’s site specific installation of Heatsink, will be displayed in conversation with the music played throughout the evening.",
  "Physicality becomes a defining theme in both form and function. Just as audiences are free from compromise when choosing between digital and physical experience, Ledger doubles down on this promise by building secure products that empower the protection of assets while providing an open platform for the sharing of creativity and culture. \n\nIn merging both worlds, a custom display of Ledger Stax’s builds into an object that serves as both a screen and a collectible artwork in its own right. Ledger Stax embodies the convergence of personalisation, uniqueness and materiality—offering not just a portal into the digital artwork but also a tangible artifact that carries its own distinct identity.",
  "The importance of the IRL connection is not simply aesthetic but fundamental; it reaffirms art’s ability to anchor us in a tangible reality, where form, texture, and spatial presence can be fully felt. A dynamic choreography of objects, screens, and experiences—each element working to enhance the interplay between digital and physical realms. \n\nCheck-in at this Side Quest checkpoint to receive your unique code to claim your collectible embroidery patch, designed by Tabitha Swanson.",
];

const checkedInTitles = [
  "",
  "You’ve started your Side Quest!",
  "One step closer...",
  "You’re In!",
];

const checkedInMessages = [
  "",
  "Congratulations, you’ve checked in to your first Side Quest and have started earning IRL points. \n\nContinue to the back of the lobby to explore the bespoke Stax artwork by Emily Edelman and find your next Side Quest checkpoint.",
  "Congratulations, you’ve checked in at the Ledger Stax Side Quest checkpoint and have earned more IRL points. It’s time to head upstairs to the 8th floor— grab a drink and visit the vending machine to collect your Ledger collectible.",
  "Claim your physical collectible at the vending machine.",
];

export default function Checkpoint({ id }: CheckpointProps) {
  const { user } = usePrivy();
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
      <div className="flex flex-col gap-6">
        {checkinStatus ? (
          <div className="flex flex-col gap-6 ">
            <div className="flex flex-col justify-center items-center gap-6">
              
                <Image
                  src={checkpointCompletedImage[id]}
                  alt="map"
                  width={393}
                  height={310}
                />
                
              
            </div>
            <div className="flex flex-col justify-center items-center gap-6">
              
                <Image
                  src={checkpointCompletedText[id]}
                  alt="map"
                  width={393}
                  height={310}
                />
                
              
            </div>
            <div className="flex flex-col text-white font-hmalpha whitespace-pre-wrap">
              {checkedInMessages[id]}
            </div>
            {id === "3" && <AssignedNumber />}
            <div className="">
              <Button
                onClick={() => router.push("/checkpoints")}
                className=" text-white hover:bg-slate-800 rounded-lg w-full font-hmalpha border-none shadow-none"
              >
                View Checkpoint Status
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col justify-center items-center gap-6">
            <Image
              src={checkpointImage[id]}
              alt="map"
              width={423}
              height={238}
            />
            
            <Image
              src={checkpointBlockText[id]}
              alt="map"
              width={361}
              height={246}
            />
  
            <div className=" text-white text-lg4 font-hmalpha whitespace-pre-wrap">
              {checkInMessages[id]}
            </div>
            {id === "3" && <AssignedNumber />}

            <div className="flex flex-col gap-2 justify-center">
              <Button
                onClick={handleCheckIn}
                disabled={isCheckingIn}
                className=" text-white hover:bg-slate-800 bg-[#F24405] rounded-lg w-full font-inktrap"
              >
                {isCheckingIn ? "Checking in..." : `CHECK-IN`}
              </Button>
              <Button
                onClick={website}
                className=" text-black hover:bg-slate-100  rounded-lg w-full font-inktrap border-none"
              >
                VISIT IRL.ENERGY
              </Button>
            </div>
          </div>
        )}
      </div>
    </Auth>
  );
}
