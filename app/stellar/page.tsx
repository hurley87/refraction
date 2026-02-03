import { StellarWalletPage } from '@/components/stellar/stellar-wallet-page';

// Avoid prerender: stellar-wallets-kit registers a custom element that cannot be registered twice
export const dynamic = 'force-dynamic';

export default function StellarPage() {
  return <StellarWalletPage />;
}
