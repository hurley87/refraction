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
          IKARO / Occulted
        </p>
      </div>
      <IkaroMint />
      <div className="flex-auto text-black text-md font-anonymous font-light max-w-4xl mx-auto">
        {`Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc at ante pulvinar erat aliquet aliquet. Interdum et malesuada fames ac ante ipsum primis in faucibus. In hac habitasse platea dictumst. Donec vitae ornare neque, sed eleifend velit. Vestibulum posuere malesuada nisl. Maecenas quis posuere libero. Aenean sit amet fermentum lorem. Pellentesque at arcu mollis, pharetra massa at, gravida lectus. Nunc nulla tortor, laoreet sit amet fringilla non, pulvinar vel diam.`}
      </div>
      <Image
        src="/circles.png"
        alt="Ledger"
        className="w-5/6 h-auto mx-auto my-6"
      />
    </div>
  );
}
