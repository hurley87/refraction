import { ExternalLink } from 'lucide-react';
import type { SponsoredActivationConfirmedSettlementRow } from '@/lib/db/sponsored-activation-admin';
import type { SettlementRail } from '@/lib/db/sponsored-activations';

export function fmtUsdc(
  n: number | null | undefined,
  tokenSymbol: string
): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const rounded = Math.round(n * 1e6) / 1e6;
  return `${rounded.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })} ${tokenSymbol}`;
}

export function fmtLocalDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export function SettlementExplorerTxLink({
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
      title={txHash}
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

/**
 * Post-event report header for Solana activations. The dedicated campaign
 * wallet's Solscan page is the complete public history for the event; the
 * confirmed settlements table remains the in-app per-transaction view.
 */
export function OnchainSettlementReport({
  activation,
  tokenSymbol,
}: {
  activation: {
    settlement_rail: SettlementRail;
    campaign_wallet_address: string;
    campaign_wallet_explorer_url: string | null;
  };
  tokenSymbol: string;
}) {
  if (activation.settlement_rail !== 'solana') return null;

  return (
    <section
      aria-labelledby="onchain-settlement-report-heading"
      className="mb-8 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
    >
      <h2
        id="onchain-settlement-report-heading"
        className="text-lg font-semibold text-neutral-900 dark:text-neutral-100"
      >
        Onchain settlement report
      </h2>
      <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-[auto_auto_1fr] sm:gap-x-8">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Network
          </dt>
          <dd className="font-semibold text-neutral-900 dark:text-neutral-100">
            Solana
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Asset
          </dt>
          <dd className="font-semibold text-neutral-900 dark:text-neutral-100">
            {tokenSymbol}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Dedicated campaign wallet
          </dt>
          <dd className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="break-all font-mono text-xs text-neutral-800 dark:text-neutral-200">
              {activation.campaign_wallet_address}
            </span>
            {activation.campaign_wallet_explorer_url && (
              <a
                href={activation.campaign_wallet_explorer_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
              >
                View all on Solscan
                <ExternalLink className="size-3.5" />
              </a>
            )}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-neutral-500">
        The campaign wallet&apos;s Solscan page is the complete public history
        for this event. Confirmed settlements below link to each {tokenSymbol}{' '}
        transfer.
      </p>
    </section>
  );
}

export function ConfirmedSettlementsTable({
  rows,
  tokenSymbol,
}: {
  rows: SponsoredActivationConfirmedSettlementRow[];
  tokenSymbol: string;
}) {
  return (
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
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-6 text-center text-neutral-500"
                >
                  No confirmed settlements yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"
                >
                  <td className="px-3 py-2 text-xs text-neutral-700 dark:text-neutral-300">
                    {fmtLocalDateTime(row.confirmedAt)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {fmtUsdc(row.amount, tokenSymbol)}
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
  );
}
