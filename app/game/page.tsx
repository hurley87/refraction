import Game from "@/components/game";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Game",
  description: "Earn points by selecting locations",
};

export default function GamePage() {
  return <Game />;
}
