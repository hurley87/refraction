import NextDynamic from 'next/dynamic';

// stellar-wallets-kit accesses `window` at module init time and registers custom
// elements — both are browser-only. Disable SSR entirely so the module is never
// evaluated on the server.
export const dynamic = 'force-dynamic';

const StellarWalletPage = NextDynamic(
  () =>
    import('@/components/stellar/stellar-wallet-page').then(
      (m) => m.StellarWalletPage
    ),
  { ssr: false }
);

export default function StellarPage() {
  return <StellarWalletPage />;
}
