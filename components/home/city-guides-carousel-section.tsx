'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

// City data - Substack city guide links; location = venue/area, city (e.g. "Lagniapannet, Miami Florida")
const CITIES = [
  {
    name: 'Mexico City',
    slug: 'mexico-city',
    location: 'Downtown, Mexico City',
    guideUrl: 'https://refraction.substack.com/city/mexico-city',
  },
  {
    name: 'London',
    slug: 'london',
    location: 'Shoreditch, London',
    guideUrl: 'https://refraction.substack.com/city/london',
  },
  {
    name: 'Hong Kong',
    slug: 'hong-kong',
    location: 'Central, Hong Kong',
    guideUrl: 'https://refraction.substack.com/city/hong-kong',
  },
  {
    name: 'New York',
    slug: 'new-york',
    location: 'Brooklyn, New York',
    guideUrl: 'https://refraction.substack.com/city/new-york',
  },
  {
    name: 'Montreal',
    slug: 'montreal',
    location: 'Plateau, Montreal',
    guideUrl: 'https://refraction.substack.com/city/montreal',
  },
  {
    name: 'Tokyo',
    slug: 'tokyo',
    location: 'Shibuya, Tokyo',
    guideUrl: 'https://refraction.substack.com/city/tokyo',
  },
  {
    name: 'Berlin',
    slug: 'berlin',
    location: 'Kreuzberg, Berlin',
    guideUrl: 'https://refraction.substack.com/city/berlin',
  },
  {
    name: 'Lisbon',
    slug: 'lisbon',
    location: 'Alfama, Lisbon',
    guideUrl: 'https://refraction.substack.com/city/lisbon',
  },
];

function TabLine({
  active,
  onClick,
  ariaLabel,
}: {
  active: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-selected={active}
      className="flex-1 min-w-0 h-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-full flex justify-center"
    >
      <svg
        width="76"
        height="2"
        viewBox="0 0 76 2"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-0.5 block"
        aria-hidden
      >
        <path
          d="M75.2346 0V2H0V0H75.2346Z"
          fill="white"
          opacity={active ? 1 : 0.4}
        />
      </svg>
    </button>
  );
}

function LocationPinIcon({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M12 20.9421C11.992 20.0405 11.7966 19.1503 11.4261 18.3275C11.0556 17.5046 10.5181 16.7668 9.84727 16.1604L7.98036 14.472C7.35646 13.9048 6.85816 13.2145 6.5172 12.4452C6.17625 11.6758 6.00011 10.8443 6 10.0035C6 6.70698 8.68655 4 12 4C15.3135 4 18 6.70626 18 10.0028C18 11.6977 17.2807 13.3305 16.0196 14.4713L14.152 16.1597C13.4812 16.7661 12.9436 17.5039 12.5732 18.3267C12.2027 19.1496 12.0073 20.0398 11.9993 20.9414L12 20.9421ZM12 20.9421V21V20.9588M12 11.9574C11.5178 11.9574 11.0553 11.7669 10.7144 11.4277C10.3734 11.0886 10.1818 10.6286 10.1818 10.1489C10.1818 9.66929 10.3734 9.20929 10.7144 8.87013C11.0553 8.53096 11.5178 8.34043 12 8.34043C12.4822 8.34043 12.9447 8.53096 13.2856 8.87013C13.6266 9.20929 13.8182 9.66929 13.8182 10.1489C13.8182 10.6286 13.6266 11.0886 13.2856 11.4277C12.9447 11.7669 12.4822 11.9574 12 11.9574Z"
        stroke="#7D7D7D"
      />
    </svg>
  );
}

/**
 * City Guides - Tabbed featured cities from local City Guides
 */
const TAB_CITIES = CITIES.slice(0, 5); // First 5 cities for the 5 tab lines

