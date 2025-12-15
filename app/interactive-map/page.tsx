"use client";

import { Suspense } from "react";
import InteractiveMap from "@/components/map/interactive-map";
import AuthOnboarding from "@/components/auth/auth-onboarding";
import MapLanding from "@/components/map/map-landing";
import { useSearchParams } from "next/navigation";

function InteractiveMapContent() {
  const searchParams = useSearchParams();
  const placeId = searchParams.get("placeId");

  return (
    <MapLanding>
      <AuthOnboarding>
        <div className="font-grotesk h-full w-full">
          <InteractiveMap initialPlaceId={placeId} />
        </div>
      </AuthOnboarding>
    </MapLanding>
  );
}

export default function InteractiveMapPage() {
  return (
    <Suspense fallback={<div className="h-full w-full" />}>
      <InteractiveMapContent />
    </Suspense>
  );
}
