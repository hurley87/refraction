import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/spend-treasury-usdc-transfer', () => ({
  submitTreasuryUsdcTransfer: vi.fn(),
  getTreasuryTxReceiptStatus: vi.fn(),
}));

import { createBaseUsdcSpendPaymentRail } from '@/lib/spend/payment-rails/base-usdc-rail';
import { SPEND_RAIL_ANALYTICS_CODES } from '@/lib/spend/payment-rails/errors';
import * as spendRailConfig from '@/lib/spend-rail-config';
import {
  submitTreasuryUsdcTransfer,
  getTreasuryTxReceiptStatus,
} from '@/lib/spend-treasury-usdc-transfer';
import * as paymentVerify from '@/lib/spend-payment-verify';
import * as posterUsdc from '@/lib/walletconnect-poster-direct-usdc';

const EMBEDDED = '0x1111111111111111111111111111111111111111';
const TREASURY = '0x3333333333333333333333333333333333333333';
const RECEIVER = '0x2222222222222222222222222222222222222222';
const VALID_PAYMENT_HASH =
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;

describe('createBaseUsdcSpendPaymentRail', () => {
  const rail = createBaseUsdcSpendPaymentRail();

  beforeEach(() => {
    vi.mocked(submitTreasuryUsdcTransfer).mockReset();
    vi.mocked(getTreasuryTxReceiptStatus).mockReset();
    vi.spyOn(spendRailConfig, 'getSpendTreasuryWalletAddress').mockReturnValue(
      TREASURY
    );
    vi.spyOn(spendRailConfig, 'getSpendRailBaseRpcUrl').mockReturnValue(
      'https://mainnet.base.org'
    );
    vi.spyOn(
      spendRailConfig,
      'getSpendRailBaseUsdcContractAddress'
    ).mockReturnValue('0x833589fcd6edb6e08f4c7c32d4f71b54bda02913');
    vi.spyOn(spendRailConfig, 'getSpendReceivingWalletAddress').mockReturnValue(
      RECEIVER
    );
    vi.spyOn(
      spendRailConfig,
      'getSpendBaseTreasuryPrivyTransferConfig'
    ).mockReturnValue({
      walletId: 'privy-wallet-1',
      address: TREASURY as `0x${string}`,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getTreasurySpendableBalance returns balance when RPC succeeds', async () => {
    vi.spyOn(posterUsdc, 'fetchUsdcBalanceOnBase').mockResolvedValue(12.34);
    const res = await rail.getTreasurySpendableBalance();
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error('unexpected');
    expect(res.value).toBe(12.34);
  });

  it('getTreasurySpendableBalance returns null when treasury address is not EVM', async () => {
    vi.spyOn(spendRailConfig, 'getSpendTreasuryWalletAddress').mockReturnValue(
      'not-an-address'
    );
    const res = await rail.getTreasurySpendableBalance();
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error('unexpected');
    expect(res.value).toBeNull();
  });

  it('runWalletReadinessOrchestration fails without a valid embedded wallet', async () => {
    const res = await rail.runWalletReadinessOrchestration({
      spendSessionId: 's1',
      embeddedEvmWalletAddress: '0xbad',
    });
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('unexpected');
    expect(res.error.category).toBe('wallet_unavailable');
  });

  it('runWalletReadinessOrchestration fails when auth wallet does not match embedded', async () => {
    const res = await rail.runWalletReadinessOrchestration({
      spendSessionId: 's1',
      embeddedEvmWalletAddress: EMBEDDED,
      privyNormalizedWalletAddressLower:
        '0x9999999999999999999999999999999999999999',
    });
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('unexpected');
    expect(res.error.category).toBe('wallet_unavailable');
  });

  it('runWalletReadinessOrchestration completes for a valid embedded EVM wallet', async () => {
    const res = await rail.runWalletReadinessOrchestration({
      spendSessionId: 's1',
      embeddedEvmWalletAddress: EMBEDDED,
      privyNormalizedWalletAddressLower: EMBEDDED.toLowerCase(),
    });
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error('unexpected');
    expect(res.value.status).toBe('completed');
  });

  it('initiateUserFunding returns pending when Privy submission is still resolving', async () => {
    vi.mocked(submitTreasuryUsdcTransfer).mockResolvedValue({
      ok: true,
      submittedPending: true,
      privyTransactionId: 'ptx-1',
    });
    const res = await rail.initiateUserFunding({
      spendSessionId: 's1',
      embeddedEvmWalletAddress: EMBEDDED,
      privyNormalizedWalletAddressLower: EMBEDDED.toLowerCase(),
      usdcAmount: 5,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error('unexpected');
    expect(res.value.status).toBe('pending');
  });

  it('initiateUserFunding returns confirmed when receipt is already successful', async () => {
    vi.mocked(submitTreasuryUsdcTransfer).mockResolvedValue({
      ok: true,
      txHash: VALID_PAYMENT_HASH,
      privyTransactionId: 'ptx-2',
    });
    vi.mocked(getTreasuryTxReceiptStatus).mockResolvedValue('success');
    const res = await rail.initiateUserFunding({
      spendSessionId: 's1',
      embeddedEvmWalletAddress: EMBEDDED,
      privyNormalizedWalletAddressLower: EMBEDDED.toLowerCase(),
      usdcAmount: 5,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error('unexpected');
    expect(res.value.status).toBe('confirmed');
  });

  it('initiateUserFunding maps treasury insufficient errors to the treasury catalog', async () => {
    vi.mocked(submitTreasuryUsdcTransfer).mockResolvedValue({
      ok: false,
      error: 'Insufficient USDC balance in treasury wallet.',
    });
    const res = await rail.initiateUserFunding({
      spendSessionId: 's1',
      embeddedEvmWalletAddress: EMBEDDED,
      privyNormalizedWalletAddressLower: EMBEDDED.toLowerCase(),
      usdcAmount: 5,
    });
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('unexpected');
    expect(res.error.category).toBe('treasury_insufficient_funds');
    expect(res.error.analyticsCode).toBe(
      SPEND_RAIL_ANALYTICS_CODES.treasury_insufficient_funds
    );
  });

  it('preparePayment returns rail_operation_not_supported', async () => {
    const res = await rail.preparePayment({ spendSessionId: 's1' });
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('unexpected');
    expect(res.error.category).toBe('rail_operation_not_supported');
  });

  it('confirmPayment rejects invalid global receiving wallet configuration', async () => {
    vi.spyOn(spendRailConfig, 'getSpendReceivingWalletAddress').mockReturnValue(
      ''
    );
    const res = await rail.confirmPayment({
      spendSessionId: 's1',
      embeddedEvmWalletAddress: EMBEDDED,
      usdcAmount: 5,
      paymentTxHash: VALID_PAYMENT_HASH,
    });
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('unexpected');
    expect(res.error.category).toBe('invalid_receiving_wallet');
  });

  it('confirmPayment returns confirmed when on-chain verification succeeds', async () => {
    vi.spyOn(paymentVerify, 'verifySpendUsdcPaymentTx').mockResolvedValue({
      ok: true,
    });
    const res = await rail.confirmPayment({
      spendSessionId: 's1',
      embeddedEvmWalletAddress: EMBEDDED,
      usdcAmount: 5,
      paymentTxHash: VALID_PAYMENT_HASH,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error('unexpected');
    expect(res.value.status).toBe('confirmed');
    expect(paymentVerify.verifySpendUsdcPaymentTx).toHaveBeenCalledWith(
      expect.objectContaining({
        txHash: VALID_PAYMENT_HASH,
        expectedFrom: EMBEDDED,
        expectedTo: RECEIVER,
        expectedUsdcAmount: 5,
      })
    );
  });

  it('explorerUrlForLedgerTx uses rail explorer template', () => {
    vi.spyOn(
      spendRailConfig,
      'formatExplorerTxUrlForSpendLedger'
    ).mockReturnValue('https://basescan.org/tx/0xabc');
    const url = rail.explorerUrlForLedgerTx('0xabc');
    expect(url).toBe('https://basescan.org/tx/0xabc');
  });
});
