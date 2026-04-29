'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';
import {
  Loader2,
  ArrowLeft,
  ExternalLink,
  RefreshCw,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type {
  PointConversion,
  SpendExperience,
  SpendSession,
  SpendTransaction,
  TreasuryTransaction,
} from '@/lib/types';
import type { SpendServerWalletFundingMetadata } from '@/lib/spend-server-wallet';

type ActivityTotals = {
  usersConverted: number;
  totalUsdcDistributed: number;
  totalUsdcReceivedAtEventWallet: number;
  spendSessionsCount: number;
};

type ActivitySessionRow = {
  session: SpendSession;
  conversion: PointConversion | null;
  payment: SpendTransaction | null;
};

type ActivityPayload = {
  spendExperienceId: string;
  totals: ActivityTotals;
  sessions: ActivitySessionRow[];
  failedConversions: PointConversion[];
  failedPayments: SpendTransaction[];
  mixpanelInsightUrl?: string;
};

type TreasuryPayload = {
  spendExperienceId: string;
  serverWalletAddress: string;
  privyServerWalletId: string | null;
  serverWalletChain: string | null;
  serverWalletCreatedAt: string | null;
  serverWalletUsdcBalance: number | null;
  funding: SpendServerWalletFundingMetadata;
  treasuryWalletAddress: string;
  receivingWalletAddress: string;
  treasuryUsdcBalance: number | null;
  ledger: TreasuryTransaction[];
  ledgerTotals: {
    fund_user_usdc: number;
    receive_payment_usdc: number;
    admin_recovery_usdc: number;
  };
};

function fmtUsdc(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const rounded = Math.round(n * 1e6) / 1e6;
  return `$${rounded.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })}`;
}

function shortenAddr(a: string): string {
  const t = a.trim();
  if (t.length < 14) return t;
  return `${t.slice(0, 6)}…${t.slice(-4)}`;
}

function baseScanTxUrl(hash: string): string {
  const h = hash.trim().toLowerCase();
  return `https://basescan.org/tx/${h}`;
}

async function copyText(value: string): Promise<void> {
  await navigator.clipboard.writeText(value);
}

function TxHashShortLink({
  hash,
  className,
}: {
  hash: string;
  className?: string;
}) {
  return (
    <a
      href={baseScanTxUrl(hash)}
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ??
        'inline-flex items-center gap-0.5 text-blue-700 hover:underline'
      }
    >
      {shortenAddr(hash)}
      <ExternalLink className="size-3" />
    </a>
  );
}

