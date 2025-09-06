"use client";

import React, { useState, useEffect } from "react";
import { ArrowRight, Coins } from "lucide-react";
import Header from "./header";
import { toast } from "sonner";

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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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
          setTotalPages(Math.ceil(coinsData.length / itemsPerPage));
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

  // Get current page data
  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return coins.slice(startIndex, endIndex);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const renderPaginationButtons = () => {
    const buttons: React.ReactNode[] = [];

    // Always show first page
    if (currentPage > 3) {
      buttons.push(
        <button
          key={1}
          onClick={() => handlePageChange(1)}
          className="w-10 h-10 rounded-full bg-white text-black font-inktrap font-medium text-sm flex items-center justify-center border border-gray-200 hover:bg-gray-50"
        >
          1
        </button>,
      );

      if (currentPage > 4) {
        buttons.push(
          <span key="ellipsis1" className="px-2 text-gray-500 font-inktrap">
            ...
          </span>,
        );
      }
    }

    // Show pages around current page
    const start = Math.max(1, currentPage - 1);
    const end = Math.min(totalPages, currentPage + 1);

    for (let i = start; i <= end; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`w-10 h-10 rounded-full font-inktrap font-medium text-sm flex items-center justify-center ${
            i === currentPage
              ? "bg-black text-white"
              : "bg-white text-black border border-gray-200 hover:bg-gray-50"
          }`}
        >
          {i}
        </button>,
      );
    }

    // Show last page if needed
    if (currentPage < totalPages - 2) {
      if (currentPage < totalPages - 3) {
        buttons.push(
          <span key="ellipsis2" className="px-2 text-gray-500 font-inktrap">
            ...
          </span>,
        );
      }

      buttons.push(
        <button
          key={totalPages}
          onClick={() => handlePageChange(totalPages)}
          className="w-10 h-10 rounded-full bg-white text-black font-inktrap font-medium text-sm flex items-center justify-center border border-gray-200 hover:bg-gray-50"
        >
          {totalPages}
        </button>,
      );
    }

    // Next button
    if (currentPage < totalPages) {
      buttons.push(
        <button
          key="next"
          onClick={() => handlePageChange(currentPage + 1)}
          className="w-10 h-10 rounded-full bg-white text-black font-inktrap font-medium text-sm flex items-center justify-center border border-gray-200 hover:bg-gray-50"
        >
          <ArrowRight className="w-4 h-4" />
        </button>,
      );
    }

    return buttons;
  };

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div
      style={{
        background:
          "linear-gradient(0deg, #61BFD1 0%, #1BA351 33.66%, #FFE600 62.5%, #EE91B7 100%)",
      }}
      className="min-h-screen p-4 pb-0 font-grotesk"
    >
      <div className="min-h-screen max-w-lg mx-auto">
        {/* Status Bar */}
        <Header />

        {/* Coins Header */}
        <div className="px-0 pt-8 mb-6">
          <div className="bg-white rounded-2xl p-4 flex items-center justify-between">
            <h1 className="text-xl font-inktrap font-bold text-black">Coins</h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-0 space-y-4">
          {/* Loading State */}
          {isLoading && (
            <div className="space-y-4">
              {[...Array(itemsPerPage)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1">
                      <div className="w-32 h-5 bg-gray-200 rounded mb-2"></div>
                      <div className="w-20 h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="w-full h-3 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Coins List */}
          {!isLoading && (
            <div className="space-y-4">
              {getCurrentPageData().length > 0 ? (
                getCurrentPageData().map((coin: CoinData) => (
                  <div key={coin.id} className="bg-white rounded-2xl p-4">
                    <div className="flex gap-4 items-start">
                      {/* Coin Image */}

                      {/* Coin Info */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between text-sm">
                          <h3 className="font-inktrap text-sm truncate">
                            {coin.coin_name}
                          </h3>
                          <span className="font-inktrap text-sm  text-gray-500 ml-2">
                            ${coin.coin_symbol}
                          </span>
                        </div>
                        <div className="rounded-2xl overflow-hidden bg-gray-100">
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
            </div>
          )}

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-6">
              {renderPaginationButtons()}
            </div>
          )}
        </div>

        {/* Bottom IRL Section */}
        <div className="py-6">
          <img src="/irl-bottom-logo.svg" alt="IRL" className="w-full h-auto" />
        </div>
      </div>
    </div>
  );
}
