import { useEffect, useState } from "react";
import { testPublicClient } from "../lib/publicClient";
import { checkinABI, checkinAddress } from "@/lib/checkin";

export function useCheckins(address: string) {
  const [checkins, setCheckins] = useState<number>(0);

  useEffect(() => {
    const fetchCheckins = async () => {
      if (!address) {
        return;
      }

      try {
        const checkins = await testPublicClient.readContract({
          address: checkinAddress,
          abi: checkinABI,
          functionName: "getUserCheckInCount",
          args: [address],
        });

        if (checkins) {
          setCheckins(Number(checkins));
        }
      } catch (error) {
        console.error("Error fetching checkins:", error);
      }
    };

    fetchCheckins();
  }, [address]);

  return { checkins };
}
