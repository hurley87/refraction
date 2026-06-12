import {
  Asset,
  Horizon,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { parseStellarSponsoredCampaignKeypair } from '@/lib/activation/stellar-campaign-wallet-config';
import { parseStellarSettlementAssetConfig } from '@/lib/activation/stellar-settlement-submit';
import { loadActivationReservedUsdc } from '@/lib/db/sponsored-activation-admin';
import type { SponsoredActivationRow } from '@/lib/db/sponsored-activations';
import { stellarWalletAddressSchema } from '@/lib/schemas/player';
import { baseUsdcAssetConfigSchema } from '@/lib/schemas/sponsored-activation';
import {
  classifyStellarHorizonSubmitError,
  formatUsdcAmountForStellar,
  loadAccountOrThrow,
  readHorizonHttpErrorData,
} from '@/lib/stellar/horizon-submit-helpers';
import {
  createStellarSpendHorizonServer,
  getStellarSpendNetworkPassphrase,
} from '@/lib/spend/stellar-wallet-readiness-config';
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
    for (const b of account.balances) {
      if (
        b.asset_type !== 'credit_alphanum4' &&
        b.asset_type !== 'credit_alphanum12'
      ) {
        continue;
      }
      if (
        b.asset_code === assetParsed.config.asset_code &&
        b.asset_issuer === assetParsed.config.issuer
      ) {
        const n = Number(b.balance);
        return Number.isFinite(n) ? n : null;
      }
    }
    return 0;
  } catch (e) {
    console.error('readStellarCampaignWalletBalance:', e);
    return null;
  }
}

export async function loadSponsoredActivationCampaignWalletBalancePack(
  activation: SponsoredActivationRow
): Promise<SponsoredActivationCampaignWalletBalancePack> {
  const reservedUsdc = await loadActivationReservedUsdc(activation.id);
  const balance =
    activation.settlement_rail === 'base'
      ? await readBaseCampaignWalletBalance(activation)
      : await readStellarCampaignWalletBalance(activation);

  return {
    campaign_wallet_usdc_balance: balance,
    campaign_wallet_withdrawable_usdc:
      balance == null ? null : computeWithdrawableUsdc(balance, reservedUsdc),
    campaign_wallet_reserved_usdc: reservedUsdc,
  };
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
    if (
      sameWalletAddress(normalized, activation.campaign_wallet_address) ||
      sameWalletAddress(normalized, activation.venue_settlement_wallet_address)
    ) {
      return {
        ok: false,
        error:
          'Destination must differ from the campaign and venue settlement wallets.',
      };
    }
    return { ok: true, normalized };
  }

  const parsed = stellarWalletAddressSchema.safeParse(
    destinationAddress.trim().toUpperCase()
  );
  if (!parsed.success) {
    return { ok: false, error: 'Invalid Stellar address' };
  }
  if (
    sameWalletAddress(parsed.data, activation.campaign_wallet_address) ||
    sameWalletAddress(parsed.data, activation.venue_settlement_wallet_address)
  ) {
    return {
      ok: false,
      error:
        'Destination must differ from the campaign and venue settlement wallets.',
    };
  }
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
  const assetParsed = parseStellarSettlementAssetConfig(
    input.activation.usdc_asset_config
  );
  if (!assetParsed.ok) {
    return { ok: false, error: 'Stellar USDC asset is misconfigured.' };
  }

  let campaignKp;
  try {
    campaignKp = parseStellarSponsoredCampaignKeypair();
  } catch {
    return {
      ok: false,
      error: 'Stellar campaign wallet is not configured on the server.',
      statusCode: 500,
    };
  }

  const campaignPub = input.activation.campaign_wallet_address
    .trim()
    .toUpperCase();
  if (campaignKp.publicKey() !== campaignPub) {
    return {
      ok: false,
      error: 'Stellar campaign wallet key does not match this activation.',
      statusCode: 500,
    };
  }

  const passphrase = getStellarSpendNetworkPassphrase();
  const server = createStellarSpendHorizonServer();
  const { asset_code: usdcCode, issuer: usdcIssuer } = assetParsed.config;
  const usdcAsset = new Asset(usdcCode, usdcIssuer);
  const payAmount = formatUsdcAmountForStellar(input.usdcAmount);

  let campaignAccount: Horizon.AccountResponse;
  try {
    campaignAccount = await loadAccountOrThrow(server, campaignPub);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const { resultCodes } = readHorizonHttpErrorData(e);
    return {
      ok: false,
      error: classifyStellarHorizonSubmitError(msg, resultCodes),
      statusCode: 500,
    };
  }

  let baseFee: string;
  try {
    baseFee = (await server.fetchBaseFee()).toString();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: classifyStellarHorizonSubmitError(msg),
      statusCode: 500,
    };
  }

  const tx = new TransactionBuilder(campaignAccount, {
    fee: baseFee,
    networkPassphrase: passphrase,
  })
    .addOperation(
      Operation.payment({
        destination: input.destinationAddress,
        asset: usdcAsset,
        amount: payAmount,
      })
    )
    .setTimeout(180)
    .build();

  tx.sign(campaignKp);

  try {
    const res = await server.submitTransaction(tx);
    return { ok: true, txHash: res.hash };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const { resultCodes } = readHorizonHttpErrorData(e);
    return {
      ok: false,
      error: classifyStellarHorizonSubmitError(msg, resultCodes),
      statusCode: 500,
    };
  }
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
        statusCode: submitted.statusCode === 400 ? 400 : 500,
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
