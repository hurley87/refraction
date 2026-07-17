import {
  parseStellarSettlementAssetConfig,
  submitStellarCampaignUsdcPayment,
} from '@/lib/activation/stellar-settlement-submit';
import {
  balanceToTokenMicro,
  balanceUsdcToMicro,
  tokenMicroToAmount,
} from '@/lib/activation/usdc-micro';
import { loadActivationReservedUsdc } from '@/lib/db/sponsored-activation-admin';
import { supabase } from '@/lib/db/client';
import type { SponsoredActivationRow } from '@/lib/db/sponsored-activations';
import { stellarWalletAddressSchema } from '@/lib/schemas/player';
import {
  baseUsdcAssetConfigSchema,
  tempoCaddAssetConfigSchema,
} from '@/lib/schemas/sponsored-activation';
import {
  describeSponsoredActivationPaymentTokenSymbol,
  resolveBaseTokenDecimals,
} from '@/lib/schemas/sponsored-activation-tokens';
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
import {
  getTempoRpcUrl,
  TEMPO_CADD_DECIMALS,
} from '@/lib/activation/tempo-config';
import {
  getTempoCaddTransferStatus,
  submitTempoCaddTransfer,
} from '@/lib/activation/tempo-cadd-transfer';

export type SponsoredActivationCampaignWalletBalancePack = {
  campaign_wallet_usdc_balance: number | null;
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

const STELLAR_WITHDRAW_REASON_MESSAGES: Record<string, string> = {
  stellar_usdc_asset_misconfigured: 'Stellar USDC asset is misconfigured.',
  stellar_campaign_wallet_not_configured:
    'Stellar campaign wallet is not configured on the server.',
  stellar_campaign_wallet_mismatch:
    'Stellar campaign wallet key does not match this activation.',
};

function computeActivationUnallocatedBudgetUsdc(
  activation: Pick<
    SponsoredActivationRow,
    'max_usdc_budget' | 'usdc_settled_total'
  >
): number | null {
  if (activation.max_usdc_budget == null) return null;
  return Math.max(
    0,
    activation.max_usdc_budget - activation.usdc_settled_total
  );
}

async function sumOtherStellarSharedWalletClaimsUsdc(
  activation: SponsoredActivationRow
): Promise<number> {
  const campaignWallet = activation.campaign_wallet_address
    .trim()
    .toUpperCase();
  const { data, error } = await supabase
    .from('sponsored_activation')
    .select('id, max_usdc_budget, usdc_settled_total')
    .eq('settlement_rail', 'stellar')
    .eq('campaign_wallet_address', campaignWallet)
    .neq('id', activation.id);
  if (error) {
    console.error('sumOtherStellarSharedWalletClaimsUsdc:', error);
    throw new Error(error.message || 'Failed to load peer activations');
  }

  const claims = await Promise.all(
    (data ?? []).map(async (row) => {
      const maxBudget =
        row.max_usdc_budget === null || row.max_usdc_budget === undefined
          ? null
          : Number(row.max_usdc_budget);
      const settled = Number(row.usdc_settled_total);
      if (maxBudget != null && Number.isFinite(maxBudget)) {
        return Math.max(
          0,
          maxBudget - (Number.isFinite(settled) ? settled : 0)
        );
      }
      return loadActivationReservedUsdc(String(row.id));
    })
  );
  return claims.reduce((sum, claimUsdc) => sum + claimUsdc, 0);
}

/** Caps Stellar shared-wallet refunds to this activation's unspent budget and peer claims. */
async function computeStellarSharedWalletMaxWithdrawMicro(
  activation: SponsoredActivationRow,
  balanceMicro: number
): Promise<number> {
  const otherClaimsUsdc =
    await sumOtherStellarSharedWalletClaimsUsdc(activation);
  let maxMicro = Math.max(
    0,
    balanceMicro - balanceUsdcToMicro(otherClaimsUsdc)
  );

  const thisClaimUsdc = computeActivationUnallocatedBudgetUsdc(activation);
  if (thisClaimUsdc != null) {
    maxMicro = Math.min(maxMicro, balanceUsdcToMicro(thisClaimUsdc));
  }

  return maxMicro;
}

async function readCampaignWalletOnChainBalance(
  activation: SponsoredActivationRow
): Promise<number | null> {
  if (activation.settlement_rail === 'base') {
    return readBaseCampaignWalletBalance(activation);
  }
  if (activation.settlement_rail === 'tempo') {
    return readTempoCampaignWalletBalance(activation);
  }
  return readStellarCampaignWalletBalance(activation);
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
      decimals: resolveBaseTokenDecimals(cfg.data.contract_address),
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

async function readTempoCampaignWalletBalance(
  activation: SponsoredActivationRow
): Promise<number | null> {
  const cfg = tempoCaddAssetConfigSchema.safeParse(
    activation.usdc_asset_config
  );
  const address = tryNormalizeEvmAddress(activation.campaign_wallet_address);
  if (!cfg.success || !address || !isEvmAddress(address)) return null;
  try {
    return await fetchUsdcBalanceOnBase(address as `0x${string}`, {
      rpcUrl: getTempoRpcUrl(),
      usdcContract: cfg.data.contract_address,
      decimals: TEMPO_CADD_DECIMALS,
    });
  } catch (error) {
    console.error('readTempoCampaignWalletBalance:', error);
    return null;
  }
}

export async function loadSponsoredActivationCampaignWalletBalancePack(
  activation: SponsoredActivationRow
): Promise<SponsoredActivationCampaignWalletBalancePack> {
  const [reservedUsdc, balance] = await Promise.all([
    loadActivationReservedUsdc(activation.id),
    readCampaignWalletOnChainBalance(activation),
  ]);

  return {
    campaign_wallet_usdc_balance: balance,
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
  if (
    activation.settlement_rail === 'base' ||
    activation.settlement_rail === 'tempo'
  ) {
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

  const tokenSymbol = describeSponsoredActivationPaymentTokenSymbol(
    input.activation
  );

  const balance = await readCampaignWalletOnChainBalance(input.activation);
  if (balance == null) {
    return {
      ok: false,
      error: `Could not read campaign wallet ${tokenSymbol} balance.`,
      statusCode: 500,
    };
  }

  const baseAssetConfig =
    input.activation.settlement_rail === 'base'
      ? baseUsdcAssetConfigSchema.safeParse(input.activation.usdc_asset_config)
      : null;
  const tokenDecimals =
    baseAssetConfig?.success === true
      ? resolveBaseTokenDecimals(baseAssetConfig.data.contract_address)
      : input.activation.settlement_rail === 'tempo'
        ? TEMPO_CADD_DECIMALS
        : 6;

  let maxBalanceMicro =
    input.activation.settlement_rail === 'base'
      ? balanceToTokenMicro(balance, tokenDecimals)
      : balanceUsdcToMicro(balance);
  if (input.activation.settlement_rail === 'stellar') {
    maxBalanceMicro = await computeStellarSharedWalletMaxWithdrawMicro(
      input.activation,
      maxBalanceMicro
    );
  }

  if (maxBalanceMicro <= 0) {
    return {
      ok: false,
      error: `No ${tokenSymbol} available to withdraw.`,
      statusCode: 400,
    };
  }

  let withdrawMicro: number;
  if (input.amountUsdc != null && input.amountUsdc > 0) {
    withdrawMicro =
      input.activation.settlement_rail === 'base'
        ? balanceToTokenMicro(input.amountUsdc, tokenDecimals)
        : Math.floor(input.amountUsdc * 1e6);
    if (withdrawMicro <= 0) {
      return {
        ok: false,
        error: 'Withdraw amount must be positive.',
        statusCode: 400,
      };
    }
    if (withdrawMicro > maxBalanceMicro) {
      return {
        ok: false,
        error: `Amount exceeds on-chain balance (${tokenMicroToAmount(maxBalanceMicro, tokenDecimals).toFixed(tokenDecimals)} ${tokenSymbol}).`,
        statusCode: 400,
      };
    }
  } else {
    withdrawMicro = maxBalanceMicro;
  }

  const withdrawAmount = tokenMicroToAmount(withdrawMicro, tokenDecimals);
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

  if (input.activation.settlement_rail === 'tempo') {
    const privyWalletId = input.activation.privy_campaign_wallet_id?.trim();
    const campaignAddress = tryNormalizeEvmAddress(
      input.activation.campaign_wallet_address
    );
    const config = tempoCaddAssetConfigSchema.safeParse(
      input.activation.usdc_asset_config
    );
    if (!privyWalletId || !campaignAddress || !config.success) {
      return {
        ok: false,
        error: 'Tempo campaign wallet is not configured for this activation.',
        statusCode: 400,
      };
    }
    const withdrawId = `withdraw:${input.activation.id}:${Date.now().toString(36)}`;
    const submitted = await submitTempoCaddTransfer({
      serverWalletId: privyWalletId,
      serverWalletAddress: campaignAddress as `0x${string}`,
      recipientAddress: destinationAddress as `0x${string}`,
      caddAmount: withdrawAmount,
      settlementId: withdrawId,
      caddContractAddress: config.data.contract_address,
      referenceId: `sa-wd:${input.activation.id}:${Date.now().toString(36)}`,
    });
    if (!submitted.ok) {
      return { ok: false, error: submitted.error, statusCode: 500 };
    }
    if ('submittedPending' in submitted && submitted.submittedPending) {
      return {
        ok: true,
        status: 'submitted',
        amountUsdc: withdrawAmount,
        destinationAddress,
        privyTransactionId: submitted.privyTransactionId,
        referenceId: submitted.referenceId,
        message: 'Withdrawal was accepted by Privy and is pending on Tempo.',
      };
    }
    if (!('txHash' in submitted)) {
      return {
        ok: false,
        error: 'Unexpected Tempo withdrawal response.',
        statusCode: 500,
      };
    }
    const status = await getTempoCaddTransferStatus({
      txHash: submitted.txHash,
      campaignAddress: campaignAddress as `0x${string}`,
      recipientAddress: destinationAddress as `0x${string}`,
      caddAmount: withdrawAmount,
      settlementId: withdrawId,
      caddContractAddress: config.data.contract_address,
    });
    if (status !== 'success') {
      return {
        ok: true,
        status: 'submitted',
        txHash: submitted.txHash,
        amountUsdc: withdrawAmount,
        destinationAddress,
        privyTransactionId: submitted.privyTransactionId,
        referenceId: submitted.referenceId,
        message: 'Withdrawal is submitted; Tempo confirmation is pending.',
      };
    }
    return {
      ok: true,
      status: 'confirmed',
      txHash: submitted.txHash,
      amountUsdc: withdrawAmount,
      destinationAddress,
      privyTransactionId: submitted.privyTransactionId,
      referenceId: submitted.referenceId,
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

  const cfg =
    baseAssetConfig ??
    baseUsdcAssetConfigSchema.safeParse(input.activation.usdc_asset_config);
  if (!cfg.success) {
    return {
      ok: false,
      error: `${tokenSymbol} contract is misconfigured.`,
      statusCode: 500,
    };
  }

  const submit = await submitTreasuryUsdcTransfer({
    serverWalletId: privyWalletId,
    serverWalletAddress: campaignAddress as `0x${string}`,
    recipientAddress: destinationAddress as `0x${string}`,
    usdcAmount: withdrawAmount,
    usdcContractAddress: cfg.data.contract_address,
    decimals: tokenDecimals,
    referenceId: `sa-wd:${input.activation.id}:${Date.now().toString(36)}`,
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
