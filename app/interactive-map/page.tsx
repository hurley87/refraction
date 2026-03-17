'use client';

import { Suspense, useMemo } from 'react';
import InteractiveMap from '@/components/map/interactive-map';
import AuthWrapper from '@/components/auth/auth-wrapper';
import { useSearchParams } from 'next/navigation';
import { getFeaturedCityCoordinates } from '@/lib/featured-cities';

function InteractiveMapContent() {
  const searchParams = useSearchParams();
  const placeId = searchParams.get('placeId');
  const cityParam = searchParams.get('city');
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');

  const { initialLatitude, initialLongitude } = useMemo(() => {
    if (latParam != null && lngParam != null) {
      const lat = parseFloat(latParam);
      const lng = parseFloat(lngParam);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        return { initialLatitude: lat, initialLongitude: lng };
      }
    }
    if (cityParam) {
      const coords = getFeaturedCityCoordinates(cityParam);
      if (coords) {
        return {
          initialLatitude: coords.lat,
          initialLongitude: coords.lng,
        };
      }
    }
    return { initialLatitude: undefined, initialLongitude: undefined };
  }, [cityParam, latParam, lngParam]);

  return (
    <AuthWrapper unauthenticatedUI="map-onboarding">
      <div className="font-grotesk h-full w-full">
        <InteractiveMap
          initialPlaceId={placeId}
          initialLatitude={initialLatitude}
          initialLongitude={initialLongitude}
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
