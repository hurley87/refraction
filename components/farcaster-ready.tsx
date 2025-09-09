"use client";

import { useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

export default function FarcasterReady() {
  useEffect(() => {
    const initializeFarcaster = async () => {
      try {
        const maybeReady = (sdk as any)?.actions?.ready;
        if (typeof maybeReady === "function") {
          await maybeReady();
        }
      } catch (error) {
        console.error("Failed to initialize Farcaster SDK:", error);
      }
    };

    initializeFarcaster();
  }, []);

  return null;
}
