"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useCheckpointStatuses } from "@/hooks/useCheckpointStatuses";
import Auth from "./auth";
import { Button } from "./ui/button";
import { CheckCircle, Circle } from "lucide-react";

export default function Checkpoints() {
  const { user, login, ready } = usePrivy();
  const address = user?.wallet?.address as `0x${string}`;
  const { checkpointStatuses, isLoading } = useCheckpointStatuses(address);

  if (!ready || isLoading) {
    return <div className="text-center text-black">Loading...</div>;
  }

  if (!user) {
    return (
      <Button
        className="bg-white text-[#F24405] rounded-lg hover:bg-white/80 w-full max-w-4xl text-xl font-inktrap"
        onClick={login}
      >
        Get Started
      </Button>
    );
  }

  return (
    <Auth>
      <div className="flex flex-col items-center justify-center py-6 w-full">
        <div className="w-full space-y-4">
          {checkpointStatuses.map((checkpoint) => (
            <div
              key={checkpoint.id}
              className={`flex items-center justify-between p-4 rounded-lg ${
                checkpoint.isCheckedIn
                  ? "bg-green-50 border border-green-200"
                  : "bg-white/10 border border-white/20"
              }`}
            >
              <div className="mr-4">
                {checkpoint.isCheckedIn ? (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                ) : (
                  <Circle className="h-6 w-6 text-gray-400" />
                )}
              </div>
              <h3
                className={`font-inktrap text-right font-medium ${
                  checkpoint.isCheckedIn ? "text-green-700" : "text-white"
                }`}
              >
                {checkpoint.description}
              </h3>
            </div>
          ))}
        </div>
      </div>
    </Auth>
  );
}
