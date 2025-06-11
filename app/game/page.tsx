import Auth from "@/components/auth";
import GameMapbox from "@/components/game-mapbox";
import Header from "@/components/header";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Game",
  description: "Earn points by selecting locations",
};

export default function GamePage() {
  return (
    <div
      style={{
        background:
          "linear-gradient(0deg, #EE91B7 0%, #FFE600 37.5%, #1BA351 66.34%, #61BFD1 100%)",
      }}
    >
      <Auth>
        <GameMapbox />
      </Auth>
    </div>
  );
}
