"use client";
import Image from "next/image";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const carouselData = [
  {
    text: "Get your onboarding Email and claim your T Shirt",
    image: "irl-shirt-4000x2250.png",
    width: 4000,
    height: 2250,
    step: 1,
    stepText: "step one"
  },
  {
    text: "Download the IRL app",
    image: "irl-app-6000x6857.png",
    transform: "rotate(15deg)",
    width: 6000,
    height: 6857,
    step: 2,
    stepText: "step two"
  },
  {
    text: "Your IRL points are auto-applied to your account",
    image: "irl-token-285x202.png",
    width: 285,
    height: 202,
    step: 3,
    stepText: "step three"
  }
];


export default function IRLPage() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
    // Scroll to middle card on mobile
    if (scrollContainerRef.current && window.innerWidth < 1024) {
      const container = scrollContainerRef.current;
      const cardWidth = 320; // w-80 = 320px
      const gap = 32; // gap-8 = 32px
      const middleCardPosition = cardWidth + gap; // Position of middle card
      
      container.scrollTo({
        left: middleCardPosition,
        behavior: 'smooth'
      });
    }
  }, []);

  // Preload all carousel images
  useEffect(() => {
    carouselData.forEach((item) => {
      const img = new window.Image();
      img.src = `/${item.image}`;
    });
  }, []);

    return (
    
    <div className="min-h-screen bg-transparent p-2 space-y-10">

       {/* Row 1: Membership Card Image */}
      <div className="flex justify-center">
        <div className="w-96 h-64 rounded-lg flex items-center justify-center">
          <Image src="/irl-card-animated.gif" alt="IRL Membership Card" width={590*2} height={347*2} unoptimized={true} />
        </div>
      </div>
      {/* Row 2: Main Heading */}
      <div className="text-center max-w-[90%] sm:max-w-[80%] lg:max-w-[40%] mx-auto px-4">
        <h1 className="text-4xl sm:text-6xl lg:text-8xl font-bold text-black font-inktrap leading-tight">
          Become a founding member of IRL
        </h1>
      </div>

      {/* Row 3: Subheading */}
      <div className="text-center max-w-[90%] sm:max-w-[80%] lg:max-w-[40%] mx-auto px-4">
        <p className="text-lg sm:text-xl lg:text-2xl text-gray-700 leading-relaxed font-inktrap">
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
      <div className="relative w-full  lg:h-[1000px] overflow-hidden rounded-xl  p-20 pb-32">
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
        <div className="relative z-10 flex flex-col justify-start pt-8 pb-10">
          <div className="lg:text-left text-center  mb-4">
            <h2 className="text-4xl lg:text-8xl font-bold text-[#ffe600] font-inktrap">
              Earn Rewards
            </h2>
          </div>
          <div className="text-left ">
            <p className="text-lg text-center lg:text-left lg:text-2xl text-white font-pleasure">
              Just by showing up for the things you love
            </p>
          </div>
        </div>
        
        {/* Three Column Flexbox Overlay */}
        <div className="relative z-10 lg:flex lg:flex-row h-auto lg:h-[600px] lg:gap-12 xl:gap-20">
          {/* Mobile horizontal scroll container */}
          <div ref={scrollContainerRef} className="lg:hidden flex overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 -mx-8 px-8">
            <div className="flex gap-8 min-w-max">
              {/* Card 1: Membership */}
              <div className="w-80 flex-shrink-0 snap-center">
                <div className="bg-black bg-opacity-70 rounded-xl p-8 flex flex-col justify-between h-full">
                  {/* Row 1: Title and Price */}
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold text-white font-inktrap">Membership</h3>
                    <span className="text-xl text-white font-inktrap font-semibold">$Free</span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="275" height="2" viewBox="0 0 397 2" fill="none">
                        <path d="M0.333374 1L365.31 1L379.213 1L396.333 1" stroke="#D7D3D0"/>
                      </svg>
                    </div>
                  </div>
                  
                  {/* Row 2: Bullet Points */}
                  <div className="flex-1 mb-4 font-pleasure">
                    <ul className="text-white space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Image src="/check-circle.svg" alt="IRL" width={20} height={20} />
                        <span>Earn IRL Points</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Image src="/check-circle.svg" alt="IRL" width={20} height={20} />
                        <span>Participate in Local Events</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Image src="/check-circle.svg" alt="IRL" width={20} height={20} />
                        <span>Help Tailor rewards to your city</span>
                      </li>
                    </ul>
                  </div>
                  
                  {/* Row 3: Button */}
                  <button className="bg-gray-800 text-white px-8 py-4 h-16 flex items-center justify-between rounded-full hover:bg-gray-600 transition-colors duration-200 font-inktrap uppercase">
                    <span>Sign up for free</span>
                    <Image src="/white-arrow-right.svg" alt="IRL" width={20} height={20} />
                  </button>
                </div>
              </div>
              
              {/* Card 2: Refract Pass (Center) */}
              <div className="w-80 flex-shrink-0 snap-center">
                <div className="rounded-xl p-[2px] bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500">
                  <div className="bg-black bg-opacity-70 rounded-xl p-8 flex flex-col justify-between h-full">
                    {/* Row 1: Title and Price */}
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-2xl font-bold font-inktrap text-white">Refract Pass</h3>
                      <span className="text-xl text-white font-inktrap font-semibold">0.25 ETH</span>
                    </div>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="275" height="2" viewBox="0 0 397 2" fill="none">
                          <path d="M0.333374 1L365.31 1L379.213 1L396.333 1" stroke="#D7D3D0"/>
                        </svg>
                      </div>
                    </div>
                    
                    {/* Row 2: Bullet Points */}
                    <div className="flex-1 mb-4">
                      <ul className="text-white space-y-2 font-pleasure text-sm">
                        <li className="flex items-center gap-2 uppercase">
                          <Image src="/check-circle.svg" alt="IRL" width={20} height={20} />
                          <span>Artist Airdrops from Refraction&apos;s Global Network of Digital Pioneers</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Image src="/check-circle.svg" alt="IRL" width={20} height={20} />
                          <span>GLOBAL EVENT ACCESS PRIORITY RSVP & EXCLUSIVE PERKS AT IRL PARTNER EVENTS WORLDWIDE.</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Image src="/check-circle.svg" alt="IRL" width={20} height={20} />
                          <span>25,000 IRL POINTS AUTOMATICALLY CREDITED. (POINTS CONVERT MONTHLY INTO IRL TOKENS VIA THE EPOCH SYSTEM. EARLY ADOPTERS GET HIGHER RATES.)</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Image src="/check-circle.svg" alt="IRL" width={20} height={20} />
                          <span>IRL TOKEN ELIGIBILITY UNLOCKFUTURE STAKING, REWARDS, AND ON-CHAIN GOVERNANCE.</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Image src="/check-circle.svg" alt="IRL" width={20} height={20} />
                          <span>LIMITED-EDITION IRL TEE</span>
                        </li>
                      </ul>
                    </div>
                    
                    {/* Row 3: Button */}
                                         <button className="bg-white text-black px-4 sm:px-8 py-4 h-16 flex items-center justify-between rounded-full hover:bg-gray-200 transition-colors duration-200 font-inktrap whitespace-nowrap uppercase">
                        <span className="text-xs sm:text-sm">Become a founding member</span>
                        <Image src="/arrow-right.svg" alt="IRL" width={20} height={20} />
                      </button>
                  </div>
                </div>
              </div>
              
              {/* Card 3: Affiliate Membership */}
              <div className="w-80 flex-shrink-0 snap-center">
                <div className="bg-black bg-opacity-70 rounded-xl p-8 flex flex-col justify-between h-full">
                  {/* Row 1: Title and Price */}
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold text-white font-inktrap">Affiliate Membership</h3>
                    <span className="text-xl text-white font-inktrap font-semibold">
                      <button className="bg-white text-black text-xs px-4 py-2 h-8 flex items-center gap-2 rounded-full hover:bg-gray-200 transition-colors duration-200 font-inktrap uppercase whitespace-nowrap">
                        Contact Us <Image src="/arrow-right.svg" alt="IRL" width={16} height={16} />
                      </button>
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="275" height="2" viewBox="0 0 397 2" fill="none">
                        <path d="M0.333374 1L365.31 1L379.213 1L396.333 1" stroke="#D7D3D0"/>
                      </svg>
                    </div>
                  </div>
                  
                  {/* Row 2: Bullet Points */}
                  <div className="flex-1 mb-4 font-pleasure">
                    <ul className="text-white space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Image src="/check-circle.svg" alt="IRL" width={20} height={20} />
                        <span>Artist Airdrops from Refraction&apos;s Global Network of Digital Pioneers</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Image src="/check-circle.svg" alt="IRL" width={20} height={20} />
                        <span>GLOBAL EVENT ACCESS PRIORITY RSVP & EXCLUSIVE PERKS AT IRL PARTNER EVENTS WORLDWIDE.</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Image src="/check-circle.svg" alt="IRL" width={20} height={20} />
                        <span>25,000 IRL POINTS AUTOMATICALLY CREDITED. (POINTS CONVERT MONTHLY INTO IRL TOKENS VIA THE EPOCH SYSTEM. EARLY ADOPTERS GET HIGHER RATES.)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Image src="/check-circle.svg" alt="IRL" width={20} height={20} />
                        <span>IRL TOKEN ELIGIBILITY UNLOCK FUTURE STAKING, REWARDS, AND ON-CHAIN GOVERNANCE.</span>
                      </li>
                    </ul>
                  </div>
                  
                  {/* Row 3: Button */}
                  <button className="bg-gray-800 text-white px-8 py-4 h-16 flex items-center justify-between rounded-full hover:bg-gray-200 transition-colors duration-200 font-inktrap uppercase">
                    <span>Get In Touch</span>
                    <Image src="/white-arrow-right.svg" alt="IRL" width={20} height={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Desktop layout */}
          <div className="hidden lg:flex w-full gap-12 xl:gap-20">
          <div className="flex-1 min-w-[300px] bg-black bg-opacity-70 rounded-xl p-6 flex flex-col justify-between">
            {/* Row 1: Title and Price */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-white font-inktrap">Membership</h3>
              <span className="text-xl text-white font-inktrap font-semibold">$Free</span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center justify-center gap-2 w-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="300" height="2" viewBox="0 0 397 2" fill="none">
                  <path d="M0.333374 1L365.31 1L379.213 1L396.333 1" stroke="#D7D3D0"/>
                </svg>
                
              </div>
            </div>
            
                          {/* Row 2: Bullet Points */}
              <div className="flex-1 mb-4 font-pleasure">
                <ul className="text-white space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Image src="/check-circle.svg" alt="IRL" width={20} height={20} />
                    <span>Earn IRL Points</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Image src="/check-circle.svg" alt="IRL" width={20} height={20} />
                    <span>Participate in Local Events</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Image src="/check-circle.svg" alt="IRL" width={20} height={20} />
                    <span>Help Tailor rewards to your city</span>
                  </li>
                
                </ul>
            </div>
            
            {/* Row 3: Button */}
            <button className="bg-gray-800 text-white px-8 py-4 h-16 flex items-center justify-between rounded-full hover:bg-gray-600 transition-colors duration-200 font-inktrap uppercase">
              <span>Sign up for free</span>
              <Image src="/arrow-right.svg" alt="IRL" width={20} height={20} />
            </button>
          </div>
          
          <div className="flex-1 min-w-[300px] rounded-xl p-[2px] bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500">
            <div className="bg-black bg-opacity-70 rounded-xl p-6 flex flex-col justify-between h-full min-h-[600px]">
              {/* Row 1: Title and Price */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold font-inktrap text-white">Refract Pass</h3>
                <span className="text-xl text-white font-inktrap font-semibold">0.25 ETH</span>
              </div>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center justify-center gap-2 w-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="300" height="2" viewBox="0 0 397 2" fill="none">
                  <path d="M0.333374 1L365.31 1L379.213 1L396.333 1" stroke="#D7D3D0"/>
                </svg>
                
              </div>
            </div>
            
               {/* Row 2: Bullet Points */}
              <div className="flex-1 mb-4">
                <ul className="text-white space-y-2  font-pleasuretext-sm">
                  <li className="flex items-center gap-2 uppercase">
                    <Image src="/check-circle.svg" alt="IRL" width={20} height={20} />
                    <span>Artist Airdrops from Refraction’s Global Network of Digital Pioneers</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Image src="/check-circle.svg" alt="IRL" width={20} height={20} />
                    <span>GLOBAL EVENT ACCESS PRIORITY RSVP & EXCLUSIVE PERKS AT IRL PARTNER EVENTS WORLDWIDE.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Image src="/check-circle.svg" alt="IRL" width={20} height={20} />
                    <span>25,000 IRL POINTS AUTOMATICALLY CREDITED. (POINTS CONVERT MONTHLY INTO IRL TOKENS VIA THE EPOCH SYSTEM. EARLY ADOPTERS GET HIGHER RATES.)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Image src="/check-circle.svg" alt="IRL" width={20} height={20} />
                    <span>IRL TOKEN ELIGIBILITY UNLOCKFUTURE STAKING, REWARDS, AND ON-CHAIN GOVERNANCE.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Image src="/check-circle.svg" alt="IRL" width={20} height={20} />
                    <span>LIMITED-EDITION IRL TEE</span>
                  </li>
                
                </ul>
            </div>
            
             {/* Row 3: Button */}
                             <button className="bg-white text-black px-4 sm:px-8 py-4 h-16 flex items-center justify-between rounded-full hover:bg-gray-300 transition-colors duration-200 font-inktrap whitespace-nowrap uppercase">
                  <span className="text-xs sm:text-sm">Become a founding member</span>
                  <Image src="/arrow-right.svg" alt="IRL" width={20} height={20} />
                </button>
            </div>
          </div>
          <div className="flex-1 min-w-[300px] bg-black bg-opacity-70 rounded-xl p-8 lg:p-6 flex flex-col justify-between">
            {/* Row 1: Title and Price */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-white font-inktrap">Affiliate Membership</h3>
              <span className="text-xl text-white font-inktrap font-semibold">
                <button className="bg-white text-black text-xs px-4 py-2 h-8 flex items-center gap-2 rounded-full hover:bg-gray-200 transition-colors duration-200 font-inktrap uppercase whitespace-nowrap">
                  Contact Us <Image src="/arrow-right.svg" alt="IRL" width={16} height={16} />
                </button></span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center justify-center gap-2 w-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="300" height="2" viewBox="0 0 397 2" fill="none">
                  <path d="M0.333374 1L365.31 1L379.213 1L396.333 1" stroke="#D7D3D0"/>
                </svg>
                
              </div>
            </div>
            
                          {/* Row 2: Bullet Points */}
              <div className="flex-1 mb-4 font-pleasure">
                <ul className="text-white space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Image src="/check-circle.svg" alt="IRL" width={20} height={20} />
                    <span>Artist Airdrops from Refraction’s Global Network of Digital Pioneers</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Image src="/check-circle.svg" alt="IRL" width={20} height={20} />
                    <span>GLOBAL EVENT ACCESS PRIORITY RSVP & EXCLUSIVE PERKS AT IRL PARTNER EVENTS WORLDWIDE.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Image src="/check-circle.svg" alt="IRL" width={20} height={20} />
                    <span>25,000 IRL POINTS AUTOMATICALLY CREDITED. (POINTS CONVERT MONTHLY INTO IRL TOKENS VIA THE EPOCH SYSTEM. EARLY ADOPTERS GET HIGHER RATES.)</span>
                  </li>
                <li className="flex items-center gap-2">
                    <Image src="/check-circle.svg" alt="IRL" width={20} height={20} />
                    <span>IRL TOKEN ELIGIBILITY UNLOCK FUTURE STAKING, REWARDS, AND ON-CHAIN GOVERNANCE.</span>
                  </li>

                
                </ul>
            </div>
            
            {/* Row 3: Button */}
            <button className="bg-gray-800 text-white  px-8 py-4 h-16 flex items-center justify-between rounded-full hover:bg-gray-600 transition-colors duration-200 font-inktrap whitespace-nowrap uppercase">
              <span>Get In Touch</span>
              <Image src="/arrow-right.svg" alt="IRL" width={20} height={20} />
            </button>
          </div>
          
          </div>
        </div>
      </div>


             <div className="max-w-4xl mx-auto py-16 px-4">
                  {/* Carousel Container */}
         <div className="flex flex-col items-center text-center min-h-fit">
           {/* Row 1 */}
           <p className="text-lg font-pleasure text-black mb-2">
             Earn your points in
           </p>

           {/* Row 2 */}
           <h2 className="text-4xl font-pleasure uppercase text-black mb-8">
             three easy steps
           </h2>

           {/* Desktop: Two Column Layout */}
           <div className="hidden lg:flex w-full gap-12 items-center h-96">
             {/* Left Column - Text Content */}
             <div className="flex-1 text-left">
               {/* Row 4 - Current Item Number */}
               <div className="text-6xl font-pleasure text-white mb-4">
                 <div className="w-24 h-24 rounded-full bg-[#B5B5B5] flex items-center justify-center">
                   {carouselData[currentIndex].step}
                 </div>
               </div>

               {/* Row 5 - Step Text */}
               <p className="text-sm font-sans uppercase text-black mb-4">
                 {carouselData[currentIndex].stepText}
               </p>

               {/* Row 6 - Description */}
               <p className="text-lg font-pleasure text-black mb-8">
                 {carouselData[currentIndex].text}
               </p>
             </div>

             {/* Right Column - Image */}
             <div className="flex-1">
               <div className="relative w-full">
                 <Image
                   src={`/${carouselData[currentIndex].image}`}
                   width={carouselData[currentIndex].width}
                   height={carouselData[currentIndex].height}
                   alt={`Step ${carouselData[currentIndex].step}`}
                   className="object-contain w-full h-auto max-h-80"
                   style={carouselData[currentIndex].transform ? { transform: carouselData[currentIndex].transform } : {}}
                   onLoad={() => setImageLoading(false)}
                   unoptimized={true}
                 />
               </div>
             </div>
           </div>

                      {/* Mobile: Vertical Stack */}
           <div className="lg:hidden w-full min-h-96 mb-8">
             {/* Row 3 - Images */}
             <div className="relative w-full mb-8">
               <Image
                 src={`/${carouselData[currentIndex].image}`}
                 width={carouselData[currentIndex].width}
                 height={carouselData[currentIndex].height}
                 alt={`Step ${carouselData[currentIndex].step}`}
                 className="object-contain w-full h-auto max-h-80"
                 style={carouselData[currentIndex].transform ? { transform: carouselData[currentIndex].transform } : {}}
                 onLoad={() => setImageLoading(false)}
                 unoptimized={true}
               />
             </div>

             {/* Row 4 - Current Item Number */}
             <div className="text-6xl font-pleasure text-white mb-4 flex justify-center">
               <div className="w-24 h-24 rounded-full bg-[#B5B5B5] flex items-center justify-center">
                 {carouselData[currentIndex].step}
               </div>
             </div>

             {/* Row 5 - Step Text */}
             <p className="text-sm uppercase font-sans text-black mb-4">
               {carouselData[currentIndex].stepText}
             </p>

             {/* Row 6 - Description */}
             <p className="text-lg font-pleasure text-black mb-8">
               {carouselData[currentIndex].text}
             </p>

             {/* Row 7 - Navigation Arrows */}
             <div className="flex gap-4 justify-center">
               <button 
                 onClick={() => {
                   setImageLoading(true);
                   setCurrentIndex(currentIndex > 0 ? currentIndex - 1 : carouselData.length - 1);
                 }} 
                 className="p-2 hover:opacity-70 transition-opacity"
                 disabled={imageLoading}
               >
                 <Image 
                   src="/up-button.png"
                   alt="Previous"
                   width={32}
                   height={32}
                 />
               </button>
               <button 
                 onClick={() => {
                   setImageLoading(true);
                   setCurrentIndex(currentIndex < carouselData.length - 1 ? currentIndex + 1 : 0);
                 }} 
                 className="p-2 hover:opacity-70 transition-opacity"
                 disabled={imageLoading}
               >
                 <Image
                   src="/down-button.png" 
                   alt="Next"
                   width={32}
                   height={32}
                 />
               </button>
             </div>
           </div>

           {/* Desktop Navigation Arrows */}
           <div className="hidden lg:flex gap-4 mb-8">
                         <button 
               onClick={() => {
                 setImageLoading(true);
                 setCurrentIndex(currentIndex > 0 ? currentIndex - 1 : carouselData.length - 1);
               }} 
               className="p-2 hover:opacity-70 transition-opacity"
               disabled={imageLoading}
             >
               <Image 
                 src="/up-button.png"
                 alt="Previous"
                 width={32}
                 height={32}
               />
             </button>
                           <button 
                onClick={() => {
                  setImageLoading(true);
                  setCurrentIndex(currentIndex < carouselData.length - 1 ? currentIndex + 1 : 0);
                }} 
                className="p-2 hover:opacity-70 transition-opacity"
                disabled={imageLoading}
              >
               <Image
                 src="/down-button.png" 
                 alt="Next"
                 width={32}
                 height={32}
               />
             </button>
          </div>
        </div>
      </div>
    

      {/* Row 6: Two Columns - Text and Button */}
      <div className="flex flex-col lg:flex-row items-center justify-between py-12 max-w-6xl mx-auto space-y-6 lg:space-y-0">
        <div className="flex-1">
          <p className="lg:text-4xl text-2xl text-black font-pleasure uppercase text-center">
            already a refract pass holder? unlock your perks
          </p>
        </div>
        <div className="flex-1 flex justify-center lg:justify-end">
          <button className="bg-black text-white px-8 py-4 rounded-full hover:bg-gray-800 transition-colors duration-200 font-inktrap uppercase">
            fill out membership form
          </button>
        </div>
      </div>


      {/* Claim Points Section */}
      <section className="py-12 sm:py-16 md:py-20 lg:py-24 xl:py-48 lg:pb-10">
        <div className="max-w-[468px] mx-auto text-center flex flex-col items-center justify-center gap-6 sm:gap-8">
          <h2 className="text-black text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold font-inktrap leading-tight">
            CLAIM
            <br />
            YOUR POINTS
          </h2>
          <p className="text-black text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl mx-auto font-anonymous">
            Check in to earn points on the IRL network, with instant access to
            future rewards and experiences.
          </p>
          <Link className="w-full" href="/game">
            <Button
              size="lg"
              className="flex items-center gap-2 justify-between bg-white hover:bg-white/90 font-inktrap text-black text-sm sm:text-base px-4 py-3 sm:py-4 rounded-full w-full"
            >
              <span className="text-black font-light">
                Earn Your First Points
              </span>
              <Image
                src="/home/arrow-right.svg"
                alt="arrow-right"
                width={24}
                height={24}
                className="w-5 h-5 sm:w-6 sm:h-6"
              />
            </Button>
          </Link>
        </div>
      </section>

      {/* Social Media Section */}
      <section className="py-8 px-4 sm:px-6">
        <div className="text-center font-grotesk text-sm sm:text-base md:text-lg mb-4">
          Follow
        </div>
        <div className="flex justify-center gap-3 sm:gap-4 md:gap-6 flex-wrap">
          <Link
            target="_blank"
            href="https://x.com/RefractionDAO"
            className="hover:opacity-80 transition-opacity"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12"
            >
              <path
                d="M33.2016 10H38.1088L27.3888 21.8611L40 38H30.1248L22.392 28.2109L13.5424 38H8.6304L20.0976 25.3144L8 10H18.1248L25.1168 18.9476L33.2016 10ZM31.48 35.1564H34.2L16.6464 12.6942H13.728L31.48 35.1564Z"
                fill="black"
              />
            </svg>
          </Link>
          <Link
            target="_blank"
            href="https://app.towns.com/t/0xf19e5997fa4df2e12a3961fc7e9ad09c7a301244/"
            className="hover:opacity-80 transition-opacity"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12"
            >
              <path
                d="M34.6764 9.28809C35.9346 9.32077 38.4631 10.0824 38.5153 12.8672C38.5673 15.6525 38.5369 17.7375 38.5153 18.4316C38.2983 19.2994 37.3766 21.0413 35.4244 21.0674C33.837 21.0674 33.8299 22.1295 34.025 22.6611V31.9678C34.0467 32.4234 33.8689 33.5884 32.984 34.6035C32.0989 35.6187 30.7278 36.9567 30.1529 37.499C29.9577 37.9003 29.0664 38.7031 27.0621 38.7031H19.6432C18.5478 38.4862 16.3501 37.4212 16.3238 34.8965C16.2913 31.7402 16.3239 29.2014 13.2653 29.0713C10.8187 28.967 9.75188 26.6205 9.52404 25.46V20.416C9.50244 20.0579 9.60829 19.1602 10.2067 18.4316C10.8054 17.7028 14.2961 13.1382 15.9664 10.9473C16.3355 10.394 17.6655 9.28809 20.0338 9.28809H34.6764ZM19.7408 11.8584C18.3091 11.8584 18.0383 12.6184 18.0817 12.998C18.06 13.8877 18.0296 15.9071 18.0817 16.8701C18.1339 17.8325 18.9051 18.0303 19.2848 18.0088H22.0836C23.1769 18.0088 23.4284 18.8116 23.4176 19.2129V28.4531C23.4176 29.6766 24.199 29.9397 24.5895 29.918C25.7611 29.9288 28.3576 29.944 29.3727 29.918C30.3871 29.8917 30.6197 29.0831 30.609 28.6816V19.2129C30.609 18.1717 31.4545 17.9763 31.8776 18.0088C32.4849 18.0305 33.9274 18.0608 34.8385 18.0088C35.7492 17.9567 35.9993 17.2282 36.0104 16.8701V12.998C36.0104 12.139 35.229 11.8801 34.8385 11.8584H19.7408Z"
                fill="black"
              />
            </svg>
          </Link>
          <Link
            target="_blank"
            href="https://farcaster.xyz/refraction"
            className="hover:opacity-80 transition-opacity"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12"
            >
              <path
                d="M32.2658 8.42285H15.7351C13.7116 8.42285 11.7709 9.22668 10.3401 10.6575C8.9093 12.0883 8.10547 14.0289 8.10547 16.0524L8.10547 31.9474C8.10547 33.9709 8.9093 35.9115 10.3401 37.3423C11.7709 38.7732 13.7116 39.577 15.7351 39.577H32.2658C34.2893 39.577 36.2299 38.7732 37.6607 37.3423C39.0916 35.9115 39.8954 33.9709 39.8954 31.9474V16.0524C39.8954 14.0289 39.0916 12.0883 37.6607 10.6575C36.2299 9.22668 34.2893 8.42285 32.2658 8.42285ZM33.3467 31.1606V31.8282C33.4365 31.8184 33.5274 31.8275 33.6135 31.8549C33.6996 31.8822 33.7791 31.9273 33.8468 31.9871C33.9145 32.047 33.969 32.1203 34.0067 32.2024C34.0444 32.2845 34.0646 32.3736 34.0659 32.464V33.2164H27.2536V32.4627C27.2551 32.3723 27.2754 32.2832 27.3133 32.2012C27.3512 32.1191 27.4058 32.0459 27.4736 31.9862C27.5415 31.9264 27.621 31.8815 27.7072 31.8543C27.7934 31.8271 27.8843 31.8182 27.9742 31.8282V31.1606C27.9742 30.8692 28.1768 30.6281 28.4484 30.5539L28.4351 24.7735C28.2258 22.4727 26.2628 20.6699 23.8746 20.6699C21.4864 20.6699 19.5234 22.4727 19.3141 24.7735L19.3008 30.546C19.6028 30.6016 20.0055 30.8215 20.0161 31.1606V31.8282C20.1059 31.8184 20.1968 31.8275 20.2829 31.8549C20.3691 31.8822 20.4485 31.9273 20.5162 31.9871C20.5839 32.047 20.6384 32.1203 20.6761 32.2024C20.7139 32.2845 20.734 32.3736 20.7353 32.464V33.2164H13.923V32.4627C13.9245 32.3724 13.9448 32.2835 13.9826 32.2015C14.0204 32.1196 14.0749 32.0464 14.1426 31.9867C14.2103 31.927 14.2897 31.882 14.3757 31.8548C14.4618 31.8275 14.5525 31.8184 14.6423 31.8282V31.1606C14.6423 30.8255 14.9085 30.5592 15.2436 30.5354V20.0778H14.5946L13.7866 17.3876H17.2848V14.7835H30.4644V17.3876H34.2024L33.3944 20.0765H32.7453V30.5354C33.0791 30.5579 33.3467 30.8268 33.3467 31.1606Z"
                fill="black"
              />
            </svg>
          </Link>
          <Link
            target="_blank"
            href="https://www.instagram.com/refractionfestival/"
            className="hover:opacity-80 transition-opacity"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12"
            >
              <path
                d="M24 4.32187C30.4125 4.32187 31.1719 4.35 33.6281 4.4625C36.0844 4.575 37.1625 4.90312 37.8844 5.1375C38.8219 5.4375 39.5063 5.79687 40.2281 6.51562C40.9594 7.24375 41.3125 7.91875 41.6125 8.85625C41.8469 9.57812 42.175 10.6562 42.2875 13.1125C42.4 15.5688 42.4281 16.3281 42.4281 22.7406C42.4281 29.1531 42.4 29.9125 42.2875 32.3688C42.175 34.825 41.8469 35.9031 41.6125 36.625C41.3125 37.5625 40.9531 38.2469 40.2344 38.9688C39.5063 39.7 38.8313 40.0531 37.8938 40.3531C37.1719 40.5875 36.0938 40.9156 33.6375 41.0281C31.1813 41.1406 30.4219 41.1688 24.0094 41.1688C17.5969 41.1688 16.8375 41.1406 14.3813 41.0281C11.925 40.9156 10.8469 40.5875 10.125 40.3531C9.1875 40.0531 8.50312 39.6937 7.78125 38.975C7.05 38.2469 6.69687 37.5719 6.39687 36.6344C6.1625 35.9125 5.83437 34.8344 5.72187 32.3781C5.60937 29.9219 5.58125 29.1625 5.58125 22.75C5.58125 16.3375 5.60937 15.5781 5.72187 13.1219C5.83437 10.6656 6.1625 9.5875 6.39687 8.86562C6.69687 7.92812 7.05625 7.24375 7.775 6.52187C8.50312 5.79062 9.17812 5.4375 10.1156 5.1375C10.8375 4.90312 11.9156 4.575 14.3719 4.4625C16.8281 4.35 17.5875 4.32187 24 4.32187ZM24 12.2031C17.3438 12.2031 12.2031 17.3438 12.2031 24C12.2031 30.6562 17.3438 35.7969 24 35.7969C30.6562 35.7969 35.7969 30.6562 35.7969 24C35.7969 17.3438 30.6562 12.2031 24 12.2031ZM24 31.3125C19.8187 31.3125 16.4875 27.9813 16.4875 24C16.4875 20.0187 19.8187 16.6875 24 16.6875C28.1813 16.6875 31.5125 20.0187 31.5125 24C31.5125 27.9813 28.1813 31.3125 24 31.3125ZM37.8844 11.6531C37.8844 10.1625 36.6781 8.95625 35.1875 8.95625C33.6969 8.95625 32.4906 10.1625 32.4906 11.6531C32.4906 13.1438 33.6969 14.35 35.1875 14.35C36.6781 14.35 37.8844 13.1438 37.8844 11.6531Z"
                fill="black"
              />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer Section */}
      <section className="py-8 sm:py-12 md:py-16 lg:py-24 px-4 sm:px-6">
        <img
          src="/home/footer.svg"
          alt="irl"
          className="w-full h-auto mt-6 sm:mt-8 md:mt-10 max-w-full object-contain"
        />
      </section>
   
    </div>
    
  );
}
