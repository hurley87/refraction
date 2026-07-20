'use client';

import React from 'react';
import Image from 'next/image';
import { usePrivy } from '@privy-io/react-auth';
import { useStellarWallet } from '@/hooks/useStellarWallet';

const primaryCtaClass =
  'label-large uppercase flex h-[44px] w-full cursor-pointer items-center justify-between bg-black py-2 pr-2 pl-4 text-white transition-colors hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-50';

function CtaArrow() {
  return (
    <Image
      src="/guidance_up-right-2-short-arrow.svg"
      alt=""
      width={24}
      height={24}
      className="h-6 w-6 shrink-0"
      aria-hidden
    />
  );
}

const ConnectAccount: React.FC = () => {
  const { ready, authenticated, login } = usePrivy();
  const {
    address: privyStellarAddress,
    connect: connectPrivyStellarWallet,
    isLoading,
    isConnecting,
  } = useStellarWallet();

  if (privyStellarAddress) {
    return (
      <p className="body-small text-[#757575]">
        Signed in with IRL · embedded Stellar wallet ready
      </p>
    );
  }

  if (!ready) {
    return (
      <button type="button" disabled className={primaryCtaClass}>
        <span>Loading...</span>
        <CtaArrow />
      </button>
    );
  }

  if (!authenticated) {
    return (
      <button type="button" className={primaryCtaClass} onClick={() => login()}>
        <span>Sign in with IRL</span>
        <CtaArrow />
      </button>
    );
  }

  return (
    <button
      type="button"
      className={primaryCtaClass}
      onClick={() => void connectPrivyStellarWallet()}
      disabled={isLoading || isConnecting}
    >
      <span>
        {isLoading || isConnecting ? 'Loading...' : 'Set up Stellar wallet'}
      </span>
      <CtaArrow />
    </button>
  );
};

export default ConnectAccount;
