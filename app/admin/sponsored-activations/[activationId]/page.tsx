'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';
import { adminApiAuthHeaders } from '@/lib/admin-api-auth-headers';
import { readApiErrorMessage } from '@/lib/admin/read-api-error-message';
import { Loader2, ArrowLeft, ExternalLink, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { initMixpanel, trackEvent } from '@/lib/analytics';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import type {
  SponsoredActivationAdminRedemptionRow,
  SponsoredActivationAdminTiles,
  SponsoredActivationConfirmedSettlementRow,
  SponsoredActivationPendingSettlementRow,
} from '@/lib/db/sponsored-activation-admin';
import type {
  SettlementRail,
  SponsoredActivationStatus,
} from '@/lib/db/sponsored-activations';

type ActivationEnvelope = {
  id: string;
  title: string;
  status: SponsoredActivationStatus;
  settlement_rail: SettlementRail;
  max_usdc_budget: number | null;
  max_redemptions: number | null;
};

type DashboardApiResponse = {
  activation: ActivationEnvelope;
  tiles: SponsoredActivationAdminTiles;
  confirmedSettlements: SponsoredActivationConfirmedSettlementRow[];
  pendingSettlements: SponsoredActivationPendingSettlementRow[];
  redemptions: SponsoredActivationAdminRedemptionRow[];
};

function formatIfNumber(
  n: number | null | undefined,
  format: (v: number) => string
): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return format(n);
}

function fmtUsdc(n: number | null | undefined): string {
  return formatIfNumber(n, (v) => {
    const rounded = Math.round(v * 1e6) / 1e6;
    return `$${rounded.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    })}`;
  });
}

function fmtInt(n: number | null | undefined): string {
  return formatIfNumber(n, (v) => v.toLocaleString());
}

function fmtLocalDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function statusBadgeClass(status: ActivationEnvelope['status']): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200';
    case 'paused':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200';
    case 'ended':
      return 'bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200';
    default:
      return 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200';
  }
}

