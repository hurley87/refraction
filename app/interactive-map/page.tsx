"use client";

import { Suspense } from "react";
import InteractiveMap from "@/components/interactive-map";
import AuthOnboarding from "@/components/auth-onboarding";
import { useSearchParams } from "next/navigation";

function InteractiveMapContent() {
  const searchParams = useSearchParams();
  const placeId = searchParams.get("placeId");

  return (
    <AuthOnboarding>
      <div className="font-grotesk h-full w-full">
        <InteractiveMap initialPlaceId={placeId} />
      </div>
    </AuthOnboarding>
  );
}

export default function InteractiveMapPage() {
  return (
    <Suspense fallback={<div className="h-full w-full" />}>
      <InteractiveMapContent />
    </Suspense>
  );
}
