'use client';

import { Suspense, useMemo } from 'react';
import InteractiveMap from '@/components/map/interactive-map';
import AuthWrapper from '@/components/auth/auth-wrapper';
import { useSearchParams } from 'next/navigation';
import { getFeaturedCityCoordinates } from '@/lib/featured-cities';
import { sanitizeInternalReturnPath } from '@/lib/utils/safe-return-path';

function InteractiveMapContent() {
  const searchParams = useSearchParams();
  const placeId = searchParams.get('placeId');
  /** City guide etc.: show location MapCard drawer only, not the full-screen check-in modal. */
  const mapCardOnlyDeepLink = searchParams.get('mapCard') === '1';
  const returnToRaw = searchParams.get('returnTo');
  const guideReturnHref = useMemo(
    () => sanitizeInternalReturnPath(returnToRaw),
    [returnToRaw]
  );
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
    <AuthWrapper requireUsername unauthenticatedUI="map-onboarding">
      <div className="font-grotesk h-full w-full">
        <InteractiveMap
          initialPlaceId={placeId}
          initialLatitude={initialLatitude}
          initialLongitude={initialLongitude}
          deepLinkMapCardOnly={mapCardOnlyDeepLink}
          guideReturnHref={guideReturnHref}
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
