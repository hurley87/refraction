"use client";

import React from "react";
import { useWallet } from "@/lib/stellar/hooks/use-wallet";
import { stellarNetwork } from "@/lib/stellar/utils/network";

// Format network name with first letter capitalized
const formatNetworkName = (name: string) => {
  if (!name) return "";
  // TODO: This is a workaround until @creit-tech/stellar-wallets-kit uses the new name for a local network.
  if (name === "STANDALONE") return "Local";
  // Handle "PUBLIC" -> "Mainnet" for better UX
  if (name.toUpperCase() === "PUBLIC" || name.toUpperCase() === "MAINNET") return "Mainnet";
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
};

const NetworkPill: React.FC = () => {
  const { network, address } = useWallet();

  // Debug: Log network value to see what we're getting
  if (address && network) {
    console.log("[NetworkPill] Wallet network:", network);
  }

  // Show the wallet's network if connected, otherwise show app's default network
  const displayNetwork = address && network 
    ? formatNetworkName(network) 
    : formatNetworkName(stellarNetwork);

  let title = "";
  let color = "#2ED06E";
  
  if (!address) {
    title = `App is configured for ${formatNetworkName(stellarNetwork)}. Connect your wallet.`;
    color = "#C1C7D0";
  } else if (network) {
    // Show green when connected, regardless of network
    title = `Connected to ${displayNetwork}`;
    color = "#2ED06E";
  } else {
    title = "Network information unavailable";
    color = "#C1C7D0";
  }

  return (
    <div
      className="bg-[#F0F2F5] text-[#4A5362] px-3 py-1 rounded-2xl text-xs font-bold flex items-center gap-1"
      style={{
        cursor: "default",
      }}
      title={title}
    >
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {displayNetwork}
    </div>
  );
};

export default NetworkPill;
