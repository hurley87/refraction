"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { usePrivy } from "@privy-io/react-auth";
import type { DiceEvent } from "@/lib/dice";
import Image from "next/image";
import {
  Calendar,
  MapPin,
  Ticket,
  Loader2,
  CalendarX2,
  Clock,
} from "lucide-react";

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
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string | null | undefined) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getStateColor = (state: string | null | undefined) => {
    switch (state) {
      case "PUBLISHED":
        return "bg-green-50 text-green-700 border border-green-200";
      case "SUBMITTED":
        return "bg-amber-50 text-amber-700 border border-amber-200";
      case "DRAFT":
        return "bg-slate-50 text-slate-600 border border-slate-200";
      case "CANCELLED":
        return "bg-red-50 text-red-700 border border-red-200";
      default:
        return "bg-slate-50 text-slate-600 border border-slate-200";
    }
  };

  const eventStats = useMemo(() => {
    if (!eventsData?.events) return null;

    return eventsData.events.reduce(
      (acc, event) => {
        acc.total++;
        switch (event.state) {
          case "PUBLISHED":
            acc.published++;
            break;
          case "SUBMITTED":
            acc.submitted++;
            break;
          case "DRAFT":
            acc.draft++;
            break;
          case "CANCELLED":
            acc.cancelled++;
            break;
        }
        return acc;
      },
      { published: 0, submitted: 0, draft: 0, cancelled: 0, total: 0 }
    );
  }, [eventsData?.events]);

  const getSquareImage = (event: DiceEvent) => {
    return event.images?.find((img) => img.type === "SQUARE")?.url;
  };

  if (adminLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <p className="text-gray-500">Verifying access...</p>
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">DICE Events</h1>
          <p className="text-gray-500 mt-1">
            Events from your DICE account
          </p>
        </div>

        {eventStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-medium text-green-600">Published</p>
              <p className="text-2xl font-bold text-green-700">
                {eventStats.published}
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm font-medium text-amber-600">Submitted</p>
              <p className="text-2xl font-bold text-amber-700">
                {eventStats.submitted}
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-sm font-medium text-slate-500">Draft</p>
              <p className="text-2xl font-bold text-slate-600">
                {eventStats.draft}
              </p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-medium text-red-600">Cancelled</p>
              <p className="text-2xl font-bold text-red-700">
                {eventStats.cancelled}
              </p>
            </div>
          </div>
        )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          Failed to load events. Make sure DICE API credentials are configured.
        </div>
      )}

      {eventsLoading ? (
        <div className="flex flex-col justify-center items-center py-16 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <p className="text-gray-500">Loading events...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {eventsData?.events.map((event) => (
            <div
              key={event.id}
              className="group bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-300"
            >
              {/* Image Header */}
              <div className="relative aspect-[16/9] bg-gradient-to-br from-gray-100 to-gray-50">
                {getSquareImage(event) ? (
                  <Image
                    src={getSquareImage(event)!}
                    alt={event.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Calendar className="h-12 w-12 text-gray-300" />
                  </div>
                )}
                {/* Status Badge Overlay */}
                <div className="absolute top-3 right-3">
                  <span
                    className={`px-3 py-1.5 text-xs font-semibold rounded-full backdrop-blur-sm ${getStateColor(event.state)}`}
                    role="status"
                    aria-label={`Event status: ${event.state || "Unknown"}`}
                  >
                    {event.state || "Unknown"}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5">
                {/* Title */}
                <h3
                  className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-gray-700 transition-colors"
                  title={event.name}
                >
                  {event.name}
                </h3>

                {/* Description */}
                {event.description && (
                  <p className="text-gray-500 text-sm mb-4 line-clamp-2">
                    {event.description}
                  </p>
                )}

                {/* Meta Info */}
                <div className="space-y-3">
                  {/* Date & Time */}
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-indigo-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(event.startDatetime)}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(event.startDatetime)}
                        {event.endDatetime && (
                          <span> - {formatTime(event.endDatetime)}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Venue */}
                  {event.venues && event.venues.length > 0 && (
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-rose-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {event.venues[0].name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {[event.venues[0].city, event.venues[0].country]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Tickets */}
                  {event.ticketTypes && event.ticketTypes.length > 0 && (
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <Ticket className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {event.ticketTypes.length} ticket type
                          {event.ticketTypes.length !== 1 && "s"}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {event.ticketTypes
                            .slice(0, 2)
                            .map((t) => t.name)
                            .join(", ")}
                          {event.ticketTypes.length > 2 &&
                            ` +${event.ticketTypes.length - 2} more`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <span className="text-xs text-gray-400 font-mono">
                    ID: {event.id.slice(0, 8)}...
                  </span>
                </div>
              </div>
            </div>
          ))}

          {eventsData?.events.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-6">
                <CalendarX2 className="h-10 w-10 text-gray-400" />
              </div>
              <p className="text-xl font-semibold text-gray-700 mb-2">
                No events found
              </p>
              <p className="text-sm text-gray-500 text-center max-w-sm">
                There are no events in your DICE account yet. Create your first
                event on DICE to see it here.
              </p>
            </div>
          )}

          {eventsData?.pageInfo.hasNextPage && (
            <div className="col-span-full text-center py-8">
              <p className="text-sm text-gray-400">
                More events available. Pagination coming soon.
              </p>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