function SettlementExplorerTxLink({
  explorerTxUrl,
  txHash,
  variant,
}: {
  explorerTxUrl: string | null;
  txHash: string | null;
  variant: 'compact' | 'full';
}) {
  if (!txHash?.trim()) {
    return <span className="text-neutral-400">—</span>;
  }
  if (!explorerTxUrl?.trim()) {
    return (
      <span className="break-all font-mono text-[11px] text-neutral-700 dark:text-neutral-300">
        {txHash}
      </span>
    );
  }
  const label = variant === 'compact' ? `${txHash.slice(0, 10)}…` : txHash;
  return (
    <a
      href={explorerTxUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={
        variant === 'compact'
          ? 'inline-flex items-center gap-0.5 text-blue-700 hover:underline dark:text-blue-400'
          : 'inline-flex flex-wrap items-center gap-0.5 break-all text-blue-700 hover:underline dark:text-blue-400'
      }
    >
      {variant === 'compact' ? (
        <span className="font-mono text-[11px]">{label}</span>
      ) : (
        <span>{label}</span>
      )}
      <ExternalLink className="size-3 shrink-0" />
    </a>
  );
}

export default function AdminSponsoredActivationDetailPage() {
  const params = useParams<{ activationId: string }>();
  const activationId = params.activationId;
  const queryClient = useQueryClient();
  const { user, login, getAccessToken } = usePrivy();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);
  const [selectedRedemptionId, setSelectedRedemptionId] = useState<
    string | null
  >(null);

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
        setAdminLoading(false);
      } else if (user === null) {
        setIsAdmin(false);
        setAdminLoading(false);
      }
    };
    void verify();
  }, [user, checkAdminStatus]);

  const dashboardQueryKey = [
    'admin-sponsored-activation-dashboard',
    activationId,
  ] as const;

  const {
    data: dashboard,
    isLoading,
    error,
  } = useQuery<DashboardApiResponse>({
    queryKey: dashboardQueryKey,
    queryFn: async () => {
      if (!activationId) throw new Error('Missing activation id');
      const auth = await adminApiAuthHeaders(getAccessToken);
      const response = await fetch(
        `/api/admin/sponsored-activations/${encodeURIComponent(activationId)}/dashboard`,
        { headers: auth }
      );
      if (response.status === 404) {
        throw new Error('Activation not found');
      }
      if (!response.ok) throw new Error('Failed to load dashboard');
      const j = (await response.json()) as Record<string, unknown>;
      const payload = j.data as DashboardApiResponse | undefined;
      if (!payload?.activation) throw new Error('Invalid dashboard response');
      return payload;
    },
    enabled: Boolean(activationId && isAdmin && user?.email?.address),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!dashboard?.activation?.id) return;
    const run = async () => {
      const token =
        process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || process.env.MIXPANEL_TOKEN;
      if (token) {
        await initMixpanel(token);
      }
      if (user?.id) {
        trackEvent(
          ANALYTICS_EVENTS.SPONSORED_ACTIVATION_ADMIN_DASHBOARD_VIEWED,
          {
            sponsored_activation_id: dashboard.activation.id,
            settlement_rail: dashboard.activation.settlement_rail,
            user_id: user.id,
          }
        );
      }
    };
    void run();
  }, [
    dashboard?.activation?.id,
    dashboard?.activation?.settlement_rail,
    user?.id,
  ]);

  const retryMutation = useMutation({
    mutationFn: async (settlementId: string) => {
      if (!activationId) throw new Error('Missing activation id');
      const auth = await adminApiAuthHeaders(getAccessToken);
      const response = await fetch(
        `/api/admin/sponsored-activations/${encodeURIComponent(activationId)}/settlements/${encodeURIComponent(settlementId)}/retry`,
        { method: 'POST', headers: auth }
      );
      const body = (await response.json()) as Record<string, unknown>;
      if (!response.ok) {
        throw new Error(
          readApiErrorMessage(body, `Request failed (${response.status})`)
        );
      }
      return body;
    },
    onSuccess: async () => {
      toast.success('Settlement queued for retry');
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Retry failed');
    },
  });

  const selectedRedemption =
    dashboard && selectedRedemptionId
      ? (dashboard.redemptions.find((r) => r.id === selectedRedemptionId) ??
        null)
      : null;

  if (adminLoading || (user && isAdmin === null)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-gray-600">Please log in to access admin.</p>
        <Button onClick={login}>Log In</Button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-red-600">
          Unauthorized: You don&apos;t have admin access.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 pb-24 dark:bg-neutral-950">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <Link
            href="/admin/sponsored-activations"
            className="mb-3 inline-flex items-center gap-1 text-sm text-blue-700 hover:underline dark:text-blue-400"
          >
            <ArrowLeft className="size-4" />
            All activations
          </Link>
          {isLoading && (
            <div className="flex items-center gap-2 text-neutral-500">
              <Loader2 className="size-5 animate-spin" />
              Loading dashboard…
            </div>
          )}
          {error && (
            <p className="text-red-600">
              {error instanceof Error ? error.message : 'Failed to load'}
            </p>
          )}
          {dashboard && (
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-neutral-100">
                {dashboard.activation.title}
              </h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadgeClass(dashboard.activation.status)}`}
              >
                {dashboard.activation.status}
              </span>
            </div>
          )}
        </div>

        {dashboard && (
          <>
            <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Tile
                label="Check-ins verified"
                value={fmtInt(dashboard.tiles.checkInsVerified)}
              />
              <Tile
                label="Redemptions created"
                hint="Not eligible or available"
                value={fmtInt(dashboard.tiles.redemptionsCreated)}
              />
              <Tile
                label="Redemptions confirmed"
                value={fmtInt(dashboard.tiles.redemptionsConfirmed)}
              />
              <Tile
                label="USDC settled"
                value={fmtUsdc(dashboard.tiles.usdcSettledTotal)}
              />
              <Tile
                label="Reserved (inflight + committed)"
                value={fmtUsdc(dashboard.tiles.reservedUsdc)}
              />
              <Tile
                label="Budget remaining"
                hint={
                  dashboard.activation.max_usdc_budget == null
                    ? 'No USDC budget cap'
                    : undefined
                }
                value={
                  dashboard.tiles.budgetRemainingUsdc == null
                    ? '—'
                    : fmtUsdc(dashboard.tiles.budgetRemainingUsdc)
                }
              />
              <Tile
                label="Redemptions remaining"
                hint={
                  dashboard.activation.max_redemptions == null
                    ? 'No redemption cap'
                    : undefined
                }
                value={
                  dashboard.tiles.redemptionsRemaining == null
                    ? '—'
                    : fmtInt(dashboard.tiles.redemptionsRemaining)
                }
              />
              <Tile
                label="Settlement rail"
                value={dashboard.tiles.settlementRail}
              />
            </div>

            <section className="mb-8">
              <h2 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Confirmed settlements
              </h2>
              <p className="mb-2 text-xs text-neutral-500">
                Newest rows first (up to 150, no pagination).
              </p>
              <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-neutral-200 bg-neutral-50 text-xs dark:border-neutral-800 dark:bg-neutral-950">
                    <tr>
                      <th className="px-3 py-2 font-medium">Confirmed</th>
                      <th className="px-3 py-2 font-medium">Amount</th>
                      <th className="px-3 py-2 font-medium">Tx</th>
                      <th className="px-3 py-2 font-medium">Redemption</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.confirmedSettlements.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-3 py-6 text-center text-neutral-500"
                        >
                          No confirmed settlements yet.
                        </td>
                      </tr>
                    ) : (
                      dashboard.confirmedSettlements.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"
                        >
                          <td className="px-3 py-2 text-xs text-neutral-700 dark:text-neutral-300">
                            {fmtLocalDateTime(row.confirmedAt)}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">
                            {fmtUsdc(row.amount)}
                          </td>
                          <td className="px-3 py-2">
                            <SettlementExplorerTxLink
                              explorerTxUrl={row.explorerTxUrl}
                              txHash={row.txHash}
                              variant="compact"
                            />
                          </td>
                          <td className="px-3 py-2 font-mono text-[11px] text-neutral-600 dark:text-neutral-400">
                            {row.redemptionId}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Failed / pending settlements
              </h2>
              <p className="mb-2 text-xs text-neutral-500">
                Queued, submitted, retrying, and failed (excludes not_started).
              </p>
              <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-neutral-200 bg-neutral-50 text-xs dark:border-neutral-800 dark:bg-neutral-950">
                    <tr>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Amount</th>
                      <th className="px-3 py-2 font-medium">Attempts</th>
                      <th className="px-3 py-2 font-medium">Last error</th>
                      <th className="px-3 py-2 font-medium">Redemption</th>
                      <th className="px-3 py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.pendingSettlements.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-6 text-center text-neutral-500"
                        >
                          No pending or failed settlements.
                        </td>
                      </tr>
                    ) : (
                      dashboard.pendingSettlements.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"
                        >
                          <td className="px-3 py-2 text-xs capitalize">
                            {row.status}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">
                            {fmtUsdc(row.amount)}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {row.submissionAttempt}
                          </td>
                          <td className="max-w-[200px] truncate px-3 py-2 text-xs text-red-700 dark:text-red-400">
                            {row.lastErrorCode ?? '—'}
                          </td>
                          <td className="px-3 py-2 font-mono text-[11px] text-neutral-600 dark:text-neutral-400">
                            {row.redemptionId}
                          </td>
                          <td className="px-3 py-2">
                            {row.canManualRetry ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={retryMutation.isPending}
                                onClick={() => retryMutation.mutate(row.id)}
                              >
                                Retry
                              </Button>
                            ) : (
                              <span className="text-xs text-neutral-400">
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Redemptions
              </h2>
              <p className="mb-2 text-xs text-neutral-500">
                Newest rows first (up to 150, no pagination).
              </p>
              <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead className="border-b border-neutral-200 bg-neutral-50 text-xs dark:border-neutral-800 dark:bg-neutral-950">
                    <tr>
                      <th className="px-3 py-2 font-medium">User</th>
                      <th className="px-3 py-2 font-medium">Reward</th>
                      <th className="px-3 py-2 font-medium">Points</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Settlement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.redemptions.map((r) => {
                      const active = selectedRedemptionId === r.id;
                      return (
                        <tr
                          key={r.id}
                          role="button"
                          tabIndex={0}
                          onClick={() =>
                            setSelectedRedemptionId(active ? null : r.id)
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedRedemptionId(active ? null : r.id);
                            }
                          }}
                          className={`cursor-pointer border-b border-neutral-100 last:border-0 dark:border-neutral-800 ${
                            active
                              ? 'bg-blue-50 dark:bg-blue-950/40'
                              : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                          }`}
                        >
                          <td className="px-3 py-2 text-xs">
                            <div className="font-mono text-[11px] text-neutral-600">
                              id {r.userId}
                            </div>
                            <div>{r.username ?? '—'}</div>
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {r.rewardDisplayName}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {r.pointsSpent ?? '—'}
                          </td>
                          <td className="px-3 py-2 text-xs capitalize">
                            {r.status}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {r.settlement?.status ?? '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>

      {selectedRedemption && (
        <>
          <button
            type="button"
            aria-label="Close redemption details"
            className="fixed inset-0 z-40 bg-black/25 dark:bg-black/50"
            onClick={() => setSelectedRedemptionId(null)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-950">
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Redemption drilldown
              </h3>
              <button
                type="button"
                className="rounded p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                onClick={() => setSelectedRedemptionId(null)}
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
              <div>
                <div className="text-xs font-medium text-neutral-500">
                  Player
                </div>
                <div className="font-mono text-xs">
                  id {selectedRedemption.userId}
                </div>
                <div>{selectedRedemption.username ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-neutral-500">
                  Reward
                </div>
                <div>{selectedRedemption.rewardDisplayName}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-neutral-500">
                  Points
                </div>
                <div>{selectedRedemption.pointsSpent ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-neutral-500">
                  Status
                </div>
                <div className="capitalize">{selectedRedemption.status}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-neutral-500">
                  Timeline
                </div>
                <ul className="mt-1 space-y-1 text-xs text-neutral-700 dark:text-neutral-300">
                  <li>
                    Created: {fmtLocalDateTime(selectedRedemption.createdAt)}
                  </li>
                  <li>
                    Purchase confirmed:{' '}
                    {fmtLocalDateTime(selectedRedemption.purchaseConfirmedAt)}
                  </li>
                  <li>
                    Redeemed: {fmtLocalDateTime(selectedRedemption.redeemedAt)}
                  </li>
                  <li>
                    Updated: {fmtLocalDateTime(selectedRedemption.updatedAt)}
                  </li>
                </ul>
              </div>
              <div>
                <div className="text-xs font-medium text-neutral-500">
                  Settlement
                </div>
                {selectedRedemption.settlement ? (
                  <ul className="mt-1 space-y-1 text-xs text-neutral-700 dark:text-neutral-300">
                    <li className="capitalize">
                      Status: {selectedRedemption.settlement.status}
                    </li>
                    <li>
                      Amount: {fmtUsdc(selectedRedemption.settlement.amount)}
                    </li>
                    <li className="break-all">
                      Tx:{' '}
                      <SettlementExplorerTxLink
                        explorerTxUrl={
                          selectedRedemption.settlement.explorerTxUrl
                        }
                        txHash={selectedRedemption.settlement.txHash}
                        variant="full"
                      />
                    </li>
                    <li>
                      Queued:{' '}
                      {fmtLocalDateTime(selectedRedemption.settlement.queuedAt)}
                    </li>
                    <li>
                      Submitted:{' '}
                      {fmtLocalDateTime(
                        selectedRedemption.settlement.submittedAt
                      )}
                    </li>
                    <li>
                      Confirmed:{' '}
                      {fmtLocalDateTime(
                        selectedRedemption.settlement.confirmedAt
                      )}
                    </li>
                    {selectedRedemption.settlement.lastErrorCode && (
                      <li className="text-red-700 dark:text-red-400">
                        Error: {selectedRedemption.settlement.lastErrorCode}
                      </li>
                    )}
                  </ul>
                ) : (
                  <p className="text-xs text-neutral-500">No settlement row.</p>
                )}
              </div>
              <div>
                <div className="text-xs font-medium text-neutral-500">
                  Eligibility
                </div>
                <ul className="mt-1 space-y-1 text-xs text-neutral-700 dark:text-neutral-300">
                  <li>Source: {selectedRedemption.eligibility.source}</li>
                  <li className="break-all">
                    Source ref:{' '}
                    {selectedRedemption.eligibility.sourceRefId ?? '—'}
                  </li>
                  <li>
                    Occurred:{' '}
                    {fmtLocalDateTime(
                      selectedRedemption.eligibility.occurredAt
                    )}
                  </li>
                </ul>
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        {value}
      </div>
      {hint && (
        <div className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
          {hint}
        </div>
      )}
    </div>
  );
}
