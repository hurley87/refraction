import { useEffect, useState, useRef } from "react";
import { testPublicClient } from "../lib/publicClient";
import { checkinABI, checkinAddress } from "@/lib/checkin";

export function useCheckInStatus(address: string, checkinId: string) {
  const [checkinStatus, setCheckinStatus] = useState<boolean | null>(null);
  const isFetching = useRef(false);

  useEffect(() => {
    // Reset status when address or checkinId changes
    setCheckinStatus(null);

    const fetchCheckins = async () => {
      // Skip if we don't have the required data or if we're already fetching
      if (!address || !checkinId || isFetching.current) {
        return;
      }

      // Set fetching flag to prevent duplicate calls
      isFetching.current = true;

      try {
        const status = await testPublicClient.readContract({
          address: checkinAddress,
          abi: checkinABI,
          functionName: "hasUserCheckedIn",
          args: [address, checkinId],
        });

        // Only update if the component is still mounted and the address/id haven't changed
        setCheckinStatus(!!status);
      } catch (error) {
        console.error("Error fetching checkin status:", error);
        setCheckinStatus(false);
      } finally {
        isFetching.current = false;
      }
    };

    if (address && checkinId) {
      fetchCheckins();
    }
  }, [address, checkinId]);

  return { checkinStatus, setCheckinStatus };
}
