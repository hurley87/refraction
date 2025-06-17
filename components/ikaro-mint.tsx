"use client";

import { usePrivy } from "@privy-io/react-auth";
import Auth from "./auth";
import { Button } from "./ui/button";
import { useState } from "react";
import Image from "next/image";

export default function IkaroMint() {
  const { user, login } = usePrivy();
  const [count, setCount] = useState(1);

  const increment = () => setCount(prev => prev + 1);
  const decrement = () => setCount(prev => Math.max(1, prev - 1));

  if (!user) {
    return (
      <Button
        className="bg-white text-[#F24405] rounded-lg hover:bg-white/80 w-full max-w-4xl text-xl font-inktrap"
        onClick={login}
      >
        Get Started
      </Button>
    );
  }

  return (
    <Auth>
      <div className="flex flex-col items-center justify-center py-6 w-full">
        <div className="w-full space-y-4">
          <Image src="/images/ikaro.png" alt="Ikaro Mint" width={1272} height={618} />
          <h1 className="text-4xl font-inktrap">PCO BY IKARO CAVALCANTE  </h1>
          <p className="text-lg">On June 26 at Public Records NYC, Serpentine and ArtDAO team up with Refraction to debut the first digital artworks from Brazilian multimedia artist     Ikaro Cavalcante: a video game developed through PCO, Serpentine&apos;s creative ownership protocol. The artwork will be available as both a 1/1 and an open edition mint, with each purchase unlocking $IRL points—culture&apos;s on-chain rewards system. The launch will take place during RESET, a full-venue takeover powered by IRL, featuring music from INVT, Ash Lauryn, and more.
          </p>
          
          <div className="flex items-center justify-center mb-4">
            <div className="flex border border-[#F24405] rounded-lg overflow-hidden">
              <button 
                onClick={decrement}
                className="w-12 h-8 bg-black text-[#F24405] hover:bg-black/70 text-lg  font-hmalpha border-r border-[#F24405]"
              >
                -
              </button>
              
              <button 
                onClick={increment}
                className="w-12 h-8 bg-black text-[#F24405] hover:bg-black/70  font-hmalpha text-lg "
              >
                +
              </button>
              <div className="w-16 h-8 bg-transparent flex items-center justify-center border-r border-[#F24405]">
                <span className="text-lg font-mono">{count}</span>
              </div>
            </div>
          </div>

          <Button className="bg-[#ff0000] text-blackrounded-lg hover:bg-black hover:text-white w-full max-w-4xl text-xl font-inktrap">
            Buy Now
          </Button>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center py-6 w-full">
        <div className="w-full space-y-4">
          <Image src="/images/ikaro.png" alt="Ikaro Mint" width={1272} height={618} />
          <h1 className="text-4xl font-inktrap">1/1 BY IKARO CAVALCANTE  </h1>
          <p className="text-lg">On June 26 at Public Records NYC, Serpentine and ArtDAO team up with Refraction to debut the first digital artworks from Brazilian multimedia artist     Ikaro Cavalcante: a video game developed through PCO, Serpentine&apos;s creative ownership protocol. The artwork will be available as both a 1/1 and an open edition mint, with each purchase unlocking $IRL points—culture&apos;s on-chain rewards system. The launch will take place during RESET, a full-venue takeover powered by IRL, featuring music from INVT, Ash Lauryn, and more.
          </p>
          
      

          <Button className="bg-[#ff0000] text-blackrounded-lg hover:bg-black hover:text-white w-full max-w-4xl text-xl font-inktrap">
            Buy Now
          </Button>
        </div>
      </div>
    </Auth>
  );
}
