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
      <div className="h-screen w-full bg-white flex items-center justify-center p-6 overflow-hidden">
        <div className="w-full max-w-xl mx-auto flex flex-col items-center justify-center h-full py-8">
          {/* Image */}
          <div className="rounded-lg overflow-hidden bg-gray-50 w-full max-w-sm aspect-square flex items-center justify-center mb-6">
            {step?.imageSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={step.imageSrc}
                alt={step.imageAlt || step.title}
                className="h-full w-full object-contain"
                loading="lazy"
              />
            ) : (
              <div className="text-gray-400 text-sm">Screenshot</div>
            )}
          </div>

          {/* Content */}
          <div className="text-center mb-8 flex-shrink-0">
            <p className="text-gray-400 text-sm mb-2">
              {currentStep}/{maxStep}
            </p>
            <h2 className="font-inktrap text-2xl md:text-3xl mb-3">
              {step.title}
            </h2>
            {step.description && (
              <p className="text-gray-600 text-sm md:text-base leading-relaxed max-w-lg mx-auto">
                {step.description}
              </p>
            )}
          </div>

          {/* Navigation */}
          {currentStep < maxStep ? (
            <div className="grid grid-cols-2 gap-2 w-full max-w-md mx-auto flex-shrink-0">
              <Button
                variant="outline"
                size="lg"
                className="w-full rounded-full"
                onClick={goPrev}
                disabled={currentStep === 1}
              >
                Back
              </Button>
              <Button
                size="lg"
                className="w-full rounded-full bg-black text-white hover:bg-black/90"
                onClick={goNext}
              >
                Next
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 w-full max-w-md mx-auto flex-shrink-0">
              <Button
                variant="outline"
                size="lg"
                className="w-full rounded-full"
                onClick={goPrev}
              >
                Back
              </Button>
              <Button
                size="lg"
                className="w-full rounded-full bg-black text-white hover:bg-black/90"
                onClick={login}
              >
                {step.cta || "Get Started"}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
