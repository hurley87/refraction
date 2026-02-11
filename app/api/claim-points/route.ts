import { NextRequest } from 'next/server';
import {
  Keypair,
  TransactionBuilder,
  nativeToScVal,
  Networks,
  rpc as SorobanRpc,
  Horizon,
} from '@stellar/stellar-sdk';
import { apiError } from '@/lib/api/response';
import { NextResponse } from 'next/server';
import {
  getSorobanRpc,
  getContract,
  addressToScVal,
  isValidAddress,
  toTokenSmallestUnits,
} from '@/lib/stellar/utils/soroban';
import {
  getSimplePaymentContractAddress,
  getFungibleTokenContractAddress,
  getHorizonUrlForNetwork,
} from '@/lib/stellar/utils/network';

/** Amount of custom tokens the simple payment sends per claim (100 tokens). */
const FUNGIBLE_TOKEN_AMOUNT_TOKENS = 100;

/**
 * POST /api/claim-points
 * Claims reward tokens by having the backend invoke the simple payment contract's
 * send_token(fungible_token_address, recipient, amount). The simple payment
 * contract must hold the fungible token; this API sends that token to the user.
 * Body: { walletAddress: string, networkPassphrase?: string }
 * Returns: { success: true, data: { txHash: string } }
 */
export async function POST(request: NextRequest) {
  const requestId = `claim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[claim-points] [${requestId}] Request received`);

  let body: { walletAddress?: string; networkPassphrase?: string };
  try {
    body = await request.json();
    console.log(`[claim-points] [${requestId}] Body parsed:`, {
      walletAddress: body.walletAddress?.substring(0, 8) + '...',
      hasNetworkPassphrase: !!body.networkPassphrase,
    });
  } catch {
    console.error(`[claim-points] [${requestId}] Invalid JSON body`);
    return apiError('Invalid JSON body', 400);
  }

  const walletAddress = body.walletAddress?.trim();

  if (!walletAddress) {
    console.error(`[claim-points] [${requestId}] Missing walletAddress`);
    return apiError('walletAddress is required', 400);
  }

  if (!isValidAddress(walletAddress)) {
    console.error(
      `[claim-points] [${requestId}] Invalid wallet address:`,
      walletAddress
    );
    return apiError('Invalid wallet address', 400);
  }

  // Use app-configured network so contract addresses and tx match deployment (e.g. irl.energy testnet).
  // Ignore wallet passphrase from body to avoid mainnet contract lookup when app is set to TESTNET.
  const appNetwork = process.env.NEXT_PUBLIC_STELLAR_NETWORK?.toUpperCase();
  const passphrase =
    appNetwork === 'PUBLIC' || appNetwork === 'MAINNET'
      ? Networks.PUBLIC
      : Networks.TESTNET;
  const isMainnet =
    passphrase.includes('Public') ||
    passphrase.includes('Public Global Stellar Network');

  console.log(`[claim-points] [${requestId}] Network config:`, {
    appNetwork,
    passphrase: passphrase.substring(0, 20) + '...',
    isMainnet,
  });

  const simplePaymentAddress = getSimplePaymentContractAddress(passphrase);
  const fungibleTokenAddress = getFungibleTokenContractAddress(passphrase);

  console.log(`[claim-points] [${requestId}] Contract addresses:`, {
    simplePayment: simplePaymentAddress,
    fungibleToken: fungibleTokenAddress,
  });

  if (!simplePaymentAddress) {
    return NextResponse.json(
      {
        success: false,
        error: 'Simple payment contract not configured for this network',
        debug: {
          requestId,
          appNetwork,
          passphrase: passphrase.substring(0, 30) + '...',
          isMainnet,
        },
      },
      { status: 500 }
    );
  }

  if (!fungibleTokenAddress) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Fungible token contract not configured for this network. Update lib/stellar/contract-addresses.ts with the deployed token contract ID.',
        debug: {
          requestId,
          appNetwork,
          passphrase: passphrase.substring(0, 30) + '...',
          simplePaymentAddress,
          isMainnet,
        },
      },
      { status: 500 }
    );
  }

  const signerSecret =
    process.env.REWARDS_TOKEN_OWNER_SECRET_KEY ||
    process.env.SERVER_WALLET_PRIVATE_KEY;
  if (!signerSecret) {
    console.error(`[claim-points] [${requestId}] Signer key not configured`);
    return apiError(
      'Signer key not configured (REWARDS_TOKEN_OWNER_SECRET_KEY or SERVER_WALLET_PRIVATE_KEY)',
      500
    );
  }

  const amountSmallest = toTokenSmallestUnits(FUNGIBLE_TOKEN_AMOUNT_TOKENS);

  console.log(`[claim-points] [${requestId}] Transaction params:`, {
    amountTokens: FUNGIBLE_TOKEN_AMOUNT_TOKENS,
    amountSmallest: amountSmallest.toString(),
    recipient: walletAddress,
  });

  try {
    const keypair = Keypair.fromSecret(signerSecret);
    const signerAddress = keypair.publicKey();
    console.log(`[claim-points] [${requestId}] Signer address:`, signerAddress);

    const rpc = getSorobanRpc(passphrase);
    console.log(`[claim-points] [${requestId}] RPC URL:`, rpc.serverURL);

    const contract = getContract(simplePaymentAddress);
    const contractCall = contract.call(
      'send_token',
      addressToScVal(fungibleTokenAddress),
      addressToScVal(walletAddress),
      nativeToScVal(amountSmallest, { type: 'i128' })
    );

    const networkName = passphrase.includes('Test')
      ? 'TESTNET'
      : passphrase.includes('Public')
        ? 'MAINNET'
        : 'TESTNET';
    const horizonUrl = getHorizonUrlForNetwork(networkName);
    console.log(`[claim-points] [${requestId}] Horizon URL:`, horizonUrl);

    const horizonServer = new Horizon.Server(horizonUrl);
    const account = await horizonServer.loadAccount(signerAddress);
    console.log(`[claim-points] [${requestId}] Account loaded:`, {
      sequence: account.sequenceNumber(),
      balance: account.balances[0]?.balance,
    });

    const baseFee = isMainnet ? '100000' : '100';

    const transaction = new TransactionBuilder(account, {
      fee: baseFee,
      networkPassphrase: passphrase,
    })
      .addOperation(contractCall)
      .setTimeout(30)
      .build();

    console.log(
      `[claim-points] [${requestId}] Transaction built, simulating...`
    );
    const simulation = await rpc.simulateTransaction(transaction);
    const isSimulationSuccess = SorobanRpc.Api.isSimulationSuccess(simulation);
    const isSimulationError = SorobanRpc.Api.isSimulationError(simulation);
    console.log(`[claim-points] [${requestId}] Simulation result:`, {
      isError: isSimulationError,
      isSuccess: isSimulationSuccess,
      hasResult:
        isSimulationSuccess && 'result' in simulation
          ? !!simulation.result
          : false,
      minResourceFee:
        isSimulationSuccess && 'minResourceFee' in simulation
          ? simulation.minResourceFee
          : undefined,
    });
    if (SorobanRpc.Api.isSimulationError(simulation)) {
      const errorDetails = simulation.error
        ? JSON.stringify(simulation.error, null, 2)
        : 'Unknown simulation error';
      const detailsStr =
        typeof simulation.error === 'string'
          ? simulation.error
          : JSON.stringify(simulation.error);
      console.error(`[claim-points] [${requestId}] Simulation error:`, {
        error: simulation.error,
        detailsStr,
      });
      if (
        detailsStr.includes('Storage') &&
        detailsStr.includes('MissingValue') &&
        detailsStr.includes('balance')
      ) {
        return NextResponse.json(
          {
            success: false,
            error: `Simple payment contract has no IRL token balance. Transfer IRL tokens from the token owner to the simple payment contract (${simplePaymentAddress}) so claims can be paid. See soroban-contracts/DEPLOY_MAINNET.md or irl_token/README.md for how to fund it.`,
            debug: {
              requestId,
              network: isMainnet ? 'MAINNET' : 'TESTNET',
              simplePaymentAddress,
              fungibleTokenAddress,
              simulationError: detailsStr,
            },
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        {
          success: false,
          error: `Simulation failed: ${errorDetails}`,
          debug: {
            requestId,
            network: isMainnet ? 'MAINNET' : 'TESTNET',
            simplePaymentAddress,
            fungibleTokenAddress,
            simulationError: errorDetails,
          },
        },
        { status: 400 }
      );
    }

    console.log(`[claim-points] [${requestId}] Preparing transaction...`);
    const prepared = await rpc.prepareTransaction(transaction);
    prepared.sign(keypair);
    console.log(`[claim-points] [${requestId}] Transaction signed, sending...`);

    const sendResult = await rpc.sendTransaction(prepared);
    console.log(`[claim-points] [${requestId}] Send result:`, {
      hash: sendResult.hash,
      status: sendResult.status,
      hasErrorResult: !!sendResult.errorResult,
      errorResult: sendResult.errorResult,
    });

    if (sendResult.errorResult) {
      const errMsg =
        typeof sendResult.errorResult === 'string'
          ? sendResult.errorResult
          : JSON.stringify(sendResult.errorResult);
      console.error(
        `[claim-points] [${requestId}] Transaction send failed:`,
        errMsg
      );
      return NextResponse.json(
        {
          success: false,
          error: `Transaction failed: ${errMsg}`,
          debug: {
            requestId,
            network: isMainnet ? 'MAINNET' : 'TESTNET',
            simplePaymentAddress,
            fungibleTokenAddress,
            sendResult: {
              status: sendResult.status,
              errorResult: sendResult.errorResult,
              hash: sendResult.hash,
            },
          },
        },
        { status: 400 }
      );
    }

    if (!sendResult.hash) {
      console.error(
        `[claim-points] [${requestId}] No transaction hash in send result:`,
        sendResult
      );
      return NextResponse.json(
        {
          success: false,
          error: 'Transaction sent but no hash returned',
          debug: {
            requestId,
            network: isMainnet ? 'MAINNET' : 'TESTNET',
            simplePaymentAddress,
            fungibleTokenAddress,
            sendResult: {
              status: sendResult.status,
              errorResult: sendResult.errorResult,
              hash: sendResult.hash,
              fullResult: JSON.stringify(sendResult, null, 2),
            },
          },
        },
        { status: 500 }
      );
    }

    const txHash = sendResult.hash;
    console.log(
      `[claim-points] [${requestId}] Success! Transaction hash:`,
      txHash
    );

    // Include debug info in response for browser console visibility
    const debugInfo = {
      requestId,
      network: isMainnet ? 'MAINNET' : 'TESTNET',
      simplePaymentAddress,
      fungibleTokenAddress,
      recipient: walletAddress,
      amountTokens: FUNGIBLE_TOKEN_AMOUNT_TOKENS,
      amountSmallest: amountSmallest.toString(),
      signerAddress,
      txHash,
      sendResultStatus: sendResult.status,
    };

    return NextResponse.json(
      {
        success: true,
        data: { txHash },
        message: 'Claim submitted',
        debug: debugInfo, // Include debug info for browser console
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error(`[claim-points] [${requestId}] Exception:`, {
      message,
      error: err,
      stack,
    });
    return NextResponse.json(
      {
        success: false,
        error: message,
        debug: {
          requestId,
          errorType: err instanceof Error ? err.constructor.name : typeof err,
          stack,
          errorString: String(err),
        },
      },
      { status: 500 }
    );
  }
}
