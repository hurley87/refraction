"use client";
import Image from "next/image";


export default function IRLPage() {
  return (
    <div className="min-h-screen bg-transparent p-2 space-y-12">
      {/* Row 1: Main Heading */}
      <div className="text-center max-w-[70%] mx-auto">
        <h1 className="text-6xl lg:text-8xl font-bold uppercase text-black font-inktrap">
          become a founding member of IRL
        </h1>
      </div>

      {/* Row 2: Subheading */}
      <div className="text-center max-w-[60%] mx-auto">
        <p className="text-xl lg:text-2xl uppercase text-black leading-relaxed font-inktrap">
          JOIN 1168 ARTISTS AND 200 GLOBAL PARTNERS IN COLLECTIVELY OWNING CULTURE&apos;S REWARDS PROGRAM.
        </p>
      </div>

      {/* Row 3: Membership Card Image */}
      <div className="flex justify-center">
        <div className="w-96 h-64 rounded-lg flex items-center justify-center">
          <Image src="/images/irl-card.png" alt="IRL Membership Card" width={384} height={256} />
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
            className="w-32 h-auto"
          />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="w-full h-0.5 bg-black"></div>
        </div>
        <div className="flex-1 flex justify-center">
          <p className="lg:text-4xl text-xl text-black text-center uppercase font-inktrap">
            rewards for showing up to things you already love
          </p>
        </div>
      </div>

      {/* Row 5: Three Image Columns */}
      <div className="flex justify-between max-w-6xl mx-auto space-x-2 sm:space-x-4 lg:space-x-8">
        <div className="flex-1">
          <div className="w-full rounded-lg flex items-center justify-center">
            <Image src="/images/irl-memberships-1.png" alt="IRL" width={600} height={800} />
          </div>
        </div>
        <div className="flex-1">
          <div className="w-full rounded-lg flex items-center justify-center">
            <Image src="/images/irl-memberships-2.png" alt="IRL" width={450} height={640} />
          </div>
        </div>
        <div className="flex-1">
          <div className="w-full rounded-lg flex items-center justify-center">
            <Image src="/images/irl-memberships-3.png" alt="IRL" width={560} height={800} />
          </div>
        </div>
      </div>

      {/* Row 6: Two Columns - Text and Button */}
      <div className="flex flex-col lg:flex-row items-center justify-between py-12 max-w-6xl mx-auto space-y-6 lg:space-y-0">
        <div className="flex-1">
          <p className="lg:text-4xl text-2xl text-black font-inktrap uppercase text-center">
            already a refract pass holder? unlock your perks
          </p>
        </div>
        <div className="flex-1 flex justify-center lg:justify-end">
          <button className="bg-black text-white px-8 py-4 rounded-full hover:bg-gray-800 transition-colors duration-200 font-inktrap uppercase">
            fill out membership form
          </button>
        </div>
      </div>

      {/* Row 7: Three Description Columns */}
      <div className="flex justify-between max-w-6xl mx-auto space-x-2 sm:space-x-4 lg:space-x-8">
        <div className="flex-1">
          <p className="lg:text-lg text-sm text-black text-center font-inktrap">
            GET YOUR ONBOARDING EMAIL AND CLAIM YOUR TEE
          </p>
        </div>
        <div className="flex-1">
          <p className="lg:text-lg text-sm text-black text-center font-inktrap">
            DOWNLOAD THE IRL APP
          </p>
        </div>
        <div className="flex-1">
          <p className="lg:text-lg text-sm text-black text-center font-inktrap">
            IRL POINTS AUTO-APPLIED
          </p>
        </div>
      </div>

      {/* Row 8: Three Image Columns */}
      <div className="flex justify-betweenI max-w-6xl mx-auto space-x-2 sm:space-x-4 lg:space-x-8">
        <div className="flex-1">
          <div className="w-full rounded-lg flex items-center justify-center">
            <Image src="/images/irl-tshirt-mockup.png" alt="IRL" width={600} height={800} />
          </div>
        </div>
        <div className="flex-1">
          <div className="w-full rounded-lg flex items-center justify-center">
            <Image src="/images/irl-phone-mockup.png" alt="IRL" width={500} height={340} />
          </div>
        </div>
        <div className="flex-1">
          <div className="w-full rounded-lg flex items-center justify-center">
            <Image src="/images/irl-token.png" alt="IRL" width={300} height={300} />
          </div>
        </div>
      </div>
    </div>
  );
}