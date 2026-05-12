'use client';

import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';
import { adminApiAuthHeaders } from '@/lib/admin-api-auth-headers';
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
import type { SpendServerWalletFundingMetadata } from '@/lib/spend-server-wallet';
import type { SpendRailsAvailabilityClientPayload } from '@/lib/admin/spend-rail-availability-public';

const QUERY_KEY = ['admin-spend-experiences'] as const;
const RAIL_AVAILABILITY_QUERY_KEY = ['admin-spend-rails-availability'] as const;

type CreateSpendExperienceResponse = {
  spendExperience: SpendExperience;
  funding?: SpendServerWalletFundingMetadata;
};

export default function AdminSpendExperiencesPage() {
  const { user, login, getAccessToken } = usePrivy();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<SpendExperience | null>(null);
  const [createdFunding, setCreatedFunding] = useState<
    CreateSpendExperienceResponse['funding'] | null
  >(null);
  const [form, setForm] = useState<SpendExperienceFormState>(
    emptySpendExperienceForm
  );

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
    } catch {
      return false;
    }
  }, [user?.email?.address, getAccessToken]);

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

  const { data: spendExperiences = [], isLoading } = useQuery<
    SpendExperience[]
  >({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const auth = await adminApiAuthHeaders(getAccessToken);
      const response = await fetch('/api/admin/spend-experiences', {
        headers: auth,
      });
      if (!response.ok) throw new Error('Failed to load spend experiences');
      const responseData = await response.json();
      const data = responseData.data || responseData;
      return data.spendExperiences ?? [];
    },
    enabled: !!isAdmin && !!user?.email?.address,
  });

  const {
    data: railAvailability,
    isLoading: railAvailabilityLoading,
    isError: railAvailabilityError,
  } = useQuery<SpendRailsAvailabilityClientPayload>({
    queryKey: RAIL_AVAILABILITY_QUERY_KEY,
    queryFn: async () => {
      const auth = await adminApiAuthHeaders(getAccessToken);
      const response = await fetch('/api/admin/spend-rails/availability', {
        headers: auth,
      });
      if (!response.ok) throw new Error('Failed to load rail availability');
      const responseData = await response.json();
      const data = responseData.data ?? responseData;
      return data as SpendRailsAvailabilityClientPayload;
    },
    enabled: !!isAdmin && !!user?.email?.address,
  });

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    setEditing(null);
  }, []);

  const readApiErrorMessage = useCallback(
    (body: Record<string, unknown>, fallback: string) => {
      if (typeof body.error === 'string') return body.error;
      if (typeof body.message === 'string') return body.message;
      return fallback;
    },
    []
  );

  const saveMutation = useMutation<CreateSpendExperienceResponse, Error>({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        event_id: form.event_id.trim() || null,
        status: form.status,
        points_to_usdc_rate: Number(form.points_to_usdc_rate),
        max_usdc_per_user: Number(form.max_usdc_per_user),
        start_time: datetimeLocalToIso(form.start_time_local),
        end_time: datetimeLocalToIso(form.end_time_local),
      };

      const auth = await adminApiAuthHeaders(getAccessToken);
      const jsonHeaders = { 'Content-Type': 'application/json', ...auth };

      if (editing) {
        const response = await fetch(
          `/api/admin/spend-experiences/${encodeURIComponent(editing.id)}`,
          {
            method: 'PATCH',
            headers: jsonHeaders,
            body: JSON.stringify(payload),
          }
        );
        const j = (await response.json().catch(() => ({}))) as Record<
          string,
          unknown
        >;
        if (!response.ok) {
          throw new Error(readApiErrorMessage(j, 'Update failed'));
        }
        const dataWrap = j.data as
          | { spendExperience?: SpendExperience }
          | undefined;
        const spendExperience =
          dataWrap?.spendExperience ??
          (j as { spendExperience?: SpendExperience }).spendExperience;
        if (!spendExperience) {
          throw new Error(readApiErrorMessage(j, 'Update failed'));
        }
        return { spendExperience } satisfies CreateSpendExperienceResponse;
      }

      const createPayload = { ...payload, spend_rail: form.spend_rail };

      const response = await fetch('/api/admin/spend-experiences', {
        method: 'POST',
        headers: {
          ...jsonHeaders,
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify(createPayload),
      });
      const j = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!response.ok) {
        throw new Error(readApiErrorMessage(j, 'Create failed'));
      }
      return (j.data ?? j) as CreateSpendExperienceResponse;
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(
        editing ? 'Spend experience updated' : 'Spend experience created'
      );
      if (!editing && result.funding) {
        setCreatedFunding(result.funding);
      }
      setPanelOpen(false);
      setEditing(null);
      setForm(emptySpendExperienceForm());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSave = useCallback(() => {
    if (!editing) {
      if (railAvailabilityLoading) {
        toast.error('Still loading payment network status. Please wait.');
        return;
      }
      if (railAvailabilityError || !railAvailability) {
        toast.error(
          'Could not verify payment network status. Try refreshing the page.'
        );
        return;
      }
      const row = railAvailability.rails[form.spend_rail];
      if (!row.operational) {
        toast.error(
          row.unavailableReason ?? 'Selected payment network is unavailable.'
        );
        return;
      }
    }
    saveMutation.mutate();
  }, [
    editing,
    form.spend_rail,
    railAvailability,
    railAvailabilityError,
    railAvailabilityLoading,
    saveMutation,
  ]);

  const openCreate = useCallback(() => {
    setEditing(null);
    setCreatedFunding(null);
    setForm(emptySpendExperienceForm());
    setPanelOpen(true);
  }, []);

  const openEdit = useCallback((e: SpendExperience) => {
    setEditing(e);
    setCreatedFunding(null);
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
      {createdFunding && (
        <section className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <div className="font-semibold">
            {createdFunding.fundingCalloutTitle}
          </div>
          <p className="mt-1">{createdFunding.fundingCalloutBody}</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="flex-1 break-all rounded bg-white/80 px-2 py-1 text-xs">
              {createdFunding.serverWalletAddress}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(
                  createdFunding.serverWalletAddress
                );
                toast.success('Treasury address copied');
              }}
            >
              Copy
            </Button>
          </div>
        </section>
      )}

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
        spendRailAvailability={railAvailability ?? null}
        spendRailAvailabilityLoading={railAvailabilityLoading}
        onClose={closePanel}
        onSubmit={handleSave}
      />
    </div>
  );
}
