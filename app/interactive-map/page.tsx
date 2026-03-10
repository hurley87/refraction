'use client';

import { Suspense } from 'react';
import InteractiveMap from '@/components/map/interactive-map';
import AuthWrapper from '@/components/auth/auth-wrapper';
import { useSearchParams } from 'next/navigation';

function InteractiveMapContent() {
  const searchParams = useSearchParams();
  const placeId = searchParams.get('placeId');
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');

  const initialLatitude = latParam ? parseFloat(latParam) : undefined;
  const initialLongitude = lngParam ? parseFloat(lngParam) : undefined;

  return (
    <AuthWrapper unauthenticatedUI="map-onboarding">
      <div className="font-grotesk h-full w-full">
        <InteractiveMap
          initialPlaceId={placeId}
          initialLatitude={
            initialLatitude && !Number.isNaN(initialLatitude)
              ? initialLatitude
              : undefined
          }
          initialLongitude={
            initialLongitude && !Number.isNaN(initialLongitude)
              ? initialLongitude
              : undefined
          }
        />
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
