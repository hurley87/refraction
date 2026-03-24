'use client';

import React from 'react';
import { WalletButton } from './wallet-button';
import { useWallet } from '@/lib/stellar/hooks/use-wallet';
import { useStellarWallet } from '@/hooks/useStellarWallet';

const ConnectAccount: React.FC = () => {
  const { address } = useWallet();
  const { address: privyStellarAddress } = useStellarWallet();

  if (address) {
    return (
      <p className="body-medium text-[#B5B5B5] font-grotesk">
        Freighter is connected.
        {privyStellarAddress
          ? ' Your IRL profile uses the embedded Stellar address shown in Wallet Balance above.'
          : ' Balance and wallet settings are in the section above.'}
      </p>
    );
  }

  return (
    <div className="w-full">
      <WalletButton />
    </div>
  );
};

export default ConnectAccount;
