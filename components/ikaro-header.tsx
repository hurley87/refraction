"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import ProfileMenu from "./profile-menu";


export default function Header() {
  const { user, login } = usePrivy();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // If user is not defined, return login button
  if (!user) {
    return (
      <div className="flex justify-between items-center">
        

        {/* Profile Menu */}
        <Button
          className="bg-white text-black px-4 py-2 text-lg hover:bg-white/80 justify-center font-grotesk rounded-full items-center"
          size="sm"
          onClick={login}
        >
          Connect Wallet
        </Button>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center">
     
      <div className="flex items-center justify-end bg-white rounded-full px-2 py-2">
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
