'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import type { SpendExperience, SpendItem } from '@/lib/types';
import { SpendItemPage } from '@/components/spend/spend-item-page';
import { SpendExperiencePage } from '@/components/spend/spend-experience-page';

type ResolveResponse =
  | { kind: 'spend_experience'; spendExperience: SpendExperience }
  | { kind: 'spend_item'; item: SpendItem };

export default function SpendRoutePage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['spend-resolve', id] as const,
    queryFn: async () => {
      if (!id) throw new Error('Missing id');
      return apiClient<ResolveResponse>(`/api/spend/${id}`);
    },
    enabled: Boolean(id),
  });

  if (!id) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-neutral-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <p className="text-center text-neutral-600">
          This spend link is not available.
        </p>
      </div>
    );
  }

  if (data.kind === 'spend_experience') {
    return (
      <SpendExperiencePage
        experienceId={id}
        initialExperience={data.spendExperience}
      />
    );
  }

  return <SpendItemPage itemId={id} />;
}
