import { useEffect, useState, useRef } from "react";

interface CheckInStatusResponse {
  hasCheckedIn: boolean;
  checkpointCheckinToday: boolean;
  dailyRewardClaimed: boolean;
  pointsEarnedToday: number;
}

export function useCheckInStatus(address: string, checkpoint: string) {
  const [checkinStatus, setCheckinStatus] = useState<boolean | null>(null);
  const [checkpointCheckinToday, setCheckpointCheckinToday] = useState(false);
  const [dailyRewardClaimed, setDailyRewardClaimed] = useState(false);
  const [pointsEarnedToday, setPointsEarnedToday] = useState(0);
  const isFetching = useRef(false);

  useEffect(() => {
    setCheckinStatus(null);
    setCheckpointCheckinToday(false);
    setDailyRewardClaimed(false);
    setPointsEarnedToday(0);

    const fetchCheckins = async () => {
      if (!address || !checkpoint || isFetching.current) {
        return;
      }

      isFetching.current = true;

      try {
        const response = await fetch(
          `/api/checkin-status?address=${address}&checkpoint=${encodeURIComponent(
            checkpoint
          )}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch check-in status");
        }

        const data: CheckInStatusResponse = await response.json();
        setCheckinStatus(data.hasCheckedIn);
        setCheckpointCheckinToday(data.checkpointCheckinToday);
        setDailyRewardClaimed(data.dailyRewardClaimed);
        setPointsEarnedToday(data.pointsEarnedToday);
      } catch (error) {
        console.error("Error fetching checkin status:", error);
        setCheckinStatus(false);
      } finally {
        isFetching.current = false;
      }
    };

    if (address && checkpoint) {
      fetchCheckins();
    }
  }, [address, checkpoint]);

  return {
    checkinStatus,
    setCheckinStatus,
    checkpointCheckinToday,
    setCheckpointCheckinToday,
    dailyRewardClaimed,
    setDailyRewardClaimed,
    pointsEarnedToday,
    setPointsEarnedToday,
  };
}
