"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Star, List } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";

type MobileFooterNavProps = {
  showOnDesktop?: boolean;
};

export default function MobileFooterNav({
  showOnDesktop = false,
}: MobileFooterNavProps) {
  const pathname = usePathname();
  const { user } = usePrivy();

  const linkClasses = (active: boolean) =>
    `p-2 rounded-full ${active ? "bg-gray-100 text-black" : "text-gray-700"}`;

  if (!user) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-4 left-0 right-0 z-40 ${showOnDesktop ? "" : "md:hidden"} flex justify-center`}
    >
      <nav className="bg-white/90 backdrop-blur rounded-full shadow px-4 py-2 flex items-center gap-6">
        <Link
          href="/"
          className={linkClasses(pathname === "/")}
          aria-label="Home"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path d="M12 3.172 2.293 12.88a1 1 0 1 0 1.414 1.414L5 13.001V20a2 2 0 0 0 2 2h3v-5h4v5h3a2 2 0 0 0 2-2v-6.999l1.293 1.293a1 1 0 1 0 1.414-1.414L12 3.172z" />
          </svg>
        </Link>
        <Link
          href="/interactive-map"
          className={linkClasses(pathname === "/interactive-map")}
          aria-label="Map"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path d="M15.5 4.5 9 2 3.5 4.5v17L9 19l6.5 2.5L21 19v-17l-5.5 2.5zm-6.5.882 5 1.923v11.313l-5-1.923V5.382z" />
          </svg>
        </Link>
        <Link
          href="/coins"
          className={linkClasses(pathname === "/coins")}
          aria-label="Coins"
        >
          <List className="w-5 h-5" />
        </Link>
        <Link
          href="/leaderboard"
          className={linkClasses(pathname === "/leaderboard")}
          aria-label="Leaderboard"
        >
          <Star className="w-5 h-5" />
        </Link>
      </nav>
    </div>
  );
}
