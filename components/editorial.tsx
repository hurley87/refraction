"use client";

import { BookOpen, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useRouter } from "next/navigation";

/**
 * Editorial component displaying curated guides, events, and rewards
 */
export default function Editorial() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6 w-full bg-white rounded-2xl p-6">
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-gray-900" />
          <h2 className="text-lg font-bold font-inktrap uppercase tracking-tight text-gray-900">
            EDITORIAL
          </h2>
        </div>
        <p className="text-sm text-gray-600 font-grotesk">
          Discover curated guides, events, and rewards in your city.
        </p>
      </div>

      {/* Featured Guide Card */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex gap-4">
          {/* Guide Image */}
          <div className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden">
            <Image
              src="/events/livepeer-ba.png"
              alt="The IRL Guide to Buenos Aires"
              fill
              className="object-cover"
            />
          </div>

          {/* Guide Content */}
          <div className="flex flex-col gap-3 flex-1 min-w-0">
            {/* Title */}
            <h3 className="text-base font-bold font-inktrap text-gray-900 leading-tight">
              The IRL Guide to Buenos Aires
            </h3>

            {/* Category Tag */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50">
                <MapPin className="w-3 h-3 text-gray-600" />
                <span className="text-xs font-inktrap uppercase tracking-wide text-gray-600">
                  CITY GUIDE
                </span>
              </div>
            </div>

            {/* Read Guide Button */}
            <Button
              onClick={() => router.push("/editorial/buenos-aires")}
              className="bg-gray-100 text-gray-900 rounded-xl hover:bg-gray-200 w-full font-inktrap py-2.5 text-sm flex items-center justify-between px-4"
            >
              <span>READ GUIDE</span>
              <ArrowRight className="w-4 h-4 text-gray-900" />
            </Button>
          </div>
        </div>
      </div>

      {/* View All Editorial Button */}
      <Button
        onClick={() => router.push("/editorial")}
        className="bg-gray-100 text-gray-900 rounded-xl hover:bg-gray-200 w-full font-inktrap py-3 text-base flex items-center justify-between px-4"
      >
        <span>View All Editorial</span>
        <ArrowRight className="w-4 h-4 text-gray-900" />
      </Button>
    </div>
  );
}