function SessionConversionCell({
  conversion,
}: {
  conversion: PointConversion | null;
}) {
  if (!conversion) {
    return <span className="text-neutral-400">—</span>;
  }
  return (
    <>
      <div>{conversion.status}</div>
      <div className="text-neutral-600">{fmtUsdc(conversion.usdc_amount)}</div>
      {conversion.funding_tx_hash && (
        <a
          href={baseScanTxUrl(conversion.funding_tx_hash)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Tx
        </a>
      )}
    </>
  );
}

function SessionPaymentCell({ payment }: { payment: SpendTransaction | null }) {
  if (!payment) {
    return <span className="text-neutral-400">—</span>;
  }
  return (
    <>
      <div>{payment.status}</div>
      <div className="text-neutral-600">{fmtUsdc(payment.usdc_amount)}</div>
      {payment.payment_tx_hash && (
        <a
          href={baseScanTxUrl(payment.payment_tx_hash)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Tx
        </a>
      )}
    </>
  );
}

export default function SpendExperienceDetailPage() {
  const params = useParams<{ experienceId: string }>();
  const experienceId = params.experienceId;
  const { user, login } = usePrivy();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);
  const [withdrawDestination, setWithdrawDestination] = useState('');
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);

  const checkAdminStatus = useCallback(async () => {
    if (!user?.email?.address) return false;
    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email.address }),
      });
      const responseData = await response.json();
      const data = responseData.data || responseData;
      return data.isAdmin;
    } catch {
      return false;
    }
  }, [user?.email?.address]);

  useEffect(() => {
    const verify = async () => {
      if (user?.email?.address) {
        setIsAdmin(await checkAdminStatus());
        setAdminLoading(false);
      } else if (user === null) {
        setIsAdmin(false);
        setAdminLoading(false);
      }
    };
    void verify();
  }, [user, checkAdminStatus]);

  const adminEmail = user?.email?.address || '';

  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      'x-user-email': adminEmail,
    }),
    [adminEmail]
  );

  const experienceQuery = useQuery<SpendExperience>({
    queryKey: ['admin-spend-experience', experienceId, adminEmail],
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/spend-experiences/${experienceId}`,
        { headers }
      );
      if (!response.ok) throw new Error('Failed to load experience');
      const j = await response.json();
      const exp = (j.data?.spendExperience ?? j.spendExperience) as
        | SpendExperience
        | undefined;
      if (!exp) throw new Error('Missing experience');
      return exp;
    },
    enabled: Boolean(experienceId && isAdmin && adminEmail),
  });

  const activityQuery = useQuery<ActivityPayload>({
    queryKey: ['admin-spend-activity', experienceId, adminEmail],
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/spend-experiences/${experienceId}/activity`,
        { headers }
      );
      if (!response.ok) throw new Error('Failed to load activity');
      const j = await response.json();
      const data = j.data ?? j;
      return data as ActivityPayload;
    },
    enabled: Boolean(experienceId && isAdmin && adminEmail),
  });

  const treasuryQuery = useQuery<TreasuryPayload>({
    queryKey: ['admin-spend-treasury', experienceId, adminEmail],
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/spend-experiences/${experienceId}/treasury`,
        { headers }
      );
      if (!response.ok) throw new Error('Failed to load treasury');
      const j = await response.json();
      const data = j.data ?? j;
      return data as TreasuryPayload;
    },
    enabled: Boolean(experienceId && isAdmin && adminEmail),
  });

  const refetchAll = useCallback(() => {
    void experienceQuery.refetch();
    void activityQuery.refetch();
    void treasuryQuery.refetch();
  }, [experienceQuery, activityQuery, treasuryQuery]);

  async function handleWithdrawServerWallet() {
    const trimmed = withdrawDestination.trim();
    if (!trimmed) {
      toast.error('Enter the wallet address that will receive the funds.');
      return;
    }
    setWithdrawSubmitting(true);
    try {
      const response = await fetch(
        `/api/admin/spend-experiences/${experienceId}/treasury/withdraw`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ destinationAddress: trimmed }),
        }
      );
      const j = await response.json();
      if (!response.ok) {
        toast.error(j.error ?? 'Withdrawal failed');
        return;
      }
      toast.success(j.message ?? 'Withdrawal confirmed.');
      setWithdrawDestination('');
      refetchAll();
    } catch {
      toast.error('Withdrawal failed');
    } finally {
      setWithdrawSubmitting(false);
    }
  }

  if (adminLoading || (user && isAdmin === null)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-neutral-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md p-6">
        <p className="mb-4 text-neutral-700">Sign in to view activity.</p>
        <Button onClick={login} className="w-full">
          Log in
        </Button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md p-6">
        <p className="text-red-600">You do not have access to this page.</p>
        <Link
          href="/admin/spend-experiences"
          className="mt-4 inline-block text-sm text-blue-600 hover:underline"
        >
          Back to spend experiences
        </Link>
      </div>
    );
  }

  const exp = experienceQuery.data;
  const activityData = activityQuery.data;
  const treasuryData = treasuryQuery.data;
  const totals = activityData?.totals;
  const mixpanelUrl = activityData?.mixpanelInsightUrl;
  const funding = treasuryData?.funding;
  const ledgerTotalsSuffix =
    treasuryData && treasuryData.ledgerTotals.admin_recovery_usdc > 0
      ? ` · admin_recovery ${fmtUsdc(treasuryData.ledgerTotals.admin_recovery_usdc)}`
      : '';

  return (
    <div className="mx-auto max-w-4xl p-6 font-grotesk">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/spend-experiences"
            className="mb-3 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            <ArrowLeft className="size-4" />
            Back to list
          </Link>
          <h1 className="text-2xl font-semibold text-[#171717]">
            {exp?.title ?? 'Spend experience'}
          </h1>
          {exp?.description && (
            <p className="mt-1 max-w-2xl text-sm text-neutral-600">
              {exp.description}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/spend-experiences/${experienceId}/qr`}>
                QR code
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={refetchAll}
              disabled={
                activityQuery.isFetching ||
                treasuryQuery.isFetching ||
                experienceQuery.isFetching
              }
            >
              <RefreshCw className="size-3.5" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {(experienceQuery.isLoading ||
        activityQuery.isLoading ||
        treasuryQuery.isLoading) && (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-neutral-500" />
        </div>
      )}

      {(experienceQuery.error ||
        activityQuery.error ||
        treasuryQuery.error) && (
        <p className="text-red-600">
          Could not load monitoring data. Try refresh.
        </p>
      )}

      {funding && !funding.funded && (
        <section className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">
                Fund server wallet before activation
              </h2>
              <p className="mt-1">
                Send at least {fmtUsdc(funding.minimumUsdc)} USDC on Base now,
                and enough USDC for expected redemptions.
              </p>
              <code className="mt-3 block break-all rounded bg-white/70 p-2 text-xs text-neutral-900">
                {funding.serverWalletAddress}
              </code>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1 bg-white"
              onClick={() => void copyText(funding.serverWalletAddress)}
            >
              <Copy className="size-3.5" />
              Copy
            </Button>
          </div>
        </section>
      )}

      {totals && treasuryData && (
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Users converted
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              {totals.usersConverted}
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              USDC distributed
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              {fmtUsdc(totals.totalUsdcDistributed)}
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              USDC received
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              {fmtUsdc(totals.totalUsdcReceivedAtEventWallet)}
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Server wallet USDC
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              {fmtUsdc(treasuryData.treasuryUsdcBalance)}
            </div>
          </div>
        </section>
      )}

      {treasuryData && (
        <section className="mb-8 rounded-lg border border-neutral-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-[#171717]">
            Server wallet
          </h2>
          <div className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <div className="text-neutral-500">Wallet address</div>
              <code className="mt-0.5 block break-all text-xs text-neutral-800">
                {treasuryData.serverWalletAddress}
              </code>
            </div>
            <div>
              <div className="text-neutral-500">Base USDC balance</div>
              <div className="mt-0.5 text-neutral-800">
                {fmtUsdc(treasuryData.serverWalletUsdcBalance)}
              </div>
            </div>
          </div>
          <div className="mt-5 border-t border-neutral-100 pt-4">
            <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-3 sm:gap-y-1.5">
              <Label
                htmlFor="withdraw-destination"
                className="order-1 text-neutral-500 sm:col-start-1 sm:row-start-1"
              >
                Withdraw to address
              </Label>
              <Input
                id="withdraw-destination"
                type="text"
                placeholder="0x…"
                autoComplete="off"
                spellCheck={false}
                value={withdrawDestination}
                onChange={(e) => setWithdrawDestination(e.target.value)}
                disabled={withdrawSubmitting}
                className="order-2 w-full font-mono text-xs sm:col-start-1 sm:row-start-2"
              />
              <p className="order-3 text-xs text-neutral-500 sm:col-start-1 sm:row-start-3">
                Withdraws the full Base USDC balance (6 decimals). Gas is
                sponsored.
              </p>
              <Button
                type="button"
                variant="outline"
                className="order-4 w-full shrink-0 whitespace-nowrap sm:order-none sm:col-start-2 sm:row-start-2 sm:w-auto sm:self-end"
                disabled={
                  withdrawSubmitting ||
                  treasuryData.serverWalletUsdcBalance === null ||
                  treasuryData.serverWalletUsdcBalance <= 0
                }
                onClick={() => {
                  void handleWithdrawServerWallet();
                }}
              >
                {withdrawSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Withdrawing…
                  </>
                ) : (
                  'Withdraw USDC'
                )}
              </Button>
            </div>
          </div>
          {treasuryData.ledger.length > 0 && (
            <div className="mt-4 border-t border-neutral-100 pt-4">
              <div className="text-xs text-neutral-500">
                Ledger totals (optional audit rows): fund_user{' '}
                {fmtUsdc(treasuryData.ledgerTotals.fund_user_usdc)} ·
                receive_payment{' '}
                {fmtUsdc(treasuryData.ledgerTotals.receive_payment_usdc)}
                {ledgerTotalsSuffix}
              </div>
              <ul className="mt-3 max-h-48 overflow-auto text-xs">
                {treasuryData.ledger.slice(0, 50).map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 border-b border-neutral-50 py-1.5 last:border-0"
                  >
                    <span className="text-neutral-600">
                      {row.transaction_type.replace(/_/g, ' ')} ·{' '}
                      {fmtUsdc(row.amount)}
                    </span>
                    {row.tx_hash ? (
                      <TxHashShortLink
                        hash={row.tx_hash}
                        className="inline-flex items-center gap-0.5 font-mono text-blue-600 hover:underline"
                      />
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {mixpanelUrl && (
        <p className="mb-6 text-sm text-neutral-600">
          <a
            href={mixpanelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 hover:underline"
          >
            Open Mixpanel events
            <ExternalLink className="size-3.5" />
          </a>{' '}
          for deeper funnels (token is project id).
        </p>
      )}

      {activityData &&
        (activityData.failedConversions.length > 0 ||
          activityData.failedPayments.length > 0) && (
          <section className="mb-8 rounded-lg border border-red-200 bg-red-50/80 p-5">
            <h2 className="text-lg font-semibold text-red-900">
              Failed transactions
            </h2>
            <p className="mt-1 text-sm text-red-800/90">
              Reasons are truncated server-side; use tx hashes on BaseScan for
              full detail.
            </p>
            <div className="mt-4 grid gap-6 md:grid-cols-2">
              {activityData.failedConversions.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-red-900">
                    Conversions ({activityData.failedConversions.length})
                  </h3>
                  <ul className="mt-2 space-y-2 text-xs">
                    {activityData.failedConversions.map((c) => (
                      <li
                        key={c.id}
                        className="rounded border border-red-100 bg-white/80 p-2"
                      >
                        <div className="font-mono text-[11px] text-neutral-600">
                          session {shortenAddr(c.spend_session_id)}
                        </div>
                        <div className="mt-1 text-neutral-800">
                          {c.failed_reason ?? 'Unknown'}
                        </div>
                        {c.funding_tx_hash && (
                          <div className="mt-1">
                            <TxHashShortLink hash={c.funding_tx_hash} />
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {activityData.failedPayments.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-red-900">
                    Payments ({activityData.failedPayments.length})
                  </h3>
                  <ul className="mt-2 space-y-2 text-xs">
                    {activityData.failedPayments.map((p) => (
                      <li
                        key={p.id}
                        className="rounded border border-red-100 bg-white/80 p-2"
                      >
                        <div className="font-mono text-[11px] text-neutral-600">
                          session {shortenAddr(p.spend_session_id)}
                        </div>
                        <div className="mt-1 text-neutral-800">
                          {p.failed_reason ?? 'Unknown'}
                        </div>
                        {p.payment_tx_hash && (
                          <div className="mt-1">
                            <TxHashShortLink hash={p.payment_tx_hash} />
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

      {activityData && (
        <section className="rounded-lg border border-neutral-200 bg-white">
          <div className="border-b border-neutral-100 px-4 py-3">
            <h2 className="font-semibold text-[#171717]">
              Recent sessions ({activityData.sessions.length} shown)
            </h2>
            <p className="text-xs text-neutral-500">
              Newest first. Conversion and payment rows when present.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-neutral-100 bg-neutral-50/80 text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Session</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Conversion</th>
                  <th className="px-3 py-2 font-medium">Payment</th>
                </tr>
              </thead>
              <tbody>
                {activityData.sessions.map(
                  ({ session, conversion, payment }) => (
                    <tr
                      key={session.id}
                      className="border-b border-neutral-50 last:border-0"
                    >
                      <td className="px-3 py-2 align-top font-mono text-xs">
                        <div>{shortenAddr(session.id)}</div>
                        <div className="text-neutral-400">
                          {shortenAddr(session.wallet_address)}
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top capitalize">
                        {session.status.replace(/_/g, ' ')}
                      </td>
                      <td className="px-3 py-2 align-top text-xs">
                        <SessionConversionCell conversion={conversion} />
                      </td>
                      <td className="px-3 py-2 align-top text-xs">
                        <SessionPaymentCell payment={payment} />
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
