import {
  Account,
  Keypair,
  Operation,
  SorobanDataBuilder,
  Transaction,
  TransactionBuilder,
  rpc as SorobanRpc,
  xdr,
} from '@stellar/stellar-sdk';
import { assembleTransaction } from '@stellar/stellar-sdk/rpc';

/** 1 XLM in stroops — hard ceiling for claim-points invoke fees. */
export const CLAIM_POINTS_MAX_FEE_STROOPS = 10_000_000;

/**
 * One-time archival restore of contract WASM/instance can cost ~20 XLM.
 * Claims stay under {@link CLAIM_POINTS_MAX_FEE_STROOPS} after restore.
 */
export const CLAIM_POINTS_RESTORE_MAX_FEE_STROOPS = 250_000_000;

/**
 * Ledgers past LCL to extend footprint TTL (relative, not absolute ledger).
 * ~100k ledgers ≈ 5–6 days at 5s/ledger — within network max TTL extension.
 */
export const CLAIM_POINTS_TTL_EXTEND_LEDGERS = 100_000;

/** Inclusion fee: 0.01 XLM on mainnet, tiny on testnet. */
export function claimPointsInclusionFeeStroops(isMainnet: boolean): number {
  return isMainnet ? 100_000 : 100;
}

/**
 * Total fee for a prepared claim tx: inclusion + simulated resource fee,
 * capped at {@link CLAIM_POINTS_MAX_FEE_STROOPS} (1 XLM).
 */
export function claimPointsFeeStroops(
  inclusionFee: number,
  minResourceFee: number | string,
  maxFeeStroops: number = CLAIM_POINTS_MAX_FEE_STROOPS
): number {
  const resource = Number(minResourceFee) || 0;
  return Math.min(inclusionFee + resource, maxFeeStroops);
}

export function formatStroopsAsXlm(stroops: number): string {
  return (stroops / 10_000_000).toFixed(7).replace(/\.?0+$/, '') || '0';
}

function uniqueLedgerKeys(keys: xdr.LedgerKey[]): xdr.LedgerKey[] {
  const seen = new Set<string>();
  const out: xdr.LedgerKey[] = [];
  for (const key of keys) {
    const id = key.toXDR('base64');
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(key);
  }
  return out;
}

function isContractCodeOrInstanceKey(key: xdr.LedgerKey): boolean {
  const kind = key.switch().name;
  if (kind === 'contractCode') return true;
  if (kind === 'contractData') {
    return (
      key.contractData().key().switch().name === 'scvLedgerKeyContractInstance'
    );
  }
  return false;
}

/** Keys that ExtendFootprintTTL may touch (no temporary / classic entries). */
function isExtendableLedgerKey(key: xdr.LedgerKey): boolean {
  const kind = key.switch().name;
  if (kind === 'contractCode') return true;
  if (kind === 'contractData') {
    return key.contractData().durability().name === 'persistent';
  }
  return false;
}

/**
 * Protocol 23 auto-restores archived WASM inside the invoke and bills ~20 XLM.
 * Simulation marks those entries as `created` in `stateChanges`.
 */
export function claimSimulationRestoresArchivedCode(
  simulation: SorobanRpc.Api.SimulateTransactionSuccessResponse
): boolean {
  const changes = simulation.stateChanges;
  if (!changes?.length) return false;
  return changes.some((change) => {
    // Protocol 23 auto-restore shows archived code/instance as created (before=null).
    if (change.before !== null || !change.key) return false;
    return isContractCodeOrInstanceKey(change.key);
  });
}

/**
 * ExtendFootprintTTL requires a readOnly-only footprint (readWrite empty).
 */
export function sorobanDataForFootprintTtlExtend(
  invokeTxData: xdr.SorobanTransactionData
): xdr.SorobanTransactionData {
  const builder = new SorobanDataBuilder(invokeTxData);
  const keys = uniqueLedgerKeys([
    ...builder.getReadOnly(),
    ...builder.getReadWrite(),
  ]).filter(isExtendableLedgerKey);

  if (keys.length === 0) {
    throw new Error(
      'No extendable contract code/data keys found in claim footprint'
    );
  }

  return new SorobanDataBuilder(invokeTxData)
    .setReadOnly(keys)
    .setReadWrite([])
    .build();
}

