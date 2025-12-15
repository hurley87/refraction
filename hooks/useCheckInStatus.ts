import { useQuery } from "@tanstack/react-query";

interface CheckInStatusResponse {
  hasCheckedIn: boolean;
  checkpointCheckinToday: boolean;
  dailyRewardClaimed: boolean;
  pointsEarnedToday: number;
}

async function fetchCheckInStatus(
  address: string,
  checkpoint: string,
): Promise<CheckInStatusResponse> {
  const response = await fetch(
    `/api/checkin-status?address=${address}&checkpoint=${encodeURIComponent(
      checkpoint,
    )}`,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch check-in status");
  }

  return response.json();
}

export function useCheckInStatus(address: string, checkpoint: string) {
  const { data, ...rest } = useQuery({
    queryKey: ["checkinStatus", address, checkpoint],
    queryFn: () => fetchCheckInStatus(address, checkpoint),
    enabled: !!address && !!checkpoint,
    staleTime: 10_000, // 10 seconds
  });

  return {
    checkinStatus: data?.hasCheckedIn ?? null,
    checkpointCheckinToday: data?.checkpointCheckinToday ?? false,
    dailyRewardClaimed: data?.dailyRewardClaimed ?? false,
    pointsEarnedToday: data?.pointsEarnedToday ?? 0,
    ...rest,
  };
}
