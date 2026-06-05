'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

import { WelcomeEllipse } from '@/components/shared/welcome-ellipse';

const VENUES = [
  {
    name: 'Rasa Space',
    neighborhood: 'Raffles Place',
    city: 'Singapore',
    backgroundImage: '/homepage/rasa-space.jpg',
    mapLat: 1.3521,
    mapLng: 103.8198,
  },
  {
    name: 'ESP Hi-Fi',
    neighborhood: 'Santa Fe Arts District',
    city: 'Denver',
    backgroundImage: '/homepage/cities/esp-hifi.jpg',
    mapLat: 39.7392,
    mapLng: -104.9903,
  },
  {
    name: 'Standard Time',
    neighborhood: 'Greater Toronto Area',
    city: 'Toronto',
    backgroundImage: '/homepage/cities/standard-time.jpg',
    mapLat: 43.6532,
    mapLng: -79.3832,
  },
  {
    name: 'Doka',
    neighborhood: 'Amsterdam-Oost',
    city: 'Amsterdam',
    backgroundImage: '/homepage/cities/doka.jpg',
    mapLat: 52.3676,
    mapLng: 4.9041,
  },
  {
    name: 'Public Records',
    neighborhood: 'Brooklyn',
    city: 'New York City',
    backgroundImage: '/homepage/cities/public-records.jpg',
    mapLat: 40.7128,
    mapLng: -74.006,
  },
  {
    name: 'Yu Yu',
    neighborhood: 'Juárez',
    city: 'Mexico City',
    backgroundImage: '/homepage/cities/yuyu.jpg',
    mapLat: 19.4326,
    mapLng: -99.1332,
  },
];

