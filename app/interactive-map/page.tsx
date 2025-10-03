"use client";

import InteractiveMap from "@/components/interactive-map";
import AuthOnboarding from "@/components/auth-onboarding";

export default function InteractiveMapPage() {
  return (
    <AuthOnboarding>
      <div className="font-grotesk h-full w-full">
        <InteractiveMap />
      </div>
    </AuthOnboarding>
  );
}
