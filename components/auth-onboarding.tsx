"use client";

import { useState, useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";

interface AuthOnboardingProps {
  children: React.ReactNode;
}

type Step = {
  id: number;
  title: string;
  subtitle?: string;
  imageSrc?: string;
  imageAlt?: string;
  description?: string;
  cta?: string;
};

export default function AuthOnboarding({ children }: AuthOnboardingProps) {
  const { user, ready, login } = usePrivy();
  const [currentStep, setCurrentStep] = useState<number>(1);

  const steps: Step[] = useMemo(
    () => [
      {
        id: 1,
        title: "Search For Locations",
        description:
          "Explore the live IRL map to discover galleries, venues, and pop-ups near you. Use search and zoom to focus on neighborhoods, see what's active, and line up your next check-in.",
        imageSrc: "/miniapp/1.png",
        imageAlt: "Search UI",
      },
      {
        id: 2,
        title: "Tap Markers to Check In",
        description:
          "Tap any map marker to view photos, hours, and community notes. Check in when you visit to earn points, unlock perks, and build a personal trail of your IRL.",
        imageSrc: "/miniapp/2.png",
        imageAlt: "Check in marker",
      },
      {
        id: 3,
        title: "Tokenize New Locations",
        description:
          "Add places that should be on the map by creating a location token. Provide a title, description, and image so others can discover it, then publish to contribute to the shared IRL graph.",
        imageSrc: "/miniapp/3.png",
        imageAlt: "Create token form",
      },
      {
        id: 4,
        title: "View Token On Zora",
        description:
          "After creating, view and manage your location token on Zora with onchain provenance. Share the link, collect it, and collaborate with others to keep the record alive.",
        imageSrc: "/miniapp/4.png",
        imageAlt: "Zora success state",
        cta: "Get Started",
      },
    ],
    [],
  );

  const maxStep = steps.length;

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, maxStep));
  const goPrev = () => setCurrentStep((s) => Math.max(s - 1, 1));

  if (!ready) {
    return (
      <div className="flex items-center justify-center text-center w-full min-h-dvh font-inktrap text-2xl">
        Loading...
      </div>
    );
  }

  if (!user) {
    const step = steps[currentStep - 1];
    return (
      <>
        {children}
        {/* Fixed white background to cover entire screen */}
        <div className="fixed inset-0 z-40 bg-white" />
        <div className="fixed inset-0 z-50 pointer-events-none flex flex-col pb-[120px]">
          {/* Card filling remaining height */}
          <div className="pointer-events-none ">
            <div className="pointer-events-auto h-full bg-white/95 backdrop-blur p-4 pt-0 pb-6 flex flex-col overflow-y-auto">
              {/* Faux image area expands to fill */}
              <div className="rounded-2xl overflow-hidden bg-gray-100 flex-1 flex items-center justify-center">
                {step?.imageSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={step.imageSrc}
                    alt={step.imageAlt || step.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="text-gray-400 text-sm">Screenshot</div>
                )}
              </div>

              {/* Step content */}
              <div className="mt-4 rounded-2xl bg-white p-4 flex flex-col">
                <div className="flex items-center justify-between">
                  <p className="text-gray-500 text-sm">
                    {currentStep}/{maxStep}
                  </p>
                </div>
                <h3 className="mt-1 font-inktrap text-xl">{step.title}</h3>
                {step.description && (
                  <p className="mt-2 text-sm text-gray-600">
                    {step.description}
                  </p>
                )}

                <div className="mt-4 flex-1" />

                {currentStep < maxStep ? (
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full h-16 rounded-full text-base"
                      onClick={goPrev}
                      disabled={currentStep === 1}
                    >
                      Back
                    </Button>
                    <Button
                      size="lg"
                      className="w-full h-16 rounded-full text-base bg-black text-white hover:bg-black/90"
                      onClick={goNext}
                    >
                      Next
                    </Button>
                  </div>
                ) : (
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full h-16 rounded-full text-base"
                      onClick={goPrev}
                    >
                      Back
                    </Button>
                    <Button
                      size="lg"
                      className="w-full h-16 rounded-full text-base bg-black text-white hover:bg-black/90"
                      onClick={login}
                    >
                      {step.cta || "Get Started"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return <>{children}</>;
}