function TabLine({ active }: { active: boolean }) {
  return (
    <div className="flex-1 min-w-0 h-0.5 flex justify-center" aria-hidden>
      <svg
        width="76"
        height="2"
        viewBox="0 0 76 2"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-0.5 block"
      >
        <path
          d="M75.2346 0V2H0V0H75.2346Z"
          fill="white"
          opacity={active ? 1 : 0.4}
        />
      </svg>
    </div>
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
 * City Guides - Tabbed featured venues from local City Guides
 */
export default function CityGuidesCarouselSection() {
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);

  // Auto-rotate every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setSelectedTabIndex((prev) => (prev + 1) % VENUES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const selectedVenue = VENUES[selectedTabIndex];

  return (
    <section className="city-guides-section-desktop-bg relative mx-auto h-[852px] w-full max-w-[393px] overflow-hidden bg-[#131313] md:h-[1117px] md:aspect-[181/117] md:w-[1728px] md:max-w-[1728px]">
      {/* Background images — cross-fade between venues */}
      {VENUES.map((venue, index) => (
        <div
          key={venue.name}
          aria-hidden
          className="absolute inset-0 transition-opacity duration-700"
          style={{
            opacity: selectedTabIndex === index ? 1 : 0,
            background: `linear-gradient(0deg, rgba(0, 0, 0, 0.35) 0%, rgba(0, 0, 0, 0.35) 100%), url('${venue.backgroundImage}') lightgray center / cover no-repeat`,
          }}
        />
      ))}

      {/* Mobile layout */}
      <div className="relative z-10 flex h-full w-full flex-col px-4 pt-[129px] pb-12 md:hidden">
        {/* Subtitle block */}
        <div className="flex w-full max-w-[361px] flex-col items-start">
          <div className="mb-4 flex items-center gap-2">
            <WelcomeEllipse />
            <h2
              className="title4 text-left text-white"
              style={{ textShadow: 'rgba(255,255,255,0.7) 0px 0px 26.7px' }}
            >
              Featured Cities
            </h2>
          </div>
          <div
            className="title1 text-left font-normal text-white"
            style={{ textShadow: '0 0 26.7px #FFF' }}
          >
            30 Cities, One Network
          </div>
        </div>

        {/* Support section — pinned to the bottom */}
        <div className="mt-auto flex w-full max-w-[361px] flex-col items-start gap-4">
          {/* City name */}
          <span className="title2 self-stretch text-left text-white">
            {selectedVenue.name}
          </span>

          {/* Location */}
          <div className="flex items-left justify-left gap-2 self-stretch">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center">
              <LocationPinIcon />
            </span>
            <span className="body-small text-white">
              {selectedVenue.neighborhood}, {selectedVenue.city}
            </span>
          </div>

          {/* Explore [city] CTA */}
          <Link
            href={`/interactive-map?city=${encodeURIComponent(selectedVenue.city)}`}
            className="inline-flex shrink-0"
          >
            <button
              type="button"
              className="flex h-8 cursor-pointer items-center gap-2 bg-[#454545] px-2 py-2"
            >
              <span className="label-medium uppercase text-white">
                Explore {selectedVenue.city}
              </span>
              <svg
                width={24}
                height={24}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="shrink-0"
                aria-hidden
              >
                <path
                  d="M14.0822 4L11.8239 6.28605L16 10.1453H2V13.8547H15.9812L11.8239 17.7139L14.0822 20L22 11.9846L14.0822 4Z"
                  fill="#FFFFFF"
                />
              </svg>
            </button>
          </Link>

          {/* Tab indicators — one per venue */}
          <div className="flex w-full items-center gap-0">
            {VENUES.map((venue, index) => (
              <TabLine key={venue.name} active={selectedTabIndex === index} />
            ))}
          </div>
        </div>
      </div>

      {/* Desktop layout */}
      <div
        className="relative z-10 hidden h-full w-full flex-col overflow-hidden px-2 pt-[129px] pb-6 md:flex md:max-w-[1177px] md:mr-auto md:pt-[201px] md:pb-16 md:pl-[171px] md:pr-[217px]"
        style={{ aspectRatio: '125/271' }}
      >
        <div className="flex items-left justify-left gap-2 mb-4">
          <WelcomeEllipse />
          <h2 className="title4 text-white text-left">Featured Cities</h2>
        </div>
        <div className="text-white font-normal text-left mb-4  leading-[1] title1 md:text-[48px]">
          30 Cities, One Network
        </div>

        {/* Tabbed venue content */}
        <div
          className="flex w-[377px] max-w-full flex-col items-stretch gap-4 pt-0 pb-4 px-6 rounded-none overflow-hidden md:mt-[400px]"
          style={{
            background: 'var(--UI-White-25, rgba(255, 255, 255, 0.25))',
            backdropFilter: 'blur(28px)',
          }}
        >
          {/* Tab indicators: one per venue */}
          <div className="flex justify-stretch items-center flex-shrink-0 w-[calc(100%+48px)] min-w-0 gap-0 -mx-6">
            {VENUES.map((venue, index) => (
              <TabLine key={venue.name} active={selectedTabIndex === index} />
            ))}
          </div>

          {/* Selected venue content */}
          <div className="flex flex-col items-start flex-1 min-w-0">
            {/* Row 1: venue name */}
            <span
              className="text-[#FFF] text-[25px] font-medium leading-8 tracking-[-0.25px]"
              style={{
                fontFamily:
                  '"ABC Monument Grotesk Unlicensed Trial", "ABC-Monument-Grotesk", sans-serif',
              }}
            >
              {selectedVenue.name}
            </span>
            {/* 16px spacing */}
            <div className="h-4" aria-hidden />
            {/* Row 2: location icon + neighborhood, city */}
            <div className="flex items-start gap-2">
              <span className="w-6 h-6 shrink-0 aspect-square flex items-center justify-center">
                <LocationPinIcon />
              </span>
              <span className="title4 text-[#FFF] font-grotesk">
                {selectedVenue.neighborhood}, {selectedVenue.city}
              </span>
            </div>
          </div>

          {/* Explore [city] CTA – links to interactive map by city name */}
          <Link
            href={`/interactive-map?city=${encodeURIComponent(selectedVenue.city)}`}
            className="inline-flex w-full max-w-full shrink-0"
          >
            <button
              type="button"
              className="label-large flex h-[44px] w-full cursor-pointer uppercase items-center justify-between bg-[#ffffff] py-2 pr-2 pl-4 text-[#171717]"
            >
              <span className="min-w-0 truncate">
                Explore {selectedVenue.city}
              </span>
              <svg
                width={24}
                height={24}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="shrink-0"
                aria-hidden
              >
                <path
                  d="M14.0822 4L11.8239 6.28605L16 10.1453H2V13.8547H15.9812L11.8239 17.7139L14.0822 20L22 11.9846L14.0822 4Z"
                  fill="#171717"
                />
              </svg>
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}
