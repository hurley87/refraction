import { useEffect, useState } from "react";
import { testPublicClient } from "../lib/publicClient";
import { checkinABI, checkinAddress } from "@/lib/checkin";

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

export function useCheckpointStatuses(address?: `0x${string}`) {
  const [checkpointStatuses, setCheckpointStatuses] = useState<
    CheckpointStatus[]
  >([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchCheckpointStatuses = async () => {
      if (!address) {
        setCheckpointStatuses(
          CHECKPOINT_DETAILS.map((checkpoint) => ({
            ...checkpoint,
            isCheckedIn: false,
          }))
        );
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Fetch status for all three checkpoints in parallel
        const statusPromises = CHECKPOINT_DETAILS.map((checkpoint) =>
          testPublicClient.readContract({
            address: checkinAddress,
            abi: checkinABI,
            functionName: "hasUserCheckedIn",
            args: [address, BigInt(checkpoint.id)],
          })
        );

        const statuses = await Promise.all(statusPromises);

        // Combine the checkpoint details with the status results
        const checkpointStatuses = CHECKPOINT_DETAILS.map(
          (checkpoint, index) => ({
            ...checkpoint,
            isCheckedIn: statuses[index] as boolean,
          })
        );

        setCheckpointStatuses(checkpointStatuses);
        setError(null);
      } catch (error) {
        console.error("Error fetching checkpoint statuses:", error);
        setError(
          error instanceof Error
            ? error
            : new Error("Failed to fetch checkpoint statuses")
        );

        // Set default values in case of error
        setCheckpointStatuses(
          CHECKPOINT_DETAILS.map((checkpoint) => ({
            ...checkpoint,
            isCheckedIn: false,
          }))
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchCheckpointStatuses();
  }, [address]);

  return { checkpointStatuses, isLoading, error };
}
