import {
  Asset,
  Horizon,
  Keypair,
  Operation,
  Transaction,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import { privyWalletRawSignTransactionHash } from '@/lib/privy-server-rest';
import {
  ensureStellarRailUserWallet,
  resolveStellarPrivyWalletIdForUser,
} from '@/lib/privy/stellar-rail-wallet';
import {
  finalizeTreasuryStellarSetupRow,
  insertTreasuryStellarSetupRow,
} from '@/lib/db/treasury-transactions';
import { updateSpendWalletReadinessFields } from '@/lib/db/spend-wallet-readiness';
import { updateSpendSessionRailUserWalletAddress } from '@/lib/db/spend-sessions';
import { explorerTxUrlForSpendLedger } from '@/lib/spend-ledger-explorer-url';
import {
  spendRailErrorNetworkUnavailable,
  spendRailErrorTreasuryInsufficientFunds,
  spendRailErrorWalletReadinessFailed,
  spendRailErrorWalletUnavailable,
  type SpendRailError,
} from '@/lib/spend/payment-rails/errors';
import type { SpendWalletReadinessOperation } from '@/lib/types';
import {
  createStellarSpendHorizonServer,
  getStellarSpendCreateAccountStartingBalance,
  getStellarSpendNetworkPassphrase,
  getStellarSpendUsdcAssetCode,
  getStellarSpendUsdcIssuer,
  parseStellarSpendSponsorKeypair,
} from '@/lib/spend/stellar-wallet-readiness-config';
import { isStellarReadinessSubmittedMetadataStale } from '@/lib/spend/stellar-wallet-readiness-stale';

export { STELLAR_WALLET_READINESS_STALE_SUBMITTED_MS } from '@/lib/spend/stellar-wallet-readiness-stale';

/** Stable `step_metadata.current_step` values for clients (IRL-18). */
export const STELLAR_WALLET_READINESS_CURRENT_STEP = {
  wallet_provisioning: 'wallet_provisioning',
  account_activation_submitting: 'account_activation_submitting',
  account_activation_confirming: 'account_activation_confirming',
  trustline_submitting: 'trustline_submitting',
  trustline_confirming: 'trustline_confirming',
} as const;

export type StellarWalletReadinessCurrentStep =
  (typeof STELLAR_WALLET_READINESS_CURRENT_STEP)[keyof typeof STELLAR_WALLET_READINESS_CURRENT_STEP];

const HORIZON_TX_POLL_ATTEMPTS = 8;
const HORIZON_TX_POLL_INTERVAL_MS = 1500;

type TrustlineSetupFailurePhase =
  | 'trustline_transaction_build'
  | 'trustline_raw_sign'
  | 'trustline_signature_attach'
  | 'trustline_fee_bump_build'
  | 'trustline_horizon_submit';

export type StellarWalletReadinessOrchestrationOutput =
  | { ok: true; status: 'completed'; address: string }
  | { ok: true; status: 'pending'; address: string | null }
  | { ok: true; status: 'needs_review'; address: string | null }
  | { ok: false; error: SpendRailError };

function mergeMeta(
  base: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  return { ...base, ...patch };
}

function classifyHorizonSubmit(e: unknown): SpendRailError {
  const raw = e instanceof Error ? e.message : String(e);
  const s = raw.toLowerCase();
  if (
    s.includes('fetch') ||
    s.includes('econn') ||
    s.includes('timeout') ||
    s.includes('socket') ||
    s.includes('502') ||
    s.includes('503') ||
    s.includes('504')
  ) {
    return spendRailErrorNetworkUnavailable();
  }
  if (
    s.includes('underfunded') ||
    s.includes('op_underfunded') ||
    s.includes('insufficient balance')
  ) {
    return spendRailErrorTreasuryInsufficientFunds();
  }
  return spendRailErrorWalletReadinessFailed();
}

function horizonLikeErrorResponse(
  e: unknown
): { status?: number; data?: unknown } | undefined {
  if (e === null || typeof e !== 'object') return undefined;
  const response = (e as { response?: { status?: number; data?: unknown } })
    .response;
  return response && typeof response === 'object' ? response : undefined;
}

async function loadAccountOrNull(
  server: Horizon.Server,
  publicKey: string
): Promise<Horizon.AccountResponse | null> {
  try {
    return await server.loadAccount(publicKey);
  } catch (e: unknown) {
    const status = horizonLikeErrorResponse(e)?.status;
    if (status === 404) return null;
    throw e;
  }
}

function hasUsdcTrustline(
  account: Horizon.AccountResponse,
  code: string,
  issuer: string
): boolean {
  for (const b of account.balances) {
    if (
      b.asset_type !== 'credit_alphanum4' &&
      b.asset_type !== 'credit_alphanum12'
    ) {
      continue;
    }
    if (b.asset_code === code && b.asset_issuer === issuer) return true;
  }
  return false;
}

function diagnosticsFromTrustlineSetupError(
  phase: TrustlineSetupFailurePhase,
  e: unknown,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  const err = e instanceof Error ? e : null;
  const response = horizonLikeErrorResponse(e);
  const data =
    response?.data && typeof response.data === 'object'
      ? (response.data as Record<string, unknown>)
      : null;
  return {
    phase,
    ...extra,
    ...(err
      ? {
          error_name: err.name,
          error_message: err.message.slice(0, 4000),
        }
      : { error_message: String(e).slice(0, 4000) }),
    ...(response?.status ? { horizon_status: response.status } : {}),
    ...(typeof data?.title === 'string' ? { horizon_title: data.title } : {}),
    ...(typeof data?.detail === 'string'
      ? { horizon_detail: data.detail.slice(0, 1000) }
      : {}),
    ...(data?.extras && typeof data.extras === 'object'
      ? { horizon_extras: data.extras }
      : {}),
  };
}

async function failTrustlineSetup(input: {
  rowId: string;
  stepMeta: Record<string, unknown>;
  phase: TrustlineSetupFailurePhase;
  error: unknown;
  extra?: Record<string, unknown>;
}): Promise<StellarWalletReadinessOrchestrationOutput> {
  const railError = classifyHorizonSubmit(input.error);
  try {
    await updateSpendWalletReadinessFields(input.rowId, {
      status: 'failed',
      step_metadata: input.stepMeta,
      sanitized_error_category: railError.category,
      sanitized_error_code: railError.analyticsCode,
      internal_diagnostics: diagnosticsFromTrustlineSetupError(
        input.phase,
        input.error,
        input.extra
      ),
    });
  } catch (persistErr) {
    console.error('stellar_usdc trustline failure diagnostics persist:', {
      phase: input.phase,
      error: persistErr,
    });
  }
  return { ok: false, error: railError };
}

async function waitForHorizonTxSuccess(
  server: Horizon.Server,
  txHash: string
): Promise<'success' | 'failed' | 'pending'> {
  const h = txHash.trim().toLowerCase();
  for (let i = 0; i < HORIZON_TX_POLL_ATTEMPTS; i += 1) {
    try {
      const tx = await server.transactions().transaction(h).call();
      if (tx.successful) return 'success';
      return 'failed';
    } catch (e: unknown) {
      const status = horizonLikeErrorResponse(e)?.status;
      if (status === 404) {
        await new Promise((r) => setTimeout(r, HORIZON_TX_POLL_INTERVAL_MS));
        continue;
      }
      throw e;
    }
  }
  return 'pending';
}

export async function runStellarUsdcWalletReadinessOrchestration(input: {
  readinessRow: SpendWalletReadinessOperation;
  spendSessionId: string;
  spendExperienceId: string | undefined;
  sessionOwnerPrivyUserId: string;
}): Promise<StellarWalletReadinessOrchestrationOutput> {
  const {
    readinessRow,
    spendSessionId,
    spendExperienceId,
    sessionOwnerPrivyUserId,
  } = input;
  const rowId = readinessRow.id;
  let stepMeta: Record<string, unknown> = {
    ...readinessRow.step_metadata,
  };

  const passphrase = getStellarSpendNetworkPassphrase();
  const usdcCode = getStellarSpendUsdcAssetCode();
  const usdcIssuer = getStellarSpendUsdcIssuer();
  if (!usdcIssuer) {
    return {
      ok: false,
      error: spendRailErrorWalletReadinessFailed(),
    };
  }

  const server = createStellarSpendHorizonServer();

  let sponsor: Keypair;
  try {
    sponsor = parseStellarSpendSponsorKeypair();
  } catch {
    return {
      ok: false,
      error: spendRailErrorWalletReadinessFailed(),
    };
  }

  if (readinessRow.status === 'needs_review') {
    const addr = readinessRow.rail_user_wallet_address?.trim() ?? null;
    if (!addr) {
      return { ok: true, status: 'needs_review', address: null };
    }
    try {
      const acct = await loadAccountOrNull(server, addr);
      if (acct && hasUsdcTrustline(acct, usdcCode, usdcIssuer)) {
        stepMeta = mergeMeta(stepMeta, {
          current_step:
            STELLAR_WALLET_READINESS_CURRENT_STEP.trustline_confirming,
          trustline_confirmed: true,
        });
        await updateSpendWalletReadinessFields(rowId, {
          status: 'completed',
          rail_user_wallet_address: addr,
          step_metadata: stepMeta,
          sanitized_error_category: null,
          sanitized_error_code: null,
          internal_diagnostics: null,
        });
        await updateSpendSessionRailUserWalletAddress(spendSessionId, addr);
        return { ok: true, status: 'completed', address: addr };
      }
    } catch {
      return { ok: true, status: 'needs_review', address: addr };
    }
    return { ok: true, status: 'needs_review', address: addr };
  }

  if (
    readinessRow.status === 'pending' &&
    isStellarReadinessSubmittedMetadataStale(stepMeta) &&
    (typeof stepMeta.activation_tx_hash === 'string' ||
      typeof stepMeta.trustline_tx_hash === 'string')
  ) {
    stepMeta = mergeMeta(stepMeta, {
      current_step: STELLAR_WALLET_READINESS_CURRENT_STEP.trustline_confirming,
      stale_submitted: true,
    });
    await updateSpendWalletReadinessFields(rowId, {
      status: 'needs_review',
      step_metadata: stepMeta,
      sanitized_error_category: 'wallet_readiness_failed',
      sanitized_error_code: 'spend_rail_wallet_readiness_needs_review',
      internal_diagnostics: { reason: 'stale_submitted_setup' },
    });
    return {
      ok: true,
      status: 'needs_review',
      address: readinessRow.rail_user_wallet_address?.trim() ?? null,
    };
  }

  let stellar: Awaited<ReturnType<typeof ensureStellarRailUserWallet>>;
  try {
    stellar = await ensureStellarRailUserWallet(sessionOwnerPrivyUserId);
  } catch {
    return { ok: false, error: spendRailErrorWalletUnavailable() };
  }

  const userPub = stellar.address.trim();
  let walletId = stellar.walletId?.trim();
  if (!walletId) {
    try {
      walletId = await resolveStellarPrivyWalletIdForUser(
        sessionOwnerPrivyUserId,
        userPub
      );
    } catch {
      return { ok: false, error: spendRailErrorWalletUnavailable() };
    }
  }

  stepMeta = mergeMeta(stepMeta, {
    current_step: STELLAR_WALLET_READINESS_CURRENT_STEP.wallet_provisioning,
    stellar_wallet_provisioned: stellar.provisioned,
  });
  await updateSpendWalletReadinessFields(rowId, {
    rail_user_wallet_address: userPub,
    step_metadata: stepMeta,
  });

  let userAccount = await loadAccountOrNull(server, userPub);

  const existingActivationHash =
    typeof stepMeta.activation_tx_hash === 'string'
      ? stepMeta.activation_tx_hash.trim()
      : '';
  if (!userAccount && existingActivationHash) {
    const actPoll = await waitForHorizonTxSuccess(
      server,
      existingActivationHash
    );
    if (actPoll === 'pending') {
      stepMeta = mergeMeta(stepMeta, {
        current_step:
          STELLAR_WALLET_READINESS_CURRENT_STEP.account_activation_confirming,
      });
      await updateSpendWalletReadinessFields(rowId, {
        status: 'pending',
        step_metadata: stepMeta,
      });
      return { ok: true, status: 'pending', address: userPub };
    }
    if (actPoll === 'failed') {
      await updateSpendWalletReadinessFields(rowId, {
        status: 'failed',
        sanitized_error_category: 'wallet_readiness_failed',
        sanitized_error_code: 'spend_rail_wallet_readiness_failed',
        internal_diagnostics: { activation_tx_hash: existingActivationHash },
      });
      return { ok: false, error: spendRailErrorWalletReadinessFailed() };
    }
    userAccount = await loadAccountOrNull(server, userPub);
  }

  if (!userAccount) {
    stepMeta = mergeMeta(stepMeta, {
      current_step:
        STELLAR_WALLET_READINESS_CURRENT_STEP.account_activation_submitting,
    });
    await updateSpendWalletReadinessFields(rowId, { step_metadata: stepMeta });

    let sponsorAccount: Horizon.AccountResponse;
    try {
      sponsorAccount = await server.loadAccount(sponsor.publicKey());
    } catch (e) {
      return { ok: false, error: classifyHorizonSubmit(e) };
    }

    const startBal = getStellarSpendCreateAccountStartingBalance();
    const activationTx = new TransactionBuilder(sponsorAccount, {
      fee: (await server.fetchBaseFee()).toString(),
      networkPassphrase: passphrase,
    })
      .addOperation(
        Operation.createAccount({
          destination: userPub,
          startingBalance: startBal,
        })
      )
      .setTimeout(180)
      .build();
    activationTx.sign(sponsor);

    let sponsorTreasuryId: string | null =
      readinessRow.sponsor_treasury_transaction_id;
    if (spendExperienceId && !sponsorTreasuryId) {
      const corr = crypto.randomUUID();
      try {
        sponsorTreasuryId = await insertTreasuryStellarSetupRow({
          spendExperienceId,
          transactionType: 'stellar_account_activation',
          fromWalletAddress: sponsor.publicKey(),
          toWalletAddress: userPub,
          pendingTxCorrelation: corr,
        });
      } catch (e) {
        console.error('insertTreasuryStellarSetupRow activation:', e);
      }
    }

    if (sponsorTreasuryId) {
      await updateSpendWalletReadinessFields(rowId, {
        sponsor_treasury_transaction_id: sponsorTreasuryId,
      });
    }

    let activationHash: string;
    try {
      const res = await server.submitTransaction(activationTx);
      activationHash = res.hash;
    } catch (e) {
      return { ok: false, error: classifyHorizonSubmit(e) };
    }

    stepMeta = mergeMeta(stepMeta, {
      current_step:
        STELLAR_WALLET_READINESS_CURRENT_STEP.account_activation_confirming,
      activation_tx_hash: activationHash,
      activation_tx_submitted_at: new Date().toISOString(),
    });
    await updateSpendWalletReadinessFields(rowId, { step_metadata: stepMeta });

    const actOutcome = await waitForHorizonTxSuccess(server, activationHash);
    if (actOutcome === 'pending') {
      await updateSpendWalletReadinessFields(rowId, {
        status: 'pending',
        step_metadata: stepMeta,
      });
      return { ok: true, status: 'pending', address: userPub };
    }
    if (actOutcome === 'failed') {
      await updateSpendWalletReadinessFields(rowId, {
        status: 'failed',
        sanitized_error_category: 'wallet_readiness_failed',
        sanitized_error_code: 'spend_rail_wallet_readiness_failed',
        internal_diagnostics: { activation_tx_hash: activationHash },
      });
      return { ok: false, error: spendRailErrorWalletReadinessFailed() };
    }

    if (sponsorTreasuryId && spendExperienceId) {
      const explorerUrl = explorerTxUrlForSpendLedger(
        'stellar_usdc',
        activationHash
      );
      try {
        await finalizeTreasuryStellarSetupRow({
          id: sponsorTreasuryId,
          txHashNormalized: activationHash.toLowerCase(),
          explorerTxUrl: explorerUrl,
          status: 'confirmed',
        });
      } catch (e) {
        console.error('finalizeTreasuryStellarSetupRow activation:', e);
      }
    }

    userAccount = await loadAccountOrNull(server, userPub);
    if (!userAccount) {
      await updateSpendWalletReadinessFields(rowId, {
        status: 'needs_review',
        internal_diagnostics: { activation_tx_hash: activationHash },
      });
      return { ok: true, status: 'needs_review', address: userPub };
    }
  }

  if (hasUsdcTrustline(userAccount, usdcCode, usdcIssuer)) {
    stepMeta = mergeMeta(stepMeta, {
      current_step: STELLAR_WALLET_READINESS_CURRENT_STEP.trustline_confirming,
      trustline_confirmed: true,
    });
    await updateSpendWalletReadinessFields(rowId, {
      status: 'completed',
      rail_user_wallet_address: userPub,
      step_metadata: stepMeta,
      sanitized_error_category: null,
      sanitized_error_code: null,
      internal_diagnostics: null,
    });
    await updateSpendSessionRailUserWalletAddress(spendSessionId, userPub);
    return { ok: true, status: 'completed', address: userPub };
  }

  const existingTrustHash =
    typeof stepMeta.trustline_tx_hash === 'string'
      ? stepMeta.trustline_tx_hash.trim()
      : '';
  if (existingTrustHash) {
    const trustPoll = await waitForHorizonTxSuccess(server, existingTrustHash);
    if (trustPoll === 'pending') {
      stepMeta = mergeMeta(stepMeta, {
        current_step:
          STELLAR_WALLET_READINESS_CURRENT_STEP.trustline_confirming,
      });
      await updateSpendWalletReadinessFields(rowId, {
        status: 'pending',
        rail_user_wallet_address: userPub,
        step_metadata: stepMeta,
      });
      return { ok: true, status: 'pending', address: userPub };
    }
    if (trustPoll === 'failed') {
      await updateSpendWalletReadinessFields(rowId, {
        status: 'failed',
        sanitized_error_category: 'wallet_readiness_failed',
        sanitized_error_code: 'spend_rail_wallet_readiness_failed',
        internal_diagnostics: { trustline_tx_hash: existingTrustHash },
      });
      return { ok: false, error: spendRailErrorWalletReadinessFailed() };
    }
    const recheck = await loadAccountOrNull(server, userPub);
    if (recheck && hasUsdcTrustline(recheck, usdcCode, usdcIssuer)) {
      stepMeta = mergeMeta(stepMeta, {
        current_step:
          STELLAR_WALLET_READINESS_CURRENT_STEP.trustline_confirming,
        trustline_confirmed: true,
      });
      await updateSpendWalletReadinessFields(rowId, {
        status: 'completed',
        rail_user_wallet_address: userPub,
        step_metadata: stepMeta,
        sanitized_error_category: null,
        sanitized_error_code: null,
        internal_diagnostics: null,
      });
      await updateSpendSessionRailUserWalletAddress(spendSessionId, userPub);
      return { ok: true, status: 'completed', address: userPub };
    }
    await updateSpendWalletReadinessFields(rowId, {
      status: 'needs_review',
      rail_user_wallet_address: userPub,
      internal_diagnostics: { trustline_tx_hash: existingTrustHash },
    });
    return { ok: true, status: 'needs_review', address: userPub };
  }

  stepMeta = mergeMeta(stepMeta, {
    current_step: STELLAR_WALLET_READINESS_CURRENT_STEP.trustline_submitting,
  });
  await updateSpendWalletReadinessFields(rowId, { step_metadata: stepMeta });

  let inner: Transaction;
  try {
    const usdcAsset = new Asset(usdcCode, usdcIssuer);
    inner = new TransactionBuilder(userAccount, {
      fee: '0',
      networkPassphrase: passphrase,
    })
      .addOperation(
        Operation.beginSponsoringFutureReserves({
          sponsoredId: userPub,
          source: sponsor.publicKey(),
        })
      )
      .addOperation(
        Operation.changeTrust({
          asset: usdcAsset,
        })
      )
      .addOperation(
        Operation.endSponsoringFutureReserves({
          source: sponsor.publicKey(),
        })
      )
      .setTimeout(180)
      .build();
    inner.sign(sponsor);
  } catch (e) {
    return failTrustlineSetup({
      rowId,
      stepMeta,
      phase: 'trustline_transaction_build',
      error: e,
      extra: {
        asset_code: usdcCode,
        asset_issuer: usdcIssuer,
        user_public_key: userPub,
      },
    });
  }

  const hash32 = inner.hash();
  let userSig: Buffer;
  try {
    userSig = await privyWalletRawSignTransactionHash({
      walletId,
      hash32,
    });
  } catch (e) {
    return failTrustlineSetup({
      rowId,
      stepMeta,
      phase: 'trustline_raw_sign',
      error: e,
      extra: {
        wallet_id_suffix: walletId.slice(-8),
        user_public_key: userPub,
      },
    });
  }

  const userKp = Keypair.fromPublicKey(userPub);
  try {
    inner.addDecoratedSignature(
      new xdr.DecoratedSignature({
        hint: userKp.signatureHint(),
        signature: userSig,
      })
    );
  } catch (e) {
    return failTrustlineSetup({
      rowId,
      stepMeta,
      phase: 'trustline_signature_attach',
      error: e,
      extra: { user_public_key: userPub },
    });
  }

  let feeBump;
  try {
    const baseFee = (await server.fetchBaseFee()).toString();
    feeBump = TransactionBuilder.buildFeeBumpTransaction(
      sponsor,
      (Number(baseFee) * 10).toString(),
      inner,
      passphrase
    );
    feeBump.sign(sponsor);
  } catch (e) {
    return failTrustlineSetup({
      rowId,
      stepMeta,
      phase: 'trustline_fee_bump_build',
      error: e,
      extra: { user_public_key: userPub },
    });
  }

  let trustlineTreasuryId: string | null =
    readinessRow.trustline_treasury_transaction_id;
  if (spendExperienceId && !trustlineTreasuryId) {
    const corr = crypto.randomUUID();
    try {
      trustlineTreasuryId = await insertTreasuryStellarSetupRow({
        spendExperienceId,
        transactionType: 'stellar_usdc_trustline_setup',
        fromWalletAddress: sponsor.publicKey(),
        toWalletAddress: userPub,
        pendingTxCorrelation: corr,
      });
    } catch (e) {
      console.error('insertTreasuryStellarSetupRow trustline:', e);
    }
  }
  if (trustlineTreasuryId) {
    await updateSpendWalletReadinessFields(rowId, {
      trustline_treasury_transaction_id: trustlineTreasuryId,
    });
  }

  let trustHash: string;
  try {
    const res = await server.submitTransaction(feeBump);
    trustHash = res.hash;
  } catch (e) {
    return failTrustlineSetup({
      rowId,
      stepMeta,
      phase: 'trustline_horizon_submit',
      error: e,
      extra: {
        user_public_key: userPub,
        trustline_treasury_transaction_id: trustlineTreasuryId,
      },
    });
  }

  stepMeta = mergeMeta(stepMeta, {
    current_step: STELLAR_WALLET_READINESS_CURRENT_STEP.trustline_confirming,
    trustline_tx_hash: trustHash,
    trustline_tx_submitted_at: new Date().toISOString(),
  });
  await updateSpendWalletReadinessFields(rowId, { step_metadata: stepMeta });

  const trustOutcome = await waitForHorizonTxSuccess(server, trustHash);
  if (trustOutcome === 'pending') {
    await updateSpendWalletReadinessFields(rowId, {
      status: 'pending',
      rail_user_wallet_address: userPub,
      step_metadata: stepMeta,
    });
    return { ok: true, status: 'pending', address: userPub };
  }
  if (trustOutcome === 'failed') {
    await updateSpendWalletReadinessFields(rowId, {
      status: 'failed',
      sanitized_error_category: 'wallet_readiness_failed',
      sanitized_error_code: 'spend_rail_wallet_readiness_failed',
      internal_diagnostics: { trustline_tx_hash: trustHash },
    });
    return { ok: false, error: spendRailErrorWalletReadinessFailed() };
  }

  if (trustlineTreasuryId && spendExperienceId) {
    const trustExplorer = explorerTxUrlForSpendLedger(
      'stellar_usdc',
      trustHash
    );
    try {
      await finalizeTreasuryStellarSetupRow({
        id: trustlineTreasuryId,
        txHashNormalized: trustHash.toLowerCase(),
        explorerTxUrl: trustExplorer,
        status: 'confirmed',
      });
    } catch (e) {
      console.error('finalizeTreasuryStellarSetupRow trustline:', e);
    }
  }

  const refreshed = await loadAccountOrNull(server, userPub);
  if (!refreshed || !hasUsdcTrustline(refreshed, usdcCode, usdcIssuer)) {
    await updateSpendWalletReadinessFields(rowId, {
      status: 'needs_review',
      rail_user_wallet_address: userPub,
      internal_diagnostics: { trustline_tx_hash: trustHash },
    });
    return { ok: true, status: 'needs_review', address: userPub };
  }

  stepMeta = mergeMeta(stepMeta, {
    current_step: STELLAR_WALLET_READINESS_CURRENT_STEP.trustline_confirming,
    trustline_confirmed: true,
  });
  await updateSpendWalletReadinessFields(rowId, {
    status: 'completed',
    rail_user_wallet_address: userPub,
    step_metadata: stepMeta,
    sanitized_error_category: null,
    sanitized_error_code: null,
    internal_diagnostics: null,
  });
  await updateSpendSessionRailUserWalletAddress(spendSessionId, userPub);
  return { ok: true, status: 'completed', address: userPub };
}
