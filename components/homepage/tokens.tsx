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
      tokenId: "1",
      tokenContract: "0x9c02860419224c3e56df4a5111a24ec5a566e709",
    },
    {
      tokenId: "2",
      tokenContract: "0x9c02860419224c3e56df4a5111a24ec5a566e709",
    },
    {
      tokenId: "3",
      tokenContract: "0x9c02860419224c3e56df4a5111a24ec5a566e709",
    },
    {
      tokenId: "1",
      tokenContract: "0xef889592ca0547c38e888e7247cfb11ebcd6936b",
    },
    {
      tokenId: "1",
      tokenContract: "0x78737183c792f2558662ce1fd6c4a18f2ca7f20a",
    },
    {
      tokenId: "3",
      tokenContract: "0xb5055d029ac1e4c01e7f5c66d27d3acdeb9f4207",
    },
    {
      tokenId: "2",
      tokenContract: "0xb5055d029ac1e4c01e7f5c66d27d3acdeb9f4207",
    },
    {
      tokenId: "1",
      tokenContract: "0xb5055d029ac1e4c01e7f5c66d27d3acdeb9f4207",
    },
    {
      tokenId: "3",
      tokenContract: "0xa7bfc86ff944d6e12dd5e0aa3ddd2950e6b7c895",
    },
    {
      tokenId: "2",
      tokenContract: "0xa7bfc86ff944d6e12dd5e0aa3ddd2950e6b7c895",
    },
    {
      tokenId: "1",
      tokenContract: "0xa7bfc86ff944d6e12dd5e0aa3ddd2950e6b7c895",
    },
    {
      tokenId: "1",
      tokenContract: "0x0d9e3740754707bf2c4bf39fa0bf6e57028071ca",
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
