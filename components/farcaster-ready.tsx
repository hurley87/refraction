"use client";

import { useEffect } from "react";
import actions from "@farcaster/miniapp-sdk";

export default function FarcasterReady() {
  useEffect(() => {
    const initializeFarcaster = async () => {
      try {
        const sdk: any = actions as any;
        if (typeof sdk.ready === "function") {
          await sdk.ready();
        } else if (typeof sdk.init === "function") {
          await sdk.init();
        }
      } catch (error) {
        console.error("Failed to initialize Farcaster SDK:", error);
      }
    };

    initializeFarcaster();
  }, []);

  return null;
}
