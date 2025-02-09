import { useState, useEffect } from "react";

export const useNumberAssignment = (userAddress: string | undefined) => {
  const [assignedNumber, setAssignedNumber] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getOrAssignNumber = async () => {
      if (!userAddress) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/number-assignment?address=${userAddress}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to get number assignment");
        }

        setAssignedNumber(data.number);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    getOrAssignNumber();
  }, [userAddress]);

  return { assignedNumber, isLoading, error };
};
