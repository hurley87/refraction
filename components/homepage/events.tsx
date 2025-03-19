"use client";

import Image from "next/image";
import { Event } from "./event";

export const Events = () => {
  return (
    <div className="flex flex-col">
      <Image
        src="events-title-bar.svg"
        alt="mints"
        width={1726}
        height={244}
        className="w-auto h-auto"
      />

      <div className="grid grid-cols-1 bg-[#ffffff] sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
        <Event
          event={{
            id: 1,
            title: "Shibuya Crossing",
            location: "Tokyo",
            date: "July 17-20 2023",
            image: "tokyo.svg",
          }}
        />
        <Event
          event={{
            id: 2,
            title: "106 Ledger",
            location: "Paris",
            date: "July 17-20 2023",
            image: "paris.svg",
          }}
        />
        <Event
          event={{
            id: 3,
            title: "ESP HiFi",
            location: "Denver",
            date: "July 17-20 2023",
            image: "denver.svg",
          }}
        />
        <Event
          event={{
            id: 4,
            title: "Lume Studios",
            location: "New York",
            date: "July 17-20 2023",
            image: "nyc.svg",
          }}
        />
      </div>
    </div>
  );
};
