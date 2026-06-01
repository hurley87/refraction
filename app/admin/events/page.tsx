'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { usePrivy } from '@privy-io/react-auth';
import { adminApiAuthHeaders } from '@/lib/admin-api-auth-headers';
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
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Upload,
  X,
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
interface EventsResponse {
  events: DiceEvent[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
}

interface ManualEvent {
  id: string;
  title: string;
  thumbnailUrl: string;
  date: string;
  endDate: string | null;
  city: string;
  mapsLink: string;
  rsvpLink: string;
}

interface TicketHoldersPreview {
  totalHolders: number;
  uniqueEmails: number;
  matchedPlayers: number;
  matchedEmails?: string[];
  alreadyRewarded: boolean;
  eventName: string;
}

interface RewardResult {
  totalHolders: number;
  uniqueEmails: number;
  matchedPlayers: number;
  unmatchedEmails: string[];
  awardedEmails?: string[];
  totalPointsAwarded: number;
  eventName: string;
}

const EMPTY_MANUAL_FORM = {
  title: '',
  thumbnailUrl: '',
  date: '',
  endDate: '',
  city: '',
  mapsLink: '',
  rsvpLink: '',
};

function ManualEventDialog({
  event,
  open,
  onOpenChange,
  getAccessToken,
}: {
  event: ManualEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  getAccessToken: () => Promise<string | null | undefined>;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_MANUAL_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const isEdit = Boolean(event);

  useEffect(() => {
    if (open && event) {
      setForm({
        title: event.title,
        thumbnailUrl: event.thumbnailUrl,
        date: event.date ? event.date.slice(0, 10) : '',
        endDate: event.endDate ? event.endDate.slice(0, 10) : '',
        city: event.city,
        mapsLink: event.mapsLink,
        rsvpLink: event.rsvpLink,
      });
    } else if (open) {
      setForm(EMPTY_MANUAL_FORM);
    }
  }, [open, event]);

  const handleSave = async () => {
    setError(null);
    if (!form.title.trim() || !form.date.trim() || !form.city.trim()) {
      setError('Title, start date, and city are required.');
      return;
    }
    if (form.endDate && new Date(form.endDate) < new Date(form.date)) {
      setError('End date must be on or after the start date.');
      return;
    }
    setSaving(true);
    try {
      const auth = await adminApiAuthHeaders(getAccessToken);
      const dateIso = new Date(form.date).toISOString();
      const endDateIso = form.endDate
        ? new Date(form.endDate).toISOString()
        : null;
      const body = {
        ...(event?.id ? { id: event.id } : {}),
        title: form.title.trim(),
        thumbnailUrl: form.thumbnailUrl.trim(),
        date: dateIso,
        endDate: endDateIso,
        city: form.city.trim(),
        mapsLink: form.mapsLink.trim(),
        rsvpLink: form.rsvpLink.trim(),
      };
      const res = await fetch('/api/admin/manual-events', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Failed to save event');
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: ['admin-manual-events'],
      });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      setError(null);
    }
    onOpenChange(next);
  };

  const set = (field: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleThumbnailUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? 'Upload failed');
      }
      const body = await res.json();
      const result = body.data ?? body;
      const url =
        (result as { url?: string }).url ??
        (result as { imageUrl?: string }).imageUrl;
      if (!url) throw new Error('Upload succeeded but no URL was returned');
      set('thumbnailUrl', url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Thumbnail upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-md"
        overlayClassName="bg-white backdrop-blur-[2px]"
      >
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Manual Event' : 'Add Manual Event'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update this event. Changes appear immediately on the public events page.'
              : 'Add a non-DICE event. It will appear on the public events page.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div>
            <Label htmlFor="me-title">Title *</Label>
            <Input
              id="me-title"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Event name"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="me-date">Start date *</Label>
              <Input
                id="me-date"
                type="date"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="me-end-date">End date</Label>
              <Input
                id="me-end-date"
                type="date"
                value={form.endDate}
                min={form.date || undefined}
                onChange={(e) => set('endDate', e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="me-city">City *</Label>
            <Input
              id="me-city"
              value={form.city}
              onChange={(e) => set('city', e.target.value)}
              placeholder="e.g. Montreal"
            />
          </div>
          <div>
            <Label>Thumbnail</Label>
            {form.thumbnailUrl ? (
              <div className="relative mt-1.5 w-full overflow-hidden rounded-lg border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element -- admin preview; arbitrary host after upload */}
                <img
                  src={form.thumbnailUrl}
                  alt="Thumbnail preview"
                  className="h-40 w-full object-cover"
                />
                <button
                  type="button"
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                  onClick={() => set('thumbnailUrl', '')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="me-thumbnail-file"
                className="mt-1.5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500 transition-colors hover:border-gray-400 hover:bg-gray-100"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-gray-400" />
                    <span>Click to upload an image</span>
                  </>
                )}
                <input
                  id="me-thumbnail-file"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleThumbnailUpload(file);
                    e.target.value = '';
                  }}
                />
              </label>
            )}
            <div className="mt-1.5">
              <Input
                value={form.thumbnailUrl}
                onChange={(e) => set('thumbnailUrl', e.target.value)}
                placeholder="Or paste a URL: /events/poster.jpg or https://..."
                className="text-xs"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="me-rsvp">RSVP / Tickets Link</Label>
            <Input
              id="me-rsvp"
              value={form.rsvpLink}
              onChange={(e) => set('rsvpLink', e.target.value)}
              placeholder="https://lu.ma/..."
            />
          </div>
          <div>
            <Label htmlFor="me-maps">Maps Link</Label>
            <Input
              id="me-maps"
              value={form.mapsLink}
              onChange={(e) => set('mapsLink', e.target.value)}
              placeholder="https://maps.app.goo.gl/..."
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : isEdit ? (
              'Update Event'
            ) : (
              'Add Event'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RewardTicketHoldersDialog({
  event,
  open,
  onOpenChange,
  getAccessToken,
}: {
  event: DiceEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  getAccessToken: () => Promise<string | null | undefined>;
}) {
  const [pointsPerHolder, setPointsPerHolder] = useState(100);
  const [awarding, setAwarding] = useState(false);
  const [result, setResult] = useState<RewardResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eventId = event?.id ?? '';

  const {
    data: preview,
    isLoading: previewLoading,
    error: previewError,
  } = useQuery<TicketHoldersPreview>({
    queryKey: ['dice-ticket-holders', eventId],
    queryFn: async () => {
      const auth = await adminApiAuthHeaders(getAccessToken);
      const res = await fetch(
        `/api/admin/dice/events/${encodeURIComponent(eventId)}/ticket-holders`,
        { headers: auth }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? 'Failed to load preview');
      }
      const body = await res.json();
      return body.data ?? body;
    },
    enabled: open && !!eventId,
  });

  const handleAward = async () => {
    if (!eventId) return;
    setAwarding(true);
    setError(null);
    try {
      const auth = await adminApiAuthHeaders(getAccessToken);
      const res = await fetch('/api/admin/dice/reward-ticket-holders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth },
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
      <DialogContent
        className="max-w-md"
        overlayClassName="bg-white backdrop-blur-[2px]"
      >
        <DialogHeader>
          <DialogTitle>Reward ticket holders</DialogTitle>
          <DialogDescription>
            {event && (
              <>
                {event.name}
                <span className="block mt-1 text-xs">
                  {formatDate(event.startDatetime)}
                </span>
                <span className="block mt-1 text-xs text-gray-500">
                  Rewards can be granted at any time and are one-time per event.
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
              <div className="space-y-2">
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-3 text-sm text-amber-800">
                  Points for this event have already been awarded.
                </div>
                {preview.matchedEmails && preview.matchedEmails.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 font-medium mb-1">
                      Awarded to ({preview.matchedEmails.length}):
                    </p>
                    <ul className="max-h-40 overflow-y-auto text-xs text-gray-600 list-disc list-inside break-all rounded border border-gray-200 bg-gray-50 px-2 py-1.5">
                      {[...preview.matchedEmails]
                        .sort((a, b) => a.localeCompare(b))
                        .map((email) => (
                          <li key={email}>{email}</li>
                        ))}
                    </ul>
                  </div>
                )}
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
                {result.awardedEmails && result.awardedEmails.length > 0 && (
                  <div className="mt-2">
                    <p className="text-gray-600 font-medium mb-1">
                      Awarded to:
                    </p>
                    <ul
                      className="max-h-32 overflow-y-auto text-xs text-gray-600 list-disc list-inside break-all rounded border border-gray-200 bg-gray-50 px-2 py-1.5"
                      aria-label="Emails that received points"
                    >
                      {[...result.awardedEmails]
                        .sort((a, b) => a.localeCompare(b))
                        .map((email) => (
                          <li key={email}>{email}</li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <>
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
                      disabled={preview.alreadyRewarded}
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
  const { user, login, getAccessToken } = usePrivy();

  const checkAdminStatus = useCallback(async () => {
    if (!user?.email?.address) return false;

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await adminApiAuthHeaders(getAccessToken)),
        },
        body: JSON.stringify({}),
      });
      const responseData = await response.json();
      const data = responseData.data || responseData;
      return data.isAdmin;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }, [user?.email?.address, getAccessToken]);

  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);
  const [rewardDialogEvent, setRewardDialogEvent] = useState<DiceEvent | null>(
    null
  );
  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualDialogEvent, setManualDialogEvent] =
    useState<ManualEvent | null>(null);

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

  const { data: manualEvents, isLoading: manualLoading } = useQuery<
    ManualEvent[]
  >({
    queryKey: ['admin-manual-events'],
    queryFn: async () => {
      const auth = await adminApiAuthHeaders(getAccessToken);
      const res = await fetch('/api/admin/manual-events', { headers: auth });
      if (!res.ok) throw new Error('Failed to fetch manual events');
      const body = await res.json();
      return body.data ?? [];
    },
    enabled: !!isAdmin,
  });

  const deleteManualEvent = useMutation({
    mutationFn: async (id: string) => {
      const auth = await adminApiAuthHeaders(getAccessToken);
      const res = await fetch('/api/admin/manual-events', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? 'Failed to delete');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-manual-events'] });
    },
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
        )}

        {/* ── Manual Events Section ── */}
        <div className="mt-12 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Manual Events
              </h2>
              <p className="text-gray-500 mt-1">
                Non-DICE events shown on the public events page
              </p>
            </div>
            <Button
              onClick={() => {
                setManualDialogEvent(null);
                setManualDialogOpen(true);
              }}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add Event
            </Button>
          </div>
        </div>

        {manualLoading ? (
          <div className="flex flex-col justify-center items-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <p className="text-gray-500">Loading manual events...</p>
          </div>
        ) : manualEvents && manualEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {manualEvents.map((evt) => (
              <div
                key={evt.id}
                className="group bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-300"
              >
                <div className="relative aspect-[16/9] bg-gradient-to-br from-gray-100 to-gray-50">
                  {evt.thumbnailUrl ? (
                    <Image
                      src={evt.thumbnailUrl}
                      alt={evt.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Calendar className="h-12 w-12 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <span className="px-3 py-1.5 text-xs font-semibold rounded-full backdrop-blur-sm bg-blue-50 text-blue-700 border border-blue-200">
                      Manual
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  <h3
                    className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-gray-700 transition-colors"
                    title={evt.title}
                  >
                    {evt.title}
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-indigo-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {evt.endDate
                            ? `${formatDate(evt.date)} – ${formatDate(evt.endDate)}`
                            : formatDate(evt.date)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-rose-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {evt.city}
                        </p>
                        {evt.mapsLink && (
                          <a
                            href={evt.mapsLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
                          >
                            View on map
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    {evt.rsvpLink && (
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                          <Ticket className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <a
                            href={evt.rsvpLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1"
                          >
                            RSVP / Tickets
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setManualDialogEvent(evt);
                        setManualDialogOpen(true);
                      }}
                      className="gap-1.5"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete "${evt.title}"? This cannot be undone.`
                          )
                        ) {
                          deleteManualEvent.mutate(evt.id);
                        }
                      }}
                      disabled={deleteManualEvent.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-6">
              <CalendarX2 className="h-10 w-10 text-gray-400" />
            </div>
            <p className="text-xl font-semibold text-gray-700 mb-2">
              No manual events
            </p>
            <p className="text-sm text-gray-500 text-center max-w-sm mb-4">
              Add events that aren&apos;t on DICE (e.g. from Luma, RA, or your
              own listings).
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setManualDialogEvent(null);
                setManualDialogOpen(true);
              }}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add your first event
            </Button>
          </div>
        )}

        <RewardTicketHoldersDialog
          event={rewardDialogEvent}
          open={rewardDialogOpen}
          onOpenChange={setRewardDialogOpen}
          getAccessToken={getAccessToken}
        />
        <ManualEventDialog
          event={manualDialogEvent}
          open={manualDialogOpen}
          onOpenChange={setManualDialogOpen}
          getAccessToken={getAccessToken}
        />
      </div>
    </div>
  );
}
