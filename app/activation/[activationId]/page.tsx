'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { SponsoredActivationFlow } from '@/components/sponsored-activation/sponsored-activation-flow';
import { SponsoredActivationPageShell } from '@/components/sponsored-activation/sponsored-activation-page-shell';

function ActivationRouteInner() {
  const params = useParams<{ activationId: string }>();
  const searchParams = useSearchParams();
  const activationId = params.activationId?.trim();

  if (!activationId) {
    return (
      <SponsoredActivationPageShell>
        <p className="body-medium font-grotesk p-6 text-center text-[#757575]">
          This activation link is not valid.
        </p>
      </SponsoredActivationPageShell>
    );
  }

  return (
    <SponsoredActivationFlow
      activationKey={activationId}
      source={searchParams.get('source')}
      sourceRefId={searchParams.get('source_ref_id')}
    />
  );
}

export default function ActivationRoutePage() {
  return (
    <Suspense
      fallback={
        <SponsoredActivationPageShell>
          <div className="flex min-h-[40vh] items-center justify-center px-4">
            <Loader2
              className="size-8 animate-spin text-[#757575]"
              aria-hidden
            />
          </div>
        </SponsoredActivationPageShell>
      }
    >
      <ActivationRouteInner />
    </Suspense>
  );
}
