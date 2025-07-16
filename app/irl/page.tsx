"use client";
import Image from "next/image";
import Link from "next/link";

export default function IRLPage() {
  return (
    <div className="min-h-screen bg-transparent p-8 space-y-12">
      {/* Row 1: Main Heading */}
      <div className="text-center max-w-[70%] mx-auto">
        <h1 className="text-6xl lg:text-8xl font-bold uppercase text-black font-inktrap">
          become a founding member of IRL
        </h1>
      </div>

      {/* Row 2: Subheading */}
      <div className="text-center max-w-[60%] mx-auto">
        <p className="text-xl lg:text-2xl uppercase text-black leading-relaxed font-inktrap">
          JOIN 1168 ARTISTS AND 200 GLOBAL PARTNERS IN COLLECTIVELY OWNING CULTURE'S REWARDS PROGRAM.
        </p>
      </div>

      {/* Row 3: Membership Card Image */}
      <div className="flex justify-center">
        <div className="w-80 h-48 bg-gray-200 rounded-lg flex items-center justify-center">
          <p className="text-gray-500 font-inktrap">
            <Image src="/images/irl-card.svg" alt="IRL Membership Card" width={320} height={180} />
          </p>
        </div>
      </div>

      {/* Row 4: Three Columns - Logo, Line, Text */}
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex-1 flex justify-center">
          <Image 
            src="/images/irl-landing-logo.png" 
            alt="IRL" 
            width={108.38} 
            height={55.55} 
            className="w-24 h-auto"
          />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="w-full h-0.5 bg-black"></div>
        </div>
        <div className="flex-1 flex justify-center">
          <p className="text-lg text-black text-center font-inktrap">
            rewards for showing up to things you already love
          </p>
        </div>
      </div>

      {/* Row 5: Three Image Columns */}
      <div className="flex justify-between max-w-6xl mx-auto space-x-8">
        <div className="flex-1">
          <div className="w-full rounded-lg flex items-center justify-center">
            <p className="text-gray-500 font-inktrap">
              <Image src="/images/irl-rectangle-1.svg" alt="IRL" width={489.79} height={621.26} />
            </p>
          </div>
        </div>
        <div className="flex-1">
          <div className="w-full  rounded-lg flex items-center justify-center">
            <p className="text-gray-500 font-inktrap">
              <Image src="/images/irl-rectangle-2.svg" alt="IRL" width={369.3} height={524.19} />
            </p>
          </div>
        </div>
        <div className="flex-1">
          <div className="w-full  rounded-lg flex items-center justify-center">
            <p className="text-gray-500 font-inktrap">
              <Image src="/images/irl-rectangle-3.svg" alt="IRL" width={459.68} height={627.58} />
            </p>
          </div>
        </div>
      </div>

      {/* Row 6: Two Columns - Text and Button */}
      <div className="flex items-center justify-between py-12 max-w-6xl mx-auto">
        <div className="flex-1">
          <p className="text-2xl text-black font-inktrap uppercase">
            already a refract pass holder? unlock your perks
          </p>
        </div>
        <div className="flex-1 flex justify-end">
          <button className="bg-black text-white px-8 py-4 rounded-lg hover:bg-gray-800 transition-colors duration-200 font-inktrap uppercase">
            fill out membership form
          </button>
        </div>
      </div>

      {/* Row 7: Three Description Columns */}
      <div className="flex justify-between max-w-6xl mx-auto space-x-8">
        <div className="flex-1">
          <p className="text-lg text-black text-center font-inktrap">
            GET YOUR ONBOARDING EMAIL AND CLAIM YOUR TEE
          </p>
        </div>
        <div className="flex-1">
          <p className="text-lg text-black text-center font-inktrap">
            DOWNLOAD THE IRL APP
          </p>
        </div>
        <div className="flex-1">
          <p className="text-lg text-black text-center font-inktrap">
            IRL POINTS AUTO-APPLIED
          </p>
        </div>
      </div>

      {/* Row 8: Three Image Columns */}
      <div className="flex justify-between max-w-6xl mx-auto space-x-8">
        <div className="flex-1">
          <div className="w-full rounded-lg flex items-center justify-center">
            <Image src="/images/irl-tshirt.svg" alt="IRL" width={489.79} height={621.26} />
          </div>
        </div>
        <div className="flex-1">
          <div className="w-full rounded-lg flex items-center justify-center">
            <Image src="/images/irl-app.svg" alt="IRL" width={420} height={479.99} />
          </div>
        </div>
        <div className="flex-1">
          <div className="w-full rounded-lg flex items-center justify-center">
            <Image src="/images/irl-token.svg" alt="IRL" width={220.54} height={221.12} />
          </div>
        </div>
      </div>
    </div>
  );
}