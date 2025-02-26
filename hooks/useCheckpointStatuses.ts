import { useEffect, useState } from "react";
import { testPublicClient } from "../lib/publicClient";
import { checkinABI, checkinAddress } from "@/lib/checkin";
import { useQuery } from "@tanstack/react-query";

export type CheckpointStatus = {
  id: number;
  isCheckedIn: boolean;
  name: string;
  description: string;
};

const CHECKPOINT_DETAILS = [
  {
    id: 1,
    name: "Checkpoint 1",
    description: "WalletCon",
  },
  {
    id: 2,
    name: "Checkpoint 2",
    description: "ESP HiFi",
  },
  {
    id: 3,
    name: "Checkpoint 3",
    description: "Syndicate Van",
  },
];

async function fetchCheckpointStatuses(address?: `0x${string}`) {
  //  Fetch status for all three checkpoints in parallel
  const statusPromises = CHECKPOINT_DETAILS.map((checkpoint) =>
    testPublicClient.readContract({
      address: checkinAddress,
      abi: checkinABI,
      functionName: "hasUserCheckedIn",
      args: [address, BigInt(checkpoint.id)],
    })
  );

  const statuses = await Promise.all(statusPromises);

  return CHECKPOINT_DETAILS.map((checkpoint, index) => ({
    ...checkpoint,
    isCheckedIn: statuses[index] as boolean,
  }));
}

export function useCheckpointStatuses(address?: `0x${string}`) {
  return useQuery({
    queryKey: ["checkpointStatuses", address],
    queryFn: () => fetchCheckpointStatuses(address),
    refetchInterval: 1000,
  });
}
