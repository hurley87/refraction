import {
  campaignBalanceToMicro,
  computeStellarSharedWalletMaxWithdrawMicro,
  readCampaignWalletOnChainBalance,
  resolveCampaignTokenDecimals,
  transferCampaignWalletBalance,
  type SponsoredActivationCampaignWithdrawResult,
} from '@/lib/activation/campaign-wallet-withdraw';
import {
  broadcastSolanaTransaction,
  buildSolanaCaddTransferTransaction,
  checkSolanaSignatureOutcome,
  createSolanaSettlementConnection,
  signSolanaCaddTransferWithPrivy,
  SOLANA_CADD_TRANSFER_ERROR_CODES,
  type SolanaSettlementConnection,
} from '@/lib/activation/solana-cadd-transfer';
import { isSolanaAddress } from '@/lib/activation/solana-config';
import { fetchSolanaSplTokenBalance } from '@/lib/activation/solana-token-rpc';
import {
  balanceToTokenMicro,
  tokenMicroToAmount,
} from '@/lib/activation/usdc-micro';
import {
  countActivationBroadcastingSettlements,
  loadActivationReservedUsdc,
} from '@/lib/db/sponsored-activation-admin';
import type { SponsoredActivationRow } from '@/lib/db/sponsored-activations';
import { stellarWalletAddressSchema } from '@/lib/schemas/player';
import { solanaCaddAssetConfigSchema } from '@/lib/schemas/sponsored-activation';
import { describeSponsoredActivationPaymentTokenSymbol } from '@/lib/schemas/sponsored-activation-tokens';
import { sameWalletAddress, tryNormalizeEvmAddress } from '@/lib/utils/wallets';
import { isEvmAddress } from '@/lib/walletconnect-poster-direct-usdc';

type VenueTransferFailure = Extract<
  SponsoredActivationCampaignWithdrawResult,
  { ok: false }
>;

const SOLANA_TRANSFER_ERROR_MESSAGES: Partial<Record<string, string>> = {
  [SOLANA_CADD_TRANSFER_ERROR_CODES.insufficient_campaign_cadd]:
    'Campaign wallet CADD balance changed; refresh and try again.',
  [SOLANA_CADD_TRANSFER_ERROR_CODES.solana_cadd_mint_not_found]:
    'CADD mint was not found on Solana.',
  [SOLANA_CADD_TRANSFER_ERROR_CODES.solana_cadd_decimals_mismatch]:
    'CADD mint decimals do not match this activation.',
  [SOLANA_CADD_TRANSFER_ERROR_CODES.privy_not_configured]:
    'Privy is not configured on the server.',
  [SOLANA_CADD_TRANSFER_ERROR_CODES.campaign_wallet_mismatch]:
    'Privy campaign wallet does not match this activation.',
  [SOLANA_CADD_TRANSFER_ERROR_CODES.privy_sign_failed]:
    'Privy could not sign the Solana transfer.',
};

function fail(
  error: string,
  statusCode: 400 | 500 = 400
): VenueTransferFailure {
  return { ok: false, error, statusCode };
}

/** Rounds up so the amount left behind always covers every reservation. */
function reservedToMicro(reserved: number, decimals: number): number {
  return Math.max(0, Math.ceil(reserved * 10 ** decimals));
}

function normalizeVenueAddress(
  activation: SponsoredActivationRow
): string | null {
  const venue = activation.venue_settlement_wallet_address.trim();
  if (activation.settlement_rail === 'solana') {
    return isSolanaAddress(venue) ? venue : null;
  }
  if (activation.settlement_rail === 'stellar') {
    const parsed = stellarWalletAddressSchema.safeParse(venue.toUpperCase());
    return parsed.success ? parsed.data : null;
  }
  const normalized = tryNormalizeEvmAddress(venue);
  return normalized && isEvmAddress(normalized) ? normalized : null;
}

