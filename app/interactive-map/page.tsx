"use client";

import { useEffect, useState } from "react";
import InteractiveMap from "@/components/interactive-map";
import { Button } from "@/components/ui/button";
import miniappSdk from "@farcaster/miniapp-sdk";
import { usePrivy } from "@privy-io/react-auth";
import { useLoginToMiniApp } from "@privy-io/react-auth/farcaster";

export default function InteractiveMapPage() {
  const { ready, authenticated } = usePrivy();
  const { initLoginToMiniApp, loginToMiniApp } = useLoginToMiniApp();
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [farcasterUsername, setFarcasterUsername] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (miniappSdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      miniappSdk.actions.ready();
      setIsReady(true);
    }
  }, [isSDKLoaded]);

  useEffect(() => {
    const checkContext = async () => {
      if (!isReady) return;
      try {
        const context: any = await miniappSdk.context;
        const username = context?.user?.username ?? null;
        setFarcasterUsername(username);
      } catch {}
    };
    checkContext();
  }, [isReady]);

  const handleSignIn = async () => {
    try {
      const { nonce } = await initLoginToMiniApp();
      console.log("nonce", nonce);
      const result = await miniappSdk.actions.signIn({ nonce });
      console.log("result", result);
      await loginToMiniApp({
        message: result.message,
        signature: result.signature,
      });
    } catch (error) {
      console.error("Failed to sign in:", error);
    }
  };

  return (
    <div className="fixed inset-0 font-grotesk">
      <div className="absolute top-3 left-3 z-20 flex gap-2">
        {!authenticated && ready && (
          <Button
            size="sm"
            onClick={handleSignIn}
            className="bg-[#FFF7AD] hover:bg-[#FF0000]/90 text-[#E04220]"
          >
            Sign in
          </Button>
        )}
      </div>
      <InteractiveMap farcasterUsername={farcasterUsername} />
    </div>
  );
}
