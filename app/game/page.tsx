import Auth from "@/components/auth";
import GameMapbox from "@/components/game-mapbox";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Game",
  description: "Earn points by selecting locations",
};

export default function GamePage() {
  return (
    <Auth>
      <GameMapbox />
    </Auth>
  );
}
