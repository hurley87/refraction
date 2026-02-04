import { NextRequest } from 'next/server';
import {
  Keypair,
  TransactionBuilder,
  nativeToScVal,
  Networks,
  rpc as SorobanRpc,
  Horizon,
} from '@stellar/stellar-sdk';
import { apiSuccess, apiError } from '@/lib/api/response';
import {
  getSorobanRpc,
  getContract,
  addressToScVal,
  isValidAddress,
  toTokenSmallestUnits,
} from '@/lib/stellar/utils/soroban';
import {
  getSimplePaymentContractAddress,
  getClaimPointsTokenAddress,
  getHorizonUrlForNetwork,
} from '@/lib/stellar/utils/network';

/** Amount of custom tokens the simple payment sends per claim (100 tokens). */
const CLAIM_POINTS_AMOUNT_TOKENS = 100;

/**
 * POST /api/claim-points
 * Claims reward tokens by having the backend invoke the simple payment contract's
 * send_token(claim_points_token_address, recipient, amount). The simple payment
 * contract must hold the claim-points token; this API sends that token to the user.
 * Body: { walletAddress: string, networkPassphrase?: string }
 * Returns: { success: true, data: { txHash: string } }
 */
export async function POST(request: NextRequest) {
  let body: { walletAddress?: string; networkPassphrase?: string };
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body', 400);
  }

  const walletAddress = body.walletAddress?.trim();
  const networkPassphrase = body.networkPassphrase?.trim();

  if (!walletAddress) {
    return apiError('walletAddress is required', 400);
  }

  if (!isValidAddress(walletAddress)) {
    return apiError('Invalid wallet address', 400);
  }

  const passphrase =
    networkPassphrase ||
    (process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'PUBLIC' ||
    process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'MAINNET'
      ? Networks.PUBLIC
      : Networks.TESTNET);

  const simplePaymentAddress = getSimplePaymentContractAddress(passphrase);
  const claimPointsTokenAddress = getClaimPointsTokenAddress(passphrase);

  if (!simplePaymentAddress) {
    return apiError(
      'Simple payment contract not configured for this network',
      500
    );
  }

  if (!claimPointsTokenAddress) {
    const isMainnet =
      passphrase.includes('Public') ||
      passphrase.includes('Public Global Stellar Network');
    const envVar = isMainnet
      ? 'NEXT_PUBLIC_CLAIM_POINTS_CONTRACT_ADDRESS_MAINNET'
      : 'NEXT_PUBLIC_CLAIM_POINTS_CONTRACT_ADDRESS_TESTNET';
    return apiError(
      `Claim-points token contract not configured for this network. Set ${envVar} in your environment (e.g. Vercel) to the deployed token contract ID.`,
      500
    );
  }

  const signerSecret =
    //process.env.REWARDS_TOKEN_OWNER_SECRET_KEY ||
    process.env.SERVER_WALLET_PRIVATE_KEY;
  if (!signerSecret) {
    return apiError(
      'Signer key not configured (REWARDS_TOKEN_OWNER_SECRET_KEY or SERVER_WALLET_PRIVATE_KEY)',
      500
    );
  }

  const amountSmallest = toTokenSmallestUnits(CLAIM_POINTS_AMOUNT_TOKENS);

  try {
    const keypair = Keypair.fromSecret(signerSecret);
    const signerAddress = keypair.publicKey();

    const rpc = getSorobanRpc(passphrase);
    const contract = getContract(simplePaymentAddress);
    const contractCall = contract.call(
      'send_token',
      addressToScVal(claimPointsTokenAddress),
      addressToScVal(walletAddress),
      nativeToScVal(amountSmallest, { type: 'i128' })
    );

    const networkName = passphrase.includes('Test')
      ? 'TESTNET'
      : passphrase.includes('Public')
        ? 'MAINNET'
        : 'TESTNET';
    const horizonUrl = getHorizonUrlForNetwork(networkName);
    const horizonServer = new Horizon.Server(horizonUrl);
    const account = await horizonServer.loadAccount(signerAddress);

    const isMainnet =
      passphrase.includes('Public') ||
      passphrase.includes('Public Global Stellar Network');
    const baseFee = isMainnet ? '100000' : '100';

    const transaction = new TransactionBuilder(account, {
      fee: baseFee,
      networkPassphrase: passphrase,
    })
      .addOperation(contractCall)
      .setTimeout(30)
      .build();

    const simulation = await rpc.simulateTransaction(transaction);
    if (SorobanRpc.Api.isSimulationError(simulation)) {
      const errorDetails = simulation.error
        ? JSON.stringify(simulation.error, null, 2)
        : 'Unknown simulation error';
      return apiError(`Simulation failed: ${errorDetails}`, 400);
    }

    const prepared = await rpc.prepareTransaction(transaction);
    prepared.sign(keypair);

    const sendResult = await rpc.sendTransaction(prepared);
    if (sendResult.errorResult) {
      const errMsg =
        typeof sendResult.errorResult === 'string'
          ? sendResult.errorResult
          : JSON.stringify(sendResult.errorResult);
      return apiError(`Transaction failed: ${errMsg}`, 400);
    }

    const txHash = sendResult.hash;
    return apiSuccess({ txHash }, 'Claim submitted', 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[claim-points] Error:', err);
    return apiError(message, 500);
  }
}
