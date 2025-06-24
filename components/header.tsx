"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import ProfileMenu from "./profile-menu";
import Link from "next/link";

export default function Header() {
  const { user, login } = usePrivy();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // If user is not defined, return login button
  if (!user) {
    return (
      <Button
        className="bg-white text-black rounded-lg hover:bg-white/80 justify-center font-inktrap uppercase"
        size="sm"
        onClick={login}
      >
        CHECK IN
      </Button>
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
            style={{ width: "35px", height: "auto" }}
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
