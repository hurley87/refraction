"use client";

import Header from "./header";

export default function GameMapbox() {
  return (
    <div
      style={{
        background:
          "linear-gradient(0deg, #61BFD1 0%, #1BA351 33.66%, #FFE600 62.5%, #EE91B7 100%)",
      }}
      className="min-h-screen p-4 pb-0 font-grotesk"
    >
      <div className="min-h-screen max-w-lg mx-auto">
        {/* Status Bar */}
        <Header />

        {/* Main Content */}
        <div className="px-0 pt-8">
          {/* Title Section */}
          <div className="mb-6">
            <h1 className="text-lg mb-1">Put Yourself</h1>
            <h2 className="text-4xl font-inktrap font-bold text-black leading-tight">
              ON THE MAP
            </h2>
          </div>

          {/* Points Card */}
          <div className="bg-orange-100 rounded-2xl p-4 mb-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700 mb-1 font-inktrap">
                  You Can Earn
                </p>
                <p className="text-5xl font-inktrap font-bold text-black">
                  <span className="text-lg font-normal">+</span>
                  100 <span className="text-lg font-normal">pts</span>
                </p>
              </div>
            </div>
          </div>

          {/* Description Text */}
          <div className="space-y-4 mb-8 text-sm text-black font-anonymous">
            <p>
              Check in at locations around the world to earn IRL points and
              unlock exclusive rewards. The IRL network connects culture and
              community through blockchain technology.
            </p>
            <p>
              Share your location to verify your presence and join a global
              network of creators, artists, and culture enthusiasts building the
              future of experiences together.
            </p>
            <p>Feature coming soon!</p>
          </div>
        </div>

        {/* Bottom IRL Section */}
        <div className="py-6">
          <img src="/irl-bottom-logo.svg" alt="IRL" className="w-full h-auto" />
        </div>
      </div>
    </div>
  );
}
