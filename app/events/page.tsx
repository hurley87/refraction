"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import eventsData from "@/data/events.json";
import MapNav from "@/components/mapnav";

// Extract event data from JSON
const { nextEvent, futureEvents } = eventsData;

export default function EventsPage() {
  const [sortBy, setSortBy] = useState("date");
  const [selectedPoster, setSelectedPoster] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Helper function to parse date format "NOV 18 2025"
  const parseDate = (dateString: string): number => {
    const months: { [key: string]: number } = {
      JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
      JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
    };
    
    const parts = dateString.trim().split(/\s+/);
    if (parts.length === 3) {
      const month = months[parts[0].toUpperCase()];
      const day = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      
      if (month !== undefined && !isNaN(day) && !isNaN(year)) {
        return new Date(year, month, day).getTime();
      }
    }
    
    // Fallback to standard date parsing
    return new Date(dateString).getTime();
  };

  // Helper function to format date from "NOV 18 2025" to "NOV 18/25"
  const formatDate = (dateString: string): string => {
    const parts = dateString.trim().split(/\s+/);
    if (parts.length === 3) {
      const month = parts[0].toUpperCase();
      const day = parts[1];
      const year = parts[2];
      const lastTwoDigits = year.slice(-2);
      return `${month} ${day}/${lastTwoDigits}`;
    }
    return dateString;
  };

  // Helper function to extract city from location (remove country after comma)
  const getCity = (location: string): string => {
    const commaIndex = location.indexOf(',');
    if (commaIndex !== -1) {
      return location.substring(0, commaIndex).trim();
    }
    return location.trim();
  };

  const sortedEvents = [...futureEvents].sort((a, b) => {
    if (sortBy === "date") {
      return parseDate(a.date) - parseDate(b.date);
    }
    return a.title.localeCompare(b.title);
  });

  const handlePosterClick = (posterUrl: string) => {
    setSelectedPoster(posterUrl);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedPoster(null);
  };

  return (
    <div
      style={{
        background:
          "linear-gradient(0deg, #61BFD1 0%, #EE91B7 26.92%, #FFE600 54.33%, #1BA351 100%)",
      }}
      className="min-h-screen p-4 pb-0 font-grotesk"
    >
      <div className="max-w-md mx-auto">
        {/* Status Bar with Header */}
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <MapNav />
          </div>
        </div>

        {/* Main Content */}
        <div className="px-0 pt-4 space-y-1">
          {/* NEXT EVENT Section */}
          <div className="mb-1">
            {/* Next Event Container */}
            <div
              style={{
                display: "flex",
                padding: "16px",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "8px",
                alignSelf: "stretch",
                borderRadius: "26px",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                background:
                  "linear-gradient(180deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.45) 100%)",
              }}
            >
              {/* Next Event Title */}
              <h1 className="text-black body-small font-monument-grotesk mb-4">
                NEXT EVENT
              </h1>

              {/* Event Poster */}
              <button
                type="button"
                onClick={() => handlePosterClick(nextEvent.poster)}
                className="w-full cursor-pointer"
              >
                <Image
                  src={nextEvent.poster}
                  alt={nextEvent.title}
                  width={400}
                  height={409}
                  className="w-full h-auto object-cover rounded-xl hover:opacity-90 transition-opacity"
                />
              </button>

              {/* Event Title */}
              <h2 className="text-[#313131] title2 font-grotesk w-full text-left mt-4 mb-4">
                {nextEvent.title}
              </h2>

              {/* Date and Location */}
              <div className="flex w-full gap-2 mb-4">
                <div
                  style={{
                    display: "flex",
                    padding: "4px 8px",
                    alignItems: "center",
                    gap: "8px",
                    alignSelf: "stretch",
                    borderRadius: "1000px",
                    border: "1px solid #000000",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4 inline-block"
                    fill="#7D7D7D"
                    viewBox="0 0 20 20"
                    stroke="#7D7D7D"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  >
                    <rect
                      x="3"
                      y="4"
                      width="14"
                      height="13"
                      rx="2"
                      className="fill-transparent"
                      stroke="#7D7D7D"
                    />
                    <path d="M3 8h14" stroke="#7D7D7D" strokeLinecap="round" />
                    <path
                      d="M7 2v2M13 2v2"
                      stroke="#7D7D7D"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="text-black body-small uppercase font-abc-monument-regular">
                    {formatDate(nextEvent.date)}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    padding: "4px 8px",
                    alignItems: "center",
                    gap: "8px",
                    alignSelf: "stretch",
                    borderRadius: "1000px",
                    border: "1px solid #000000",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4 inline-block"
                    fill="#7D7D7D"
                    viewBox="0 0 20 20"
                    stroke="none"
                    aria-hidden="true"
                  >
                    <path d="M10 2C7.24 2 5 4.24 5 7c0 5.25 5 11 5 11s5-5.75 5-11c0-2.76-2.24-5-5-5zm0 7.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                  <span className="flex items-center gap-1 text-black body-small uppercase font-abc-monument-regular truncate">
                    {getCity(nextEvent.location)}
                  </span>
                </div>

                {/* Map Button */}
                <a
                  href={nextEvent.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-gray-200 transition-colors"
                  style={{
                    display: "flex",
                    padding: "4px 12px",
                    alignItems: "center",
                    gap: "8px",
                    borderRadius: "1000px",
                    background: "#EDEDED",
                    
                  }}
                >
                  <span className="text-black body-small font-abc-monument-regular">
                    MAP
                  </span>
                  <Image
                    src="/arrow-diag-right.svg"
                    alt="arrow-right"
                    width={16}
                    height={16}
                    className="w-4 h-4"
                  />
                </a>
              </div>

              {/* Register Button */}
              <a
                href={nextEvent.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-white text-black font-bold rounded-full py-3 px-4 hover:bg-gray-100 transition-colors flex items-center justify-between"
              >
                <h4 className="font-pleasure text-left">Register</h4>
                <div
                  style={{
                    display: "flex",
                    width: "24px",
                    height: "24px",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Image
                    src="/home/arrow-right.svg"
                    alt="arrow-right"
                    width={20}
                    height={20}
                    className="w-5 h-5"
                  />
                </div>
              </a>
            </div>
          </div>

          {/* Sort Section */}
          <div className="mb-1">
            <div className="flex items-center mb-1 gap-4">
              {/* Filter Button */}
              <button
                onClick={() => setSortBy(sortBy === "date" ? "title" : "date")}
                style={{
                  display: "flex",
                  width: "100%",
                  height: "48px",
                  padding: "16px",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderRadius: "24px",
                  background: "#FFF",
                }}
                className="hover:bg-gray-50 transition-colors"
              >
                <span className="text-[#7D7D7D] body-small font-grotesk uppercase tracking-wide">FILTER</span>
                <Image
                  src="/events/filter.svg"
                  alt="filter"
                  width={20}
                  height={20}
                  className="w-5 h-5"
                />
              </button>
            </div>
          </div>

          {/* Future Events Section */}
          <div>
            <div className="space-y-1">
              {sortedEvents.map((event) => (
                <div
                  key={event.id}
                  style={{
                    display: "flex",
                    padding: "16px",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: "8px",
                    alignSelf: "stretch",
                    borderRadius: "26px",
                    border: "1px solid #EDEDED",
                    background: "#FFF",
                    boxShadow: "0 1px 8px 0 rgba(0, 0, 0, 0.08)",
                  }}
                >
                  {/* Row 1: Title and Poster */}
                  <div className="flex w-full gap-4 items-start">
                    {/* Column 1: Title */}
                    <div className="flex-1">
                      <div className="text-[#313131] title3 font-grotesk text-left">
                        {event.title}
                      </div>
                    </div>

                    {/* Column 2: Small Poster */}
                    <button
                      type="button"
                      onClick={() => handlePosterClick(event.poster)}
                      className="flex-shrink-0 cursor-pointer overflow-hidden rounded-lg"
                    >
                      <Image
                        src={event.poster}
                        alt={event.title}
                        width={80}
                        height={100}
                        className="rounded-xl object-cover hover:opacity-90 transition-opacity"
                        style={{ width: "80px", height: "100px" }}
                      />
                    </button>
                  </div>

                  {/* Row 2: Date, Location, and Map Button */}
                  <div className="flex w-full gap-1">
                    <div
                      style={{
                        display: "flex",
                        padding: "4px 8px",
                        alignItems: "center",
                        gap: "8px",
                        alignSelf: "stretch",
                        borderRadius: "1000px",
                        border: "1px solid #EDEDED",
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4 inline-block text-black"
                        fill="#7D7D7D"
                        viewBox="0 0 20 20"
                        stroke="#7D7D7D"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      >
                        <rect
                          x="3"
                          y="4"
                          width="14"
                          height="13"
                          rx="2"
                          className="fill-transparent"
                          stroke="#7D7D7D"
                        />
                        <path
                          d="M3 8h14"
                          stroke="#7D7D7D"
                          strokeLinecap="round"
                        />
                        <path
                          d="M7 2v2M13 2v2"
                          stroke="#7D7D7D"
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="text-[#4f4f4f] body-small uppercase font-grotesk">
                        {formatDate(event.date)}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        padding: "4px 8px",
                        alignItems: "center",
                        gap: "8px",
                        alignSelf: "stretch",
                        borderRadius: "1000px",
                        border: "1px solid #EDEDED",
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4 text-black inline-block"
                        fill="none"
                        viewBox="0 0 20 20"
                        stroke="#7D7D7D"
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
                      <span className="flex items-center gap-1 text-[#4f4f4f] body-small uppercase font-grotesk truncate whitespace-nowrap">
                        {getCity(event.location)}
                      </span>
                    </div>

                    {/* Map Button */}
                    <a
                      href={event.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-gray-200 transition-colors"
                      style={{
                        display: "flex",
                        padding: "4px 12px",
                        alignItems: "center",
                        gap: "8px",
                        borderRadius: "1000px",
                        background: "#EDEDED",
                      }}
                    >
                      <span className="text-[#4f4f4f] body-small font-grotesk">
                        MAP
                      </span>
                      <Image
                        src="/arrow-diag-right.svg"
                        alt="arrow-right"
                        width={16}
                        height={16}
                        className="w-4 h-4"
                      />
                    </a>
                  </div>

                  {/* Row 3: Register Button */}
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[#EDEDED] text-black font-bold rounded-full py-3 px-4 hover:bg-gray-100 transition-colors flex items-center justify-between"
                  >
                    <h4 className="font-pleasure text-left">Register</h4>
                    <div
                      style={{
                        display: "flex",
                        width: "24px",
                        height: "24px",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Image
                        src="/home/arrow-right.svg"
                        alt="arrow-right"
                        width={20}
                        height={20}
                        className="w-5 h-5"
                      />
                    </div>
                  </a>
                </div>
              ))}
            </div>
          </div>

          <div style={{ height: "100px" }} />
        </div>
      </div>

      {/* Poster Modal */}
      <Dialog open={isModalOpen} onOpenChange={handleModalClose}>
        <DialogContent className="w-[95vw] max-w-[95vw] h-[95vh] max-h-[95vh] border-none bg-transparent p-0 shadow-none [&>button]:hidden overflow-hidden flex flex-col">
          {selectedPoster && (
            <div className="relative flex flex-col h-full">
              {/* Close Button */}
              <div className="w-full rounded-3xl border border-[#131313]/10 bg-white px-4 py-3 flex justify-center mb-1 flex-shrink-0">
                <DialogClose asChild>
                  <button className="flex h-10 w-10 items-center justify-center rounded-full text-black hover:bg-gray-100 transition-colors">
                    <span className="sr-only">Close</span>
                    <Image
                      src="/x-close.svg"
                      alt="Close"
                      width={24}
                      height={24}
                    />
                  </button>
                </DialogClose>
              </div>

              {/* Full Size Poster */}
              <div className="w-full rounded-3xl border border-[#131313]/10 bg-white p-6 flex-1 overflow-auto flex items-center justify-center">
                <div className="w-full h-full flex justify-center items-center">
                  <Image
                    src={selectedPoster}
                    alt="Event poster"
                    width={800}
                    height={1000}
                    className="max-w-full max-h-full w-auto h-auto object-contain rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
