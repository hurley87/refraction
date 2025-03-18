"use client";
import { publicClient } from "@/lib/publicClient";
import { createCollectorClient } from "@zoralabs/protocol-sdk";
import { Token } from "./token";
import { Coin } from "./coin";
import Image from "next/image";

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
    {
      tokenId: "1",
      tokenContract: "0xdabf37fa1bb92b8a0c44eb4695c930679538697e",
    },
  ];

  const coins = [
    {
      tokenAddress: "0xc316cc6911cba583fe2bafa13dad398b2de329fd",
      name: "Street Flowers in a Pot",
      image: "/coins/street-flowers-in-a-pot.png",
      avatar: "/coins/skohr.png",
      creator: "skohr",
    },
    {
      tokenAddress: "0x96092e07827ecf53e43a02bc39a6e5c0bf8ea68b",
      name: "Consciousness Terrain Sampler",
      image: "/coins/consciousness-terrain-sampler.png",
      avatar: "/coins/skygoodman.png",
      creator: "Sky Goodman",
    },
  ];

  return (
    <div className="flex flex-col">
      <Image
        src="mints-title-bar.svg"
        alt="mints"
        width={1726}
        height={244}
        className="w-auto h-auto"
      />

      <div className="grid grid-cols-1 bg-[#ffffff] sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {coins.map((coin: any) => (
          <Coin key={coin.tokenAddress} coin={coin} />
        ))}
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
