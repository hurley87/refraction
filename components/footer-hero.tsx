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
        <div className="flex flex-col gap-12 items-center text-white text-center max-w-[600px] w-full">
          {/* Heading section */}
          <div className="flex flex-col gap-4 items-center">
            <h3 className="font-pleasure font-normal text-[32px] leading-[38px] md:text-[40px] md:leading-[48px]">
              Support Culture
            </h3>
            <h2 className="font-pleasure font-black text-[64px] leading-[68px] md:text-[80px] md:leading-[84px] tracking-[-2px] uppercase">
              EARN
              <br />
              REWARDS
            </h2>
            <p className="font-mono text-[15px] leading-[24px] md:text-[18px] md:leading-[28px] mt-2">
              Start earning IRL points for check-ins, completing challenges and
              spending at underground venues in your city.
            </p>
          </div>

          {/* CTA Button */}
          <button className="bg-white flex items-center justify-between gap-12 px-8 py-4 rounded-full cursor-pointer hover:bg-gray-100 transition-colors group min-w-[260px]">
            <span className="font-pleasure font-medium text-[20px] leading-[24px] text-black">
              Start Now
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="12"
              viewBox="0 0 18 12"
              fill="none"
            >
              <path
                d="M12 0C12 0.636 12.5498 1.58571 13.1063 2.38286C13.8218 3.41143 14.6767 4.30886 15.657 4.99371C16.392 5.50714 17.283 6 18 6M18 6C17.283 6 16.3912 6.49286 15.657 7.00629C14.6767 7.692 13.8218 8.58943 13.1063 9.61629C12.5498 10.4143 12 11.3657 12 12M18 6H0"
                stroke="#7D7D7D"
              />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
