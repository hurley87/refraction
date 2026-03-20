'use client';

import { useWallet } from '@/lib/stellar/hooks/use-wallet';
import { connectWallet } from '@/lib/stellar/utils/wallet';

export const WalletButton = () => {
  const { address, isPending } = useWallet();
  const buttonLabel = isPending ? 'Loading...' : 'Connect';

  if (address) return null;

  return (
    <button
      className="w-full h-12 bg-white hover:bg-gray-100 text-[#313131] px-6 rounded-full title3 font-grotesk transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      onClick={() => void connectWallet()}
      disabled={isPending}
    >
      {buttonLabel}
    </button>
  );
};