/** RestoreFootprint requires readWrite-only footprint (readOnly empty). */
export function sorobanDataForArchivalRestore(
  invokeTxData: xdr.SorobanTransactionData
): xdr.SorobanTransactionData {
  const builder = new SorobanDataBuilder(invokeTxData);
  const keys = uniqueLedgerKeys([
    ...builder.getReadOnly(),
    ...builder.getReadWrite(),
  ]).filter(isContractCodeOrInstanceKey);

  if (keys.length === 0) {
    throw new Error('No archived contract code/instance keys found to restore');
  }

  return new SorobanDataBuilder().setReadOnly([]).setReadWrite(keys).build();
}

/**
 * Assemble a Soroban invoke from simulation, with fee capped at 1 XLM.
 * Throws if the simulated resource fee alone already exceeds the cap.
 */
export function assembleClaimPointsTransaction(
  raw: Transaction,
  simulation: SorobanRpc.Api.SimulateTransactionSuccessResponse,
  inclusionFee: number
): Transaction {
  const minResourceFee = Number(simulation.minResourceFee) || 0;
  if (minResourceFee > CLAIM_POINTS_MAX_FEE_STROOPS - inclusionFee) {
    const archived = claimSimulationRestoresArchivedCode(simulation);
    throw new Error(
      `Claim resource fee is ${formatStroopsAsXlm(minResourceFee)} XLM ` +
        `(${minResourceFee} stroops), above the ${formatStroopsAsXlm(CLAIM_POINTS_MAX_FEE_STROOPS)} XLM cap. ` +
        (archived
          ? 'Contract WASM is still archived — fund the rewards signer and restore, then retry.'
          : 'TTL extend may have failed or rent is still required — retry shortly.')
    );
  }

  const fee = claimPointsFeeStroops(inclusionFee, minResourceFee);
  const assembled = assembleTransaction(raw, simulation).build();
  const op = assembled.operations[0];
  if (op.type !== 'invokeHostFunction') {
    throw new Error('Expected invokeHostFunction after assemble');
  }

  const builder = TransactionBuilder.cloneFrom(assembled, {
    fee: String(fee),
    networkPassphrase: assembled.networkPassphrase,
    sorobanData: simulation.transactionData.build(),
  });
  builder.clearOperations();
  builder.addOperation(
    Operation.invokeHostFunction({
      source: op.source,
      func: op.func,
      auth: op.auth ?? [],
    })
  );
  return builder.build();
}

