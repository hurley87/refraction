import { useQuery } from "@tanstack/react-query";

async function fetchNumberAssignment(
  userAddress: string,
): Promise<number | null> {
  const response = await fetch(
    `/api/number-assignment?address=${userAddress}`,
  );
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to get number assignment");
  }

  return data.number;
}

export const useNumberAssignment = (userAddress: string | undefined) => {
  const { data: assignedNumber, isLoading, error, ...rest } = useQuery({
    queryKey: ["numberAssignment", userAddress],
    queryFn: () => fetchNumberAssignment(userAddress!),
    enabled: !!userAddress,
    staleTime: 60_000, // 1 minute
  });

  return {
    assignedNumber: assignedNumber ?? null,
    isLoading,
    error: error ? (error instanceof Error ? error.message : "An error occurred") : null,
    ...rest,
  };
};
