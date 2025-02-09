"use client";
import { publicClient } from "@/lib/publicClient";
import { createCollectorClient } from "@zoralabs/protocol-sdk";
import { Token } from "./token";

export const Tokens = () => {
  const chainId = 8453;
  const collectorClient = createCollectorClient({
    chainId,
    publicClient,
  });

  const tokens = [
    {
      tokenId: "3",
      tokenContract: "0x9c02860419224c3e56df4a5111a24ec5a566e709",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-start items-center p-4 sm:p-8 bg-[#DBDFF2]/50">
        DIG Shibuya Mints
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {tokens.map((token: any) => (
          <Token
            key={token.tokenId}
            tokenId={token.tokenId}
            tokenContract={token.tokenContract}
            collectorClient={collectorClient}
          />
        ))}
      </div>
    </div>
  );
};
