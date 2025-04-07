"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Token = {
  tokenAddress: string;
  tokenId: string;
  name: string;
  image: string;
  creator: string;
  avatar: string;
};

export const Token = ({ token }: { token: Token }) => {
  return (
    <div className="flex flex-col gap-3 bg-[#ffffff]/50 p-4 sm:p-8 rounded-lg max-w-[600px] font-sans h-full">
      <div
        className="w-full aspect-square relative rounded-lg overflow-hidden"
        style={{
          backgroundImage: `url(${token.image})`,
          backgroundPosition: "center",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div className="text-2xl">{token.name}</div>

      <span className="text-black flex items-center gap-2">
        <img
          src={token.avatar}
          alt={token.creator}
          className="w-4 h-4 rounded-full"
        />
        {token.creator.toUpperCase()}
      </span>
      <div className="flex flex-row gap-6 justify-between mt-auto">
        <div className="flex">
          <Link
            target="_blank"
            href={`https://zora.co/collect/base:${token.tokenAddress}/${token.tokenId}?referrer=0xbD78783a26252bAf756e22f0DE764dfDcDa7733c`}
          >
            <Button
              size="lg"
              className="bg-gradient-to-r from-[#EE95BC] to-[#ED2D24] inline-block text-black uppercase hover:bg-[#DDDDDD]/90  sm:w-auto"
            >
              Mint
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
