'use client';

import React from 'react';
import { WalletButton } from './wallet-button';

const ConnectAccount: React.FC = () => {
  return (
    <div className="flex flex-row items-center gap-3 w-full">
      <WalletButton />
    </div>
  );
};

export default ConnectAccount;
