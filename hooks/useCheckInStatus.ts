import { useEffect, useState } from "react";
import { publicClient } from "../lib/publicClient";
import { checkinABI, checkinAddress } from "@/lib/checkin";

export function useCheckInStatus(address: string, checkinId: string) {
  const [checkinStatus, setCheckinStatus] = useState<any>(null);

  useEffect(() => {
    const fetchCheckins = async () => {
      if (!address || !checkinId) {
        return;
      }

      try {
        const checkinStatus = await publicClient.readContract({
          address: checkinAddress,
          abi: checkinABI,
          functionName: "checkInStatus",
          args: [address, checkinId],
        });

        if (checkinStatus) {
          setCheckinStatus(checkinStatus);
        }
      } catch (error) {
        console.error("Error fetching checkin status:", error);
      }
    };

    fetchCheckins();
  }, [address, checkinId]);

  return { checkinStatus, setCheckinStatus };
}
