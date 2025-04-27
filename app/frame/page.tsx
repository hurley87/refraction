"use client";

import { useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk";
import { Button } from "@/components/ui/button";

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
    <div className="min-h-screen bg-black px-20 pt-36">
      <div className="max-w-md mx-auto">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2 font-grotesk">
            Welcome to IRL
          </h1>
          <p className="text-muted-foreground pb-10">
            Add IRL and get notified when we launch
          </p>
        </div>

        {!isAdded && (
          <Button
            size="lg"
            onClick={handleAddToWaitlist}
            className="bg-white text-black rounded-full font-pixel text-xl sm:text-base md:text-xl py-2 px-4 sm:px-3 md:px-4 h-auto block mx-auto"
          >
            Add IRL
          </Button>
        )}

        {/* show button if isAdded is true */}
        {isAdded && (
          <Button
            size="lg"
            disabled
            className="bg-white text-black rounded-full font-pixel text-xl sm:text-base md:text-xl py-2 px-4 sm:px-3 md:px-4 h-auto opacity-50 block mx-auto"
          >
            Added!
          </Button>
        )}
      </div>
    </div>
  );
}
