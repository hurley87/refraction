'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type {
  PointConversion,
  SpendExperience,
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
import {
  encodeUsdcTransferData,
  isEvmAddress,
  POSTER_CHECKOUT_CHAIN_ID,
  POSTER_CHECKOUT_USDC_ADDRESS_BASE,
} from '@/lib/walletconnect-poster-direct-usdc';
import type { BrowserProvider } from '@/lib/walletconnect-pay/sign-wallet-rpc-action';

type SpendExperiencePageProps = {
  experienceId: string;
  initialExperience: SpendExperience;
};

type SessionResponse = {
  session: SpendSession;
  spendExperience: SpendExperience;
  created: boolean;
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
};

type ConversionConfirmResponse = {
  pointConversion: PointConversion;
  session: Pick<SpendSession, 'id' | 'status' | 'expires_at'>;
  spendExperience: {
    id: string;
    title: string;
    pointsRequired: number;
    usdcAmount: number;
  };
  resumed: boolean;
};

type PaymentConfirmResponse = {
  spendTransaction: SpendTransaction;
  session: Pick<SpendSession, 'id' | 'status' | 'expires_at' | 'completed_at'>;
  resumed: boolean;
};

type ReceiptResponse = {
  session: SpendSession;
  spendExperience: SpendExperience;
  pointConversion: PointConversion | null;
  spendTransaction: SpendTransaction | null;
  eligibility: ConversionPreviewResponse['eligibility'];
};

const WALLET_STEP_TIMEOUT_MS = 180_000;

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

function toEvmHexAddress(value: string | undefined): `0x${string}` | null {
  return value && isEvmAddress(value) ? (value as `0x${string}`) : null;
}

function eligibilityToneClass(status: SpendEligibilityStatus): string {
  if (
    status === 'eligible' ||
    status === 'ready_for_payment' ||
    status === 'ready_for_payment_own_usdc' ||
    status === 'payment_complete'
  ) {
    return 'text-sm text-emerald-800';
  }
  return 'text-sm text-amber-900';
}

/**
 * Spend pilot: opens from QR at `/spend/{experienceId}`; creates/returns a session when authed.
 */
