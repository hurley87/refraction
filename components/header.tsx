"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { X, LogOut } from "lucide-react";

export default function Header() {
  const { user, logout } = usePrivy();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMenuMounted, setIsMenuMounted] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  // Handle menu open/close with transitions
  useEffect(() => {
    if (isMenuOpen) {
      // Prevent scrolling when menu is open
      document.body.style.overflow = "hidden";
      setIsMenuMounted(true);
      // Small delay to ensure the DOM is updated before adding the visible class
      setTimeout(() => setIsMenuVisible(true), 10);
    } else {
      // Re-enable scrolling when menu is closed
      document.body.style.overflow = "";
      setIsMenuVisible(false);
      // Wait for the transition to complete before unmounting
      const timer = setTimeout(() => setIsMenuMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isMenuOpen]);

  // If user is not defined, return null
  if (!user) {
    return null;
  }

  return (
    <>
      <header className="w-full flex items-center justify-end">
        <button
          onClick={() => setIsMenuOpen(true)}
          className="flex items-center justify-center rounded-full w-6 h-6 bg-green-500 border transition-colors"
          aria-label="Open user menu"
        >
          {/* Green circle indicating logged in status */}
        </button>
      </header>

      {/* Full screen menu with transitions */}
      {isMenuMounted && (
        <div
          className={`fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex flex-col transition-all duration-300 ease-in-out ${
            isMenuVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="flex justify-end p-4">
            <button
              onClick={() => setIsMenuOpen(false)}
              className="text-white p-2 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Close menu"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center gap-8">
            <div className="flex flex-col items-center">
              <div className="text-white text-center">
                <p className="text-xl font-medium font-inktrap">
                  {user.email?.address}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                onClick={() => {
                  logout();
                  setIsMenuOpen(false);
                }}
                className="px-6 py-3 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 font-inktrap"
              >
                <LogOut size={18} />
                <span>Disconnect</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
