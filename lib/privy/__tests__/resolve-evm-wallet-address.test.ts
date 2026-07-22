import { describe, expect, it } from 'vitest';
import { resolvePrivyEvmWalletAddress } from '@/lib/privy/resolve-evm-wallet-address';

const EVM = '0x4D418f71c531465337b65127B207aa849Fa5a9e3';
const OTHER_EVM = '0x1234567890AbcdEF1234567890aBcdef12345678';
const STELLAR = 'GMATCHBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';

describe('resolvePrivyEvmWalletAddress', () => {
  it('prefers ethereum linked account over user.wallet stellar address', () => {
    const address = resolvePrivyEvmWalletAddress({
      linkedAccounts: [
        {
          type: 'wallet',
          chainType: 'ethereum',
          address: EVM,
        },
        {
          type: 'wallet',
          chainType: 'stellar',
          address: STELLAR,
        },
      ],
      wallet: { address: STELLAR },
    } as never);

    expect(address).toBe('0x4D418f71c531465337b65127B207aa849Fa5a9e3');
  });

  it('returns undefined when only non-EVM wallets are linked', () => {
    const address = resolvePrivyEvmWalletAddress({
      linkedAccounts: [
        {
          type: 'wallet',
          chainType: 'stellar',
          address: STELLAR,
        },
      ],
      wallet: { address: STELLAR },
    } as never);

    expect(address).toBeUndefined();
  });

  it('preserves an active EVM wallet when multiple EVM wallets are linked', () => {
    const address = resolvePrivyEvmWalletAddress({
      linkedAccounts: [
        {
          type: 'wallet',
          chainType: 'ethereum',
          address: OTHER_EVM,
        },
        {
          type: 'wallet',
          chainType: 'ethereum',
          address: EVM,
        },
      ],
      wallet: { address: EVM },
    } as never);

    expect(address).toBe(EVM);
  });

  it('uses connected wallets as fallback', () => {
    const address = resolvePrivyEvmWalletAddress(
      { linkedAccounts: [], wallet: { address: STELLAR } } as never,
      [{ address: EVM } as never]
    );

    expect(address).toBe('0x4D418f71c531465337b65127B207aa849Fa5a9e3');
  });
});
