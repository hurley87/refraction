"use client";

import { useState, useEffect } from "react";
import Transactions, { type Activity } from "@/components/transactions";

interface PointsActivityProps {
  walletAddress: string;
}

export default function PointsActivity({ walletAddress }: PointsActivityProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchActivities() {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/activities?wallet_address=${walletAddress}`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch activities");
        }

        const responseData = await response.json();
        // Unwrap the apiSuccess wrapper - data is in responseData.data
        const data = responseData.data || responseData;
        setActivities(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    if (walletAddress) {
      fetchActivities();
    }
  }, [walletAddress]);

  return (
    <Transactions
      activities={activities}
      isLoading={loading}
      error={error}
      showEmptyStateAction={false}
      maxHeight="400px"
    />
  );
}
