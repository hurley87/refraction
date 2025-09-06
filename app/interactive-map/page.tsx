"use client";

import InteractiveMap from "@/components/interactive-map";
import MobileFooterNav from "@/components/mobile-footer-nav";
import Auth from "@/components/auth";

export default function InteractiveMapPage() {
  return (
    <div
      style={{
        background:
          "linear-gradient(0deg, #61BFD1 0%, #1BA351 33.66%, #FFE600 62.5%, #EE91B7 100%)",
      }}
      className="min-h-screen p-4 pb-0 font-grotesk"
    >
      <Auth>
        <div className="fixed inset-0 font-grotesk">
          <InteractiveMap />
          <MobileFooterNav showOnDesktop />
        </div>
      </Auth>
    </div>
  );
}
