'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SpendExperience } from '@/lib/types';
import {
  datetimeLocalToIso,
  emptySpendExperienceForm,
  experienceToForm,
  type SpendExperienceFormState,
} from './form-state';
import { SpendExperienceFormPanel } from './spend-experience-form-panel';
import { SpendExperienceList } from './spend-experience-list';

const QUERY_KEY = ['admin-spend-experiences'] as const;

export default function AdminSpendExperiencesPage() {
  const { user, login } = usePrivy();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<SpendExperience | null>(null);
  const [form, setForm] = useState<SpendExperienceFormState>(
    emptySpendExperienceForm
  );

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

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    setEditing(null);
  }, []);

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
      setForm(emptySpendExperienceForm());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm(emptySpendExperienceForm());
    setPanelOpen(true);
  }, []);

  const openEdit = useCallback((e: SpendExperience) => {
    setEditing(e);
    setForm(experienceToForm(e));
    setPanelOpen(true);
  }, []);

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
      <SpendExperienceList
        experiences={spendExperiences}
        isLoading={isLoading}
        onNew={openCreate}
        onEdit={openEdit}
      />

      <SpendExperienceFormPanel
        open={panelOpen}
        editing={editing}
        form={form}
        setForm={setForm}
        isSaving={saveMutation.isPending}
        onClose={closePanel}
        onSubmit={saveMutation.mutate}
      />
    </div>
  );
}
