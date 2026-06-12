import {
  parseStellarSettlementAssetConfig,
  submitStellarCampaignUsdcPayment,
} from '@/lib/activation/stellar-settlement-submit';
import { loadActivationReservedUsdc } from '@/lib/db/sponsored-activation-admin';
import type { SponsoredActivationRow } from '@/lib/db/sponsored-activations';
import { stellarWalletAddressSchema } from '@/lib/schemas/player';
import { baseUsdcAssetConfigSchema } from '@/lib/schemas/sponsored-activation';
import { parseUsdcBalanceLine } from '@/lib/spend/stellar-treasury-funding';
import { createStellarSpendHorizonServer } from '@/lib/spend/stellar-wallet-readiness-config';
import { getSpendRailBaseRpcUrl } from '@/lib/spend-rail-config';
import {
  submitTreasuryUsdcTransfer,
  waitForTreasuryTxReceipt,
} from '@/lib/spend-treasury-usdc-transfer';
import { sameWalletAddress, tryNormalizeEvmAddress } from '@/lib/utils/wallets';
import {
  fetchUsdcBalanceOnBase,
  isEvmAddress,
} from '@/lib/walletconnect-poster-direct-usdc';

export type SponsoredActivationCampaignWalletBalancePack = {
  campaign_wallet_usdc_balance: number | null;
  campaign_wallet_withdrawable_usdc: number | null;
  campaign_wallet_reserved_usdc: number;
};

export type SponsoredActivationCampaignWithdrawResult =
  | {
      ok: true;
      status: 'confirmed';
      txHash: string;
      amountUsdc: number;
      destinationAddress: string;
      privyTransactionId?: string;
      userOperationHash?: string | null;
      referenceId?: string;
    }
  | {
      ok: true;
      status: 'submitted';
      amountUsdc: number;
      destinationAddress: string;
      txHash?: string;
      privyTransactionId?: string;
      userOperationHash?: string | null;
      referenceId?: string;
      message: string;
    }
  | { ok: false; error: string; statusCode?: 400 | 500 };

const DESTINATION_WALLET_CONFLICT_ERROR =
  'Destination must differ from the campaign and venue settlement wallets.';

function computeWithdrawableMicro(
  balanceUsdc: number,
  reservedUsdc: number
): number {
  const balanceMicro = Math.floor(balanceUsdc * 1e6);
  const reservedMicro = Math.ceil(Math.max(0, reservedUsdc) * 1e6);
  return Math.max(0, balanceMicro - reservedMicro);
}

export function computeWithdrawableUsdc(
  balanceUsdc: number,
  reservedUsdc: number
): number {
  return computeWithdrawableMicro(balanceUsdc, reservedUsdc) / 1e6;
}

async function readBaseCampaignWalletBalance(
  activation: SponsoredActivationRow
): Promise<number | null> {
  const cfg = baseUsdcAssetConfigSchema.safeParse(activation.usdc_asset_config);
  if (!cfg.success) return null;
  const normalized = tryNormalizeEvmAddress(activation.campaign_wallet_address);
  if (!normalized || !isEvmAddress(normalized)) return null;
  try {
    return await fetchUsdcBalanceOnBase(normalized as `0x${string}`, {
      rpcUrl: getSpendRailBaseRpcUrl() || undefined,
      usdcContract: cfg.data.contract_address as `0x${string}`,
    });
  } catch (e) {
    console.error('readBaseCampaignWalletBalance:', e);
    return null;
  }
}

async function readStellarCampaignWalletBalance(
  activation: SponsoredActivationRow
): Promise<number | null> {
  const assetParsed = parseStellarSettlementAssetConfig(
    activation.usdc_asset_config
  );
  if (!assetParsed.ok) return null;

  const campaignParse = stellarWalletAddressSchema.safeParse(
    activation.campaign_wallet_address.trim().toUpperCase()
  );
  if (!campaignParse.success) return null;

  const server = createStellarSpendHorizonServer();
  try {
    const account = await server.loadAccount(campaignParse.data);
    return (
      parseUsdcBalanceLine(
        account,
        assetParsed.config.asset_code,
        assetParsed.config.issuer
      ) ?? 0
    );
  } catch (e) {
    console.error('readStellarCampaignWalletBalance:', e);
    return null;
  }
}

