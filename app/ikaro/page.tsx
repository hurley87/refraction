import IkaroMint from "@/components/ikaro-mint";
import Image from "next/image";

export default async function IkaroMintPage() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-inktrap uppercase text-black">Mint</h1>
        <p
          style={{ lineHeight: "70px" }}
          className="text-white text-7xl font-inktrap uppercase"
        >
          IKARO / OCCULTED
        </p>
      </div>
      <IkaroMint />
      <div className="flex-auto text-black text-md font-anonymous font-light max-w-4xl mx-auto">
        {`PCO project is initiated and incubated by RadicalxChange and the Future Art Ecosystems the team at Serpentine Arts Technologies with support from ArtDAO`}
      </div>
      <Image
        src="/circles.png"
        alt="Ledger"
        width={1272}
        height={618}
        className="w-5/6 h-auto mx-auto my-6"
      />
    </div>
  );
}