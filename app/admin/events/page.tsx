'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { usePrivy } from '@privy-io/react-auth';
import type { DiceEvent } from '@/lib/dice';
import Image from 'next/image';
import {
  Calendar,
  MapPin,
  Ticket,
  Loader2,
  CalendarX2,
  Clock,
  Gift,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EventsResponse {
  events: DiceEvent[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
}

interface TicketHoldersPreview {
  totalHolders: number;
  uniqueEmails: number;
  matchedPlayers: number;
  alreadyRewarded: boolean;
  eventEnded: boolean;
  eventName: string;
}

interface RewardResult {
  totalHolders: number;
  uniqueEmails: number;
  matchedPlayers: number;
  unmatchedEmails: string[];
  totalPointsAwarded: number;
  eventName: string;
}

function isEventEnded(event: DiceEvent): boolean {
  const end = event.endDatetime
    ? new Date(event.endDatetime)
    : event.startDatetime
      ? new Date(new Date(event.startDatetime).getTime() + 24 * 60 * 60 * 1000)
      : null;
  return !!end && end.getTime() <= Date.now();
}

function RewardTicketHoldersDialog({
  event,
  open,
  onOpenChange,
  adminEmail,
}: {
  event: DiceEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adminEmail: string | undefined;
}) {
  const [pointsPerHolder, setPointsPerHolder] = useState(100);
  const [awarding, setAwarding] = useState(false);
  const [result, setResult] = useState<RewardResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eventId = event?.id ?? '';
  const headers = useMemo(
    () =>
      adminEmail
        ? { 'Content-Type': 'application/json', 'x-user-email': adminEmail }
        : { 'Content-Type': 'application/json' },
    [adminEmail]
  );

  const {
    data: preview,
    isLoading: previewLoading,
    error: previewError,
  } = useQuery<TicketHoldersPreview>({
    queryKey: ['dice-ticket-holders', eventId],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/dice/events/${encodeURIComponent(eventId)}/ticket-holders`,
        { headers: headers as HeadersInit }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? 'Failed to load preview');
      }
      const body = await res.json();
      return body.data ?? body;
    },
    enabled: open && !!eventId && !!adminEmail,
  });

  const handleAward = async () => {
    if (!eventId || !adminEmail) return;
    setAwarding(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/dice/reward-ticket-holders', {
        method: 'POST',
        headers: headers as HeadersInit,
        body: JSON.stringify({
          eventId,
          pointsPerHolder,
        }),
      });
      const body = await res.json();
      if (!body.success) {
        setError(body.error ?? 'Failed to award points');
        return;
      }
      setResult(body.data ?? body);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setAwarding(false);
    }
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setResult(null);
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reward ticket holders</DialogTitle>
          <DialogDescription>
            {event && (
              <>
                {event.name}
                <span className="block mt-1 text-xs">
                  {formatDate(event.startDatetime)}
                </span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {previewLoading && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <p className="text-sm text-gray-500">Loading ticket holders...</p>
          </div>
        )}

        {previewError && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm">
            {previewError instanceof Error
              ? previewError.message
              : 'Failed to load preview'}
          </div>
        )}

        {!previewLoading && !previewError && preview && (
          <>
            {preview.alreadyRewarded ? (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-3 text-sm text-amber-800">
                Points for this event have already been awarded.
              </div>
            ) : result ? (
              <div className="space-y-2 text-sm">
                <p className="font-medium text-green-700">Points awarded</p>
                <p>
                  {result.matchedPlayers} players received{' '}
                  {result.totalPointsAwarded} points total.
                </p>
                {result.unmatchedEmails.length > 0 && (
                  <p className="text-gray-600">
                    {result.unmatchedEmails.length} ticket holder(s) not found
                    in app (no account with matching email).
                  </p>
                )}
              </div>
            ) : (
              <>
                {!preview.eventEnded && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
                    Event has not ended yet. You can only award points after the
                    event is over.
                  </div>
                )}
                <div className="grid gap-4 py-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-gray-500">Total ticket holders</span>
                    <span className="font-medium">{preview.totalHolders}</span>
                    <span className="text-gray-500">Unique emails</span>
                    <span className="font-medium">{preview.uniqueEmails}</span>
                    <span className="text-gray-500">Matched in app</span>
                    <span className="font-medium">
                      {preview.matchedPlayers}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="points">Points per holder</Label>
                    <Input
                      id="points"
                      type="number"
                      min={1}
                      value={pointsPerHolder}
                      onChange={(e) =>
                        setPointsPerHolder(
                          Math.max(1, parseInt(e.target.value, 10) || 1)
                        )
                      }
                      disabled={!preview.eventEnded || preview.alreadyRewarded}
                    />
                  </div>
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => handleClose(false)}
                    disabled={awarding}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAward}
                    disabled={
                      awarding ||
                      !preview.eventEnded ||
                      preview.alreadyRewarded ||
                      preview.matchedPlayers === 0
                    }
                  >
                    {awarding ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Awarding...
                      </>
                    ) : (
                      'Award points'
                    )}
                  </Button>
                </DialogFooter>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function AdminEventsPage() {
  const { user, login } = usePrivy();

  const checkAdminStatus = useCallback(async () => {
    if (!user?.email?.address) return false;

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email.address }),
      });
      const responseData = await response.json();
      const data = responseData.data || responseData;
      return data.isAdmin;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }, [user?.email?.address]);

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);
  const [rewardDialogEvent, setRewardDialogEvent] = useState<DiceEvent | null>(
    null
  );
  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);

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
    queryKey: ['admin-dice-events'],
    queryFn: async () => {
      const response = await fetch('/api/dice/events');
      if (!response.ok) throw new Error('Failed to fetch events');
      const responseData = await response.json();
      return responseData.data || responseData;
    },
    enabled: !!isAdmin,
  });

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStateColor = (state: string | null | undefined) => {
    switch (state) {
      case 'PUBLISHED':
        return 'bg-green-50 text-green-700 border border-green-200';
      case 'SUBMITTED':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'DRAFT':
        return 'bg-slate-50 text-slate-600 border border-slate-200';
      case 'CANCELLED':
        return 'bg-red-50 text-red-700 border border-red-200';
      default:
        return 'bg-slate-50 text-slate-600 border border-slate-200';
    }
  };

  const eventStats = useMemo(() => {
    if (!eventsData?.events) return null;

    return eventsData.events.reduce(
      (acc, event) => {
        acc.total++;
        switch (event.state) {
          case 'PUBLISHED':
            acc.published++;
            break;
          case 'SUBMITTED':
            acc.submitted++;
            break;
          case 'DRAFT':
            acc.draft++;
            break;
          case 'CANCELLED':
            acc.cancelled++;
            break;
        }
        return acc;
      },
      { published: 0, submitted: 0, draft: 0, cancelled: 0, total: 0 }
    );
  }, [eventsData?.events]);

  const getSquareImage = (event: DiceEvent) => {
    return event.images?.find((img) => img.type === 'SQUARE')?.url;
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
          <p className="text-gray-500 mt-1">Events from your DICE account</p>
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
            Failed to load events. Make sure DICE API credentials are
            configured.
          </div>
        )}

        {eventsLoading ? (
          <div className="flex flex-col justify-center items-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <p className="text-gray-500">Loading events...</p>
          </div>
        ) : (
          <TooltipProvider>
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
                        aria-label={`Event status: ${event.state || 'Unknown'}`}
                      >
                        {event.state || 'Unknown'}
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
                                .join(', ')}
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
                              {event.ticketTypes.length !== 1 && 's'}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {event.ticketTypes
                                .slice(0, 2)
                                .map((t) => t.name)
                                .join(', ')}
                              {event.ticketTypes.length > 2 &&
                                ` +${event.ticketTypes.length - 2} more`}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-gray-400 font-mono">
                        ID: {event.id.slice(0, 8)}...
                      </span>
                      {isEventEnded(event) ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setRewardDialogEvent(event);
                            setRewardDialogOpen(true);
                          }}
                          className="gap-1.5"
                        >
                          <Gift className="h-3.5 w-3.5" />
                          Reward holders
                        </Button>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex">
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled
                                className="gap-1.5"
                              >
                                <Gift className="h-3.5 w-3.5" />
                                Reward holders
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Event hasn&apos;t ended yet</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
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
                    There are no events in your DICE account yet. Create your
                    first event on DICE to see it here.
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
          </TooltipProvider>
        )}

        <RewardTicketHoldersDialog
          event={rewardDialogEvent}
          open={rewardDialogOpen}
          onOpenChange={setRewardDialogOpen}
          adminEmail={user?.email?.address}
        />
      </div>
    </div>
  );
}
