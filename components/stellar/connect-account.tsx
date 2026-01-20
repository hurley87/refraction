"use client";

import React from "react";
import { useWallet } from "@/lib/stellar/hooks/use-wallet";
import { stellarNetwork } from "@/lib/stellar/utils/network";
import FundAccountButton from "./fund-account-button";
import { WalletButton } from "./wallet-button";

const ConnectAccount: React.FC = () => {
  const { network } = useWallet();
  const currentNetwork = network?.toUpperCase() || stellarNetwork;

  return (
    <div className="flex flex-row items-center gap-3">
      <WalletButton />
      {currentNetwork !== "PUBLIC" && <FundAccountButton />}
    </div>
  );
};

export default ConnectAccount;
