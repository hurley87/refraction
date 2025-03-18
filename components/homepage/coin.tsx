"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Coin = {
  tokenAddress: string;
  name: string;
  image: string;
  creator: string;
  avatar: string;
};

export const Coin = ({ coin }: { coin: Coin }) => {
  return (
    <div className="flex flex-col gap-3 bg-[#ffffff]/50 p-4 sm:p-8 rounded-lg max-w-[600px] font-sans h-full">
      <div
        className="w-full aspect-square relative rounded-lg overflow-hidden"
        style={{
          backgroundImage: `url(${coin.image})`,
          backgroundPosition: "center",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div className="text-2xl">{coin.name}</div>

      <span className="text-black flex items-center gap-2">
        <img
          src={coin.avatar}
          alt={coin.creator}
          className="w-4 h-4 rounded-full"
        />
        {coin.creator.toUpperCase()}
      </span>
      <div className="flex flex-row gap-6 justify-between mt-auto">
        <div className="flex">
          <Link
            target="_blank"
            href={`https://zora.co/coin/base:${coin.tokenAddress}`}
          >
            <Button
              size="lg"
              className="bg-gradient-to-r from-[#EE95BC] to-[#ED2D24] inline-block text-black uppercase hover:bg-[#DDDDDD]/90  sm:w-auto"
            >
              Buy
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
