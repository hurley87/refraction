import { describe, expect, it } from 'vitest';
import { findConnectedEvmWallet } from '@/lib/privy/find-connected-evm-wallet';

const EVM = '0x4D418f71c531465337b65127B207aa849Fa5a9e3';
const OTHER_EVM = '0x1234567890AbcdEF1234567890aBcdef12345678';

describe('findConnectedEvmWallet', () => {
  const wallets = [
    { address: OTHER_EVM, walletClientType: 'metamask' },
    { address: EVM, walletClientType: 'privy' },
  ];

  it('returns the connected wallet that matches the resolved address', () => {
    expect(findConnectedEvmWallet(wallets, EVM)).toEqual(wallets[1]);
  });

  it('prefers the embedded Privy wallet when requested', () => {
    const mixedWallets = [
      { address: EVM, walletClientType: 'metamask' },
      { address: EVM, walletClientType: 'privy' },
    ];

    expect(
      findConnectedEvmWallet(mixedWallets, EVM, { preferEmbeddedPrivy: true })
    ).toEqual(mixedWallets[1]);
  });

  it('returns null when no wallet matches', () => {
    expect(findConnectedEvmWallet(wallets, undefined)).toBeNull();
    expect(
      findConnectedEvmWallet(
        wallets,
        '0x0000000000000000000000000000000000000001'
      )
    ).toBeNull();
  });
});