export default function CityGuidesCarouselSection() {
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);

  const selectedCity = TAB_CITIES[selectedTabIndex];

  return (
    <section
      className="city-guides-section-desktop-bg w-full max-w-[393px] mx-auto bg-[#131313] overflow-hidden md:max-w-[1728px] md:w-[1728px] md:h-[1117px] md:aspect-[181/117]"
      style={{
        background:
          "linear-gradient(0deg, rgba(0, 0, 0, 0.35) 0%, rgba(0, 0, 0, 0.35) 100%), url('/homepage/featured-cities.jpg') lightgray -463.161px -26.697px / 335.705% 103.133% no-repeat",
        aspectRatio: '125/271',
      }}
    >
      <div className="w-full h-full px-2 pt-[129px] pb-6 flex flex-col overflow-hidden md:pt-[201px] md:pb-16 md:pl-[171px] md:pr-[217px] md:max-w-[1177px] md:mr-auto">
        <div className="flex items-left justify-left gap-2 mb-4">
          <Image
            src="/homepage/ellipse.svg"
            alt=""
            width={24}
            height={24}
            className="shrink-0"
          />
          <h2
            className="title5 text-white text-left"
            style={{ textShadow: 'rgba(255,255,255,0.7) 0px 0px 26.7px' }}
          >
            Featured Cities
          </h2>
        </div>
        <h3
          className="text-white font-normal text-left mb-4 text-[48px] leading-[1] tracking-[-1.44px] md:text-[48px]"
          style={{
            fontFamily:
              '"ABC Monument Grotesk Unlicensed Trial", "ABC-Monument-Grotesk", sans-serif',
            textShadow: '0 0 26.7px #FFF',
          }}
        >
          30 Cities, One Network
        </h3>
        <p
          className="text-left mx-auto mb-[200px] md:mb-0"
          style={{
            color: 'var(--UI-White, #FFF)',
            textShadow: '0 0 26.7px #FFF',
            fontFamily:
              '"ABC Monument Grotesk Unlicensed Trial", "ABC-Monument-Grotesk", sans-serif',
            fontSize: '20px',
            fontStyle: 'normal',
            fontWeight: 400,
            lineHeight: '24px',
            letterSpacing: '-0.4px',
          }}
        >
          Mexico City. London. Hong Kong, NYC. Montreal. Ever-expanding local
          guides in every city showing you where they go.
        </p>

        {/* Tabbed city content - same layout/dimensions on desktop as mobile */}
        <div
          className="flex w-[377px] max-w-full flex-col items-stretch gap-4 pt-0 pb-4 px-6 rounded-none overflow-hidden md:mt-[400px]"
          style={{
            background: 'var(--UI-White-25, rgba(255, 255, 255, 0.25))',
            backdropFilter: 'blur(28px)',
          }}
        >
          {/* Tab navigation: full width edge to edge */}
          <div className="flex justify-stretch items-center flex-shrink-0 w-[calc(100%+48px)] min-w-0 gap-0 -mx-6">
            {TAB_CITIES.map((city, index) => (
              <TabLine
                key={city.slug}
                active={selectedTabIndex === index}
                onClick={() => setSelectedTabIndex(index)}
                ariaLabel={`View ${city.name}`}
              />
            ))}
          </div>

          {/* Selected city content */}
          <Link
            href={selectedCity.guideUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-start flex-1 min-w-0"
          >
            {/* Row 1: section title */}
            <span
              className="text-[#FFF] text-[25px] font-medium leading-8 tracking-[-0.25px]"
              style={{
                fontFamily:
                  '"ABC Monument Grotesk Unlicensed Trial", "ABC-Monument-Grotesk", sans-serif',
              }}
            >
              {selectedCity.name}
            </span>
            {/* 16px spacing */}
            <div className="h-4" aria-hidden />
            {/* Row 2: location icon + body (title4) */}
            <div className="flex items-start gap-2">
              <span className="w-6 h-6 shrink-0 aspect-square flex items-center justify-center">
                <LocationPinIcon />
              </span>
              <span className="title4 text-[#FFF] font-grotesk">
                {selectedCity.location}
              </span>
            </div>
          </Link>

          {/* Explored button */}
          <Link
            href="/interactive-map"
            className="flex flex-1 min-w-0 self-stretch justify-center items-center gap-2.5 py-5 px-6 rounded-full transition-colors hover:opacity-90"
            style={{
              background: 'rgba(253, 255, 255, 0.15)',
            }}
            aria-label={`Explore ${selectedCity.name}`}
          >
            <span className="title4 text-[#313131] font-grotesk">
              Explore {selectedCity.name}
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
