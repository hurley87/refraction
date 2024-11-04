"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useCheckins } from "@/hooks/useCheckins";
import Link from "next/link";
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
      <div className="flex flex-col">
        {checkins?.map((checkin: boolean, index: number) => (
          <Link href={`/checkpoints/${index}`} key={index}>
            <div className="flex gap-1">
              <p>{index + 1}</p>
              <p>{checkin ? "Checked In" : "Not Checked In"}</p>
            </div>
          </Link>
        ))}
      </div>
    </Auth>
  );
}
