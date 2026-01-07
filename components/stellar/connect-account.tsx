"use client";

import React from "react";
import { stellarNetwork } from "@/lib/stellar/utils/network";
import FundAccountButton from "./fund-account-button";
import { WalletButton } from "./wallet-button";
import NetworkPill from "./network-pill";

const ConnectAccount: React.FC = () => {
  return (
    <div className="flex flex-row items-center gap-3">
      <WalletButton />
      {stellarNetwork !== "PUBLIC" && <FundAccountButton />}
      <NetworkPill />
    </div>
  );
};

export default ConnectAccount;
