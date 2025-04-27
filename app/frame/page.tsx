"use client";

import { useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function FramePage() {
  const [isReady, setIsReady] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);

  useEffect(() => {
    const initializeFrame = async () => {
      // Hide splash screen when component is mounted
      await sdk.actions.ready();
      setIsReady(true);

      // Check if user has added the app
      const context = await sdk.context;
      console.log("context", context);
      setIsAdded(context?.client?.added);
    };
    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      initializeFrame();
    }
  }, [isSDKLoaded]);

  const handleAddToWaitlist = async () => {
    await sdk.actions.addFrame();
    setIsAdded(true);
  };

  if (!isReady) {
    return null;
  }

  return (
    <div className="flex flex-col justify-between items-center min-h-screen w-full bg-black font-grotesk p-2 sm:p-4">
      <div className="p-4 sm:p-8 bg-[#E04220] rounded-sm flex flex-col items-center justify-center w-full gap-6 sm:gap-8 md:gap-10">
        <div className="flex flex-col text-center items-center gap-4 w-full">
          <h1 className="text-2xl font-bold font-grotesk text-[#FFF7AD]">
            Welcome to IRL
          </h1>

          <p className="text-[#FFF7AD] pb-6 max-w-md">
            Add IRL and get notified when we launch
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center w-full mt-auto mb-8">
        {!isAdded && (
          <Button
            size="lg"
            onClick={handleAddToWaitlist}
            className="uppercase bg-[#FFF7AD] hover:bg-[#FF0000]/90 text-[#E04220] w-full max-w-md font-inktrap text-xl py-8 h-auto"
          >
            Add IRL
          </Button>
        )}

        {isAdded && (
          <Button
            size="lg"
            disabled
            className="uppercase bg-[#FFF7AD] text-[#E04220] w-full max-w-md font-inktrap text-xl py-8 h-auto opacity-80"
          >
            Added!
          </Button>
        )}

        <Image
          src="/irl-logo-footer.svg"
          alt="IRL logo footer"
          width={400}
          height={100}
          className="w-full h-auto mt-6 max-w-md mx-auto"
        />
      </div>
    </div>
  );
}
