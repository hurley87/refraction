"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useLoginToMiniApp } from "@privy-io/react-auth/farcaster";
import miniappSdk from "@farcaster/miniapp-sdk";
import { Button } from "@/components/ui/button";
import ProfileMenu from "./profile-menu";
import Link from "next/link";

export default function Header() {
  const { user, login } = usePrivy();
  const { initLoginToMiniApp, loginToMiniApp } = useLoginToMiniApp();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [isMiniApp, setIsMiniApp] = useState(false);

  // Initialize miniapp SDK and detect context
  useEffect(() => {
    const initializeSDK = async () => {
      if (miniappSdk && !isSDKLoaded) {
        setIsSDKLoaded(true);
        const isMiniAppContext = await miniappSdk.isInMiniApp();
        setIsMiniApp(isMiniAppContext);
        if (isMiniAppContext) {
          miniappSdk.actions.ready();
        }
      }
    };
    initializeSDK();
  }, [isSDKLoaded]);

  const handleLogin = async () => {
    try {
      if (isMiniApp) {
        const { nonce } = await initLoginToMiniApp();
        const result = await miniappSdk.actions.signIn({ nonce });
        await loginToMiniApp({
          message: result.message,
          signature: result.signature,
        });
      } else {
        login();
      }
    } catch (error) {
      console.error("Header login failed:", error);
    }
  };

  // If user is not defined, return login button
  if (!user) {
    return (
      <div className="flex justify-between items-center">
        <div className="bg-white rounded-full px-4 py-2">
          <Link href="/">
            <img
              src="/logo2.svg"
              alt="IRL"
              className="w-full h-auto"
              style={{ width: "40", height: "auto" }}
            />
          </Link>
        </div>

        {/* Profile Menu */}
        <Button
          className="bg-white text-black px-4 py-2 text-lg hover:bg-white/80 justify-center font-inktrap uppercase rounded-full items-center"
          size="sm"
          onClick={handleLogin}
        >
          CHECK IN
        </Button>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center">
      <div className="bg-white rounded-full px-4 py-2">
        <Link href="/">
          <img
            src="/logo2.svg"
            alt="IRL"
            className="w-full h-auto"
            style={{ width: "40", height: "auto" }}
          />
        </Link>
      </div>
      <div className="flex items-center justify-end bg-white rounded-full px-4 py-2">
        <button
          style={{
            background:
              "linear-gradient(90deg, #2400FF 14.58%, #FA00FF 52.6%, #FF0000 86.46%)",
          }}
          onClick={() => setIsMenuOpen(true)}
          className="flex items-center justify-center rounded-full w-6 h-6 transition-colors"
          aria-label="Open user menu"
        >
          {/* Gradient circle indicating logged in status */}
        </button>
      </div>

      {/* Profile Menu */}
      <ProfileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </div>
  );
}
