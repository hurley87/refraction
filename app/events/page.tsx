"use client";

import React, { useState } from "react";
import Image from "next/image";
import eventsData from "@/data/events.json";
import MapNav from "@/components/mapnav";

// Extract event data from JSON
const { nextEvent, futureEvents } = eventsData;

export default function EventsPage() {
  const [eventType, setEventType] = useState("IRL");
  const [sortBy, setSortBy] = useState("date");

  const filteredEvents = futureEvents.filter(
    (event) => eventType === "ALL" || event.type === eventType,
  );

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    if (sortBy === "date") {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    }
    return a.title.localeCompare(b.title);
  });

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
        <div className="px-0 pt-4 space-y-4">
          {/* NEXT EVENT Section */}
          <div className="mb-6">
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
              <Image
                src={nextEvent.poster}
                alt={nextEvent.title}
                width={400}
                height={409}
                className="w-full h-auto object-cover rounded-xl"
              />

              {/* Event Title */}
              <h2 className="text-black title2 font-pleasure w-full text-left">
                {nextEvent.title}
              </h2>

              {/* Date and Location */}
              <div className="flex w-full gap-2">
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
                    {nextEvent.date}
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
                  <span className="flex items-center gap-1 text-black body-small uppercase font-abc-monument-regular">
                    {nextEvent.location}
                  </span>
                </div>
              </div>

              {/* Register Button */}
              <button className="w-full bg-white text-black font-bold rounded-full py-3 px-4 hover:bg-gray-100 transition-colors flex items-center justify-between">
                <span className="font-pleasure text-left">Register</span>
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
                    src="/events/ra-red.jpeg"
                    alt="resident advisor"
                    width={20}
                    height={20}
                    className="rounded-full"
                  />
                </div>
              </button>
            </div>
          </div>

          {/* Toggle and Sort Section */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4 gap-4">
              {/* Event Type Toggle */}
              <div
                style={{
                  display: "flex",
                  padding: "4px",
                  alignItems: "center",
                  gap: "4px",
                  flex: "1 0 0",
                  borderRadius: "100px",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  background: "rgba(255, 255, 255, 0.25)",
                }}
              >
                <button
                  onClick={() => setEventType("IRL")}
                  className={`text-sm font-medium transition-colors ${
                    eventType === "IRL"
                      ? "text-black"
                      : "text-white hover:text-gray-300"
                  }`}
                  style={
                    eventType === "IRL"
                      ? {
                          display: "flex",
                          height: "40px",
                          padding: "4px 0",
                          justifyContent: "center",
                          alignItems: "center",
                          gap: "8px",
                          flex: "1 0 0",
                          borderRadius: "1000px",
                          background: "#FFF",
                          boxShadow: "0 1px 8px 0 rgba(0, 0, 0, 0.08)",
                        }
                      : {
                          display: "flex",
                          height: "40px",
                          padding: "4px 0",
                          justifyContent: "center",
                          alignItems: "center",
                          gap: "8px",
                          flex: "1 0 0",
                        }
                  }
                >
                  IRL
                </button>
                <button
                  onClick={() => setEventType("ONLINE")}
                  className={`text-sm font-medium transition-colors ${
                    eventType === "ONLINE"
                      ? "text-black"
                      : "text-white hover:text-gray-300"
                  }`}
                  style={
                    eventType === "ONLINE"
                      ? {
                          display: "flex",
                          height: "40px",
                          padding: "4px 0",
                          justifyContent: "center",
                          alignItems: "center",
                          gap: "8px",
                          flex: "1 0 0",
                          borderRadius: "1000px",
                          background: "#FFF",
                          boxShadow: "0 1px 8px 0 rgba(0, 0, 0, 0.08)",
                        }
                      : {
                          display: "flex",
                          height: "40px",
                          padding: "4px 0",
                          justifyContent: "center",
                          alignItems: "center",
                          gap: "8px",
                          flex: "1 0 0",
                        }
                  }
                >
                  Online
                </button>
              </div>

              {/* Filter Button */}
              <button
                onClick={() => setSortBy(sortBy === "date" ? "title" : "date")}
                style={{
                  display: "flex",
                  width: "55px",
                  height: "48px",
                  padding: "16px",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "flex-start",
                  gap: "16px",
                  borderRadius: "24px",
                  background: "#FFF",
                }}
                className="hover:bg-gray-50 transition-colors"
              >
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
            <div className="space-y-4">
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
                      <div className="text-black title3 font-pleasure text-left">
                        {event.title}
                      </div>
                    </div>

                    {/* Column 2: Small Poster */}
                    <div className="flex-shrink-0">
                      <Image
                        src={event.poster}
                        alt={event.title}
                        width={80}
                        height={100}
                        className="rounded-xl object-cover"
                        style={{ width: "80px", height: "100px" }}
                      />
                    </div>
                  </div>

                  {/* Row 2: Date, Location, and Map Button */}
                  <div className="flex w-full gap-2">
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
                      <span className="text-black body-small uppercase font-abc-monument-regular">
                        {event.date}
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
                      <span className="flex items-center gap-1 text-black body-small uppercase font-abc-monument-regular">
                        {event.location}
                      </span>
                    </div>

                    {/* Map Button */}
                    <button
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
                        src="/home/arrow-right.svg"
                        alt="arrow-right"
                        width={16}
                        height={16}
                        className="w-4 h-4"
                      />
                    </button>
                  </div>

                  {/* Row 3: Register Button */}
                  <button className="w-full bg-[#EDEDED] text-black font-bold rounded-full py-3 px-4 hover:bg-gray-100 transition-colors flex items-center justify-between">
                    <span className="font-pleasure text-left">Register</span>
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
                        src="/events/ra-red.jpeg"
                        alt="resident advisor"
                        width={20}
                        height={20}
                        className="rounded-full"
                      />
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ height: "100px" }} />
        </div>
      </div>
    </div>
  );
}
