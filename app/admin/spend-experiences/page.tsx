'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';
import { toast } from 'sonner';
import { Loader2, Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SpendExperience, SpendExperienceStatus } from '@/lib/types';

const QUERY_KEY = ['admin-spend-experiences'] as const;

function isoToDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalToIso(value: string): string {
  return new Date(value).toISOString();
}

function defaultWindow(): { start: string; end: string } {
  const start = new Date();
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

type FormState = {
  title: string;
  description: string;
  event_id: string;
  status: SpendExperienceStatus;
  points_to_usdc_rate: string;
  max_usdc_per_user: string;
  treasury_wallet_address: string;
  receiving_wallet_address: string;
  start_time_local: string;
  end_time_local: string;
};

function experienceToForm(e: SpendExperience): FormState {
  return {
    title: e.title,
    description: e.description ?? '',
    event_id: e.event_id ?? '',
    status: e.status,
    points_to_usdc_rate: String(e.points_to_usdc_rate),
    max_usdc_per_user: String(e.max_usdc_per_user),
    treasury_wallet_address: e.treasury_wallet_address,
    receiving_wallet_address: e.receiving_wallet_address,
    start_time_local: isoToDatetimeLocalValue(e.start_time),
    end_time_local: isoToDatetimeLocalValue(e.end_time),
  };
}

function emptyForm(): FormState {
  const { start, end } = defaultWindow();
  return {
    title: '',
    description: '',
    event_id: '',
    status: 'draft',
    points_to_usdc_rate: '1000',
    max_usdc_per_user: '5',
    treasury_wallet_address: '',
    receiving_wallet_address: '',
    start_time_local: isoToDatetimeLocalValue(start),
    end_time_local: isoToDatetimeLocalValue(end),
  };
}

export default function AdminSpendExperiencesPage() {
  const { user, login } = usePrivy();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<SpendExperience | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

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
    } catch {
      return false;
    }
  }, [user?.email?.address]);

  useEffect(() => {
    const verify = async () => {
      if (user?.email?.address) {
        setIsAdmin(await checkAdminStatus());
        setAdminLoading(false);
      } else if (user === null) {
        setIsAdmin(false);
        setAdminLoading(false);
      }
    };
    void verify();
  }, [user, checkAdminStatus]);

  const adminEmail = user?.email?.address || '';

  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      'x-user-email': adminEmail,
    }),
    [adminEmail]
  );

  const { data: spendExperiences = [], isLoading } = useQuery<
    SpendExperience[]
  >({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const response = await fetch('/api/admin/spend-experiences', {
        headers: { 'x-user-email': adminEmail },
      });
      if (!response.ok) throw new Error('Failed to load spend experiences');
      const responseData = await response.json();
      const data = responseData.data || responseData;
      return data.spendExperiences ?? [];
    },
    enabled: !!isAdmin && !!adminEmail,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        event_id: form.event_id.trim() || null,
        status: form.status,
        points_to_usdc_rate: Number(form.points_to_usdc_rate),
        max_usdc_per_user: Number(form.max_usdc_per_user),
        treasury_wallet_address: form.treasury_wallet_address.trim(),
        receiving_wallet_address: form.receiving_wallet_address.trim(),
        start_time: datetimeLocalToIso(form.start_time_local),
        end_time: datetimeLocalToIso(form.end_time_local),
      };

      if (editing) {
        const response = await fetch(
          `/api/admin/spend-experiences/${encodeURIComponent(editing.id)}`,
          { method: 'PATCH', headers, body: JSON.stringify(payload) }
        );
        const j = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(j.error || j.message || 'Update failed');
        }
        return j.data?.spendExperience ?? j.spendExperience;
      }

      const response = await fetch('/api/admin/spend-experiences', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const j = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(j.error || j.message || 'Create failed');
      }
      return j.data?.spendExperience ?? j.spendExperience;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(
        editing ? 'Spend experience updated' : 'Spend experience created'
      );
      setPanelOpen(false);
      setEditing(null);
      setForm(emptyForm());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setPanelOpen(true);
  };

  const openEdit = (e: SpendExperience) => {
    setEditing(e);
    setForm(experienceToForm(e));
    setPanelOpen(true);
  };

  if (adminLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <Loader2 className="size-8 animate-spin text-neutral-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <h1 className="mb-4 text-xl font-semibold">Spend experiences</h1>
        <p className="mb-4 text-neutral-600">
          Sign in to configure the spend pilot.
        </p>
        <Button type="button" onClick={() => login()}>
          Log in
        </Button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <h1 className="mb-4 text-xl font-semibold">Unauthorized</h1>
        <p className="text-neutral-600">
          Your account cannot access this admin page.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6 font-grotesk">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#171717]">
            Spend experiences
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Pilot defaults: 1000 points = $1 USDC, max $5 per user (adjust per
            experience).
          </p>
        </div>
        <Button
          type="button"
          onClick={openCreate}
          className="gap-1 bg-black text-white hover:bg-black/85"
        >
          <Plus className="size-4" />
          New experience
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-neutral-500" />
        </div>
      ) : spendExperiences.length === 0 ? (
        <p className="text-neutral-600">No spend experiences yet.</p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {spendExperiences.map((exp) => (
            <li
              key={exp.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium text-[#171717]">{exp.title}</div>
                <div className="text-sm text-neutral-500">
                  <span className="capitalize">{exp.status}</span>
                  {' · '}
                  {exp.points_to_usdc_rate} pts / $1 · max $
                  {exp.max_usdc_per_user} USDC
                </div>
                <div className="mt-0.5 font-mono text-xs text-blue-600">
                  /spend/{exp.id}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1"
                onClick={() => openEdit(exp)}
              >
                <Pencil className="size-3.5" />
                Edit
              </Button>
            </li>
          ))}
        </ul>
      )}

      {panelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            aria-label="Close panel"
            onClick={() => {
              setPanelOpen(false);
              setEditing(null);
            }}
          />
          <div className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-[#171717]">
                {editing ? 'Edit spend experience' : 'New spend experience'}
              </h2>
              <button
                type="button"
                className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100"
                onClick={() => {
                  setPanelOpen(false);
                  setEditing(null);
                }}
              >
                ×
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="space-y-2">
                <Label htmlFor="se-title">Title</Label>
                <Input
                  id="se-title"
                  value={form.title}
                  onChange={(ev) =>
                    setForm((f) => ({ ...f, title: ev.target.value }))
                  }
                  placeholder="e.g. Spring launch pilot"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="se-desc">Description</Label>
                <Textarea
                  id="se-desc"
                  className="min-h-[88px]"
                  value={form.description}
                  onChange={(ev) =>
                    setForm((f) => ({ ...f, description: ev.target.value }))
                  }
                  placeholder="Shown in the spend flow"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="se-event">Event ID (optional)</Label>
                <Input
                  id="se-event"
                  value={form.event_id}
                  onChange={(ev) =>
                    setForm((f) => ({ ...f, event_id: ev.target.value }))
                  }
                  placeholder="External event id if linked"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      status: v as SpendExperienceStatus,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="ended">Ended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="se-rate">Points per $1 USDC</Label>
                  <Input
                    id="se-rate"
                    type="number"
                    min={1}
                    step={1}
                    value={form.points_to_usdc_rate}
                    onChange={(ev) =>
                      setForm((f) => ({
                        ...f,
                        points_to_usdc_rate: ev.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="se-max">Max USDC per user</Label>
                  <Input
                    id="se-max"
                    type="number"
                    min={0}
                    step="any"
                    value={form.max_usdc_per_user}
                    onChange={(ev) =>
                      setForm((f) => ({
                        ...f,
                        max_usdc_per_user: ev.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="se-treasury">
                  Treasury wallet (funds users)
                </Label>
                <Input
                  id="se-treasury"
                  className="font-mono text-sm"
                  value={form.treasury_wallet_address}
                  onChange={(ev) =>
                    setForm((f) => ({
                      ...f,
                      treasury_wallet_address: ev.target.value,
                    }))
                  }
                  placeholder="0x…"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="se-receive">
                  Receiving wallet (event / IRL)
                </Label>
                <Input
                  id="se-receive"
                  className="font-mono text-sm"
                  value={form.receiving_wallet_address}
                  onChange={(ev) =>
                    setForm((f) => ({
                      ...f,
                      receiving_wallet_address: ev.target.value,
                    }))
                  }
                  placeholder="0x…"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="se-start">Start (local)</Label>
                  <Input
                    id="se-start"
                    type="datetime-local"
                    value={form.start_time_local}
                    onChange={(ev) =>
                      setForm((f) => ({
                        ...f,
                        start_time_local: ev.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="se-end">End (local)</Label>
                  <Input
                    id="se-end"
                    type="datetime-local"
                    value={form.end_time_local}
                    onChange={(ev) =>
                      setForm((f) => ({
                        ...f,
                        end_time_local: ev.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-5 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPanelOpen(false);
                  setEditing(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Saving…
                  </>
                ) : editing ? (
                  'Save changes'
                ) : (
                  'Create'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
