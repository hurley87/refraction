'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';
import { adminApiAuthHeaders } from '@/lib/admin-api-auth-headers';
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
  SpendRail,
  SpendTransaction,
  TreasuryTransaction,
} from '@/lib/types';
import type { SpendServerWalletFundingMetadata } from '@/lib/spend-server-wallet';
import { spendLedgerTxExplorerUrl } from '@/lib/spend-ledger-explorer-url';
import type {
  SpendPilotAdminRailVisibility,
  SpendPilotAdminTotals,
  SpendPilotSessionActivityRow,
} from '@/lib/db/spend-admin';

type ActivityPayload = {
  spendExperienceId: string;
  totals: SpendPilotAdminTotals;
  sessions: SpendPilotSessionActivityRow[];
  failedConversions: PointConversion[];
  failedPayments: SpendTransaction[];
  railVisibility?: SpendPilotAdminRailVisibility;
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

/** Age from `createdAt` (ISO), consistent with API contract (IRL-26). */
function formatAgeFromIso(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return '<1m';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function LedgerTxLink({
  spendRail,
  explorerTxUrl,
  txHash,
  className,
}: {
  spendRail: SpendRail;
  explorerTxUrl?: string | null;
  txHash: string;
  className?: string;
}) {
  const href = spendLedgerTxExplorerUrl(spendRail, explorerTxUrl, txHash);
  const label = shortenAddr(txHash);
  if (!href) {
    return (
      <span
        className={
          className ?? 'font-mono text-[11px] text-neutral-600 tabular-nums'
        }
      >
        {label}
      </span>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ??
        'inline-flex items-center gap-0.5 text-blue-700 hover:underline'
      }
    >
      {label}
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
        <div className="mt-0.5">
          <LedgerTxLink
            spendRail={conversion.spend_rail}
            explorerTxUrl={conversion.explorer_tx_url}
            txHash={conversion.funding_tx_hash}
            className="text-blue-600 hover:underline"
          />
        </div>
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
        <div className="mt-0.5">
          <LedgerTxLink
            spendRail={payment.spend_rail}
            explorerTxUrl={payment.explorer_tx_url}
            txHash={payment.payment_tx_hash}
            className="text-blue-600 hover:underline"
          />
        </div>
      )}
    </>
  );
}

