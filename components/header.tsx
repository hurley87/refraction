"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import ProfileMenu from "./profile-menu";
import Link from "next/link";

export default function Header() {
  const { user, login } = usePrivy();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogin = async () => {
    try {
      login();
    } catch (error) {
      console.error("Header login failed:", error);
    }
  };

  // If user is not defined, return login button
  if (!user) {
    return (
      <div className="flex justify-between items-center w-full">
        <div className="w-[40px] h-[40px] sm:w-[40px] sm:h-[40px] md:w-[40px] md:h-[40px] bg-[#313131] rounded-full px-2 flex items-center justify-center">
          <Link href="/">
            <img
              src="/home/IRL.png"
              alt="IRL"
              className="w-full h-auto"
              style={{ width: "40", height: "40" }}
            />
          </Link>
        </div>

        {/* Profile Menu */}
        <Button
          className="bg-white text-black text-lg hover:bg-white/80 justify-center font-inktrap rounded-full items-center"
          size="sm"
          onClick={handleLogin}
          style={{ width: "123px", height: "40px" }}
        >
          Check In 
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