export async function loadSponsoredActivationCampaignWalletBalancePack(
  activation: SponsoredActivationRow
): Promise<SponsoredActivationCampaignWalletBalancePack> {
  const [reservedUsdc, balance] = await Promise.all([
    loadActivationReservedUsdc(activation.id),
    activation.settlement_rail === 'base'
      ? readBaseCampaignWalletBalance(activation)
      : readStellarCampaignWalletBalance(activation),
  ]);

  return {
    campaign_wallet_usdc_balance: balance,
    campaign_wallet_withdrawable_usdc:
      balance == null ? null : computeWithdrawableUsdc(balance, reservedUsdc),
    campaign_wallet_reserved_usdc: reservedUsdc,
  };
}

function assertDestinationNotCampaignOrVenue(
  normalized: string,
  activation: SponsoredActivationRow
): { ok: true } | { ok: false; error: string } {
  if (
    sameWalletAddress(normalized, activation.campaign_wallet_address) ||
    sameWalletAddress(normalized, activation.venue_settlement_wallet_address)
  ) {
    return { ok: false, error: DESTINATION_WALLET_CONFLICT_ERROR };
  }
  return { ok: true };
}

function validateDestinationForRail(
  activation: SponsoredActivationRow,
  destinationAddress: string
): { ok: true; normalized: string } | { ok: false; error: string } {
  if (activation.settlement_rail === 'base') {
    const normalized = tryNormalizeEvmAddress(destinationAddress);
    if (!normalized || !isEvmAddress(normalized)) {
      return { ok: false, error: 'Invalid Ethereum address' };
    }
    const walletCheck = assertDestinationNotCampaignOrVenue(
      normalized,
      activation
    );
    if (!walletCheck.ok) return walletCheck;
    return { ok: true, normalized };
  }

  const parsed = stellarWalletAddressSchema.safeParse(
    destinationAddress.trim().toUpperCase()
  );
  if (!parsed.success) {
    return { ok: false, error: 'Invalid Stellar address' };
  }
  const walletCheck = assertDestinationNotCampaignOrVenue(
    parsed.data,
    activation
  );
  if (!walletCheck.ok) return walletCheck;
  return { ok: true, normalized: parsed.data };
}

const STELLAR_WITHDRAW_REASON_MESSAGES: Record<string, string> = {
  stellar_usdc_asset_misconfigured: 'Stellar USDC asset is misconfigured.',
  stellar_campaign_wallet_not_configured:
    'Stellar campaign wallet is not configured on the server.',
  stellar_campaign_wallet_mismatch:
    'Stellar campaign wallet key does not match this activation.',
};

async function submitStellarCampaignWalletWithdraw(input: {
  activation: SponsoredActivationRow;
  destinationAddress: string;
  usdcAmount: number;
}): Promise<
  | { ok: true; txHash: string }
  | { ok: false; error: string; statusCode?: 400 | 500 }
> {
  const submitted = await submitStellarCampaignUsdcPayment({
    campaignPublicKey: input.activation.campaign_wallet_address,
    destinationPublicKey: input.destinationAddress,
    usdcAmount: input.usdcAmount,
    usdcAssetConfig: input.activation.usdc_asset_config,
  });

  if (!submitted.ok) {
    return {
      ok: false,
      error:
        STELLAR_WITHDRAW_REASON_MESSAGES[submitted.reason] ?? submitted.reason,
      statusCode: 500,
    };
  }

  return { ok: true, txHash: submitted.txHash };
}

