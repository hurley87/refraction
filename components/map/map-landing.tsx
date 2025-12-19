"use client";

import { useState } from "react";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface MapLandingProps {
  children: React.ReactNode;
}

export default function MapLanding({ children }: MapLandingProps) {
  const [hasEntered, setHasEntered] = useState(false);
  const { login, authenticated, ready } = usePrivy();

  // Skip landing page for authenticated users
  if (hasEntered || authenticated) {
    return <>{children}</>;
  }

  // Show loading state while Privy initializes to prevent flash
  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-gradient-to-b from-[#D4A5C9] via-[#7FBF7F] to-[#7FFF00]">
        <div className="text-[#1a1a1a] font-inktrap text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col relative overflow-hidden bg-gradient-to-b from-[#D4A5C9] via-[#7FBF7F] to-[#7FFF00]">
      {/* Miami map overlay at top */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url("/miami.png")`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
          maskImage:
            "linear-gradient(to bottom, black 0%, black 40%, transparent 70%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 0%, black 40%, transparent 70%)",
        }}
      />

      {/* Content wrapper with max-width */}
      <div className="relative z-10 flex flex-col flex-1 w-full max-w-md mx-auto">
        {/* Header */}
        <header className="flex items-center justify-end p-4">
          <Button
            onClick={login}
            variant="outline"
            className="rounded-full bg-white text-black border-0 font-inktrap text-sm px-5 py-2 hover:bg-white/90"
          >
            Sign In
          </Button>
        </header>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center -mt-8">
          {/* Tagline */}
          <p className="font-inktrap text-[#1a1a1a] text-xl sm:text-2xl mb-10 leading-tight">
            Explore Miami Through the
            <br />
            Lens of Locals
          </p>

          {/* IRL Marker */}
          <div className="relative mb-16">
            <div className="w-20 h-24 flex items-center justify-center">
              <Image
                src="/marker.svg"
                alt="IRL marker"
                width={80}
                height={96}
                className="w-full h-full drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]"
              />
            </div>
          </div>

          {/* Welcome text */}
          <div className="space-y-3">
            <p className="text-[#1a1a1a] font-inktrap text-base sm:text-lg tracking-wide">
              Welcome to the IRL Map for
            </p>
            <h1 className="font-inktrap text-[#1a1a1a] text-5xl sm:text-6xl md:text-7xl leading-[0.85] tracking-tight">
              MIAMI ART
              <br />
              WEEK
            </h1>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="p-6 pb-10">
          <Button
            onClick={() => setHasEntered(true)}
            className="bg-white text-black rounded-full hover:bg-white/90 w-full font-inktrap py-6 text-base flex items-center justify-between px-6 shadow-lg"
          >
            <span>Get Started</span>
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
