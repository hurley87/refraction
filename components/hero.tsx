"use client";

import WebGLRenderer from "@/components/webgl-renderer";

/**
 * Hero component that renders an animated WebGL gradient above the fold
 */
export default function Hero() {
  return (
    <section className="relative w-full h-screen overflow-hidden">
      {/* WebGL Background with padding */}
      <div className="absolute inset-0 p-0 md:p-4">
        <div className="w-full h-full rounded-[48px] overflow-hidden">
          <WebGLRenderer />
        </div>
      </div>

      {/* Optional content overlay - uncomment to add text/CTA */}
      {/* <div className="relative z-10 flex items-center justify-center h-full">
        <div className="text-center text-white">
          <h1 className="text-6xl font-bold mb-4">Welcome</h1>
          <p className="text-xl">Your tagline here</p>
        </div>
      </div> */}
    </section>
  );
}
