import { useEffect, useState, useRef } from "react";

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
        const response = await fetch(`/api/checkin-status?address=${address}`);
        console.log("response", response);
        if (!response.ok) {
          throw new Error("Failed to fetch check-in status");
        }
        const data = await response.json();
        setCheckinStatus(data.hasCheckedIn);
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
