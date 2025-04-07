"use client";

import { Token } from "./token";
import { Coin } from "./coin";
import Image from "next/image";

export const Tokens = () => {
  const tokens = [
    {
      tokenAddress: "0x9c02860419224c3e56df4a5111a24ec5a566e709",
      tokenId: "1",
      name: "Save the data save the memory",
      image: "/tokens/save-the-data-save-the-memory.png",
      avatar: "/tokens/otp-otopi.png",
      creator: "otp_otopi",
    },
    {
      tokenAddress: "0x9c02860419224c3e56df4a5111a24ec5a566e709",
      tokenId: "2",
      name: "optimization",
      image: "/tokens/optimization.png",
      avatar: "/tokens/otp-otopi.png",
      creator: "otp_otopi",
    },
    {
      tokenAddress: "0x9c02860419224c3e56df4a5111a24ec5a566e709",
      tokenId: "3",
      name: "File 01 - Call my name",
      image: "/tokens/call-my-name.png",
      avatar: "/tokens/otp-otopi.png",
      creator: "otp_otopi",
    },
    {
      tokenAddress: "0xef889592ca0547c38e888e7247cfb11ebcd6936b",
      tokenId: "1",
      name: "324LINES",
      image: "/tokens/324lines.png",
      avatar: "/tokens/seohyo.png",
      creator: "seohyo",
    },
    {
      tokenAddress: "0x78737183c792f2558662ce1fd6c4a18f2ca7f20a",
      tokenId: "1",
      name: "Render Ghost / Tower of Evolution",
      image: "/tokens/render-ghost.png",
      avatar: "/tokens/naxsgroup.png",
      creator: "naxsgroup",
    },
    {
      tokenAddress: "0xb5055d029ac1e4c01e7f5c66d27d3acdeb9f4207",
      tokenId: "3",
      name: "Painting with Smoke 003",
      image: "/tokens/painting-with-smoke-003.png",
      avatar: "/tokens/genkinishida.png",
      creator: "genkinishida",
    },
    {
      tokenAddress: "0xb5055d029ac1e4c01e7f5c66d27d3acdeb9f4207",
      tokenId: "2",
      name: "Painting with Smoke 002",
      image: "/tokens/painting-with-smoke-002.png",
      avatar: "/tokens/genkinishida.png",
      creator: "genkinishida",
    },
    {
      tokenAddress: "0xb5055d029ac1e4c01e7f5c66d27d3acdeb9f4207",
      tokenId: "1",
      name: "Painting with Smoke 001",
      image: "/tokens/painting-with-smoke-001.png",
      avatar: "/tokens/genkinishida.png",
      creator: "genkinishida",
    },
    {
      tokenAddress: "0xa7bfc86ff944d6e12dd5e0aa3ddd2950e6b7c895",
      tokenId: "3",
      name: "Antopia",
      image: "/tokens/antopia.png",
      avatar: "/tokens/survival_dance.png",
      creator: "survival_dance",
    },
    {
      tokenAddress: "0xa7bfc86ff944d6e12dd5e0aa3ddd2950e6b7c895",
      tokenId: "2",
      name: "Lifelong Grind",
      image: "/tokens/lifelong-grind.png",
      avatar: "/tokens/survival_dance.png",
      creator: "survival_dance",
    },
    {
      tokenAddress: "0xa7bfc86ff944d6e12dd5e0aa3ddd2950e6b7c895",
      tokenId: "1",
      name: "Endless Hourglass",
      image: "/tokens/endless-hourglass.png",
      avatar: "/tokens/survival_dance.png",
      creator: "survival_dance",
    },
    {
      tokenAddress: "0x0d9e3740754707bf2c4bf39fa0bf6e57028071ca",
      tokenId: "1",
      name: "sea voice",
      image: "/tokens/sea-voice.png",
      avatar: "/tokens/hanargram.png",
      creator: "hanargram",
    },
    {
      tokenAddress: "0xdabf37fa1bb92b8a0c44eb4695c930679538697e",
      tokenId: "1",
      name: "Link",
      image: "/tokens/link.png",
      avatar: "/tokens/itoaoi.png",
      creator: "itoaoi",
    },
  ];

  const coins = [
    {
      tokenAddress: "0xbc57e8d020223dd0605472c5d1f1696e28c3817c",
      name: "MI828",
      image: "/coins/MI828.png",
      avatar: "/coins/misato.png",
      creator: "misato",
    },
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
            key={`${token.tokenId}-${token.tokenContract}`}
            token={token}
          />
        ))}
      </div>
    </div>
  );
};
