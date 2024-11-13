import { useEffect, useState } from "react";
import { publicClient } from "../lib/publicClient";
import { checkinABI, checkinAddress } from "@/lib/checkin";

export function useCheckins(address: string) {
  const [checkins, setCheckins] = useState<any>(null);

  if (!address) {
    return { checkins: null };
  }

  useEffect(() => {
    const fetchCheckins = async () => {
      if (!address) {
        return;
      }

      try {
        const checkins = await publicClient.readContract({
          address: checkinAddress,
          abi: checkinABI,
          functionName: "getCheckInStatus",
          args: [address],
        });

        if (checkins) {
          setCheckins(checkins);
        }
      } catch (error) {
        console.error("Error fetching checkins:", error);
      }
    };

    fetchCheckins();
  }, [address]);

  return { checkins };
}
