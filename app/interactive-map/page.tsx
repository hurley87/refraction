'use client';

import { Suspense } from 'react';
import InteractiveMap from '@/components/map/interactive-map';
import AuthWrapper from '@/components/auth/auth-wrapper';
import { useSearchParams } from 'next/navigation';

function InteractiveMapContent() {
  const searchParams = useSearchParams();
  const placeId = searchParams.get('placeId');

  return (
    <AuthWrapper unauthenticatedUI="map-onboarding">
      <div className="font-grotesk h-full w-full">
        <InteractiveMap initialPlaceId={placeId} />
      </div>
    </AuthWrapper>
  );
}

export default function InteractiveMapPage() {
  return (
    <Suspense fallback={<div className="h-full w-full" />}>
      <InteractiveMapContent />
    </Suspense>
  );
}
