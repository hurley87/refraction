"use client";

import { useState, useEffect } from "react";

interface Activity {
  id: string;
  date: string;
  description: string;
  activityType: string;
  points: number;
  event: string;
  metadata: any;
}

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

        const data = await response.json();
        setActivities(data);
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

  if (loading) {
    return (
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl p-4 mb-4">
          <h2 className="text-lg font-inktrap font-semibold text-gray-800 mb-4">
            Points Activity
          </h2>
          <div className="space-y-3">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl p-4">
          <h2 className="text-lg font-inktrap font-semibold text-gray-800 mb-4">
            Points Activity
          </h2>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl p-4">
          <h2 className="text-lg font-inktrap font-semibold text-gray-800 mb-4">
            Points Activity
          </h2>
          <p className="text-gray-600 text-sm">No activities yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-white rounded-xl p-4">
        <h2 className="text-lg font-inktrap font-semibold text-gray-800 mb-4">
          Points Activity
        </h2>

        {/* Table Header */}
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
          <span className="text-sm font-grotesk font-medium text-gray-600 uppercase flex-1">
            Date
          </span>
          <span className="text-sm font-grotesk font-medium text-gray-600 uppercase flex-2 text-center">
            TX
          </span>
          <span className="text-sm font-grotesk font-medium text-gray-600 uppercase flex-1 text-right">
            Event
          </span>
        </div>

        {/* Activities List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0"
            >
              <div className="flex-1">
                <span className="text-sm font-grotesk text-gray-800">
                  {activity.date}
                </span>
              </div>
              <div className="flex-2 text-center px-2">
                <span className="text-sm font-grotesk text-gray-600">
                  {activity.description}
                </span>
              </div>
              <div className="flex-1 text-right">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-grotesk text-gray-800">
                    {activity.event}
                  </span>
                  <span className="text-xs font-grotesk text-green-600 font-medium">
                    +{activity.points} pts
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Show more button if there are many activities */}
        {activities.length >= 20 && (
          <div className="mt-4 text-center">
            <button className="text-sm font-grotesk text-blue-600 hover:text-blue-800">
              View More Activities
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
