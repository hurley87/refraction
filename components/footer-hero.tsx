"use client";

import WebGLRenderer from "@/components/webgl-renderer";
import footerWebGLData from "@/public/footer-webgl.json";

/**
 * Footer Hero component that renders an animated WebGL gradient above the footer
 */
export default function FooterHero() {
  return (
    <section className="relative w-full min-h-screen overflow-hidden">
      {/* WebGL Background with padding */}
      <div className="absolute inset-0 p-0 md:p-4">
        <div className="w-full h-full rounded-[48px] overflow-hidden">
          <WebGLRenderer data={footerWebGLData} />
        </div>
      </div>

      {/* Content overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-20">
        {/* Main content container */}
        <div className="flex flex-col gap-8 items-center text-white text-center max-w-[1177px] w-full">
          {/* Heading section */}
          <div className="flex flex-col gap-6 items-center">
            <h2
              className="font-['Pleasure_Variable_Trial',_sans-serif] font-bold text-[61px] leading-[64px] tracking-[-4.88px] md:text-[100px] md:leading-[100px] md:tracking-[-8px] uppercase"
              style={{
                textShadow: "0 0 24px rgba(255, 255, 255, 0.54)",
              }}
            >
              Ready to Join?
            </h2>
            <p
              className="font-['Pleasure_Variable_Trial',_sans-serif] font-medium text-[20px] leading-[24px] tracking-[-0.4px] md:text-[25px] md:leading-[28px] md:tracking-[-0.5px] max-w-[600px]"
              style={{
                textShadow: "0 0 24px rgba(255, 255, 255, 0.54)",
              }}
            >
              Start earning rewards for participating in culture
            </p>
          </div>

          {/* CTA Button */}
          <div className="flex flex-col gap-4 items-center w-[260px] max-w-full">
            <button className="bg-white flex h-12 items-center justify-between px-4 py-2 rounded-full w-full cursor-pointer hover:bg-gray-100 transition-colors">
              <span className="font-['Pleasure_Variable_Trial',_sans-serif] font-medium text-[16px] leading-[16px] text-[#313131] tracking-[-1.28px]">
                Get Started Now
              </span>
              <img src="/arrow-right.svg" alt="" className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
