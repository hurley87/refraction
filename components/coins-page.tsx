"use client";

import React, { useState, useEffect, useRef } from "react";
import { Coins } from "lucide-react";
import { toast } from "sonner";
import MobileFooterNav from "./mobile-footer-nav";

interface CoinData {
  id: number;
  name: string;
  display_name: string;
  latitude: number;
  longitude: number;
  place_id: string;
  coin_address: string;
  coin_name: string;
  coin_symbol: string;
  coin_image_url?: string;
  creator_wallet_address?: string;
  creator_username?: string;
  created_at: string;
}

export default function CoinsPage() {
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const itemsPerPage = 9;

  // Fetch all coins
  useEffect(() => {
    const loadCoins = async () => {
      try {
        const response = await fetch("/api/locations");
        if (response.ok) {
          const data = await response.json();
          // Filter only locations with coins and sort by created_at desc
          const coinsData = data.locations
            .filter((location: any) => location.coin_address)
            .sort(
              (a: any, b: any) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
            );

          setCoins(coinsData);
          setVisibleCount(Math.min(itemsPerPage, coinsData.length));
        }
      } catch (error) {
        console.error("Error fetching coins:", error);
        toast.error("Failed to load coins");
      } finally {
        setIsLoading(false);
      }
    };

    loadCoins();
  }, []);

  // Infinite scroll observer
  useEffect(() => {
    if (isLoading) return;
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        const hasMore = visibleCount < coins.length;
        if (entry.isIntersecting && hasMore && !isLoadingMore) {
          setIsLoadingMore(true);
          // Defer to allow smooth UX; no network call, just reveal more
          setTimeout(() => {
            setVisibleCount((prev) =>
              Math.min(prev + itemsPerPage, coins.length),
            );
            setIsLoadingMore(false);
          }, 150);
        }
      },
      { rootMargin: "200px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isLoading, coins.length, visibleCount, isLoadingMore]);

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div
      style={{
        background:
          "linear-gradient(0deg, #61BFD1 0%, #1BA351 33.66%, #FFE600 62.5%, #EE91B7 100%)",
      }}
      className="min-h-screen p-4 pb-24 font-grotesk"
    >
      <div className="min-h-screen max-w-lg mx-auto">
        {/* Main Content */}
        <div className="px-0 space-y-4">
          {/* Loading State */}
          {isLoading && (
            <div className="space-y-4">
              {[...Array(itemsPerPage)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                  <div className="flex flex-col gap-2 w-full">
                    {/* Header with coin name and symbol */}
                    <div className="flex items-center justify-between">
                      <div className="w-24 h-4 bg-gray-200 rounded"></div>
                      <div className="w-16 h-4 bg-gray-200 rounded"></div>
                    </div>

                    {/* Coin image placeholder */}
                    <div className="w-full h-96 bg-gray-200 rounded-2xl"></div>

                    {/* Location and creator info */}
                    <div className="flex flex-col gap-1">
                      <div className="w-3/4 h-3 bg-gray-200 rounded"></div>
                      <div className="w-1/2 h-3 bg-gray-200 rounded"></div>
                    </div>

                    {/* Trade button */}
                    <div className="w-full h-11 bg-gray-200 rounded-full mt-3"></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Coins List */}
          {!isLoading && (
            <div className="space-y-4">
              {coins.slice(0, visibleCount).length > 0 ? (
                coins.slice(0, visibleCount).map((coin: CoinData) => (
                  <div key={coin.id} className="bg-white rounded-2xl p-4">
                    <div className="flex gap-4 items-start">
                      {/* Coin Image */}

                      {/* Coin Info */}
                      <div className="flex flex-col gap-2 w-full">
                        <div className="flex items-center justify-between text-sm">
                          <h3 className="font-inktrap text-sm truncate">
                            {coin.coin_name}
                          </h3>
                          <span className="font-inktrap text-sm  text-gray-500 ml-2">
                            ${coin.coin_symbol}
                          </span>
                        </div>
                        <div className="rounded-2xl overflow-hidden bg-gray-100 w-full">
                          {coin.coin_image_url ? (
                            <img
                              src={coin.coin_image_url}
                              alt={coin.coin_name}
                              className="w-full h-auto"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Coins className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <p className="text-xs text-gray-600 text-wrap">
                            {coin.display_name}
                          </p>
                          {coin.creator_wallet_address && (
                            <p className="text-xs text-gray-500">
                              Created by{" "}
                              {coin.creator_username ||
                                formatWalletAddress(
                                  coin.creator_wallet_address,
                                )}
                            </p>
                          )}
                        </div>
                        <a
                          href={`https://zora.co/coin/base:${coin.coin_address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 w-full rounded-full bg-black px-5 py-3 text-center font-inktrap text-base text-white hover:opacity-90"
                        >
                          Trade on Zora
                        </a>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-2xl p-8 text-center">
                  <Coins className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 font-inktrap">No coins yet!</p>
                  <p className="text-sm text-gray-500 font-inktrap">
                    Create the first coin location
                  </p>
                </div>
              )}

              {/* Infinite scroll sentinel */}
              {!isLoading &&
                coins.length > 0 &&
                visibleCount < coins.length && (
                  <div ref={loadMoreRef} className="h-8" />
                )}
              {isLoadingMore && (
                <div className="flex justify-center py-4">
                  <div className="h-5 w-5 rounded-full border-2 border-gray-300 border-t-black animate-spin" />
                </div>
              )}
            </div>
          )}

          {/* Spacer for bottom nav */}
          <div className="h-8" />
        </div>

        {/* Bottom IRL Section */}
        <div className="py-6">
          <img src="/irl-bottom-logo.svg" alt="IRL" className="w-full h-auto" />
        </div>
      </div>

      {/* Mobile footer navigation */}
      <MobileFooterNav />
    </div>
  );
}
