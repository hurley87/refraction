"use client";

import Image from "next/image";
import Link from "next/link";
import { Coins } from "lucide-react";

export interface Activity {
  id: string;
  date: string;
  description?: string;
  activityType?: string;
  points: number;
  event: string;
  metadata?: any;
}

interface TransactionsProps {
  activities?: Activity[];
  isLoading?: boolean;
  error?: Error | string | null;
  walletAddress?: string;
  showEmptyStateAction?: boolean;
  emptyStateActionHref?: string;
  emptyStateActionLabel?: string;
  maxHeight?: string;
}

export default function Transactions({
  activities = [],
  isLoading = false,
  error = null,
  showEmptyStateAction = false,
  emptyStateActionHref = "/interactive-map",
  emptyStateActionLabel = "Explore Map",
  maxHeight = "400px",
}: TransactionsProps) {
  return (
    <div className="bg-white rounded-[26px] p-[16px] pt-[24px]">
      <div className="flex items-center gap-2 mb-4">
        <Image
          src="/list-icon.svg"
          alt="Transactions"
          width={8}
          height={8}
          className="w-4 h-4"
        />
        <h2 className="body-small font-grotesk text-[#7D7D7D]">
          TRANSACTIONS
        </h2>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse flex justify-between items-center py-3 border-b border-gray-100"
            >
              <div className="w-20 h-4 bg-gray-200 rounded"></div>
              <div className="w-32 h-4 bg-gray-200 rounded"></div>
              <div className="w-16 h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="text-center py-6">
          <p className="text-red-600 text-sm">
            {error instanceof Error
              ? error.message
              : typeof error === "string"
                ? error
                : "An error occurred"}
          </p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && activities.length === 0 && (
        <div className="text-center py-6">
          <Coins className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-grotesk body-medium">
            No activity yet
          </p>
          <p className="text-sm text-gray-500 font-grotesk mt-1">
            Check in at locations to start earning points
          </p>
          {showEmptyStateAction && (
            <Link
              href={emptyStateActionHref}
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[#1BA351] hover:bg-[#158f44] text-white rounded-full text-sm font-grotesk transition-colors"
            >
              <span>{emptyStateActionLabel}</span>
              <Image
                src="/home/arrow-right.svg"
                alt="arrow"
                width={16}
                height={16}
                className="w-4 h-4 brightness-0 invert"
              />
            </Link>
          )}
        </div>
      )}

      {/* Activities List */}
      {!isLoading && !error && activities.length > 0 && (
        <>
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_2fr_auto] gap-2 pb-2 border-b border-gray-200 mb-2">
            <span className="body-small text-[#B5B5B5] uppercase tracking-wide">
              Date
            </span>
            <span className="body-small text-[#B5B5B5] uppercase tracking-wide">
              Activity
            </span>
            <span className="body-small text-[#B5B5B5] uppercase tracking-wide text-right">
              Points
            </span>
          </div>

          {/* Activities */}
          <div className={`space-y-0 overflow-y-auto`} style={{ maxHeight }}>
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="grid grid-cols-[1fr_2fr_auto] gap-2 py-3 border-b border-gray-100 last:border-b-0 items-center"
              >
                <div className="body-medium text-[#F0A0AF] font-grotesk">
                  {activity.date}
                </div>
                <div className="body-medium text-[#4F4F4F] font-grotesk truncate">
                  {activity.event}
                </div>
                <div className="body-medium text-[#7D7D7D] font-grotesk text-right whitespace-nowrap">
                  +{activity.points}
                </div>
              </div>
            ))}
          </div>

          {/* Load More Button */}
          {activities.length >= 20 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <button className="w-full h-[40px] bg-[#ededed] hover:bg-gray-200 text-[#313131] px-4 rounded-full transition-colors duration-200 flex items-center justify-center">
                <span className="body-small font-grotesk uppercase">
                  Load More
                </span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
