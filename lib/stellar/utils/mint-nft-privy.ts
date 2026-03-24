/**
 * Mint NFT using a Privy embedded Stellar wallet: Soroban contracts that call
 * `require_auth` on the user need Ed25519 signatures on (1) each Soroban
 * authorization preimage and (2) the transaction hash. Server-only signing
 * cannot satisfy those — use `signPayload` from Privy `useSignRawHash`.
 */

import {
  Address,
  authorizeEntry,
  hash,
  Operation,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-base';
import {
  Horizon,
  Networks,
  rpc as SorobanRpc,
  scValToNative,
  Transaction,
} from '@stellar/stellar-sdk';
import {
  Api,
  assembleTransaction,
  parseRawSimulation,
} from '@stellar/stellar-sdk/rpc';
import { getContract, getSorobanRpc, addressToScVal } from './soroban';
import { getHorizonUrlForNetwork } from './network';

/** Signs 32-byte payloads (auth preimage hash or transaction hash) with Privy. */
export type PrivyEd25519Signer = (payload32: Buffer) => Promise<Buffer>;

function rebuildInvokeWithSignedAuth(
  prepared: Transaction,
  signedAuth: xdr.SorobanAuthorizationEntry[],
  networkPassphrase: string,
  simulation: Api.SimulateTransactionSuccessResponse
): Transaction {
  const sorobanData = simulation.transactionData.build();
  const op = prepared.operations[0];
  if (op.type !== 'invokeHostFunction') {
    throw new Error('Expected invokeHostFunction operation');
  }
  const tb = TransactionBuilder.cloneFrom(prepared, {
    fee: prepared.fee,
    networkPassphrase,
    sorobanData,
  });
  tb.clearOperations();
  tb.addOperation(
    Operation.invokeHostFunction({
      source: op.source,
      func: op.func,
      auth: signedAuth,
    })
  );
  return tb.build();
}

/**
 * Mint NFT: simulate → assemble → sign Soroban auth entries with Privy →
 * sign transaction envelope → submit.
 */
export async function mintNFTWithPrivySign(params: {
  contractId: string;
  signerAddress: string;
  networkPassphrase: string;
  signPayload: PrivyEd25519Signer;
}): Promise<{ txHash: string; tokenId: number; contractId: string }> {
  const { contractId, signerAddress, networkPassphrase, signPayload } = params;

  const rpc = getSorobanRpc(networkPassphrase);
  const contract = getContract(contractId);
  const contractCall = contract.call('mint', addressToScVal(signerAddress));

  const isMainnet =
    networkPassphrase.includes('Public') ||
    networkPassphrase.includes('Public Global Stellar Network');
  const baseFee = isMainnet ? '100000' : '100';
  let account;
  try {
    account = await rpc.getAccount(signerAddress);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const looksMissing =
      message.toLowerCase().includes('not found') ||
      message.toLowerCase().includes('account not found');
    if (!looksMissing) {
      throw error;
    }

    const currentNetworkName = isMainnet ? 'MAINNET' : 'TESTNET';
    const altNetworkName = isMainnet ? 'TESTNET' : 'MAINNET';
    let hint =
      ` Account is missing on ${currentNetworkName}. ` +
      `Make sure your embedded Stellar wallet is funded on ${currentNetworkName}.`;

    try {
      const altHorizonUrl = getHorizonUrlForNetwork(altNetworkName);
      const altHorizon = new Horizon.Server(altHorizonUrl);
      await altHorizon.loadAccount(signerAddress);
      hint =
        ` Account exists on ${altNetworkName}, but this mint is running on ${currentNetworkName}. ` +
        `Switch the app/wallet network to ${altNetworkName} or fund the account on ${currentNetworkName}.`;
    } catch {
      if (!isMainnet) {
        hint += ` On testnet, fund with Friendbot: https://friendbot.stellar.org/?addr=${signerAddress}`;
      }
    }

    throw new Error(`Account not found: ${signerAddress}.${hint}`);
  }

  const transaction = new TransactionBuilder(account, {
    fee: baseFee,
    networkPassphrase: networkPassphrase || Networks.TESTNET,
  })
    .addOperation(contractCall)
    .setTimeout(30)
    .build();

  const simulation = await rpc.simulateTransaction(transaction);
  if (SorobanRpc.Api.isSimulationError(simulation)) {
    const details = simulation.error
      ? JSON.stringify(simulation.error, null, 2)
      : 'Unknown simulation error';
    throw new Error(`Simulation failed: ${details}`);
  }

  const parsedSim = parseRawSimulation(simulation);
  if (!Api.isSimulationSuccess(parsedSim)) {
    throw new Error('Simulation was not successful');
  }

  const builder = assembleTransaction(transaction, simulation);
  const prepared = builder.build();

  const op = prepared.operations[0];
  if (op.type !== 'invokeHostFunction') {
    throw new Error('Expected invokeHostFunction after assemble');
  }

  const latest = await rpc.getLatestLedger();
  const validUntil = latest.sequence + 100_000;

  const authSigner = async (preimage: xdr.HashIdPreimage) => {
    const payload = hash(preimage.toXDR());
    return signPayload(payload);
  };

  const signedAuth: xdr.SorobanAuthorizationEntry[] = [];
  for (const entry of op.auth ?? []) {
    const cred = entry.credentials();
    if (
      cred.switch().value !==
      xdr.SorobanCredentialsType.sorobanCredentialsAddress().value
    ) {
      signedAuth.push(entry);
      continue;
    }
    const addrStr = Address.fromScAddress(cred.address().address()).toString();
    if (addrStr !== signerAddress) {
      signedAuth.push(entry);
      continue;
    }
    signedAuth.push(
      await authorizeEntry(entry, authSigner, validUntil, networkPassphrase)
    );
  }

  const authReady = rebuildInvokeWithSignedAuth(
    prepared,
    signedAuth,
    networkPassphrase,
    parsedSim
  );

  const networkSig = await signPayload(authReady.hash());
  authReady.addSignature(signerAddress, networkSig.toString('base64'));

  const sendResult = await rpc.sendTransaction(authReady);
  if (sendResult.status === 'ERROR') {
    const errMsg = sendResult.errorResult
      ? JSON.stringify(sendResult.errorResult)
      : 'Unknown submission error';
    throw new Error(`Transaction failed: ${errMsg}`);
  }
  if (!sendResult.hash) {
    throw new Error('No transaction hash returned');
  }

  if (!parsedSim.result?.retval) {
    throw new Error('Mint simulation returned no result value');
  }
  const tokenId = Number(scValToNative(parsedSim.result.retval));

  return {
    txHash: sendResult.hash,
    tokenId,
    contractId,
  };
}