export default function SpendExperienceDetailPage() {
  const params = useParams<{ experienceId: string }>();
  const experienceId = params.experienceId;
  const { user, login, getAccessToken } = usePrivy();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);
  const [withdrawDestination, setWithdrawDestination] = useState('');
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);

  const checkAdminStatus = useCallback(async () => {
    if (!user?.email?.address) return false;
    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await adminApiAuthHeaders(getAccessToken)),
        },
        body: JSON.stringify({}),
      });
      const responseData = await response.json();
      const data = responseData.data || responseData;
      return data.isAdmin;
    } catch {
      return false;
    }
  }, [user?.email?.address, getAccessToken]);

  useEffect(() => {
    const verify = async () => {
      if (user?.email?.address) {
        setIsAdmin(await checkAdminStatus());
      } else if (!user) {
        setIsAdmin(false);
      } else {
        setIsAdmin(false);
      }
      setAdminLoading(false);
    };
    void verify();
  }, [user, checkAdminStatus]);

  const experienceQuery = useQuery<SpendExperience>({
    queryKey: ['admin-spend-experience', experienceId, isAdmin],
    queryFn: async () => {
      const auth = await adminApiAuthHeaders(getAccessToken);
      const jsonHeaders = { 'Content-Type': 'application/json', ...auth };
      const response = await fetch(
        `/api/admin/spend-experiences/${experienceId}`,
        { headers: jsonHeaders }
      );
      if (!response.ok) throw new Error('Failed to load experience');
      const j = await response.json();
      const exp = (j.data?.spendExperience ?? j.spendExperience) as
        | SpendExperience
        | undefined;
      if (!exp) throw new Error('Missing experience');
      return exp;
    },
    enabled: Boolean(experienceId && isAdmin && user?.email?.address),
  });

  const activityQuery = useQuery<ActivityPayload>({
    queryKey: ['admin-spend-activity', experienceId, isAdmin],
    queryFn: async () => {
      const auth = await adminApiAuthHeaders(getAccessToken);
      const jsonHeaders = { 'Content-Type': 'application/json', ...auth };
      const response = await fetch(
        `/api/admin/spend-experiences/${experienceId}/activity`,
        { headers: jsonHeaders }
      );
      if (!response.ok) throw new Error('Failed to load activity');
      const j = await response.json();
      const data = j.data ?? j;
      return data as ActivityPayload;
    },
    enabled: Boolean(experienceId && isAdmin && user?.email?.address),
  });

  const treasuryQuery = useQuery<TreasuryPayload>({
    queryKey: ['admin-spend-treasury', experienceId, isAdmin],
    queryFn: async () => {
      const auth = await adminApiAuthHeaders(getAccessToken);
      const jsonHeaders = { 'Content-Type': 'application/json', ...auth };
      const response = await fetch(
        `/api/admin/spend-experiences/${experienceId}/treasury`,
        { headers: jsonHeaders }
      );
      if (!response.ok) throw new Error('Failed to load treasury');
      const j = await response.json();
      const data = j.data ?? j;
      return data as TreasuryPayload;
    },
    enabled: Boolean(experienceId && isAdmin && user?.email?.address),
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
      const auth = await adminApiAuthHeaders(getAccessToken);
      const jsonHeaders = { 'Content-Type': 'application/json', ...auth };
      const response = await fetch(
        `/api/admin/spend-experiences/${experienceId}/treasury/withdraw`,
        {
          method: 'POST',
          headers: jsonHeaders,
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
              <h2 className="font-semibold">{funding.fundingCalloutTitle}</h2>
              <p className="mt-1">{funding.fundingCalloutBody}</p>
              <code className="mt-3 block break-all rounded bg-white/70 p-2 text-xs text-neutral-900">
                {funding.serverWalletAddress}
              </code>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1 bg-white"
              onClick={() =>
                void navigator.clipboard.writeText(funding.serverWalletAddress)
              }
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
                      <LedgerTxLink
                        spendRail={row.spend_rail}
                        explorerTxUrl={row.explorer_tx_url}
                        txHash={row.tx_hash}
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

      {activityData?.railVisibility && (
        <section className="mb-8 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-[#171717]">
              In-flight rail work & funded (unpaid)
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              Read-only visibility for this experience. Age uses each row&apos;s{' '}
              <span className="font-mono text-[11px]">created_at</span>. Lists
              are capped (oldest in-flight queues first; funded-unpaid by newest
              conversion activity).
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-sm">
              <div className="text-xs font-medium uppercase tracking-wide text-amber-900/80">
                Wallet readiness
              </div>
              <div className="mt-1 text-neutral-800">
                pending{' '}
                <span className="font-semibold tabular-nums">
                  {activityData.railVisibility.summary.walletReadiness.pending}
                </span>
                <span className="mx-1 text-neutral-400">·</span>
                needs_review{' '}
                <span className="font-semibold tabular-nums">
                  {
                    activityData.railVisibility.summary.walletReadiness
                      .needsReview
                  }
                </span>
              </div>
            </div>
            <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-3 text-sm">
              <div className="text-xs font-medium uppercase tracking-wide text-violet-900/80">
                Conversions (in-flight)
              </div>
              <div className="mt-1 text-neutral-800">
                total{' '}
                <span className="font-semibold tabular-nums">
                  {
                    activityData.railVisibility.summary.conversions
                      .inFlightTotal
                  }
                </span>
                <div className="mt-0.5 text-[11px] text-neutral-600">
                  pnd {activityData.railVisibility.summary.conversions.pending}{' '}
                  · pts{' '}
                  {
                    activityData.railVisibility.summary.conversions
                      .pointsDeducted
                  }{' '}
                  · fund{' '}
                  {
                    activityData.railVisibility.summary.conversions
                      .fundingPending
                  }{' '}
                  · rev{' '}
                  {activityData.railVisibility.summary.conversions.needsReview}
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-3 text-sm">
              <div className="text-xs font-medium uppercase tracking-wide text-sky-900/80">
                Payments (ledger)
              </div>
              <div className="mt-1 text-neutral-800">
                pending{' '}
                <span className="font-semibold tabular-nums">
                  {
                    activityData.railVisibility.summary.spendTransactions
                      .pending
                  }
                </span>
                <span className="mx-1 text-neutral-400">·</span>
                submitted{' '}
                <span className="font-semibold tabular-nums">
                  {
                    activityData.railVisibility.summary.spendTransactions
                      .submitted
                  }
                </span>
              </div>
            </div>
            <div className="rounded-lg border border-orange-200 bg-orange-50/60 p-3 text-sm">
              <div className="text-xs font-medium uppercase tracking-wide text-orange-900/80">
                Funded — payment not confirmed
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">
                {activityData.railVisibility.summary.fundedUnpaidSessions}
              </div>
              <div className="text-[11px] text-neutral-600">sessions</div>
            </div>
          </div>

          {activityData.railVisibility.walletReadiness.length > 0 && (
            <div className="rounded-lg border border-neutral-200 bg-white">
              <div className="border-b border-neutral-100 px-4 py-2 text-sm font-medium text-neutral-800">
                Wallet readiness (pending / needs_review)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead className="border-b border-neutral-100 bg-neutral-50/80 text-[10px] uppercase text-neutral-500">
                    <tr>
                      <th className="px-2 py-1.5 font-medium">Rail</th>
                      <th className="px-2 py-1.5 font-medium">Network</th>
                      <th className="px-2 py-1.5 font-medium">User</th>
                      <th className="px-2 py-1.5 font-medium">Session</th>
                      <th className="px-2 py-1.5 font-medium">Status</th>
                      <th className="px-2 py-1.5 font-medium">Age</th>
                      <th className="px-2 py-1.5 font-medium">Safe error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityData.railVisibility.walletReadiness.map((r) => (
                      <tr
                        key={r.operationId}
                        className="border-b border-neutral-50 last:border-0"
                      >
                        <td className="px-2 py-1.5 font-mono text-[11px]">
                          {r.spendRail}
                        </td>
                        <td className="px-2 py-1.5">{r.networkLabel}</td>
                        <td className="px-2 py-1.5 font-mono text-[11px]">
                          {shortenAddr(r.userId)}
                        </td>
                        <td className="px-2 py-1.5 font-mono text-[11px]">
                          {shortenAddr(r.spendSessionId)}
                        </td>
                        <td className="px-2 py-1.5">{r.status}</td>
                        <td className="px-2 py-1.5 tabular-nums text-neutral-600">
                          {formatAgeFromIso(r.createdAt)}
                        </td>
                        <td className="max-w-[200px] truncate px-2 py-1.5 text-neutral-700">
                          {r.safeErrorSummary ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activityData.railVisibility.conversionsInFlight.length > 0 && (
            <div className="rounded-lg border border-neutral-200 bg-white">
              <div className="border-b border-neutral-100 px-4 py-2 text-sm font-medium text-neutral-800">
                Conversions (in-flight statuses)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-left text-xs">
                  <thead className="border-b border-neutral-100 bg-neutral-50/80 text-[10px] uppercase text-neutral-500">
                    <tr>
                      <th className="px-2 py-1.5 font-medium">Rail</th>
                      <th className="px-2 py-1.5 font-medium">Network</th>
                      <th className="px-2 py-1.5 font-medium">USDC</th>
                      <th className="px-2 py-1.5 font-medium">User</th>
                      <th className="px-2 py-1.5 font-medium">Session</th>
                      <th className="px-2 py-1.5 font-medium">Status</th>
                      <th className="px-2 py-1.5 font-medium">Age</th>
                      <th className="px-2 py-1.5 font-medium">Safe error</th>
                      <th className="px-2 py-1.5 font-medium">Tx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityData.railVisibility.conversionsInFlight.map(
                      (r) => (
                        <tr
                          key={r.operationId}
                          className="border-b border-neutral-50 last:border-0"
                        >
                          <td className="px-2 py-1.5 font-mono text-[11px]">
                            {r.spendRail}
                          </td>
                          <td className="px-2 py-1.5">{r.networkLabel}</td>
                          <td className="px-2 py-1.5 tabular-nums">
                            {fmtUsdc(r.usdcAmount)}
                          </td>
                          <td className="px-2 py-1.5 font-mono text-[11px]">
                            {shortenAddr(r.userId)}
                          </td>
                          <td className="px-2 py-1.5 font-mono text-[11px]">
                            {shortenAddr(r.spendSessionId)}
                          </td>
                          <td className="px-2 py-1.5">{r.status}</td>
                          <td className="px-2 py-1.5 tabular-nums text-neutral-600">
                            {formatAgeFromIso(r.createdAt)}
                          </td>
                          <td className="max-w-[180px] truncate px-2 py-1.5 text-neutral-700">
                            {r.safeErrorSummary ?? '—'}
                          </td>
                          <td className="px-2 py-1.5">
                            {r.txHash ? (
                              <LedgerTxLink
                                spendRail={r.spendRail}
                                explorerTxUrl={r.explorerTxUrl}
                                txHash={r.txHash}
                                className="text-blue-600 hover:underline"
                              />
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activityData.railVisibility.spendTransactionsInFlight.length > 0 && (
            <div className="rounded-lg border border-neutral-200 bg-white">
              <div className="border-b border-neutral-100 px-4 py-2 text-sm font-medium text-neutral-800">
                Spend transactions (pending / submitted)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-left text-xs">
                  <thead className="border-b border-neutral-100 bg-neutral-50/80 text-[10px] uppercase text-neutral-500">
                    <tr>
                      <th className="px-2 py-1.5 font-medium">Rail</th>
                      <th className="px-2 py-1.5 font-medium">Network</th>
                      <th className="px-2 py-1.5 font-medium">USDC</th>
                      <th className="px-2 py-1.5 font-medium">User</th>
                      <th className="px-2 py-1.5 font-medium">Session</th>
                      <th className="px-2 py-1.5 font-medium">Status</th>
                      <th className="px-2 py-1.5 font-medium">Age</th>
                      <th className="px-2 py-1.5 font-medium">Safe error</th>
                      <th className="px-2 py-1.5 font-medium">Tx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityData.railVisibility.spendTransactionsInFlight.map(
                      (r) => (
                        <tr
                          key={r.operationId}
                          className="border-b border-neutral-50 last:border-0"
                        >
                          <td className="px-2 py-1.5 font-mono text-[11px]">
                            {r.spendRail}
                          </td>
                          <td className="px-2 py-1.5">{r.networkLabel}</td>
                          <td className="px-2 py-1.5 tabular-nums">
                            {fmtUsdc(r.usdcAmount)}
                          </td>
                          <td className="px-2 py-1.5 font-mono text-[11px]">
                            {shortenAddr(r.userId)}
                          </td>
                          <td className="px-2 py-1.5 font-mono text-[11px]">
                            {shortenAddr(r.spendSessionId)}
                          </td>
                          <td className="px-2 py-1.5">{r.status}</td>
                          <td className="px-2 py-1.5 tabular-nums text-neutral-600">
                            {formatAgeFromIso(r.createdAt)}
                          </td>
                          <td className="max-w-[180px] truncate px-2 py-1.5 text-neutral-700">
                            {r.safeErrorSummary ?? '—'}
                          </td>
                          <td className="px-2 py-1.5">
                            {r.txHash ? (
                              <LedgerTxLink
                                spendRail={r.spendRail}
                                explorerTxUrl={r.explorerTxUrl}
                                txHash={r.txHash}
                                className="text-blue-600 hover:underline"
                              />
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activityData.railVisibility.fundedUnpaid.length > 0 && (
            <div className="rounded-lg border border-orange-200 bg-orange-50/40">
              <div className="border-b border-orange-100 px-4 py-2 text-sm font-medium text-orange-950">
                Funded — payment not confirmed (sessions)
              </div>
              <div className="overflow-x-auto bg-white/80">
                <table className="w-full min-w-[960px] text-left text-xs">
                  <thead className="border-b border-orange-100 bg-orange-50/80 text-[10px] uppercase text-orange-900/70">
                    <tr>
                      <th className="px-2 py-1.5 font-medium">Rail</th>
                      <th className="px-2 py-1.5 font-medium">Network</th>
                      <th className="px-2 py-1.5 font-medium">USDC</th>
                      <th className="px-2 py-1.5 font-medium">User</th>
                      <th className="px-2 py-1.5 font-medium">Session</th>
                      <th className="px-2 py-1.5 font-medium">
                        Session status
                      </th>
                      <th className="px-2 py-1.5 font-medium">Pay status</th>
                      <th className="px-2 py-1.5 font-medium">Age (conv.)</th>
                      <th className="px-2 py-1.5 font-medium">Funding tx</th>
                      <th className="px-2 py-1.5 font-medium">Payment tx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityData.railVisibility.fundedUnpaid.map((row) => (
                      <tr
                        key={row.conversion.id}
                        className="border-b border-orange-50/80 last:border-0"
                      >
                        <td className="px-2 py-1.5 font-mono text-[11px]">
                          {row.spendRail}
                        </td>
                        <td className="px-2 py-1.5">{row.networkLabel}</td>
                        <td className="px-2 py-1.5 tabular-nums">
                          {fmtUsdc(row.usdcAmount)}
                        </td>
                        <td className="px-2 py-1.5 font-mono text-[11px]">
                          {shortenAddr(row.userId)}
                        </td>
                        <td className="px-2 py-1.5 font-mono text-[11px]">
                          {shortenAddr(row.spendSessionId)}
                        </td>
                        <td className="px-2 py-1.5">
                          {row.sessionStatus
                            ? row.sessionStatus.replace(/_/g, ' ')
                            : '—'}
                        </td>
                        <td className="px-2 py-1.5">
                          {row.payment?.status ?? '—'}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums text-neutral-600">
                          {formatAgeFromIso(row.conversion.createdAt)}
                        </td>
                        <td className="px-2 py-1.5">
                          {row.conversion.fundingTxHash ? (
                            <LedgerTxLink
                              spendRail={row.spendRail}
                              explorerTxUrl={row.conversion.explorerTxUrl}
                              txHash={row.conversion.fundingTxHash}
                              className="text-blue-600 hover:underline"
                            />
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          {row.payment?.paymentTxHash ? (
                            <LedgerTxLink
                              spendRail={row.spendRail}
                              explorerTxUrl={row.payment.explorerTxUrl}
                              txHash={row.payment.paymentTxHash}
                              className="text-blue-600 hover:underline"
                            />
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {activityData &&
        (activityData.failedConversions.length > 0 ||
          activityData.failedPayments.length > 0) && (
          <section className="mb-8 rounded-lg border border-red-200 bg-red-50/80 p-5">
            <h2 className="text-lg font-semibold text-red-900">
              Failed transactions
            </h2>
            <p className="mt-1 text-sm text-red-800/90">
              Reasons are truncated server-side; use the explorer links for
              chain detail.
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
                            <LedgerTxLink
                              spendRail={c.spend_rail}
                              explorerTxUrl={c.explorer_tx_url}
                              txHash={c.funding_tx_hash}
                            />
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
                            <LedgerTxLink
                              spendRail={p.spend_rail}
                              explorerTxUrl={p.explorer_tx_url}
                              txHash={p.payment_tx_hash}
                            />
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