export async function withdrawSponsoredActivationCampaignWallet(input: {
  activation: SponsoredActivationRow;
  destinationAddress: string;
  amountUsdc?: number | null;
}): Promise<SponsoredActivationCampaignWithdrawResult> {
  const destCheck = validateDestinationForRail(
    input.activation,
    input.destinationAddress
  );
  if (!destCheck.ok) {
    return { ok: false, error: destCheck.error, statusCode: 400 };
  }

  const balancePack = await loadSponsoredActivationCampaignWalletBalancePack(
    input.activation
  );
  if (balancePack.campaign_wallet_usdc_balance == null) {
    return {
      ok: false,
      error: 'Could not read campaign wallet USDC balance.',
      statusCode: 500,
    };
  }

  const maxWithdrawableMicro = computeWithdrawableMicro(
    balancePack.campaign_wallet_usdc_balance,
    balancePack.campaign_wallet_reserved_usdc
  );
  if (maxWithdrawableMicro <= 0) {
    return {
      ok: false,
      error:
        balancePack.campaign_wallet_reserved_usdc > 0
          ? 'No withdrawable USDC while funds are reserved for pending redemptions or settlements.'
          : 'No USDC available to withdraw.',
      statusCode: 400,
    };
  }

  let withdrawMicro: number;
  if (input.amountUsdc != null && input.amountUsdc > 0) {
    withdrawMicro = Math.floor(input.amountUsdc * 1e6);
    if (withdrawMicro <= 0) {
      return {
        ok: false,
        error: 'Withdraw amount must be positive.',
        statusCode: 400,
      };
    }
    if (withdrawMicro > maxWithdrawableMicro) {
      return {
        ok: false,
        error: `Amount exceeds withdrawable balance (${(maxWithdrawableMicro / 1e6).toFixed(6)} USDC).`,
        statusCode: 400,
      };
    }
  } else {
    withdrawMicro = maxWithdrawableMicro;
  }

  const withdrawAmount = withdrawMicro / 1e6;
  const destinationAddress = destCheck.normalized;

  if (input.activation.settlement_rail === 'stellar') {
    const submitted = await submitStellarCampaignWalletWithdraw({
      activation: input.activation,
      destinationAddress,
      usdcAmount: withdrawAmount,
    });
    if (!submitted.ok) {
      return {
        ok: false,
        error: submitted.error,
        statusCode: submitted.statusCode ?? 500,
      };
    }
    return {
      ok: true,
      status: 'confirmed',
      txHash: submitted.txHash,
      amountUsdc: withdrawAmount,
      destinationAddress,
    };
  }

  const privyWalletId = input.activation.privy_campaign_wallet_id?.trim();
  if (!privyWalletId) {
    return {
      ok: false,
      error: 'Campaign wallet is not configured for this activation.',
      statusCode: 400,
    };
  }

  const campaignAddress = tryNormalizeEvmAddress(
    input.activation.campaign_wallet_address
  );
  if (!campaignAddress || !isEvmAddress(campaignAddress)) {
    return {
      ok: false,
      error: 'Campaign wallet address is invalid.',
      statusCode: 500,
    };
  }

  const cfg = baseUsdcAssetConfigSchema.safeParse(
    input.activation.usdc_asset_config
  );
  if (!cfg.success) {
    return {
      ok: false,
      error: 'USDC contract is misconfigured.',
      statusCode: 500,
    };
  }

  const submit = await submitTreasuryUsdcTransfer({
    serverWalletId: privyWalletId,
    serverWalletAddress: campaignAddress as `0x${string}`,
    recipientAddress: destinationAddress as `0x${string}`,
    usdcAmount: withdrawAmount,
    usdcContractAddress: cfg.data.contract_address,
    referenceId: `sponsored-activation-withdraw:${input.activation.id}:${Date.now()}`,
    withdrawTelemetry: true,
  });

  if (!submit.ok) {
    return {
      ok: false,
      error: submit.error || 'USDC transfer failed',
      statusCode: 500,
    };
  }

  if ('submittedPending' in submit && submit.submittedPending) {
    return {
      ok: true,
      status: 'submitted',
      amountUsdc: withdrawAmount,
      destinationAddress,
      privyTransactionId: submit.privyTransactionId,
      userOperationHash: submit.userOperationHash,
      referenceId: submit.referenceId,
      message:
        'Withdrawal was accepted by Privy; on-chain hash is not available yet. Re-check shortly or use the block explorer with this transaction id.',
    };
  }

  if (!('txHash' in submit)) {
    return {
      ok: false,
      error: 'Unexpected treasury submit response.',
      statusCode: 500,
    };
  }

  try {
    await waitForTreasuryTxReceipt(submit.txHash);
  } catch (waitErr) {
    const msg =
      waitErr instanceof Error ? waitErr.message : 'Confirmation failed';
    console.warn(
      'sponsored activation withdraw receipt_wait_timeout_or_error',
      {
        txHash: submit.txHash,
        error: msg,
      }
    );
    return {
      ok: true,
      status: 'submitted',
      txHash: submit.txHash,
      amountUsdc: withdrawAmount,
      destinationAddress,
      privyTransactionId: submit.privyTransactionId,
      userOperationHash: submit.userOperationHash,
      referenceId: submit.referenceId,
      message:
        'Withdrawal was included on-chain; full receipt confirmation is still pending or timed out. Check the block explorer for this transaction hash.',
    };
  }

  return {
    ok: true,
    status: 'confirmed',
    txHash: submit.txHash,
    amountUsdc: withdrawAmount,
    destinationAddress,
    privyTransactionId: submit.privyTransactionId,
    userOperationHash: submit.userOperationHash,
    referenceId: submit.referenceId,
  };
}