async function sendSolanaRemainingBalanceToVenue(input: {
  activation: SponsoredActivationRow;
  venueAddress: string;
  reservedUsdc: number;
  connection?: SolanaSettlementConnection;
}): Promise<SponsoredActivationCampaignWithdrawResult> {
  const { activation, venueAddress } = input;
  const assetConfig = solanaCaddAssetConfigSchema.safeParse(
    activation.usdc_asset_config
  );
  if (!assetConfig.success) {
    return fail('Solana CADD asset is misconfigured.', 500);
  }
  const privyWalletId = activation.privy_campaign_wallet_id?.trim();
  if (!privyWalletId) {
    return fail('Campaign wallet is not configured for this activation.');
  }
  const campaignAddress = activation.campaign_wallet_address.trim();
  const { decimals, mint } = assetConfig.data;

  let balance: number;
  try {
    balance = await fetchSolanaSplTokenBalance({
      ownerAddress: campaignAddress,
      mint,
      decimals,
    });
  } catch (error) {
    console.error('sendSolanaRemainingBalanceToVenue balance:', error);
    return fail('Could not read campaign wallet CADD balance.', 500);
  }

  const sendMicro =
    balanceToTokenMicro(balance, decimals) -
    reservedToMicro(input.reservedUsdc, decimals);
  if (sendMicro <= 0) {
    return fail('No unreserved CADD left to send to the venue.');
  }
  const amount = tokenMicroToAmount(sendMicro, decimals);

  const connection = input.connection ?? createSolanaSettlementConnection();
  const built = await buildSolanaCaddTransferTransaction({
    connection,
    campaignAddress,
    venueAddress,
    assetConfig: assetConfig.data,
    amount,
  });
  if (!built.ok) {
    return fail(SOLANA_TRANSFER_ERROR_MESSAGES[built.reason] ?? built.reason);
  }

  const signed = await signSolanaCaddTransferWithPrivy({
    privyWalletId,
    campaignAddress,
    transaction: built.transaction,
  });
  if (!signed.ok) {
    return fail(
      SOLANA_TRANSFER_ERROR_MESSAGES[signed.reason] ?? signed.reason,
      500
    );
  }

  const broadcast = await broadcastSolanaTransaction({
    connection,
    serializedTransaction: signed.serializedTransaction,
  });
  if (broadcast.status === 'rejected') {
    console.warn(
      'sendSolanaRemainingBalanceToVenue: broadcast rejected',
      activation.id,
      broadcast.message
    );
    return fail(
      'Solana rejected the transfer. Make sure the campaign wallet has enough SOL for network fees.',
      500
    );
  }

  const outcome = await checkSolanaSignatureOutcome({
    connection,
    signature: signed.signature,
  });
  if (outcome === 'failed') {
    return fail('The Solana transfer failed on-chain.', 500);
  }
  if (outcome === 'success') {
    return {
      ok: true,
      status: 'confirmed',
      txHash: signed.signature,
      amountUsdc: amount,
      destinationAddress: venueAddress,
    };
  }
  return {
    ok: true,
    status: 'submitted',
    txHash: signed.signature,
    amountUsdc: amount,
    destinationAddress: venueAddress,
    message:
      'Venue transfer was sent to Solana and is awaiting finalization. Check the explorer for this signature.',
  };
}

/**
 * Sends the campaign wallet's unreserved balance to the venue settlement
 * wallet. Funds reserved for committed redemptions stay behind so they can
 * still settle. Refused while the activation is live or any settlement is
 * broadcasting, because Base settlement recovery matches campaign→venue
 * transfers by amount and could mistake this transfer for a settlement.
 */
export async function sendSponsoredActivationRemainingBalanceToVenue(input: {
  activation: SponsoredActivationRow;
  solanaConnection?: SolanaSettlementConnection;
}): Promise<SponsoredActivationCampaignWithdrawResult> {
  const { activation } = input;
  if (activation.status === 'active') {
    return fail(
      'Pause or end the activation before sending the remaining balance to the venue.'
    );
  }

  const venueAddress = normalizeVenueAddress(activation);
  if (!venueAddress) {
    return fail('Venue settlement wallet address is invalid.');
  }
  if (sameWalletAddress(venueAddress, activation.campaign_wallet_address)) {
    return fail('Venue wallet must differ from the campaign wallet.');
  }

  const [broadcastingCount, reservedUsdc] = await Promise.all([
    countActivationBroadcastingSettlements(activation.id),
    loadActivationReservedUsdc(activation.id),
  ]);
  if (broadcastingCount > 0) {
    return fail(
      `Wait for ${broadcastingCount} in-flight settlement${broadcastingCount === 1 ? '' : 's'} to finish before sending the remaining balance.`
    );
  }

  if (activation.settlement_rail === 'solana') {
    return sendSolanaRemainingBalanceToVenue({
      activation,
      venueAddress,
      reservedUsdc,
      connection: input.solanaConnection,
    });
  }

  const tokenSymbol = describeSponsoredActivationPaymentTokenSymbol(activation);
  const balance = await readCampaignWalletOnChainBalance(activation);
  if (balance == null) {
    return fail(`Could not read campaign wallet ${tokenSymbol} balance.`, 500);
  }

  const tokenDecimals = resolveCampaignTokenDecimals(activation);
  let availableMicro = campaignBalanceToMicro(
    activation,
    balance,
    tokenDecimals
  );
  if (activation.settlement_rail === 'stellar') {
    availableMicro = await computeStellarSharedWalletMaxWithdrawMicro(
      activation,
      availableMicro
    );
  }
  const reservedDecimals =
    activation.settlement_rail === 'base' ? tokenDecimals : 6;
  const sendMicro =
    availableMicro - reservedToMicro(reservedUsdc, reservedDecimals);
  if (sendMicro <= 0) {
    return fail(`No unreserved ${tokenSymbol} left to send to the venue.`);
  }

  return transferCampaignWalletBalance({
    activation,
    destinationAddress: venueAddress,
    amountMicro: sendMicro,
    tokenDecimals,
    purpose: 'venue',
  });
}
