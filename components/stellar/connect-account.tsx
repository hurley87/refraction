'use client';

import React from 'react';
import { WalletButton } from './wallet-button';
import { UserBalance } from './user-balance';
import { useWallet } from '@/lib/stellar/hooks/use-wallet';

const ConnectAccount: React.FC = () => {
  const { address } = useWallet();

  return (
    <div className="flex flex-row items-center gap-3 w-full">
      {address ? <UserBalance /> : <WalletButton />}
    </div>
  );
};

export default ConnectAccount;
