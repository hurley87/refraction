'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import type { SpendExperience, SpendItem } from '@/lib/types';
import { SpendItemPage } from '@/components/spend/spend-item-page';
import { SpendExperiencePage } from '@/components/spend/spend-experience-page';
import { SpendPageShell } from '@/components/spend/spend-page-shell';

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
      <SpendPageShell showCard={false}>
        <div className="flex min-h-[40vh] items-center justify-center px-4">
          <Loader2 className="size-8 animate-spin text-white/70" aria-hidden />
        </div>
      </SpendPageShell>
    );
  }

  if (error || !data) {
    return (
      <SpendPageShell>
        <p className="body-medium font-grotesk text-center text-[#171717]">
          This spend link is not available.
        </p>
      </SpendPageShell>
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
