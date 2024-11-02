"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useCheckins } from "@/hooks/useCheckins";
import Auth from "./auth";

export default function Checkpoints() {
  const { user } = usePrivy();
  const address = user?.wallet?.address as `0x${string}`;
  const { checkins } = useCheckins(address);

  console.log("address", address);
  console.log("checkins", checkins);

  if (address && !checkins) {
    return <div>Loading...</div>;
  }

  return (
    <Auth>
      <div className="flex flex-col p-6  ">
        Checkpoints: 
        {checkins.map((checkin: boolean, index: number) => (      
            <div key={index} className="flex gap-1 text-center">
              <p>{index + 1}</p>
              <p>{checkin ? "Checked In" : "Not Checked In"}</p>
            </div>
          
        ))}
      </div>
    </Auth>
  );
}
