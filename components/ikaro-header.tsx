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
     


      {/* Profile Menu */}
      <ProfileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </div>
  );
}
