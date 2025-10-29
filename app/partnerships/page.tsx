"use client";



import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import NewsletterForm from "@/components/newsletter-form";
import LogoLoop from '@/components/LogoLoop.jsx';
import CircularGallery from "@/components/CircularGallery"
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
    poster: "/partnerships/case-studies/nftnyc-aptos.png",
    title: "IRL X Public Records",
    date: "JUN 26 2025",
    location: "NEW YORK, NY",
    descriptionTitle: "A Frictionless Night Out",
    description: "IRL Partnered with REOWN to elevate event access and engagement at Public Records. Guests checked in on the IRL platform for free entry and drinks, then explored the art exhibition through a digital surface that rewarded discovery with IRL points.",
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
    descriptionTitle: "From Gallery To Game",
    description: "IRL transformed Mutek's Village Numerique digital art circuit in to a citywide scavenger hunt, rewarding the most engaged festival goers for their participation. Attendees who completed the circuit were entered to win 2026 Mutek tickets — boosting exploration , participation, and audience excitement.",
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

  // Sample event images for circular gallery
  const eventImages = [
    { image: event.poster, text: event.title },
    { image: event.poster, text: event.title}, // Using same image for demo, replace with actual event images
    { image: event.poster, text: event.title },
  ];

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-y-auto">
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
            textColor="#000000"
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
      className={`bg-black rounded-2xl p-6 mb-4 transition-all duration-1000 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      <div className="title5 text-white font-monument-grotesk text-center mb-6">
        HOW IRL WORKS
      </div>
      
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
        <div className={`text-white ${leftSize} ${leftFont}`}>{leftText}</div>
      </div>
      {/* Column 2 */}
      <div className="flex-1 pr-2 text-right">
        <div className={`text-white ${rightSize} ${rightFont} text-bottom`}>{rightText}</div>
      </div>
    </div>
    
    {/* Row 2: Description */}
    <div className="w-full">
      <p className="text-white title5 font-abc-monument-regular leading-relaxed">
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
    leftText: "40000",
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
    <div className="min-h-screen bg-black p-0 sm:p-4 pb-0 font-grotesk">
      <div className="max-w-lg mx-auto">
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
               
              
                <h3>IN TO</h3>
                
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
        <div className="bg-black rounded-2xl p-4 mb-4 mx-auto" style={{ width: '345px'}}>
          <p className="text-white title3 items-center text-center ">
            Built by Refraction, the trusted cultural collective behind the parties, lineups, and art shaping scenes worldwide. Plug your brand or venue into our partner platform and reach an audience of 40,000+ at the forefront of culture.
          </p>
        </div>

        <div style={{ height: "200px" }} />

        {/* Section 1: Partnerships */}
        <div className="bg-black rounded-2xl p-6 mb-4">
          <div className="title5 text-white font-monument-grotesk text-center">
            PARTNERSHIPS
          </div>
        </div>

        {/* Section 2: Trusted by Partners */}
        <div className="bg-black rounded-2xl p-6 mb-4">
          <div className="font-bold title5 text-white font-pleasure text-center">
            <h2 className="font-pleasure"style={{ textShadow: "0 0 16px rgba(255, 255, 255, 0.70)" }}>Trusted by 200+ Global Partners</h2>
          </div>
        </div>

        {/* Section 3: Network Description */}
        <div className="bg-black rounded-2xl p-6 mb-4">
          <p className="text-white font-grotesk text-center title3 ">
            Since 2021, Refraction has built a trusted network of 200+ cultural partners. IRL extends this network to your venue or brand.
          </p>
        </div>

        {/* Main Content */}
        <div className="px-0 pt-4 pb-1 space-y-1">

        
          <LogoLoop
            {...({
              logos:  imageLogos,
              speed: 80,
              direction: "left",
              logoHeight: 48,
              gap: 40,
              pauseOnHover: true,
              scaleOnHover: true,
              fadeOut: true,
              fadeOutColor: "#000000",
              ariaLabel: "Technology partners"
            } as any)}
          />
          <LogoLoop
            {...({
              logos:  imageLogos,
              speed: 70,
              direction: "right",
              logoHeight: 48,
              gap: 40,
              pauseOnHover: true,
              scaleOnHover: true,
              fadeOut: true,
              fadeOutColor: "#000000",
              ariaLabel: "Technology partners"
            } as any)}
          />
            <LogoLoop
            {...({
              logos:  imageLogos,
              speed: 70,
              direction: "left",
              logoHeight: 48,
              gap: 40,
              pauseOnHover: true,
              scaleOnHover: true,
              fadeOut: true,
              fadeOutColor: "#000000",
              ariaLabel: "Technology partners"
            } as any)}
          />
          <LogoLoop
            {...({
              logos:  imageLogos,
                speed: 80,
              direction: "right",
              logoHeight: 48,
              gap: 40,
              pauseOnHover: true,
              scaleOnHover: true,
              fadeOut: true,
              fadeOutColor: "#000000",
              ariaLabel: "Technology partners"
            } as any)}
          />
        </div>
      </div>
      <div style={{ height: "200px" }} />
      
      {/* Benefits Section Title */}
      <div className="bg-black rounded-2xl p-6 mb-4">
        <div className="title5 text-white font-monument-grotesk text-center mb-6">
          BENEFITS
        </div>
        
        <div className="font-bold text-white text-center">
          <h2 className="font-pleasure" style={{ textShadow: "0 0 16px rgba(255, 255, 255, 0.70)" }}>Why Partners<br/> Join IRL</h2>
        </div>
      </div>

       {/* Benefits Section with Video Background */}
      <div className="relative rounded-2xl overflow-hidden mb-4">
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
        <div className="relative z-10 p-4 sm:p-8 lg:p-16">

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
      <div className="bg-black rounded-2xl p-6 mb-4">
        <div className="title5 text-white font-monument-grotesk text-center mb-6">
          CASE STUDIES
        </div>
        
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
                        className="w-full h-full object-cover"
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
        className="relative rounded-2xl overflow-hidden mb-4"
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
        <div className="relative z-10 h-full flex items-center justify-center p-6 sm:p-8 lg:p-16">
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
      <div className="bg-black rounded-2xl p-6 mb-4">
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

      {/* Footer Section - Similar to Homepage */}
      <section className="py-8 sm:py-12 md:py-16 lg:py-24 px-4 sm:px-6 bg-black">
        <div className="flex flex-col lg:flex-row justify-between gap-8 lg:gap-20 max-w-6xl mx-auto">
          {/* Column 1: Social Media */}
          <div className="w-full lg:w-1/2 order-1 lg:order-2">
            <h3 className="text-white font-inktrap text-lg font-bold mb-4">
              Follow Us
            </h3>
            <div className="flex justify-between gap-4 sm:gap-6">
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
                    fill="white"
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
                    fill="white"
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
                    fill="white"
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
                    fill="white"
                  />
                </svg>
              </Link>
              <Link
                target="_blank"
                href="https://t.me/refractioncommunity"
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
                    d="M24 4C12.954 4 4 12.954 4 24C4 35.046 12.954 44 24 44C35.046 44 44 35.046 44 24C44 12.954 35.046 4 24 4ZM35.607 15.607L33.393 35.607C33.179 36.821 32.571 37.071 31.5 36.607L24 31.607L20.5 35C20.179 35.321 19.893 35.607 19.25 35.607L19.607 28.607L31.5 17.607C31.857 17.286 31.429 17.071 30.964 17.393L16.5 26.607L9.607 24.607C8.393 24.179 8.393 23.5 9.857 23.107L34.143 14.393C35.179 14.036 36.071 14.607 35.607 15.607Z"
                    fill="white"
                  />
                </svg>
              </Link>
            </div>
          </div>

          {/* Column 2: Newsletter Signup */}
          <div className="w-full lg:w-1/2 order-2 lg:order-1">
            <h3 className="text-white body-large mb-6 uppercase lg:normal-case">
              Stay Up to Date With Our Newsletter
            </h3>
            <NewsletterForm />
          </div>
        </div>
      </section>

      {/* IRL Logo and Copyright Footer */}
      <section className="py-8 sm:py-12 md:py-16 lg:py-24 px-4 sm:px-6 bg-black">
        <div className="max-w-6xl mx-auto">
          <img
            src="/irlfooterlogo.svg"
            alt="irl"
            className="w-full h-auto mt-6 sm:mt-8 md:mt-10 max-w-full object-contain block lg:hidden mx-auto"
          />
          <img
            src="/home/footer.svg"
            alt="irl"
            className="w-full h-auto mt-6 sm:mt-8 md:mt-10 max-w-full object-contain hidden lg:block mx-auto"
          />
          <div className="w-full flex justify-center items-center mt-8">
            <p className="body-small text-white dark:text-white font-mono tracking-wide uppercase">
              copyright &bull; refraction &bull; 2025
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
