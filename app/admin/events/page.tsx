"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { usePrivy } from "@privy-io/react-auth";
import type { DiceEvent } from "@/lib/dice";
import Image from "next/image";

interface EventsResponse {
  events: DiceEvent[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
}

export default function AdminEventsPage() {
  const { user, login } = usePrivy();

  const checkAdminStatus = useCallback(async () => {
    if (!user?.email?.address) return false;

    try {
      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email.address }),
      });
      const responseData = await response.json();
      const data = responseData.data || responseData;
      return data.isAdmin;
    } catch (error) {
      console.error("Error checking admin status:", error);
      return false;
    }
  }, [user?.email?.address]);

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);

  useEffect(() => {
    const verifyAdmin = async () => {
      if (user?.email?.address) {
        const adminStatus = await checkAdminStatus();
        setIsAdmin(adminStatus);
        setAdminLoading(false);
      } else if (user === null) {
        setIsAdmin(false);
        setAdminLoading(false);
      }
    };

    verifyAdmin();
  }, [user, checkAdminStatus]);

  const {
    data: eventsData,
    isLoading: eventsLoading,
    error,
  } = useQuery<EventsResponse>({
    queryKey: ["admin-dice-events"],
    queryFn: async () => {
      const response = await fetch("/api/dice/events");
      if (!response.ok) throw new Error("Failed to fetch events");
      const responseData = await response.json();
      return responseData.data || responseData;
    },
    enabled: !!isAdmin,
  });

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getStateColor = (state: string | null | undefined) => {
    switch (state) {
      case "PUBLISHED":
        return "bg-green-100 text-green-800";
      case "SUBMITTED":
        return "bg-yellow-100 text-yellow-800";
      case "DRAFT":
        return "bg-gray-100 text-gray-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getSquareImage = (event: DiceEvent) => {
    return event.images?.find((img) => img.type === "SQUARE")?.url;
  };

  if (adminLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen space-y-4">
        <p>Please login to access admin features</p>
        <Button onClick={login}>Login</Button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Access denied. Admin permissions required.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 bg-white relative min-h-screen z-40">
      <div className="flex justify-between items-center mb-6 bg-white">
        <div>
          <h1 className="text-3xl font-bold">DICE Events</h1>
          <p className="text-gray-500 mt-1">
            Events from your DICE account
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          Failed to load events. Make sure DICE API credentials are configured.
        </div>
      )}

      {eventsLoading ? (
        <div className="flex justify-center py-8">Loading events...</div>
      ) : (
        <div className="grid gap-4 bg-white">
          {eventsData?.events.map((event) => (
            <div
              key={event.id}
              className="border rounded-lg p-4 bg-white shadow-sm"
            >
              <div className="flex gap-4">
                {getSquareImage(event) && (
                  <div className="flex-shrink-0">
                    <Image
                      src={getSquareImage(event)!}
                      alt={event.name}
                      width={120}
                      height={120}
                      className="rounded-lg object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">{event.name}</h3>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${getStateColor(event.state)}`}
                    >
                      {event.state || "Unknown"}
                    </span>
                  </div>

                  {event.description && (
                    <p className="text-gray-600 mb-3 line-clamp-2">
                      {event.description}
                    </p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-500">
                    <div>
                      <span className="font-medium">Start:</span>{" "}
                      {formatDate(event.startDatetime)}
                    </div>
                    <div>
                      <span className="font-medium">End:</span>{" "}
                      {formatDate(event.endDatetime)}
                    </div>
                    {event.venues && event.venues.length > 0 && (
                      <div className="md:col-span-2">
                        <span className="font-medium">Venue:</span>{" "}
                        {event.venues[0].name}
                        {event.venues[0].city && `, ${event.venues[0].city}`}
                        {event.venues[0].country &&
                          `, ${event.venues[0].country}`}
                      </div>
                    )}
                    {event.ticketTypes && event.ticketTypes.length > 0 && (
                      <div className="md:col-span-2">
                        <span className="font-medium">Tickets:</span>{" "}
                        {event.ticketTypes
                          .map(
                            (t) =>
                              `${t.name}${t.price !== null && t.price !== undefined ? ` ($${t.price})` : ""}`
                          )
                          .join(", ")}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 text-xs text-gray-400">
                    Event ID: {event.id}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {eventsData?.events.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No events found in your DICE account.
            </div>
          )}

          {eventsData?.pageInfo.hasNextPage && (
            <div className="text-center py-4 text-gray-500">
              More events available. Pagination coming soon.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