export function SpendExperiencePage({
  experienceId,
  initialExperience,
}: SpendExperiencePageProps) {
  const { user, login, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const queryClient = useQueryClient();
  const walletAddress = user?.wallet?.address;
  const [trackedScan, setTrackedScan] = useState(false);

  const evmWallet = useMemo(() => {
    if (!walletAddress) return null;
    const lower = walletAddress.toLowerCase();
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
  }, [queryClient, sessionId, experienceId]);

  const conversionMutation = useMutation({
    mutationFn: async () => {
      const token = await getAccessToken();
      if (!token || !walletAddress || !sessionId) {
        throw new Error('Missing auth or session');
      }
      return spendAuthedPost<ConversionConfirmResponse>(
        token,
        `/api/spend-sessions/${sessionId}/conversion/confirm`,
        { walletAddress }
      );
    },
    onSuccess: async () => {
      toast.success('USDC is on the way to your wallet.');
      await invalidateSpendQueries();
    },
    onError: (e) => {
      const msg = e instanceof ApiError ? e.message : String(e);
      toast.error(msg);
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async (paymentTxHash: string) => {
      const token = await getAccessToken();
      if (!token || !walletAddress || !sessionId) {
        throw new Error('Missing auth or session');
      }
      return spendAuthedPost<PaymentConfirmResponse>(
        token,
        `/api/spend-sessions/${sessionId}/payment/confirm`,
        { walletAddress, paymentTxHash }
      );
    },
    onSuccess: async () => {
      toast.success('Payment recorded. Thank you!');
      await invalidateSpendQueries();
    },
    onError: (e) => {
      const msg = e instanceof ApiError ? e.message : String(e);
      toast.error(msg);
    },
  });

  const sendUsdcPayment = useCallback(async () => {
    if (!walletAddress || !evmWallet || !previewPayload?.eligibility.preview) {
      toast.error('Wallet not ready');
      return;
    }
    const preview = previewPayload.eligibility.preview;
    const recipient = toEvmHexAddress(preview.receivingWalletAddress);
    if (!recipient) {
      toast.error('Invalid receiving wallet');
      return;
    }

    try {
      await withTimeout(
        evmWallet.switchChain(POSTER_CHECKOUT_CHAIN_ID),
        WALLET_STEP_TIMEOUT_MS,
        'Switching to Base in your wallet'
      );
      const provider = await evmWallet.getEthereumProvider();
      if (!provider) {
        throw new Error('Could not connect to your wallet');
      }
      const data = encodeUsdcTransferData(recipient, preview.usdcAmount);
      const hash = await withTimeout(
        (provider as unknown as BrowserProvider).request({
          method: 'eth_sendTransaction',
          params: [
            {
              from: walletAddress,
              to: POSTER_CHECKOUT_USDC_ADDRESS_BASE,
              data,
            },
          ],
        }) as Promise<string>,
        WALLET_STEP_TIMEOUT_MS,
        'Confirm the USDC payment in your wallet'
      );
      const txHash = typeof hash === 'string' ? hash : String(hash);
      await paymentMutation.mutateAsync(txHash);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    }
  }, [walletAddress, evmWallet, previewPayload, paymentMutation]);

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
  const showSessionError = user && walletAddress && sessionError;
  const showWalletBlock = user && !walletAddress;

  const showPayDirectUsdc = elig?.status === 'ready_for_payment_own_usdc';

  const showConvert =
    elig?.status === 'eligible' &&
    preview &&
    (sessionStatus === 'created' || sessionStatus === 'conversion_pending');

  const showPay =
    (elig?.status === 'ready_for_payment' ||
      elig?.status === 'ready_for_payment_own_usdc' ||
      elig?.status === 'payment_failed') &&
    preview &&
    isEvmAddress(preview.receivingWalletAddress);

  const receiptSession = receiptPayload?.session ?? session;
  const receiptConversion = receiptPayload?.pointConversion;
  const receiptPaymentHash = receiptPayload?.spendTransaction?.payment_tx_hash;

  const displayReceipt =
    elig?.status === 'payment_complete' || sessionStatus === 'payment_complete';

  const basescanUrl = (hash: string) =>
    `https://basescan.org/tx/${hash.trim()}`;

  return (
    <div className="container mx-auto max-w-lg p-6">
      <h1 className="mb-2 text-2xl font-bold text-[#171717]">
        {experience.title}
      </h1>
      {experience.description && (
        <p className="mb-4 text-neutral-600">{experience.description}</p>
      )}

      <div className="mb-6 space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-neutral-600">Status</span>
          <span className="font-medium capitalize">{experience.status}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-600">Max USDC / user</span>
          <span className="font-medium">
            ${Number(experience.max_usdc_per_user).toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-600">Points per $1 USDC</span>
          <span className="font-medium">
            {Number(experience.points_to_usdc_rate).toLocaleString()} pts
          </span>
        </div>
      </div>

      {!user && (
        <Button className="w-full" onClick={login}>
          Log in to continue
        </Button>
      )}

      {showWalletBlock && (
        <p className="text-sm text-amber-800">
          {SPEND_ELIGIBILITY_MESSAGES.wallet_unavailable}
        </p>
      )}

      {user && walletAddress && (
        <div className="space-y-4">
          {isFetching && (
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <Loader2 className="size-4 animate-spin" />
              Starting your session…
            </div>
          )}

          {showSessionError && !isFetching && (
            <p className="text-sm text-red-800">
              {SPEND_ELIGIBILITY_MESSAGES.experience_inactive}
            </p>
          )}

          {session && !isFetching && !showSessionError && (
            <>
              {previewLoading && (
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <Loader2 className="size-4 animate-spin" />
                  Checking your balance and event funds…
                </div>
              )}

              {elig && !previewLoading && (
                <div className="space-y-3">
                  {preview && (
                    <div className="space-y-2 rounded-lg border border-neutral-200 bg-white p-4 text-sm">
                      {showPayDirectUsdc ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-neutral-600">Pay</span>
                            <span className="font-medium">
                              ${preview.usdcAmount.toFixed(2)} USDC
                            </span>
                          </div>
                          {preview.userUsdcBalance != null && (
                            <div className="flex justify-between text-neutral-500">
                              <span>Your wallet (Base)</span>
                              <span>
                                ${preview.userUsdcBalance.toFixed(2)} USDC
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between">
                            <span className="text-neutral-600">
                              You will use
                            </span>
                            <span className="font-medium">
                              {preview.pointsRequired.toLocaleString()} points
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-600">
                              You will receive
                            </span>
                            <span className="font-medium">
                              ${preview.usdcAmount.toFixed(2)} USDC
                            </span>
                          </div>
                          {preview.userPointsBalance != null && (
                            <div className="flex justify-between text-neutral-500">
                              <span>Your points balance</span>
                              <span>
                                {Number(
                                  preview.userPointsBalance
                                ).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  <p className={eligibilityToneClass(elig.status)}>
                    {elig.message}
                  </p>

                  {showConvert && (
                    <Button
                      className="w-full"
                      disabled={conversionMutation.isPending}
                      onClick={() => conversionMutation.mutate()}
                    >
                      {conversionMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Converting…
                        </>
                      ) : (
                        'Convert points to USDC'
                      )}
                    </Button>
                  )}

                  {showPay && (
                    <Button
                      className="w-full"
                      disabled={paymentMutation.isPending}
                      onClick={() => void sendUsdcPayment()}
                    >
                      {paymentMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Pay with USDC…
                        </>
                      ) : (
                        `Spend $${preview.usdcAmount.toFixed(2)} USDC`
                      )}
                    </Button>
                  )}

                  {displayReceipt && (
                    <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-[#171717]">
                      <p className="font-semibold text-emerald-900">
                        Payment complete
                      </p>
                      <div className="flex justify-between gap-2">
                        <span className="text-neutral-600">Amount</span>
                        <span className="font-medium">
                          $
                          {(
                            receiptConversion?.usdc_amount ??
                            preview?.usdcAmount ??
                            0
                          ).toFixed(2)}{' '}
                          USDC
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-neutral-600">Points used</span>
                        <span className="font-medium">
                          {Number(
                            receiptConversion?.points_deducted ??
                              (displayReceipt && !receiptConversion
                                ? 0
                                : (preview?.pointsRequired ?? 0))
                          ).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-600">Session</p>
                        <p className="break-all font-mono text-xs">
                          {receiptSession?.id}
                        </p>
                      </div>
                      {receiptPaymentHash && (
                        <a
                          href={basescanUrl(receiptPaymentHash)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-medium text-emerald-900 underline"
                        >
                          View payment on BaseScan
                          <ExternalLink className="size-3.5" />
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
  );
}
