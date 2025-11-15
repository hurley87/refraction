"use client";



import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";

import LogoLoop from '@/components/LogoLoop.jsx';
import CircularGallery from "@/components/CircularGallery"
import Footer from "@/components/footer";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

// Custom Header Component for Partnerships Page
const PartnershipsHeader = () => {
  return (
    <div className="flex justify-between items-center w-full">
      {/* IRL Logo - Left Side */}
      <Link href="/">
        <div className="w-[40px] h-[40px] bg-[#313131] rounded-full px-2 flex items-center justify-center">
          <img
            src="/home/IRL.png"
            alt="IRL"
            className="w-full h-auto"
            style={{ width: "40", height: "40" }}
          />
        </div>
      </Link>

      {/* Sign Up Button - Right Side */}
      <Link href="/contact-us">
        <button 
          className="text-white font-bold transition-colors"
          style={{
            display: 'flex',
            padding: '8px 12px',
            alignItems: 'center',
            gap: '8px',
            borderRadius: '100px',
            background: 'rgba(255, 255, 255, 0.25)'
          }}
        >
          <span className="body-small font-groteks uppercase">Sign Up</span>
        </button>
      </Link>
    </div>
  );
};

const carouselData = [
  {
    poster: "/case-studies/public-records/RESET at Public Records with Refraction and Reown 9.jpg",
    title: "IRL x Public Records",
    date: "JUN 26 2025",
    location: "NEW YORK, NY",
    descriptionTitle: "Enter, Explore, Earn",
    description: "RESET at Public Records showed how IRL connects culture to participation. Guests checked in via IRL for entry and a welcome drink, then earned points by scanning artworks placed throughout the venue — all while artists like Ash Lauryn, INVT, and Kristine Barilli soundtracked the night.",
    stats: [
      {
        value: "1K+",
        label: "RSVPs"
      },
      {
        value: "70%",
        label: "Attendance"
      },
      {
        value: "250",
        label: "Complimentary Drinks"
      }
    ]
  },
  {
    poster: "/partnerships/case-studies/mutek.png",
    title: "IRL X Mutek Village Numérique",
    date: "AUG 19-25 2025",
    location: "MONTREAL, QC",
    descriptionTitle: "Mapping Art Into Movement",
    description: "At MUTEK&apos;s Village Numérique, IRL transformed a city-wide digital art circuit into an interactive scavenger hunt. Audiences checked in at five installation sites using the IRL web app, collecting points toward cultural rewards and a chance to win a MUTEK 2026 passport. Featured works included pieces by Iregular, Ubisoft, Victor Drouin Trempe, Danny Perreault, Fig 55, and more.",
    stats: [
      {
        value: "47K",
        label: "Reach To Festival Attendees"
      },
      {
        value: "50+",
        label: "IRL Check-Ins"
      }
    ]
  },
 
];

