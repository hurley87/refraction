"use client";
import Image from "next/image";

export default function IRLPage() {
  return (
    
    <div className="min-h-screen bg-transparent p-2 space-y-10">

       {/* Row 1: Membership Card Image */}
      <div className="flex justify-center">
        <div className="w-96 h-64 rounded-lg flex items-center justify-center">
          <Image src="/irl-card-animated.gif" alt="IRL Membership Card" width={590*2} height={347*2} unoptimized={true} />
        </div>
      </div>
      {/* Row 2: Main Heading */}
      <div className="text-center max-w-[30%] sm:max-w-[80%] lg:max-w-[40%] mx-auto">
        <h1 className="text-6xl lg:text-8xl font-bold  text-black font-inktrap">
          Become a founding member of IRL
        </h1>
      </div>

      {/* Row 3: Subheading */}
      <div className="text-center max-w-[30%] sm:max-w-[80%] lg:max-w-[40%] mx-auto">
        <p className="text-xl lg:text-2xl  text-gray-700 leading-relaxed font-inktrap">
          Join 1168 artists and 200 global partners in collectively owning culture&apos;s rewards program.
        </p>
      </div>

              <div className="flex flex-col items-center space-y-4">
          <button className="bg-white text-black px-8 py-4 h-16 flex items-center gap-2 rounded-full hover:bg-gray-200 transition-colors duration-200 font-inktrap uppercase">
            Earn your first points <Image src="/arrow-right.svg" alt="IRL" width={20} height={20} />
          </button>
          <Image src="/poweredbyrefraction.svg" alt="IRL Membership Card" width={300} height={150} />
        </div>
    


     

      {/* Video Background Section with Three Columns */}
      <div className="relative w-full  lg:h-[905px] overflow-hidden rounded-xl  p-20">
        {/* Video Background */}
        <video 
          autoPlay 
          loop 
          muted 
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/video-reel.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        
        {/* Text Overlay - Two Rows */}
        <div className="relative z-10 flex flex-col justify-start pt-8">
          <div className="text-left  mb-4">
            <h2 className="text-3xl lg:text-4xl font-bold text-white font-inktrap">
              Earn Rewards
            </h2>
          </div>
          <div className="text-left ">
            <p className="text-lg lg:text-2xl text-white font-inktrap">
              Just by showing up for the things you love
            </p>
          </div>
        </div>
        
        {/* Three Column Flexbox Overlay */}
        <div className="relative z-10 flex h-[500px] gap-20">
          <div className="flex-1 bg-black bg-opacity-70 rounded-xl flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-2">Column 1</h3>
              <p className="text-white">Content for first column</p>
            </div>
          </div>
          
          <div className="flex-1 bg-black bg-opacity-70 rounded-xl flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-2">Column 2</h3>
              <p className="text-white">Content for second column</p>
            </div>
          </div>
          
          <div className="flex-1 bg-black bg-opacity-70 rounded-xl flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-2">Column 3</h3>
              <p className="text-white">Content for third column</p>
            </div>
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
            <Image src="/images/irl-tshirt-mockup.png" alt="IRL" width={1200} height={1600} />
          </div>
        </div>
        <div className="flex-1">
          <div className="w-full rounded-lg flex items-center justify-center">
            <Image src="/images/irl-phone-mockup.png" alt="IRL" width={125*1.2} height={85*1.2} />
          </div>
        </div>
        <div className="flex-1">
          <div className="w-full rounded-lg flex items-center justify-center">
            <Image src="/images/irl-token.png" alt="IRL" width={150} height={150} />
          </div>
        </div>
      </div>
    </div>
    
  );
}
