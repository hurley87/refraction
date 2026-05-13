'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePrivy, useSendTransaction, useWallets } from '@privy-io/react-auth';
import { ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SpendPageShell } from '@/components/spend/spend-page-shell';
import { SpendPrimaryButton } from '@/components/spend/spend-primary-button';
import { Button } from '@/components/ui/button';
import type {
  PointConversion,
  SpendExperience,
  SpendPaymentOperationClientSummary,
  SpendSession,
  SpendTransaction,
} from '@/lib/types';
import { initMixpanel, trackEvent } from '@/lib/analytics';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { apiClient, ApiError } from '@/lib/api/client';
import {
  SPEND_ELIGIBILITY_MESSAGES,
  type SpendEligibilityStatus,
} from '@/lib/spend-eligibility-messages';
import type { SpendRailClientSummary } from '@/lib/spend-rail-config/types';
import {
  resolveSpendReceiptPaymentExplorerUrl,
  SPEND_RECEIPT_EXPLORER_LINK_LABEL,
  spendReceiptPaymentStatusLabel,
} from '@/lib/spend-rail-explorer-url-client';
import { isEvmAddress } from '@/lib/walletconnect-poster-direct-usdc';
import { stellarWalletAddressSchema } from '@/lib/schemas/player';
import {
  isSpendPaymentPrepareStoredActionV1,
  isSpendStellarUsdcBackendSubmitPreparedActionV1,
} from '@/lib/spend-payment-prepare-types';

type SpendExperiencePageProps = {
  experienceId: string;
  initialExperience: SpendExperience;
};

type SessionResponse = {
  session: SpendSession;
  spendExperience: SpendExperience;
  created: boolean;
  spendRailSummary: SpendRailClientSummary;
};

type ConversionPreviewResponse = {
  eligibility: {
    status: SpendEligibilityStatus;
    message: string;
    preview: {
      pointsRequired: number;
      usdcAmount: number;
      receivingWalletAddress: string;
      treasuryWalletAddress: string;
      userPointsBalance: number | null;
      userUsdcBalance: number | null;
      treasuryUsdcBalance: number | null;
    } | null;
  };
  spendExperience: SpendExperience;
  session: Pick<SpendSession, 'id' | 'status' | 'expires_at'>;
  spendRailSummary: SpendRailClientSummary;
};

type ConversionConfirmResponse = {
  pointConversion: PointConversion;
  session: Pick<SpendSession, 'id' | 'status' | 'expires_at'>;
  spendExperience: {
    id: string;
    title: string;
    spend_rail: SpendExperience['spend_rail'];
    pointsRequired: number;
    usdcAmount: number;
  };
  spendRailSummary: SpendRailClientSummary;
  resumed: boolean;
  clientHint: 'funded' | 'processing';
};

type PaymentConfirmResponse = {
  spendTransaction: SpendTransaction;
  spendRailSummary: SpendRailClientSummary;
  session: Pick<SpendSession, 'id' | 'status' | 'expires_at' | 'completed_at'>;
  resumed: boolean;
  paymentOperation?: SpendPaymentOperationClientSummary;
};

type PaymentPrepareResponse = {
  preparedAction: Record<string, unknown>;
  spendRailSummary: SpendRailClientSummary;
  session: Pick<SpendSession, 'id' | 'status' | 'expires_at'>;
  paymentOperation: SpendPaymentOperationClientSummary;
};

type ReceiptResponse = {
  session: SpendSession;
  spendExperience: SpendExperience;
  pointConversion: PointConversion | null;
  spendTransaction: SpendTransaction | null;
  eligibility: ConversionPreviewResponse['eligibility'];
  spendRailSummary: SpendRailClientSummary;
};

const WALLET_STEP_TIMEOUT_MS = 180_000;

const SPEND_TOAST_CONVERSION_ERROR =
  "We couldn't complete that step. Please try again, or contact support if it keeps happening.";
const SPEND_TOAST_PAYMENT_ERROR =
  "We couldn't record your payment. Please try again, or contact support if it keeps happening.";
const SPEND_TOAST_WALLET_ERROR =
  'Something went wrong with your wallet or network. Please try again in a moment.';

