import { useQuery } from "@tanstack/react-query";
import { testPublicClient } from "../lib/publicClient";
import { checkinABI, checkinAddress } from "@/lib/checkin";

async function fetchCheckins(address: string) {
  const checkins = await testPublicClient.readContract({
    address: checkinAddress,
    abi: checkinABI,
    functionName: "getUserCheckInCount",
    args: [address],
  });

  return Number(checkins);
}

export function useCheckins(address: string) {
  const { data: checkins = 0, ...rest } = useQuery({
    queryKey: ["checkins", address],
    queryFn: () => fetchCheckins(address),
    enabled: !!address,
    staleTime: 30_000, // 30 seconds
  });

  return { checkins, ...rest };
}
