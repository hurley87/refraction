import { NextRequest, NextResponse } from 'next/server';
import {
  Keypair,
  Networks,
  TransactionBuilder,
  Horizon,
  rpc as SorobanRpc,
  scValToNative,
} from '@stellar/stellar-sdk';
import { apiError } from '@/lib/api/response';
import {
  addressToScVal,
  getContract,
  getSorobanRpc,
  isValidAddress,
} from '@/lib/stellar/utils/soroban';
import {
  getHorizonUrlForNetwork,
  getNFTContractAddress,
} from '@/lib/stellar/utils/network';
import { verifyWalletOwnership } from '@/lib/api/privy';

/**
 * POST /api/mint-nft
 * Server-signed fallback mint flow for Privy Stellar wallets.
 * Body: { walletAddress: string, networkPassphrase?: string }
 */
export async function POST(request: NextRequest) {
  let body: { walletAddress?: string; networkPassphrase?: string };
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body', 400);
  }

  const walletAddress = body.walletAddress?.trim();
  if (!walletAddress) {
    return apiError('walletAddress is required', 400);
  }
  if (!isValidAddress(walletAddress)) {
    return apiError('Invalid wallet address', 400);
  }

  const auth = await verifyWalletOwnership(request, walletAddress);
  if (!auth.authorized) {
    return apiError(auth.error ?? 'Unauthorized', 401);
  }

  const appNetwork = process.env.NEXT_PUBLIC_STELLAR_NETWORK?.toUpperCase();
  const passphrase = body.networkPassphrase?.trim()
    ? body.networkPassphrase.trim()
    : appNetwork === 'PUBLIC' || appNetwork === 'MAINNET'
      ? Networks.PUBLIC
      : Networks.TESTNET;
  const isMainnet =
    passphrase.includes('Public') ||
    passphrase.includes('Public Global Stellar Network');

  const contractId = getNFTContractAddress(passphrase);
  if (!contractId) {
    return apiError('NFT contract not configured for this network', 500);
  }

  const signerSecret =
    process.env.REWARDS_TOKEN_OWNER_SECRET_KEY ||
    process.env.SERVER_WALLET_PRIVATE_KEY;
  if (!signerSecret) {
    return apiError(
      'Signer key not configured (REWARDS_TOKEN_OWNER_SECRET_KEY or SERVER_WALLET_PRIVATE_KEY)',
      500
    );
  }

  try {
    const signer = Keypair.fromSecret(signerSecret);
    const signerAddress = signer.publicKey();
    const rpc = getSorobanRpc(passphrase);
    const contract = getContract(contractId);

    const networkName = passphrase.includes('Test')
      ? 'TESTNET'
      : passphrase.includes('Public')
        ? 'MAINNET'
        : 'TESTNET';
    const horizonUrl = getHorizonUrlForNetwork(networkName);
    const horizonServer = new Horizon.Server(horizonUrl);

    // Ensure recipient account exists on this network before simulating mint.
    // The NFT contract's mint flow transfers payment from recipient -> contract.
    // If recipient account is not funded/initialized, simulation fails with
    // HostError: Error(Contract, #6) and "account entry is missing".
    try {
      await horizonServer.loadAccount(walletAddress);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const looksLikeMissingAccount =
        errorMessage.includes('not found') ||
        errorMessage.includes('does not exist') ||
        errorMessage.includes('404');
      if (looksLikeMissingAccount) {
        const isTestLike =
          passphrase.includes('Test') || passphrase.includes('Future');
        const friendbotHint = isTestLike
          ? ` Fund it first via Friendbot: https://friendbot.stellar.org/?addr=${walletAddress}`
          : ' Fund it first with XLM from a Stellar wallet or exchange.';
        return apiError(
          `Recipient account is not funded on this network (${networkName}).${friendbotHint}`,
          400
        );
      }
      throw error;
    }

    let account;
    try {
      account = await horizonServer.loadAccount(signerAddress);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const looksLikeMissingSignerAccount =
        errorMessage.includes('not found') ||
        errorMessage.includes('Not Found') ||
        errorMessage.includes('does not exist') ||
        errorMessage.includes('404');
      if (looksLikeMissingSignerAccount) {
        return apiError(
          `Server signer account (${signerAddress}) is missing on ${networkName}. ` +
            `Fund or configure a signer key for this network.`,
          500
        );
      }
      throw error;
    }

    const contractCall = contract.call('mint', addressToScVal(walletAddress));
    const baseFee = isMainnet ? '100000' : '100';

    const tx = new TransactionBuilder(account, {
      fee: baseFee,
      networkPassphrase: passphrase,
    })
      .addOperation(contractCall)
      .setTimeout(30)
      .build();

    const simulation = await rpc.simulateTransaction(tx);
    if (SorobanRpc.Api.isSimulationError(simulation)) {
      const details = simulation.error
        ? JSON.stringify(simulation.error, null, 2)
        : 'Unknown simulation error';
      if (details.includes('account entry is missing')) {
        const isTestLike =
          passphrase.includes('Test') || passphrase.includes('Future');
        const friendbotHint = isTestLike
          ? ` Fund it first via Friendbot: https://friendbot.stellar.org/?addr=${walletAddress}`
          : ' Fund it first with XLM from a Stellar wallet or exchange.';
        return apiError(
          `Mint simulation failed because recipient account is missing on ${networkName}.${friendbotHint}`,
          400
        );
      }
      return apiError(`Simulation failed: ${details}`, 400);
    }

    const prepared = await rpc.prepareTransaction(tx);
    prepared.sign(signer);
    const sendResult = await rpc.sendTransaction(prepared);

    if (sendResult.errorResult) {
      const errMsg =
        typeof sendResult.errorResult === 'string'
          ? sendResult.errorResult
          : JSON.stringify(sendResult.errorResult);
      return apiError(`Transaction failed: ${errMsg}`, 400);
    }
    if (!sendResult.hash) {
      return apiError('Transaction sent but no hash returned', 500);
    }

    const tokenId =
      simulation.result && !SorobanRpc.Api.isSimulationError(simulation)
        ? Number(scValToNative(simulation.result.retval))
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        txHash: sendResult.hash,
        tokenId,
        contractId,
      },
      message: 'NFT minted successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[api/mint-nft] Unexpected mint error:', error);
    return apiError(message || 'Mint failed', 500);
  }
}
