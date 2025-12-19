"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useState, useEffect, useRef } from "react";

// Lazy load WebGLRenderer with dynamic import - only loads when component mounts
const WebGLRenderer = dynamic(() => import("@/components/webgl-renderer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-950" />
  ),
});

/**
 * Footer Hero component that renders an animated WebGL gradient above the footer
 * Matches Figma design: node-id=6192:100639
 */
export default function FooterHero() {
  const [shouldLoadWebGL, setShouldLoadWebGL] = useState(false);
  const [webglData, setWebglData] = useState<any>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    // Use intersection observer to only load when footer is near viewport
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoadWebGL(true);
            // Lazy load the JSON data only when needed
            import("@/public/footer-webgl.json").then((module) => {
              setWebglData(module.default);
            });
            observer.disconnect();
          }
        });
      },
      { rootMargin: "200px" }, // Start loading 200px before it enters viewport
    );

    observer.observe(section);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full min-h-screen overflow-hidden pt-[900px]"
    >
      {/* WebGL Background with padding */}
      <div className="absolute inset-0 p-0 md:p-4 top-[250px] md:top-[800px]">
        <div className="w-full h-full rounded-[48px] overflow-hidden">
          {shouldLoadWebGL ? (
            <WebGLRenderer data={webglData} />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-950" />
          )}
        </div>
      </div>

      {/* Content overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center pt-[320px] pb-[320px]  px-4 py-20 ">
        {/* Main content container */}
        <div className="flex flex-col gap-[57px] items-center text-white text-center max-w-[600px] w-full">
          {/* Heading section */}
          <div className="flex flex-col gap-4 items-center w-full">
            <h2
              className="font-pleasure display2 font-medium text-[50px] leading-[40px] tracking-[-2.34px] mb-0"
              style={{ textShadow: "rgba(255,255,255,0.54) 0px 0px 24px" }}
            >
              Support Culture
            </h2>
            <h2
              className="font-pleasure display2 font-bold text-[61px] leading-[64px] tracking-[-4.88px]  mb-0"
              style={{ textShadow: "rgba(255,255,255,0.54) 0px 0px 24px" }}
            >
              Earn Rewards
            </h2>
            <p className="font-mono font-bold text-[16px] leading-[24px] tracking-[-0.32px] w-full mt-4">
              Start earning IRL points for check-ins, completing challenges and
              spending at underground venues in your city.
            </p>
          </div>

          {/* CTA Button */}
          <div className="w-[260px]">
            <Link
              href="/interactive-map"
              className="bg-white flex items-center justify-between h-[48px] px-4 py-2 rounded-[100px] cursor-pointer hover:bg-[#b5b5b5] transition-colors group w-full"
            >
              <span className="font-pleasure font-medium text-[16px] leading-[16px] tracking-[-1.28px] text-[#313131] whitespace-nowrap">
                Start Now
              </span>
              <div className="w-6 h-6 flex items-center justify-center shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="12"
                  viewBox="0 0 18 12"
                  fill="none"
                  className="block"
                >
                  <path
                    d="M12 0C12 0.636 12.5498 1.58571 13.1063 2.38286C13.8218 3.41143 14.6767 4.30886 15.657 4.99371C16.392 5.50714 17.283 6 18 6M18 6C17.283 6 16.3912 6.49286 15.657 7.00629C14.6767 7.692 13.8218 8.58943 13.1063 9.61629C12.5498 10.4143 12 11.3657 12 12M18 6H0"
                    stroke="#313131"
                    strokeWidth="1"
                  />
                </svg>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}