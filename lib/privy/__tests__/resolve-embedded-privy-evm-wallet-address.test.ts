import { describe, expect, it } from 'vitest';
import { resolveEmbeddedPrivyEvmWalletAddress } from '@/lib/privy/resolve-embedded-privy-evm-wallet-address';

const EVM = '0x4D418f71c531465337b65127B207aa849Fa5a9e3';
const EXTERNAL_EVM = '0x1234567890AbcdEF1234567890aBcdef12345678';

describe('resolveEmbeddedPrivyEvmWalletAddress', () => {
  it('returns the embedded Privy EVM wallet address', () => {
    const address = resolveEmbeddedPrivyEvmWalletAddress({
      linkedAccounts: [
        {
          type: 'wallet',
          walletClientType: 'metamask',
          chainType: 'ethereum',
          address: EXTERNAL_EVM,
        },
        {
          type: 'wallet',
          walletClientType: 'privy',
          chainType: 'ethereum',
          address: EVM,
        },
      ],
    } as never);

    expect(address).toBe('0x4D418f71c531465337b65127B207aa849Fa5a9e3');
  });

  it('returns undefined when no embedded Privy EVM wallet exists', () => {
    const address = resolveEmbeddedPrivyEvmWalletAddress({
      linkedAccounts: [
        {
          type: 'wallet',
          walletClientType: 'metamask',
          chainType: 'ethereum',
          address: EXTERNAL_EVM,
        },
      ],
    } as never);

    expect(address).toBeUndefined();
  });
});