// Event Modal Component
const EventModal = ({ event, isOpen, onClose }) => {
  if (!isOpen || !event) return null;

  // Event images for circular gallery - populated from case study folders
  const getEventImages = () => {
    if (event.title.includes("Public Records")) {
      return [
        { image: "/case-studies/public-records/RESET at Public Records with Refraction and Reown 2.jpg", text: event.title },
        { image: "/case-studies/public-records/RESET at Public Records with Refraction and Reown 3.jpg", text: event.title },
        { image: "/case-studies/public-records/RESET at Public Records with Refraction and Reown 4.jpg", text: event.title },
        { image: "/case-studies/public-records/RESET at Public Records with Refraction and Reown 5.jpg", text: event.title },
        { image: "/case-studies/public-records/RESET at Public Records with Refraction and Reown 6.jpg", text: event.title },
        { image: "/case-studies/public-records/RESET at Public Records with Refraction and Reown 7.jpg", text: event.title },
        { image: "/case-studies/public-records/RESET at Public Records with Refraction and Reown 8.jpg", text: event.title },
        { image: "/case-studies/public-records/RESET at Public Records with Refraction and Reown 9.jpg", text: event.title },
        { image: "/case-studies/public-records/RESET at Public Records with Refraction and Reown 10.jpg", text: event.title },
        { image: "/case-studies/public-records/©FILIPA_AURÉLIO_REFRACTION - RESET @ PUBLIC RECORDS (FINAL)-185.jpg", text: event.title },
        { image: "/case-studies/public-records/©FILIPA_AURÉLIO_REFRACTION - RESET @ PUBLIC RECORDS (FINAL)-232.jpg", text: event.title },
        { image: "/case-studies/public-records/©FILIPA_AURÉLIO_REFRACTION - RESET @ PUBLIC RECORDS (FINAL)-244.jpg", text: event.title },
        { image: "/case-studies/public-records/©FILIPA_AURÉLIO_REFRACTION - RESET @ PUBLIC RECORDS (FINAL)-265.jpg", text: event.title },
      ];
    } else if (event.title.includes("Mutek")) {
      return [
        { image: "/case-studies/mutek-montreal/1S1A0218.jpg", text: event.title },
        { image: "/case-studies/mutek-montreal/1S1A8722.jpg", text: event.title },
        { image: "/case-studies/mutek-montreal/1S1A9751.jpg", text: event.title },
        { image: "/case-studies/mutek-montreal/Astronomical water par Martin Messier _ Village Numérique 2025 présenté par MUTEK et Xn Québec © Tannaz Shirazi.jpg", text: event.title },
        { image: "/case-studies/mutek-montreal/Photomode cadrer le jeu présenté par Ubisoft _ Village Numérique 2025 présenté par MUTEK et Xn Québec © Tannaz Shirazi (1).jpg", text: event.title },
        { image: "/case-studies/mutek-montreal/Photomode cadrer le jeu présenté par Ubisoft _ Village Numérique 2025 présenté par MUTEK et Xn Québec © Tannaz Shirazi.jpg", text: event.title },
        { image: "/case-studies/mutek-montreal/Programmation spéciale par Iregular _ Village Numérique 2025 présenté par MUTEK et Xn Québec © Tannaz Shirazi.jpg", text: event.title },
        { image: "/case-studies/mutek-montreal/TETRA par Ottomata _ Village Numérique 2025 présenté par MUTEK et Xn Québec © Tannaz Shirazi.jpg", text: event.title },
      ];
    }
    // Fallback to poster if event doesn't match
    return [
      { image: event.poster, text: event.title },
      { image: event.poster, text: event.title },
      { image: event.poster, text: event.title },
    ];
  };

  const eventImages = getEventImages();

  return (
    <div className="fixed inset-0 bg-[#131313] z-50 overflow-y-auto">
      <div className="min-h-screen p-4 space-y-1">
        {/* Container 1: Header with Close Button */}
        <div 
          style={{
            display: 'flex',
            padding: '16px',
            justifyContent: 'space-between',
            alignItems: 'center',
            alignSelf: 'stretch',
            borderRadius: '24px',
            background: 'linear-gradient(160deg, rgba(255, 255, 255, 0.24) 31.3%, rgba(255, 255, 255, 0.70) 100.83%)',
            boxShadow: '0 2.722px 10.89px 0 rgba(0, 0, 0, 0.25)',
            backdropFilter: 'blur(13.101491928100586px)'
          }}
        >
          <span className="text-white title5 font-abc-monument-regular">Case Study</span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Container 2: Event Images Circular Gallery */}
        <div style={{ height: '400px' }}>
          <CircularGallery
            items={eventImages}
            bend={0}
            textColor="#131313"
            borderRadius={0}
            font="bold 24px inktrap"
            scrollSpeed={1.5}
            scrollEase={0.05}
          />
        </div>

        {/* Container 3: Title, Date and Location */}
        <div 
          style={{
            display: 'flex',
            padding: '16px',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '8px',
            alignSelf: 'stretch',
            borderRadius: '26px',
            background: 'linear-gradient(160deg, rgba(255, 255, 255, 0.24) 31.3%, rgba(255, 255, 255, 0.70) 100.83%)',
            boxShadow: '0 2.722px 10.89px 0 rgba(0, 0, 0, 0.25)',
            backdropFilter: 'blur(13.101491928100586px)'
          }}
        >
          {/* Row 1: Title */}
          <h1 className="text-white  font-pleasure  w-full text-left">
            {event.title}
          </h1>
          
          {/* Row 2: Date and Location */}
          <div className="flex w-full gap-2">
            <div 
              style={{
                display: 'flex',
                padding: '4px 8px',
                alignItems: 'center',
                gap: '8px',
                alignSelf: 'stretch',
                borderRadius: '1000px',
                border: '1px solid #EDEDED'
              }}
            >
              <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4 inline-block text-white"
                  fill="#ffffff"
                  viewBox="0 0 20 20"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <rect x="3" y="4" width="14" height="13" rx="2" className="fill-transparent" stroke="currentColor"/>
                  <path d="M3 8h14" stroke="currentColor" strokeLinecap="round"/>
                  <path d="M7 2v2M13 2v2" stroke="currentColor" strokeLinecap="round" />
                </svg>
              <span className="text-white title5 font-abc-monument-regular">{event.date}</span>
            </div>
            <div 
              style={{
                display: 'flex',
                padding: '4px 8px',
                alignItems: 'center',
                gap: '8px',
                alignSelf: 'stretch',
                borderRadius: '1000px',
                border: '1px solid #EDEDED'
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 text-white inline-block"
                fill="none"
                viewBox="0 0 20 20"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 18s6-5.686 6-10A6 6 0 1 0 4 8c0 4.314 6 10 6 10Z"
                  className="stroke-current"
                />
                <circle
                  cx="10"
                  cy="8"
                  r="2.25"
                  className="stroke-current"
                  strokeWidth={1.5}
                />
              </svg>
              <span className="flex items-center gap-1 text-white title5 font-abc-monument-regular">
                
                {event.location}
              </span>
            </div>
          </div>
        </div>

        {/* Container 4: Description Title and Description */}
        <div 
          style={{
            display: 'flex',
            padding: '16px',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '8px',
            alignSelf: 'stretch',
            borderRadius: '26px',
            background: 'linear-gradient(160deg, rgba(255, 255, 255, 0.24) 31.3%, rgba(255, 255, 255, 0.70) 100.83%)',
            boxShadow: '0 2.722px 10.89px 0 rgba(0, 0, 0, 0.25)',
            backdropFilter: 'blur(13.101491928100586px)'
          }}
        >
          {/* Row 1: Description Title */}
          {event.descriptionTitle && (
            <h3 className="text-white w-full">
              {event.descriptionTitle}
            </h3>
          )}
          
          {/* Row 2: Description */}
          <p className="text-white title5 font-abc-monument-regular leading-relaxed w-full">
            {event.description}
          </p>
        </div>

        {/* Dynamic Stats Containers */}
        {event.stats && event.stats.map((stat, index) => (
          <div 
            key={index}
            style={{
              display: 'flex',
              padding: '16px',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '8px',
              alignSelf: 'stretch',
              borderRadius: '26px',
              background: 'linear-gradient(160deg, rgba(255, 255, 255, 0.24) 31.3%, rgba(255, 255, 255, 0.70) 100.83%)',
              boxShadow: '0 2.722px 10.89px 0 rgba(0, 0, 0, 0.25)',
              backdropFilter: 'blur(13.101491928100586px)'
            }}
          >
            <div className="flex w-full gap-4">
              <div className="flex-1 flex items-end">
                <div className="text-white display2 font-inktrap">{stat.value}</div>
              </div>
              <div className="flex-1 text-right">
                <div className="text-white title4 font-abc-monument-regular">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}

        {/* Back Button */}
        <button
          onClick={onClose}
          className="w-full bg-white text-black font-bold rounded-full py-4 px-6 hover:bg-gray-100 transition-colors flex items-center justify-between"
        >
          <span className="font-pleasure">Back</span>
          <svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M13 7l5 5m0 0l-5 5m5-5H6" 
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

// How It Works Section Component
const HowItWorksSection = () => {
  const [isVisible, setIsVisible] = React.useState(false);
  const sectionRef = React.useRef(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={sectionRef}
      className={`bg-[#131313] rounded-2xl p-6 mb-4 max-w-lg mx-auto transition-all duration-1000 ease-out overflow-hidden ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      <h2 className=" text-white font-pleasure text-center mb-6">
        HOW IRL WORKS
      </h2>
      
      <div className="space-y-4">
        {/* Part 1 */}
        <div className="relative flex items-center gap-2 sm:gap-4">
          {/* Column 1: Number */}
          <div className="flex-shrink-0">
            <Image
              src="/partnerships/howitworks-1.svg"
              alt="Step 1"
              width={60}
              height={60}
              className="w-112 h-112 sm:w-15 sm:h-15"
            />
          </div>
          
          {/* Column 2: Text Content */}
          <div className="flex-1 min-w-0">
            <div className="text-white title1 font-pleasure mb-1 sm:mb-2">
              DISCOVER
            </div>
            <div style={{ height: "15px" }} />
            <div className="text-white title4 font-grotesk">
              Users discover events and venues through the IRL platform, exploring curated cultural experiences.
            </div>
          </div>
          
          {/* Column 3: Geometric Circle - Overlapping Text */}
          <div className="absolute -right-8 sm:right-4 top-1/2 transform -translate-y-1/2">
            <Image
              src="/partnerships/howitworks-ellipse1.svg"
              alt="Geometric shape"
              width={160}
              height={160}
              className="w-32 h-32 sm:w-40 sm:h-40"
            />
          </div>
        </div>


        {/* Part 2 */}
        <div className="relative flex items-center gap-2 sm:gap-4">
          {/* Column 1: Number */}
          <div className="flex-shrink-0">
            <Image
              src="/partnerships/howitworks-2.svg"
              alt="Step 2"
              width={60}
              height={60}
              className="w-112 h-112 sm:w-15 sm:h-15"
            />
          </div>
          
          {/* Column 2: Text Content */}
          <div className="flex-1 min-w-0">
            <div className="text-white title1 font-pleasure mb-1 sm:mb-2">
              ENGAGE
            </div>
            <div style={{ height: "15px" }} />
            <div className="text-white title4 font-grotesk">
              Attendees check in at events, participate in activities, and earn IRL points for their engagement.
            </div>
          </div>
          
          {/* Column 3: Geometric Circles - Overlapping Text */}
          <div className="absolute -right-12 sm:right-4 top-1/2 transform -translate-y-1/2">
            <Image
              src="/partnerships/howitworks-ellipse2.svg"
              alt="Geometric shape"
              width={160}
              height={160}
              className="w-32 h-32 sm:w-40 sm:h-40"
            />
          </div>
          <div className="absolute -right-6 sm:right-12 top-1/2 transform -translate-y-1/2">
            <Image
              src="/partnerships/howitworks-ellipse2.svg"
              alt="Geometric shape"
              width={160}
              height={160}
              className="w-32 h-32 sm:w-40 sm:h-40"
            />
          </div>
        </div>


        {/* Part 3 */}
        <div className="relative flex items-center gap-2 sm:gap-4">
          {/* Column 1: Number */}
          <div className="flex-shrink-0">
            <Image
              src="/partnerships/howitworks-3.svg"
              alt="Step 3"
              width={60}
              height={60}
              className="w-112 h-112 sm:w-15 sm:h-15"
            />
          </div>
          
          {/* Column 2: Text Content */}
          <div className="flex-1 min-w-0">
            <div className="text-white title1 font-pleasure mb-1 sm:mb-2">
              REWARD
            </div>
            <div style={{ height: "15px" }} />
            <div className="text-white title4 font-grotesk">
              Points earned can be redeemed for exclusive rewards, creating a seamless cultural rewards ecosystem.
            </div>
          </div>
          
          {/* Column 3: Geometric Circles - Overlapping Text */}
          <div className="absolute -right-9 sm:right-4 top-1/2 transform -translate-y-1/2">
            <Image
              src="/partnerships/howitworks-ellipse2.svg"
              alt="Geometric shape"
              width={160}
              height={160}
              className="w-32 h-32 sm:w-40 sm:h-40"
            />
          </div>
          <div className="absolute -right-7 sm:right-8 top-1/2 transform -translate-y-1/2">
            <Image
              src="/partnerships/howitworks-ellipse2.svg"
              alt="Geometric shape"
              width={160}
              height={160}
              className="w-32 h-32 sm:w-40 sm:h-40"
            />
          </div>
          <div className="absolute -right-5 sm:right-12 top-1/2 transform -translate-y-1/2">
            <Image
              src="/partnerships/howitworks-ellipse2.svg"
              alt="Geometric shape"
              width={160}
              height={160}
              className="w-32 h-32 sm:w-40 sm:h-40"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Benefits Container Component
const BenefitsContainer = ({ 
  leftText, 
  rightText, 
  leftFont = "font-inktrap", 
  rightFont = "font-abc-monument-regular",
  leftSize = "display1",
  rightSize = "title3",
  description 
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`mb-2 mx-auto transition-all duration-1000 ease-out w-full max-w-sm sm:max-w-md lg:max-w-lg ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{
        display: 'flex',
        padding: '40px 24px 24px 24px',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '10.89px',
        borderRadius: '17.696px',
        border: '0.681px solid rgba(255, 255, 255, 0.15)',
        background: 'linear-gradient(160deg, rgba(255, 255, 255, 0.24) 31.3%, rgba(255, 255, 255, 0.70) 100.83%)',
        boxShadow: '0 2.722px 10.89px 0 rgba(0, 0, 0, 0.25)',
        backdropFilter: 'blur(13.101491928100586px)'
      }}
    >
    {/* Row 1: Two columns */}
    <div className="flex w-full gap-4 align-text-bottom">
      {/* Column 1 */}
      <div className="flex-1 flex items-end">
        <div className={`text-black ${leftSize} ${leftFont}`}>{leftText}</div>
      </div>
      {/* Column 2 */}
      <div className="flex-1 pr-2 text-right">
        <div className={`text-black ${rightSize} ${rightFont} text-bottom`}>{rightText}</div>
      </div>
    </div>
    
    {/* Row 2: Description */}
    <div className="w-full">
      <p className="text-black title5 font-abc-monument-regular leading-relaxed">
        {description}
      </p>
    </div>
  </div>
  );
};

export default function PartnershipsPage() {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  const imageLogos = [
    { src: "/partner_logos/Allships logo white.svg", alt: "Allships", href: "https://allships.com" },
    { src: "/partner_logos/Aptos_Primary_WHT.svg", alt: "Aptos", href: "https://aptoslabs.com" },
    { src: "/partner_logos/Base_lockup_white.svg", alt: "Base", href: "https://base.org" },
    { src: "/partner_logos/FWB-Lettermark.svg", alt: "FWB", href: "https://fwb.help" },
    { src: "/partner_logos/Galxe_Logo_Wordmark_White.svg", alt: "Galxe", href: "https://galxe.com" },
    { src: "/partner_logos/Livepeer white logo.svg", alt: "Livepeer", href: "https://livepeer.org" },
    { src: "/partner_logos/LUKSO_logo white.svg", alt: "Lukso", href: "https://lukso.network" },
    { src: "/partner_logos/Mutek white logo.svg", alt: "Mutek", href: "https://mutek.org" },
    { src: "/partner_logos/Near white logo.svg", alt: "Near", href: "https://near.org" },
    { src: "/partner_logos/objkt_logo_white.svg", alt: "Objkt", href: "https://objkt.com" },
    { src: "/partner_logos/Opensea white logo.svg", alt: "OpenSea", href: "https://opensea.io" },
    { src: "/partner_logos/Polygon Primary light.svg", alt: "Polygon", href: "https://polygon.technology" },
    { src: "/partner_logos/Public Records white logo.svg", alt: "Public Records", href: "https://publicrecords.nyc" },
    { src: "/partner_logos/Rainbow Discoclub white logo.svg", alt: "Rainbow Discoclub", href: "https://rainbowdiscoclub.com" },
    { src: "/partner_logos/Rarible-logo.svg", alt: "Rarible", href: "https://rarible.com" },
    { src: "/partner_logos/reown-logo-negative.svg", alt: "Reown", href: "https://reown.com" },
    { src: "/partner_logos/Resident Advisor white logo.svg", alt: "Resident Advisor", href: "https://residentadvisor.net" },
    { src: "/partner_logos/rhizome logo.svg", alt: "Rhizome", href: "https://rhizome.org" },
    { src: "/partner_logos/Rodeo white logo.svg", alt: "Rodeo", href: "https://rodeo.com" },
    { src: "/partner_logos/rug-radio-seeklogo white.svg", alt: "Rug Radio", href: "https://rug.fm" },
    { src: "/partner_logos/Serpentine white logo..svg", alt: "Serpentine", href: "https://serpentinegalleries.org" },
    { src: "/partner_logos/Standard Time white logo.svg", alt: "Standard Time", href: "https://standardtime.io" },
    { src: "/partner_logos/syndicate logo white.svg", alt: "Syndicate", href: "https://syndicate.io" },
    { src: "/partner_logos/The Lot Radio white logo.svg", alt: "The Lot Radio", href: "https://thelotradio.com" },
    { src: "/partner_logos/towns logo black.svg", alt: "Towns", href: "https://towns.com" },
    { src: "/partner_logos/walletconnect white.svg", alt: "WalletConnect", href: "https://walletconnect.com" },
    { src: "/partner_logos/Zora Logo White.svg", alt: "Zora", href: "https://zora.co" }
  ];

// Benefits data array
const benefitsData = [
  {
    leftText: "40,000",
    rightText: "Cultural Innovators",
    leftFont: "font-inktrap",
    rightFont: "font-abc-monument-regular",
    leftSize: "display1",
    rightSize: "title3",
    description: "Reach a global community of curated culture-makers. 40000+ cultural innovators discover new projects and venues through IRL."
  },
  {
    leftText: "Offer Rewards That",
    rightText: "TRAVEL",
    leftFont: "font-abc-monument-regular",
    rightFont: "font-inktrap",
    leftSize: "title3",
    rightSize: "display2",
    description: "Rewards earned at a Refraction art exhibition in NYC can be redeemed at a festival in Tokyo."
  },
  {
    leftText: "Shared",
    rightText: "CUSTOMER ACQUISITION",
    leftFont: "font-abc-monument-regular",
    rightFont: "font-inktrap",
    leftSize: "title3",
    rightSize: "title6",
    description: "Lower marketing costs by plugging into a culturally-aligned discovery network."
  },
  {
    leftText: "Gain",
    rightText: "OWNER SHIP",
    leftFont: "font-abc-monument-regular",
    rightFont: "font-inktrap",
    leftSize: "title3",
    rightSize: "display2",
    description: "Partners receive equity through tokens as the network grows."
  },
    {
    leftText: "No",
    rightText: "SETUP COSTS",
    leftFont: "font-abc-monument-regular",
    rightFont: "font-inktrap",
    leftSize: "title3",
    rightSize: "display2",
    description: "Partners receive equity through tokens as the network grows."
  },

  // Add 3 more benefit objects here
];

  return (
    <div className="min-h-screen bg-[#131313] p-0 sm:p-4 pb-0 font-grotesk overflow-x-hidden">
      <div className="max-w-lg mx-auto w-full">
        {/* Hero Section with Video Background */}
        <div className="relative min-h-screen flex flex-col justify-center items-center px-4 py-8 rounded-4xl overflow-hidden mb-4">
          {/* Header */}
          <div 
            className="absolute top-4 left-4 right-4 z-20"
            style={{
              display: 'flex',
              padding: '8px 16px 8px 8px',
              justifyContent: 'space-between',
              alignItems: 'center',
              alignSelf: 'stretch',
              borderRadius: '24px',
              background: 'linear-gradient(160deg, rgba(255, 255, 255, 0.24) 31.3%, rgba(255, 255, 255, 0.70) 100.83%)',
              boxShadow: '0 2.722px 10.89px 0 rgba(0, 0, 0, 0.25)',
              backdropFilter: 'blur(13.101491928100586px)'
            }}
          >
            <PartnershipsHeader />
          </div>
          {/* Video Background */}
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              WebkitTransform: 'translateZ(0)',
              transform: 'translateZ(0)',
              WebkitBackfaceVisibility: 'hidden',
              backfaceVisibility: 'hidden'
            }}
          >
            <source src="/partnerships/partnerships-1.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          {/* Main Content */}
          <div className="relative z-10 text-center max-w-[393px] w-full">
            <div className="mb-8">
              <div className="display2 text-white font-inktrap font-bold leading-tight mb-4">
                <h3>TURN</h3>
                
                <span style={{ textShadow: "0 0 16px rgba(255, 255, 255, 0.70)" }}>
                   AUDIENCES
                </span>
               
              
                <h3>INTO</h3>
                
                 <span style={{ textShadow: "0 0 16px rgba(255, 255, 255, 0.70)" }}>
                   CUSTOMERS
                </span>
              </div>
              <h3 className="text-white font-pleasure-standard-regular">
                IRL Is Culture&apos;s Rewards Program
              </h3>
            </div>
            
            {/* Buttons */}
            <div className="flex flex-col gap-4 justify-center items-center">
              <Link href="/contact-us">
                <button 
                  className="bg-white hover:bg-gray-100 text-black font-bold rounded-full transition-colors flex items-center justify-between px-4"
                  style={{ width: '260px', height: '48px' }}
                >
                  <h4 className="font-pleasure">Request an Invite</h4>
                  <Image
                    src="/home/arrow-right.svg"
                    alt="arrow-right"
                    width={20}
                    height={20}
                    className="w-5 h-5"
                  />
                </button>
              </Link>
              <Link href="/contact-us">
                <button 
                  className="hover:opacity-80 text-white font-bold rounded-full transition-colors flex items-center justify-between px-4"
                  style={{ backgroundColor: '#313131', width: '260px', height: '48px' }}
                >
                  <h4 className="font-pleasure">Contact us</h4>
                  <Image
                    src="/white-arrow-right.svg"
                    alt="arrow-right"
                    width={20}
                    height={20}
                    className="w-5 h-5"
                  />
                </button>
              </Link>
            </div>
            
            {/* Powered By Section */}
            <div className="text-white font-inktrap flex justify-between items-center mt-8 mx-auto" style={{ width: '260px' }}>
              <h4 className="">POWERED BY</h4>
              <div className="flex justify-end">
                <Image
                  src="/home/Logo.svg"
                  alt="refraction"
                  width={100}
                  height={100}
                  className="w-full max-w-[100px] h-auto"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Support Text Section */}
        <div className="bg-[#131313] rounded-2xl p-4 mb-4 mx-auto" style={{ width: '345px'}}>
          <p className="text-white title3 items-center text-center ">
            Built by Refraction, the trusted cultural collective behind the parties, lineups, and art shaping scenes worldwide. Plug your brand or venue into our partner platform and reach an audience of 40,000+ at the forefront of culture.
          </p>
        </div>

        <div style={{ height: "200px" }} />

        {/* Section 1: Partnerships */}
        <div className="bg-[#131313] rounded-2xl p-6 mb-4">
          <div className="title5 text-white font-monument-grotesk text-center">
            PARTNERSHIPS
          </div>
        </div>

        {/* Section 2: Trusted by Partners */}
        <div className="bg-[#131313] rounded-2xl p-6 mb-4">
          <div className="font-bold title5 text-white font-pleasure text-center">
            <h2 className="font-pleasure"style={{ textShadow: "0 0 16px rgba(255, 255, 255, 0.70)" }}>Trusted by 200+ Global Partners</h2>
          </div>
        </div>

        {/* Section 3: Network Description */}
        <div className="bg-[#131313] rounded-2xl p-6 mb-4">
          <p className="text-white font-grotesk text-center title3 ">
            Since 2021, Refraction has built a trusted network of 200+ cultural partners. IRL extends this network to your venue or brand.
          </p>
        </div>

        {/* Main Content */}
        <div className="px-0 pt-4 pb-1 space-y-1 overflow-x-hidden w-full">

        
          <LogoLoop
            {...({
              logos:  imageLogos,
              speed: 50,
              direction: "left",
              logoHeight: 48,
              gap: 40,
              pauseOnHover: true,
              scaleOnHover: true,
              fadeOut: true,
              fadeOutColor: "#131313",
              ariaLabel: "Technology partners"
            } as any)}
          />
          <LogoLoop
            {...({
              logos:  imageLogos,
              speed: 50,
              direction: "right",
              logoHeight: 48,
              gap: 40,
              pauseOnHover: true,
              scaleOnHover: true,
              fadeOut: true,
              fadeOutColor: "#131313",
              ariaLabel: "Technology partners"
            } as any)}
          />
   
     
        </div>
      </div>
      <div style={{ height: "200px" }} />
      
      {/* Benefits Section Title */}
      <div className="bg-[#131313] rounded-2xl p-6 mb-4 max-w-lg mx-auto">
        
        
        <div className="font-bold text-white text-center">
          <h2 className="font-pleasure" style={{ textShadow: "0 0 16px rgba(255, 255, 255, 0.70)" }}>Why Partners<br/> Join IRL</h2>
        </div>
      </div>

       {/* Benefits Section with Video Background */}
      <div className="relative rounded-2xl overflow-hidden mb-4 max-w-lg mx-auto">
        {/* Video Background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            WebkitTransform: 'translateZ(0)',
            transform: 'translateZ(0)',
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden'
          }}
        >
          <source src="/partnerships/partnerships-2.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {/* Content Overlay */}
        <div className="relative z-10 p-4 sm:p-8">

          {/* Benefits Containers */}
          {benefitsData.map((benefit, index) => (
            <BenefitsContainer
              key={index}
              leftText={benefit.leftText}
              rightText={benefit.rightText}
              leftFont={benefit.leftFont}
              rightFont={benefit.rightFont}
              leftSize={benefit.leftSize}
              rightSize={benefit.rightSize}
              description={benefit.description}
            />
          ))}
        </div>
      </div>
      <div style={{ height: "200px" }} />
      {/* How IRL Works Section */}
      <HowItWorksSection />

      {/* Case Studies Section */}
      <div className="bg-[#131313] rounded-2xl p-6 mb-4">
        <h2 className=" text-white font-pleasure text-center mb-6">
          CASE STUDIES
        </h2>
        
        <div className="w-full flex justify-center">
          <Carousel 
            className="w-full max-w-sm"
            opts={{
              align: "start",
              loop: true,
            }}
          >
            <CarouselContent>
              {carouselData.map((event, index) => (
                <CarouselItem key={index} className="flex justify-center">
                  <div 
                    className="relative overflow-hidden"
                    style={{
                      display: 'flex',
                      width: '325px',
                      height: '541px',
                      padding: '24px',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '12px',
                      borderRadius: '26px',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.45) 100%)'
                    }}
                  >
                    {/* Row 1: Event Poster */}
                    <div className="rounded-lg overflow-hidden" style={{ width: '277px', height: '345px' }}>
                      <Image
                        src={event.poster}
                        alt={event.title}
                        width={277}
                        height={345}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* Row 2: Event Title */}
                    <h3 className="text-white titl2 font-grotesk text-center w-full">
                      {event.title}
                    </h3>

                    {/* Row 3: Date and Location */}
                    <div className="flex justify-between w-full text-white title5 font-abc-monument-regular">
                      <span>{event.date}</span>
                      <span>{event.location}</span>
                    </div>

                    {/* Row 4: Details Button */}
                    <button
                      onClick={() => handleEventClick(event)}
                      className="w-full bg-white text-black font-bold rounded-full py-3 px-4 hover:bg-gray-100 transition-colors"
                    >
                      <span className="font-pleasure">Learn More</span>
                    </button>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            
            {/* Navigation Arrows */}
            <div className="flex justify-center gap-4 mt-6">
              <CarouselPrevious 
                className="relative translate-y-0 left-0 bg-white/20 border-white/30 text-white hover:bg-white/30 hover:text-white" 
                variant="outline"
              />
              <CarouselNext 
                className="relative translate-y-0 right-0 bg-white/20 border-white/30 text-white hover:bg-white/30 hover:text-white" 
                variant="outline"
              />
            </div>
          </Carousel>
        </div>
      </div>

      {/* Event Modal */}
      <EventModal 
        event={selectedEvent} 
        isOpen={isModalOpen} 
        onClose={closeModal} 
      />

      <div style={{ height: "200px" }} />

      {/* Next Steps Section */}
      <div 
        className="relative rounded-2xl overflow-hidden mb-4 max-w-lg mx-auto"
        style={{ height: '836px' }}
      >
        {/* Video Background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            WebkitTransform: 'translateZ(0)',
            transform: 'translateZ(0)',
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden'
          }}
        >
          <source src="/partnerships/next-steps.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {/* Content Overlay */}
        <div className="relative z-10 h-full flex items-center justify-center p-6 sm:p-8">
          <div className="text-center space-y-6">
            {/* Row 1: Title */}
            <div className="display1 text-white font-inktrap" style={{ textShadow: "0 0 16px rgba(255, 255, 255, 0.70)" }}>
              NEXT<br/> STEPS
            </div>
            
            {/* Row 2: Description */}
            <div className="text-white title4 font-anonymous-pro max-w-2xl mx-auto">
              Joining is simple. Share a reward, we list it, push it to 40k+ culture-first members, and send you monthly results. No Staff training, no hidden costs.
            </div>
            
            {/* Row 3: Button */}
            <div className="flex justify-center">
              <Link href="/contact-us">
                <button 
                  className="bg-white hover:bg-gray-100 text-black font-bold rounded-full transition-colors"
                  style={{ 
                    width: '260px',
                    display: 'flex',
                    height: '48px',
                    padding: '8px 16px',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    alignSelf: 'stretch'
                  }}
                >
                  <span className="font-pleasure">Let&apos;s Talk</span>
                  <Image
                    src="/home/arrow-right.svg"
                    alt="arrow-right"
                    width={20}
                    height={20}
                    className="w-5 h-5 ml-2"
                  />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: "100px" }} />
      {/* Next Members Section */}
      <div className="bg-[#131313] rounded-2xl p-6 mb-4">
        <div className="text-center space-y-4">
          {/* Row 1: Title */}
          <div className="body-small text-white font-grotesk">
            FOR MEMBERS
          </div>
          
          {/* Row 2: Become A Founding Member */}
          <div className="flex justify-center">
            <button className="text-left text-white title4 font-anonymous-pro underline hover:no-underline transition-all">
              Become A Founding Member →
            </button>
          </div>
          
          {/* Row 3: Editorial */}
          <div className="flex justify-center">
            <button className="text-left text-white title4 font-anonymous-pro underline hover:no-underline transition-all">
              Editorial →
            </button>
          </div>
          
          {/* Row 4: Frequently Asked Questions */}
          <div className="flex justify-center">
            <button className="text-left text-white title4 font-anonymous-pro underline hover:no-underline transition-all">
              Frequently Asked Questions →
            </button>
          </div>
          
          {/* Row 5: FOR VENUES AND BRANDS */}
          <div className=" text-white body-small font-groteks" >
            FOR VENUES AND BRANDS
          </div>
          
          {/* Row 6: Become An IRL Partner */}
          <div className="flex justify-center">
            <button className="text-left text-white title4 font-anonymous-pro underline hover:no-underline transition-all">
              Become An IRL Partner →
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