function isPaymentNeedsReviewFromApiError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  const d = error.details as
    | { paymentOperation?: { status?: string } }
    | undefined;
  return d?.paymentOperation?.status === 'needs_review';
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = window.setTimeout(() => {
      reject(
        new Error(
          `${label} timed out. Check your wallet or network, then try again.`
        )
      );
    }, ms);
    promise
      .then((v) => {
        clearTimeout(id);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(id);
        reject(e);
      });
  });
}

/** POST with Bearer token + JSON body. */
async function spendAuthedPost<T>(
  token: string,
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  return apiClient<T>(path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

async function spendAuthedGet<T>(token: string, path: string): Promise<T> {
  return apiClient<T>(path, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

function eligibilityToneClass(status: SpendEligibilityStatus): string {
  if (
    status === 'eligible' ||
    status === 'ready_for_payment' ||
    status === 'ready_for_payment_own_usdc' ||
    status === 'payment_complete'
  ) {
    return 'body-small font-grotesk text-emerald-800';
  }
  if (status === 'conversion_failed_retry_exhausted') {
    return 'body-small font-grotesk text-red-800';
  }
  return 'body-small font-grotesk text-amber-900';
}

/** After a points→USDC conversion (or that path through payment), balances reflect deducted points and funded USDC. */
function isPostPointsConversionFlow(status: SpendEligibilityStatus): boolean {
  return (
    status === 'ready_for_payment' ||
    status === 'conversion_in_progress' ||
    status === 'payment_failed' ||
    status === 'payment_complete'
  );
}

/**
 * Spend pilot: opens from QR at `/spend/{experienceId}`; creates/returns a session when authed.
 */
export function SpendExperiencePage({
  experienceId,
  initialExperience,
}: SpendExperiencePageProps) {
  const { user, login, getAccessToken } = usePrivy();
  const { sendTransaction } = useSendTransaction();
  const { wallets } = useWallets();
  const queryClient = useQueryClient();
  const walletAddress = user?.wallet?.address;
  const [trackedScan, setTrackedScan] = useState(false);

  const evmWallet = useMemo(() => {
    if (!walletAddress) return null;
    const lower = walletAddress.toLowerCase();
    const privyEmbedded = wallets.find(
      (w) => w.walletClientType === 'privy' && w.address.toLowerCase() === lower
    );
    if (privyEmbedded) return privyEmbedded;
    return (
      wallets.find((w) => w.address.toLowerCase() === lower) ??
      wallets[0] ??
      null
    );
  }, [walletAddress, wallets]);

  const {
    data: sessionPayload,
    isFetching,
    isError: sessionError,
  } = useQuery({
    queryKey: ['spend-session', experienceId, user?.id, walletAddress] as const,
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token || !walletAddress) {
        throw new Error('Missing auth');
      }
      return spendAuthedPost<SessionResponse>(
        token,
        `/api/spend-experiences/${experienceId}/sessions`,
        { walletAddress }
      );
    },
    enabled: Boolean(user && walletAddress),
    retry: false,
  });

  const sessionId = sessionPayload?.session?.id;

  const { data: previewPayload, isFetching: previewLoading } = useQuery({
    queryKey: [
      'spend-conversion-preview',
      sessionId,
      user?.id,
      walletAddress,
    ] as const,
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token || !walletAddress || !sessionId) {
        throw new Error('Missing auth or session');
      }
      return spendAuthedPost<ConversionPreviewResponse>(
        token,
        `/api/spend-sessions/${sessionId}/conversion/preview`,
        { walletAddress }
      );
    },
    enabled: Boolean(user && walletAddress && sessionId && !isFetching),
    refetchInterval: (query) => {
      const status = query.state.data?.eligibility.status;
      return status === 'conversion_in_progress' ? 3_000 : false;
    },
    retry: false,
  });

  const eligForPrepare = previewPayload?.eligibility;
  const sessionStatusForPrepare = previewPayload?.session?.status;
  const basePayPrepareEnabled = Boolean(
    user &&
    walletAddress &&
    sessionId &&
    !isFetching &&
    !previewLoading &&
    eligForPrepare?.preview &&
    previewPayload?.spendRailSummary?.rail === 'base_usdc' &&
    isEvmAddress(eligForPrepare.preview.receivingWalletAddress) &&
    (eligForPrepare.status === 'ready_for_payment' ||
      eligForPrepare.status === 'ready_for_payment_own_usdc' ||
      eligForPrepare.status === 'payment_failed') &&
    sessionStatusForPrepare !== 'payment_complete'
  );

  const stellarPayPrepareEnabled = Boolean(
    user &&
    walletAddress &&
    sessionId &&
    !isFetching &&
    !previewLoading &&
    eligForPrepare?.preview &&
    previewPayload?.spendRailSummary?.rail === 'stellar_usdc' &&
    stellarWalletAddressSchema.safeParse(
      eligForPrepare.preview.receivingWalletAddress.trim()
    ).success &&
    (eligForPrepare.status === 'ready_for_payment' ||
      eligForPrepare.status === 'ready_for_payment_own_usdc' ||
      eligForPrepare.status === 'payment_failed') &&
    sessionStatusForPrepare !== 'payment_complete'
  );

  const payPrepareEnabled = basePayPrepareEnabled || stellarPayPrepareEnabled;

  const {
    data: paymentPrepareData,
    isFetching: paymentPrepareLoading,
    error: paymentPrepareError,
  } = useQuery({
    queryKey: [
      'spend-payment-prepare',
      sessionId,
      user?.id,
      walletAddress,
    ] as const,
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token || !walletAddress || !sessionId) {
        throw new Error('Missing auth or session');
      }
      return spendAuthedPost<PaymentPrepareResponse>(
        token,
        `/api/spend-sessions/${sessionId}/payment/prepare`,
        { walletAddress }
      );
    },
    enabled: payPrepareEnabled,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const paymentPrepareNeedsReview = useMemo(
    () => isPaymentNeedsReviewFromApiError(paymentPrepareError),
    [paymentPrepareError]
  );

  const sessionStatus = previewPayload?.session?.status;

  const { data: receiptPayload } = useQuery({
    queryKey: ['spend-receipt', sessionId, user?.id, walletAddress] as const,
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token || !walletAddress || !sessionId) {
        throw new Error('Missing auth or session');
      }
      return spendAuthedGet<ReceiptResponse>(
        token,
        `/api/spend-sessions/${sessionId}/receipt`
      );
    },
    enabled: Boolean(
      user && walletAddress && sessionId && sessionStatus === 'payment_complete'
    ),
    retry: false,
  });

  const invalidateSpendQueries = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ['spend-conversion-preview', sessionId],
    });
    await queryClient.invalidateQueries({
      queryKey: ['spend-session', experienceId],
    });
    await queryClient.invalidateQueries({
      queryKey: ['spend-receipt', sessionId],
    });
    await queryClient.invalidateQueries({
      queryKey: ['spend-payment-prepare', sessionId],
    });
  }, [queryClient, sessionId, experienceId]);

  const conversionMutation = useMutation({
    mutationFn: async (intent: 'confirm' | 'retry_conversion') => {
      const token = await getAccessToken();
      if (!token || !walletAddress || !sessionId) {
        throw new Error('Missing auth or session');
      }
      return spendAuthedPost<ConversionConfirmResponse>(
        token,
        `/api/spend-sessions/${sessionId}/conversion/confirm`,
        { walletAddress, intent }
      );
    },
    onSuccess: async (data) => {
      if (data.clientHint === 'funded') {
        toast.success('USDC is on the way to your wallet.');
      } else {
        toast.success('We are processing your conversion.');
      }
      await invalidateSpendQueries();
    },
    onError: () => {
      toast.error(SPEND_TOAST_CONVERSION_ERROR);
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async (input: {
      paymentTxHash?: string;
      stellarBackendConfirm?: boolean;
    }) => {
      const token = await getAccessToken();
      if (!token || !walletAddress || !sessionId) {
        throw new Error('Missing auth or session');
      }
      const body: Record<string, unknown> = { walletAddress };
      if (input.stellarBackendConfirm) {
        body.stellarBackendConfirm = true;
      } else if (input.paymentTxHash) {
        body.paymentTxHash = input.paymentTxHash;
      }
      return spendAuthedPost<PaymentConfirmResponse>(
        token,
        `/api/spend-sessions/${sessionId}/payment/confirm`,
        body
      );
    },
    onSuccess: async () => {
      toast.success('Payment recorded. Thank you!');
      await invalidateSpendQueries();
    },
    onError: () => {
      toast.error(SPEND_TOAST_PAYMENT_ERROR);
    },
  });

  const sendUsdcPayment = useCallback(async () => {
    if (!walletAddress || !previewPayload?.eligibility.preview) {
      toast.error('Wallet not ready');
      return;
    }
    const prepared = paymentPrepareData?.preparedAction;
    if (isSpendStellarUsdcBackendSubmitPreparedActionV1(prepared)) {
      try {
        await paymentMutation.mutateAsync({ stellarBackendConfirm: true });
      } catch {
        toast.error(SPEND_TOAST_PAYMENT_ERROR);
      }
      return;
    }
    if (!evmWallet || !isSpendPaymentPrepareStoredActionV1(prepared)) {
      toast.error(
        'Payment is not ready yet. Wait a moment or refresh the page.'
      );
      return;
    }
    const treq = prepared.evmTransactionRequest;

    try {
      await withTimeout(
        evmWallet.switchChain(treq.chainId),
        WALLET_STEP_TIMEOUT_MS,
        'Switching to Base in your wallet'
      );
      const transactionRequest = {
        to: treq.to as `0x${string}`,
        data: treq.data as `0x${string}`,
        chainId: treq.chainId,
        gas: BigInt(treq.gas),
      };
      const spendPaymentDebug = process.env.NODE_ENV !== 'production';
      if (spendPaymentDebug) {
        console.debug('[spend payment]', {
          step: 'spend_payment_send_requested',
          walletAddress,
          evmWalletAddress: evmWallet.address,
          evmWalletClientType: evmWallet.walletClientType,
          chainId: treq.chainId,
          sponsor: true,
          to: treq.to,
          hasData: Boolean(treq.data),
          dataLength: treq.data.length,
          includesValueField: Object.prototype.hasOwnProperty.call(
            transactionRequest,
            'value'
          ),
        });
      }
      // Client-side gas sponsorship requires Privy Dashboard → Gas sponsorship → Allow transactions from the client to be enabled for Base.
      let hash: string;
      try {
        const result = await withTimeout(
          sendTransaction(transactionRequest, {
            address: evmWallet.address,
            sponsor: true,
          }),
          WALLET_STEP_TIMEOUT_MS,
          'Confirm the USDC payment in your wallet'
        );
        hash = result.hash;
      } catch (sendErr) {
        if (spendPaymentDebug) {
          const message =
            sendErr instanceof Error ? sendErr.message : String(sendErr);
          const name =
            sendErr instanceof Error ? sendErr.name : 'NonErrorThrown';
          console.debug('[spend payment]', {
            step: 'spend_payment_send_failed',
            message,
            name,
            walletAddress,
            evmWalletAddress: evmWallet.address,
            evmWalletClientType: evmWallet.walletClientType,
            sponsor: true,
          });
        }
        throw sendErr;
      }
      if (spendPaymentDebug) {
        console.debug('[spend payment]', {
          step: 'spend_payment_send_success',
          hash,
          walletAddress,
          evmWalletAddress: evmWallet.address,
          evmWalletClientType: evmWallet.walletClientType,
          sponsor: true,
        });
      }
      await paymentMutation.mutateAsync({ paymentTxHash: hash });
    } catch {
      toast.error(SPEND_TOAST_WALLET_ERROR);
    }
  }, [
    walletAddress,
    evmWallet,
    previewPayload,
    paymentPrepareData,
    paymentMutation,
    sendTransaction,
  ]);

  useEffect(() => {
    const fireScan = async () => {
      if (trackedScan) return;
      const token =
        process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || process.env.MIXPANEL_TOKEN;
      if (token) {
        await initMixpanel(token);
      }
      trackEvent(ANALYTICS_EVENTS.SPEND_EXPERIENCE_QR_SCANNED, {
        spend_experience_id: experienceId,
        event_id: initialExperience.event_id ?? undefined,
        user_id: user?.id,
        wallet_address: walletAddress ?? undefined,
      });
      setTrackedScan(true);
    };
    void fireScan();
  }, [
    experienceId,
    initialExperience.event_id,
    user?.id,
    walletAddress,
    trackedScan,
  ]);

  const experience = sessionPayload?.spendExperience ?? initialExperience;
  const session = sessionPayload?.session;
  const elig = previewPayload?.eligibility;
  const preview = elig?.preview;
  const spendRailSummary: SpendRailClientSummary | null =
    previewPayload?.spendRailSummary ??
    sessionPayload?.spendRailSummary ??
    receiptPayload?.spendRailSummary ??
    null;
  const resolvedSpendRail = spendRailSummary?.rail ?? experience.spend_rail;
  const walletNetworkLabel = spendRailSummary?.networkLabel ?? 'Base';
  const assetSymbol = spendRailSummary?.assetSymbol ?? 'USDC';
  const showSessionError = user && walletAddress && sessionError;
  const showWalletBlock = user && !walletAddress;

  const receiptSession = receiptPayload?.session ?? session;
  const receiptConversion = receiptPayload?.pointConversion;
  const receiptSpendTx = receiptPayload?.spendTransaction ?? null;
  const receiptPaymentHash = receiptSpendTx?.payment_tx_hash;

  const isPaymentComplete =
    elig?.status === 'payment_complete' ||
    sessionStatus === 'payment_complete' ||
    Boolean(receiptPaymentHash);

  const showPayDirectUsdc = elig?.status === 'ready_for_payment_own_usdc';

  const postPointsConversion =
    Boolean(elig?.status && isPostPointsConversionFlow(elig.status)) &&
    !showPayDirectUsdc;

  const sessionAllowsConversionActions =
    Boolean(preview) &&
    (sessionStatus === 'created' || sessionStatus === 'conversion_pending');

  const showConvert =
    elig?.status === 'eligible' && sessionAllowsConversionActions;

  const showRetryConversion =
    elig?.status === 'conversion_failed_retryable' &&
    sessionAllowsConversionActions;

  const showWalletPay =
    !isPaymentComplete &&
    !paymentPrepareNeedsReview &&
    (elig?.status === 'ready_for_payment' ||
      elig?.status === 'ready_for_payment_own_usdc' ||
      elig?.status === 'payment_failed') &&
    preview &&
    ((resolvedSpendRail === 'base_usdc' &&
      isEvmAddress(preview.receivingWalletAddress)) ||
      (resolvedSpendRail === 'stellar_usdc' &&
        stellarWalletAddressSchema.safeParse(
          preview.receivingWalletAddress.trim()
        ).success));

  const displayReceipt = isPaymentComplete;

  const receiptNetworkDisplay =
    receiptSpendTx?.network?.trim() || walletNetworkLabel;
  const receiptPaymentStatusLabel = spendReceiptPaymentStatusLabel(
    receiptSpendTx?.status
  );

  const paymentExplorerUrl = resolveSpendReceiptPaymentExplorerUrl({
    persistedExplorerTxUrl: receiptSpendTx?.explorer_tx_url,
    explorerTxUrlTemplate: spendRailSummary?.explorerTxUrlTemplate,
    paymentTxHash: receiptPaymentHash,
  });

  return (
    <SpendPageShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="title2 text-[#171717]">{experience.title}</h1>
          {experience.description && (
            <p className="mt-3 body-medium font-grotesk text-[#757575]">
              {experience.description}
            </p>
          )}
        </div>

        {!user && (
          <SpendPrimaryButton onClick={login}>
            Log in to continue
          </SpendPrimaryButton>
        )}

        {showWalletBlock && (
          <p className="body-small font-grotesk text-amber-900">
            {SPEND_ELIGIBILITY_MESSAGES.wallet_unavailable}
          </p>
        )}

        {user && walletAddress && (
          <div className="space-y-4">
            {isFetching && (
              <div className="flex items-center gap-2 body-small font-grotesk text-[#757575]">
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                Starting your session…
              </div>
            )}

            {showSessionError && !isFetching && (
              <p className="body-small font-grotesk text-red-800">
                {SPEND_ELIGIBILITY_MESSAGES.experience_inactive}
              </p>
            )}

            {session && !isFetching && !showSessionError && (
              <>
                {previewLoading && (
                  <div className="flex items-center gap-2 body-small font-grotesk text-[#757575]">
                    <Loader2
                      className="size-4 shrink-0 animate-spin"
                      aria-hidden
                    />
                    Checking your balance on {walletNetworkLabel} and event
                    funds…
                  </div>
                )}

                {elig && !previewLoading && (
                  <div className="space-y-4">
                    {preview && (
                      <div className="space-y-3 rounded-sm border border-[#ededed] bg-[#fafafa] p-4">
                        {showPayDirectUsdc ? (
                          <>
                            <div className="flex justify-between gap-4">
                              <span className="body-small font-grotesk text-[#757575]">
                                Pay
                              </span>
                              <span className="body-medium font-grotesk font-semibold text-[#171717]">
                                ${preview.usdcAmount.toFixed(2)} {assetSymbol}{' '}
                                on {walletNetworkLabel}
                              </span>
                            </div>
                            {preview.userUsdcBalance != null && (
                              <div className="flex justify-between gap-4 border-t border-[#ededed] pt-3">
                                <span className="body-small font-grotesk text-[#757575]">
                                  Your wallet ({walletNetworkLabel})
                                </span>
                                <span className="body-medium font-grotesk text-[#171717]">
                                  ${preview.userUsdcBalance.toFixed(2)}{' '}
                                  {assetSymbol}
                                </span>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            {!postPointsConversion && (
                              <>
                                <div className="flex justify-between gap-4">
                                  <span className="body-small font-grotesk text-[#757575]">
                                    You will use
                                  </span>
                                  <span className="body-medium font-grotesk font-semibold text-[#171717]">
                                    {preview.pointsRequired.toLocaleString()}{' '}
                                    points
                                  </span>
                                </div>
                                <div className="flex justify-between gap-4 border-t border-[#ededed] pt-3">
                                  <span className="body-small font-grotesk text-[#757575]">
                                    You will receive
                                  </span>
                                  <span className="body-medium font-grotesk font-semibold text-[#171717]">
                                    ${preview.usdcAmount.toFixed(2)}{' '}
                                    {assetSymbol} on {walletNetworkLabel}
                                  </span>
                                </div>
                              </>
                            )}
                            {preview.userPointsBalance != null && (
                              <div
                                className={
                                  postPointsConversion
                                    ? 'flex justify-between gap-4'
                                    : 'flex justify-between gap-4 border-t border-[#ededed] pt-3'
                                }
                              >
                                <span className="body-small font-grotesk text-[#757575]">
                                  {postPointsConversion
                                    ? 'Points remaining'
                                    : 'Your points balance'}
                                </span>
                                <span
                                  className={
                                    postPointsConversion
                                      ? 'body-medium font-grotesk font-semibold text-[#171717]'
                                      : 'body-medium font-grotesk text-[#171717]'
                                  }
                                >
                                  {Number(
                                    preview.userPointsBalance
                                  ).toLocaleString()}
                                </span>
                              </div>
                            )}
                            {postPointsConversion &&
                              preview.userUsdcBalance != null && (
                                <div className="flex justify-between gap-4 border-t border-[#ededed] pt-3">
                                  <span className="body-small font-grotesk text-[#757575]">
                                    {assetSymbol} balance
                                  </span>
                                  <span className="body-medium font-grotesk font-semibold text-[#171717]">
                                    ${preview.userUsdcBalance.toFixed(2)}{' '}
                                    {assetSymbol}
                                  </span>
                                </div>
                              )}
                          </>
                        )}
                      </div>
                    )}

                    <p className={eligibilityToneClass(elig.status)}>
                      {elig.status === 'ready_for_payment' && preview
                        ? `${preview.pointsRequired.toLocaleString()} points were converted to ${preview.usdcAmount.toFixed(2)} ${assetSymbol} on ${walletNetworkLabel}.`
                        : elig.message}
                    </p>

                    {showConvert && (
                      <SpendPrimaryButton
                        pending={conversionMutation.isPending}
                        onClick={() => conversionMutation.mutate('confirm')}
                      >
                        {conversionMutation.isPending
                          ? 'Converting…'
                          : `Convert points to ${assetSymbol} on ${walletNetworkLabel}`}
                      </SpendPrimaryButton>
                    )}

                    {showRetryConversion && (
                      <div className="flex flex-col gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-[44px] w-full border-[#171717] font-grotesk text-[#171717]"
                          disabled={conversionMutation.isPending}
                          onClick={() =>
                            conversionMutation.mutate('retry_conversion')
                          }
                        >
                          {conversionMutation.isPending
                            ? 'Retrying…'
                            : 'Retry conversion'}
                        </Button>
                      </div>
                    )}

                    {showWalletPay && (
                      <SpendPrimaryButton
                        pending={
                          paymentMutation.isPending || paymentPrepareLoading
                        }
                        onClick={() => void sendUsdcPayment()}
                      >
                        {paymentMutation.isPending
                          ? resolvedSpendRail === 'stellar_usdc' &&
                            isSpendStellarUsdcBackendSubmitPreparedActionV1(
                              paymentPrepareData?.preparedAction
                            )
                            ? paymentPrepareData.preparedAction.display
                                .submitting_label
                            : `Pay with ${assetSymbol} on ${walletNetworkLabel}…`
                          : isSpendStellarUsdcBackendSubmitPreparedActionV1(
                                paymentPrepareData?.preparedAction
                              )
                            ? paymentPrepareData.preparedAction.display
                                .pay_label
                            : `Spend $${preview.usdcAmount.toFixed(2)} ${assetSymbol} on ${walletNetworkLabel}`}
                      </SpendPrimaryButton>
                    )}

                    {postPointsConversion &&
                      paymentPrepareNeedsReview &&
                      !isPaymentComplete &&
                      (resolvedSpendRail === 'base_usdc' ||
                        resolvedSpendRail === 'stellar_usdc') && (
                        <p className="body-small font-grotesk text-[#575757]">
                          Your payment is still being confirmed. This can take a
                          few minutes. If nothing changes, contact support
                          before trying again, and avoid sending a duplicate
                          payment.
                        </p>
                      )}

                    {displayReceipt && (
                      <div className="space-y-3 rounded-sm border border-emerald-200/90 bg-emerald-50/90 p-4 text-[#171717]">
                        <p className="title4 text-emerald-900">
                          Payment complete
                        </p>
                        <div className="flex justify-between gap-2">
                          <span className="body-small font-grotesk text-[#757575]">
                            Amount
                          </span>
                          <span className="body-medium font-grotesk font-semibold">
                            $
                            {(
                              receiptConversion?.usdc_amount ??
                              preview?.usdcAmount ??
                              0
                            ).toFixed(2)}{' '}
                            {assetSymbol}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="body-small font-grotesk text-[#757575]">
                            Network
                          </span>
                          <span className="body-medium font-grotesk font-semibold">
                            {receiptNetworkDisplay}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="body-small font-grotesk text-[#757575]">
                            Payment status
                          </span>
                          <span className="body-medium font-grotesk font-semibold">
                            {receiptPaymentStatusLabel}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="body-small font-grotesk text-[#757575]">
                            Points used
                          </span>
                          <span className="body-medium font-grotesk font-semibold">
                            {Number(
                              receiptConversion?.points_deducted ??
                                (displayReceipt && !receiptConversion
                                  ? 0
                                  : (preview?.pointsRequired ?? 0))
                            ).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <p className="label-small text-[#757575]">Session</p>
                          <p className="break-all font-mono text-xs text-[#171717]">
                            {receiptSession?.id}
                          </p>
                        </div>
                        {paymentExplorerUrl && (
                          <a
                            href={paymentExplorerUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 body-medium font-grotesk font-semibold text-emerald-900 underline"
                          >
                            {SPEND_RECEIPT_EXPLORER_LINK_LABEL}
                            <ExternalLink className="size-3.5 shrink-0" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </SpendPageShell>
  );
}
