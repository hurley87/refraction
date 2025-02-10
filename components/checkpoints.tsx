"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useCheckins } from "@/hooks/useCheckins";
import Auth from "./auth";
import { Button } from "./ui/button";

export default function Checkpoints() {
  const { user, login, ready } = usePrivy();
  const address = user?.wallet?.address as `0x${string}`;
  const { checkins } = useCheckins(address);

  if (!ready) {
    return <div className="text-center text-black">Loading...</div>;
  }

  if (!user) {
    return (
      <Button
        className="bg-white text-[#F24405] rounded-lg hover:bg-white/80 justify-center items-center w-full max-w-4xl text-xl font-ledger py-5"
        onClick={login}
      >
        Get Started
      </Button>
    );
  }

  const checkpointNames = ["CHECKPOINT1", "CHECKPOINT2", "CHECKPOINT3"];

  return (
    <Auth>
      <div className="flex flex-col justify-center items-center gap-6">
        <h2 className="font-ledger text-2xl">STATUS</h2>
        <div className="flex flex-col text-xl gap-3 text-white">
          {checkpointNames?.map((name, index) => (
            <div key={index} className="flex gap-6 items-center font-hmalpha">
              {checkins < index + 1 ? (
                <div className="size-5 bg-[#FF9900] rounded-full"></div>
              ) : (
                <div className="size-5 bg-[#00E232] rounded-full"></div>
              )}
              <p>{name}</p>
            </div>
          ))}
        </div>
      </div>
    </Auth>
  );
}
