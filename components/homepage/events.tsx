"use client";

import Image from "next/image";
import { Event } from "./event";
/*  
    // Event format
      <Event
          event={{
            id: 1,
            title: "Shibuya Crossing",
            location: "Tokyo",
            date: "July 17-20 2023",
            image: "tokyo.svg",
          }}
        />
  */
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
            id: 4,
            title: "React X Refraction Present Reset",
            location: "NYC",
            date: "June 26 2025",
            image: "nftnyc-aptos.png",
          }}
        /> 
         <Event
            event={{
            id: 3,
            title: "IRL @ Standard Time w/Aptos, Polygon & Cold Pod",
            location: "Toronto",
            date: "May 16 2025",
            image: "refraction-standard-time.png",
          }}
        /> 
       
        <Event
            event={{
            id: 2,
            title: "IRL @ Pony w/Livepeer,",
            location: "NYC",
            date: "May 1 2025",
            image: "irl-daydream-greenpoint-portrait.png",
          }}
        /> 

         <Event
            event={{
            id: 1,
            title: "IRL @ Public Records w/ Rodeo",
            location: "NYC",
            date: "April 30 2025",
            image: "public-records-apr-30.png",
          }}
        /> 
       
      </div>
    </div>
  );
};