async function waitForTx(
  rpc: SorobanRpc.Server,
  hash: string,
  label: string
): Promise<void> {
  for (let i = 0; i < 30; i++) {
    const status = await rpc.getTransaction(hash);
    if (status.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
      return;
    }
    if (status.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(`${label} transaction failed on-chain`);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  // Not confirmed yet — caller will re-simulate; often still ok.
}

/** Snapshot ledger sequence from Soroban RPC (avoids Horizon lag / mutated Account). */
export async function loadClaimPointsSigningAccount(
  rpc: SorobanRpc.Server,
  accountId: string
): Promise<Account> {
  const latest = await rpc.getAccount(accountId);
  return new Account(latest.accountId(), latest.sequenceNumber());
}

function isBadSeqError(errorResult: unknown): boolean {
  const raw =
    typeof errorResult === 'string'
      ? errorResult
      : JSON.stringify(errorResult ?? '');
  return raw.includes('txBadSeq');
}

export function claimPointsSendIsBadSeq(errorResult: unknown): boolean {
  return isBadSeqError(errorResult);
}

async function sendSignedSorobanTx(params: {
  rpc: SorobanRpc.Server;
  keypair: Keypair;
  label: string;
  buildAndSign: () => Promise<Transaction> | Transaction;
}): Promise<string> {
  const { rpc, keypair, label, buildAndSign } = params;

  for (let attempt = 0; attempt < 2; attempt++) {
    const tx = await buildAndSign();
    tx.sign(keypair);
    const sendResult = await rpc.sendTransaction(tx);
    if (sendResult.errorResult) {
      if (attempt === 0 && isBadSeqError(sendResult.errorResult)) {
        console.warn(
          `[claim-points] ${label} hit txBadSeq; reloading sequence and retrying`
        );
        continue;
      }
      const errMsg =
        typeof sendResult.errorResult === 'string'
          ? sendResult.errorResult
          : JSON.stringify(sendResult.errorResult);
      throw new Error(`${label} failed: ${errMsg}`);
    }
    if (!sendResult.hash) {
      throw new Error(`${label} returned no transaction hash`);
    }
    await waitForTx(rpc, sendResult.hash, label);
    return sendResult.hash;
  }

  throw new Error(`${label} failed after sequence retry`);
}

async function freshSigningAccount(
  rpc: SorobanRpc.Server,
  accountId: string
): Promise<Account> {
  return loadClaimPointsSigningAccount(rpc, accountId);
}

/**
 * When Protocol 23 would auto-restore archived WASM inside the claim (~20 XLM),
 * restore code/instance first so the claim itself stays under 1 XLM.
 */
export async function restoreArchivedClaimCodeIfNeeded(params: {
  rpc: SorobanRpc.Server;
  accountId: string;
  keypair: Keypair;
  networkPassphrase: string;
  simulation: SorobanRpc.Api.SimulateTransactionSuccessResponse;
  inclusionFee: number;
  nativeBalanceXlm?: string | null;
}): Promise<boolean> {
  const {
    rpc,
    accountId,
    keypair,
    networkPassphrase,
    simulation,
    inclusionFee,
    nativeBalanceXlm,
  } = params;

  const minResourceFee = Number(simulation.minResourceFee) || 0;
  const overClaimCap =
    minResourceFee > CLAIM_POINTS_MAX_FEE_STROOPS - inclusionFee;
  if (!overClaimCap || !claimSimulationRestoresArchivedCode(simulation)) {
    return false;
  }

  console.log(
    `[claim-points] Restoring archived contract WASM/instance (claim would cost ${formatStroopsAsXlm(minResourceFee)} XLM via auto-restore)`
  );

  const restoreData = sorobanDataForArchivalRestore(
    simulation.transactionData.build()
  );

  await sendSignedSorobanTx({
    rpc,
    keypair,
    label: 'Archival restore',
    buildAndSign: async () => {
      const source = await freshSigningAccount(rpc, accountId);
      const draft = new TransactionBuilder(source, {
        fee: String(inclusionFee),
        networkPassphrase,
        sorobanData: restoreData,
      })
        .addOperation(Operation.restoreFootprint({}))
        .setTimeout(60)
        .build();

      const restoreSim = await rpc.simulateTransaction(draft);
      if (SorobanRpc.Api.isSimulationError(restoreSim)) {
        const details = restoreSim.error
          ? JSON.stringify(restoreSim.error)
          : 'Unknown restore simulation error';
        throw new Error(`Archival restore simulation failed: ${details}`);
      }

      const restoreResourceFee = Number(restoreSim.minResourceFee) || 0;
      if (
        restoreResourceFee >
        CLAIM_POINTS_RESTORE_MAX_FEE_STROOPS - inclusionFee
      ) {
        throw new Error(
          `Archival restore requires ${formatStroopsAsXlm(restoreResourceFee)} XLM, ` +
            `above the ${formatStroopsAsXlm(CLAIM_POINTS_RESTORE_MAX_FEE_STROOPS)} XLM restore cap.`
        );
      }

      const neededStroops = inclusionFee + restoreResourceFee;
      if (nativeBalanceXlm != null) {
        const balanceStroops = Math.floor(
          parseFloat(nativeBalanceXlm) * 10_000_000
        );
        // Leave a little headroom for the subsequent claim.
        const reserve = CLAIM_POINTS_MAX_FEE_STROOPS;
        if (balanceStroops < neededStroops + reserve) {
          throw new Error(
            `Rewards signer needs ~${formatStroopsAsXlm(neededStroops + reserve)} XLM ` +
              `for a one-time contract WASM restore (has ${nativeBalanceXlm} XLM). ` +
              `Fund ${accountId}, then retry — later claims stay under 1 XLM.`
          );
        }
      }

      const fee = claimPointsFeeStroops(
        inclusionFee,
        restoreResourceFee,
        CLAIM_POINTS_RESTORE_MAX_FEE_STROOPS
      );
      const assembled = assembleTransaction(draft, restoreSim).build();
      return TransactionBuilder.cloneFrom(assembled, {
        fee: String(fee),
        networkPassphrase,
        sorobanData: restoreSim.transactionData.build(),
      }).build();
    },
  });

  return true;
}

/**
 * When claim simulation prices in WASM rent (~tens of XLM) but entries are
 * already live, extend footprint TTL first (typically << 0.01 XLM).
 */
export async function extendClaimPointsFootprintTtlIfNeeded(params: {
  rpc: SorobanRpc.Server;
  accountId: string;
  keypair: Keypair;
  networkPassphrase: string;
  simulation: SorobanRpc.Api.SimulateTransactionSuccessResponse;
  inclusionFee: number;
}): Promise<boolean> {
  const {
    rpc,
    accountId,
    keypair,
    networkPassphrase,
    simulation,
    inclusionFee,
  } = params;

  const minResourceFee = Number(simulation.minResourceFee) || 0;
  if (minResourceFee <= CLAIM_POINTS_MAX_FEE_STROOPS - inclusionFee) {
    return false;
  }

  // Archived WASM must be restored, not extended.
  if (claimSimulationRestoresArchivedCode(simulation)) {
    return false;
  }

  console.log(
    `[claim-points] Extending footprint TTL (claim resource fee ${formatStroopsAsXlm(minResourceFee)} XLM exceeds cap)`
  );

  const extendTo = CLAIM_POINTS_TTL_EXTEND_LEDGERS;
  const extendData = sorobanDataForFootprintTtlExtend(
    simulation.transactionData.build()
  );

  await sendSignedSorobanTx({
    rpc,
    keypair,
    label: 'TTL extend',
    buildAndSign: async () => {
      const source = await freshSigningAccount(rpc, accountId);
      const draft = new TransactionBuilder(source, {
        fee: String(inclusionFee),
        networkPassphrase,
        sorobanData: extendData,
      })
        .addOperation(Operation.extendFootprintTtl({ extendTo }))
        .setTimeout(60)
        .build();

      const extendSim = await rpc.simulateTransaction(draft);
      if (SorobanRpc.Api.isSimulationError(extendSim)) {
        const details = extendSim.error
          ? JSON.stringify(extendSim.error)
          : 'Unknown extend simulation error';
        throw new Error(`TTL extend simulation failed: ${details}`);
      }

      const extendResourceFee = Number(extendSim.minResourceFee) || 0;
      if (extendResourceFee > CLAIM_POINTS_MAX_FEE_STROOPS - inclusionFee) {
        throw new Error(
          `TTL extend requires ${formatStroopsAsXlm(extendResourceFee)} XLM, ` +
            `above the ${formatStroopsAsXlm(CLAIM_POINTS_MAX_FEE_STROOPS)} XLM cap.`
        );
      }

      const fee = claimPointsFeeStroops(inclusionFee, extendResourceFee);
      const assembled = assembleTransaction(draft, extendSim).build();
      const finalData = sorobanDataForFootprintTtlExtend(
        extendSim.transactionData.build()
      );
      return TransactionBuilder.cloneFrom(assembled, {
        fee: String(fee),
        networkPassphrase,
        sorobanData: finalData,
      }).build();
    },
  });

  return true;
}

/**
 * If simulation requires restoring expired footprints via restorePreamble,
 * submit that restore first (capped at restore max). Returns true when sent.
 */
export async function restoreClaimPointsFootprintIfNeeded(params: {
  rpc: SorobanRpc.Server;
  accountId: string;
  keypair: Keypair;
  networkPassphrase: string;
  simulation: SorobanRpc.Api.SimulateTransactionRestoreResponse;
  inclusionFee: number;
}): Promise<boolean> {
  const {
    rpc,
    accountId,
    keypair,
    networkPassphrase,
    simulation,
    inclusionFee,
  } = params;

  if (!SorobanRpc.Api.isSimulationRestore(simulation)) {
    return false;
  }

  const restoreFeeNeeded =
    Number(simulation.restorePreamble.minResourceFee) || 0;
  if (restoreFeeNeeded > CLAIM_POINTS_RESTORE_MAX_FEE_STROOPS - inclusionFee) {
    throw new Error(
      `Footprint restore requires ${formatStroopsAsXlm(restoreFeeNeeded)} XLM, ` +
        `above the ${formatStroopsAsXlm(CLAIM_POINTS_RESTORE_MAX_FEE_STROOPS)} XLM restore fee cap.`
    );
  }

  await sendSignedSorobanTx({
    rpc,
    keypair,
    label: 'Footprint restore',
    buildAndSign: async () => {
      const source = await freshSigningAccount(rpc, accountId);
      const fee = claimPointsFeeStroops(
        inclusionFee,
        restoreFeeNeeded,
        CLAIM_POINTS_RESTORE_MAX_FEE_STROOPS
      );
      return new TransactionBuilder(source, {
        fee: String(fee),
        networkPassphrase,
        sorobanData: simulation.restorePreamble.transactionData.build(),
      })
        .addOperation(Operation.restoreFootprint({}))
        .setTimeout(30)
        .build();
    },
  });

  return true;
}
