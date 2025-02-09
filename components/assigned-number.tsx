"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useNumberAssignment } from "@/hooks/useNumberAssignment";

export function AssignedNumber() {
  const { user } = usePrivy();
  const { assignedNumber, isLoading, error } = useNumberAssignment(
    user?.wallet?.address
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4 bg-white/10 rounded-lg">
        <p className="text-black animate-pulse">Loading your number...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-4 bg-red-100 rounded-lg">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  if (!assignedNumber) {
    return (
      <div className="flex items-center justify-center p-4 bg-yellow-100 rounded-lg">
        <p className="text-yellow-800">
          Connect your wallet to get your number
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold text-black mb-2">Your Number</h2>
      <p className="text-4xl font-bold text-[#F24405]">{assignedNumber}</p>
    </div>
  );
}
