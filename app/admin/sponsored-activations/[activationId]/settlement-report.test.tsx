import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { SponsoredActivationConfirmedSettlementRow } from '@/lib/db/sponsored-activation-admin';
import type { SettlementRail } from '@/lib/db/sponsored-activations';
import {
  describeSponsoredActivationPaymentTokenSymbol,
  SPONSORED_ACTIVATION_BASE_TOKENS,
} from '@/lib/schemas/sponsored-activation-tokens';
import {
  formatSettlementExplorerTxUrl,
  formatSettlementWalletExplorerUrl,
} from '@/lib/spend-rail-config';
import {
  ConfirmedSettlementsTable,
  OnchainSettlementReport,
} from './settlement-report';

const SOLANA_CAMPAIGN_WALLET = '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin';
const SOLANA_SIGNATURE =
  '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW';
const SOLANA_REDEMPTION_ID = 'b0c8e1f4-6a2d-4c1e-9f3a-2d5e7b9c1a01';
const SOLANA_CONFIRMED_AT = '2026-09-20T18:30:00.000Z';

const solanaActivation = {
  settlement_rail: 'solana' as const,
  usdc_asset_config: {
    mint: 'CADDmint1111111111111111111111111111111111',
    decimals: 9,
    symbol: 'CADD',
  },
  campaign_wallet_address: SOLANA_CAMPAIGN_WALLET,
  campaign_wallet_explorer_url: formatSettlementWalletExplorerUrl(
    'solana',
    SOLANA_CAMPAIGN_WALLET
  ),
};

function confirmedRow(
  rail: SettlementRail,
  txHash: string,
  overrides: Partial<SponsoredActivationConfirmedSettlementRow> = {}
): SponsoredActivationConfirmedSettlementRow {
  return {
    id: `settlement-${rail}`,
    redemptionId: `redemption-${rail}`,
    amount: 12.5,
    txHash,
    confirmedAt: SOLANA_CONFIRMED_AT,
    explorerTxUrl: formatSettlementExplorerTxUrl(rail, txHash),
    ...overrides,
  };
}

describe('OnchainSettlementReport', () => {
  it('identifies Solana and CADD with the dedicated campaign wallet', () => {
    const tokenSymbol =
      describeSponsoredActivationPaymentTokenSymbol(solanaActivation);
    expect(tokenSymbol).toBe('CADD');

    render(
      <OnchainSettlementReport
        activation={solanaActivation}
        tokenSymbol={tokenSymbol}
      />
    );

    const report = screen.getByRole('region', {
      name: 'Onchain settlement report',
    });
    expect(within(report).getByText('Solana')).toBeInTheDocument();
    expect(within(report).getByText('CADD')).toBeInTheDocument();
    expect(
      within(report).getByText(SOLANA_CAMPAIGN_WALLET)
    ).toBeInTheDocument();
  });

  it('links View all on Solscan to the existing campaign wallet explorer URL', () => {
    const explorerUrl = solanaActivation.campaign_wallet_explorer_url;
    expect(explorerUrl).toBe(
      `https://solscan.io/account/${SOLANA_CAMPAIGN_WALLET}`
    );

    render(
      <OnchainSettlementReport
        activation={solanaActivation}
        tokenSymbol="CADD"
      />
    );

    const link = screen.getByRole('link', { name: /view all on solscan/i });
    expect(link).toHaveAttribute('href', explorerUrl);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('omits the Solscan link when no explorer URL was returned', () => {
    render(
      <OnchainSettlementReport
        activation={{
          ...solanaActivation,
          campaign_wallet_explorer_url: null,
        }}
        tokenSymbol="CADD"
      />
    );

    expect(screen.getByText(SOLANA_CAMPAIGN_WALLET)).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /view all on solscan/i })
    ).not.toBeInTheDocument();
  });

  it.each(['base', 'stellar', 'tempo'] as const)(
    'renders nothing for %s activations',
    (rail) => {
      const { container } = render(
        <OnchainSettlementReport
          activation={{
            settlement_rail: rail,
            campaign_wallet_address:
              '0x1111111111111111111111111111111111111111',
            campaign_wallet_explorer_url: 'https://example.test/address/0x1111',
          }}
          tokenSymbol="USDC"
        />
      );
      expect(container).toBeEmptyDOMElement();
    }
  );
});

describe('ConfirmedSettlementsTable', () => {
  it('renders a confirmed Solana settlement as a CADD transaction report row', () => {
    const row = confirmedRow('solana', SOLANA_SIGNATURE, {
      redemptionId: SOLANA_REDEMPTION_ID,
    });
    expect(row.explorerTxUrl).toBe(`https://solscan.io/tx/${SOLANA_SIGNATURE}`);

    render(<ConfirmedSettlementsTable rows={[row]} tokenSymbol="CADD" />);

    const [, dataRow] = screen.getAllByRole('row');
    const cells = within(dataRow!).getAllByRole('cell');
    expect(cells[0]).toHaveTextContent(
      new Date(SOLANA_CONFIRMED_AT).toLocaleString()
    );
    expect(cells[1]).toHaveTextContent('12.50 CADD');
    expect(cells[3]).toHaveTextContent(SOLANA_REDEMPTION_ID);

    const txLink = within(cells[2]!).getByRole('link');
    expect(txLink).toHaveAttribute('href', row.explorerTxUrl);
    expect(txLink).toHaveAttribute('title', SOLANA_SIGNATURE);
    expect(txLink).toHaveTextContent(`${SOLANA_SIGNATURE.slice(0, 10)}…`);
  });

  it('shows the persisted signature unlinked when no explorer URL exists', () => {
    render(
      <ConfirmedSettlementsTable
        rows={[
          confirmedRow('solana', SOLANA_SIGNATURE, { explorerTxUrl: null }),
        ]}
        tokenSymbol="CADD"
      />
    );

    expect(screen.getByText(SOLANA_SIGNATURE)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('keeps the empty state', () => {
    render(<ConfirmedSettlementsTable rows={[]} tokenSymbol="CADD" />);
    expect(
      screen.getByText('No confirmed settlements yet.')
    ).toBeInTheDocument();
  });

  it.each([
    {
      rail: 'base' as const,
      config: {
        config: {
          contract_address:
            SPONSORED_ACTIVATION_BASE_TOKENS.USDC.contract_address,
        },
      },
      txHash: `0x${'a'.repeat(64)}`,
      symbol: 'USDC',
    },
    {
      rail: 'stellar' as const,
      config: { asset_code: 'USDC' },
      txHash: 'b'.repeat(64),
      symbol: 'USDC',
    },
    {
      rail: 'tempo' as const,
      config: { symbol: 'CADD' },
      txHash: `0x${'c'.repeat(64)}`,
      symbol: 'CADD',
    },
  ])(
    'labels $rail confirmed settlements in $symbol with the rail explorer link',
    ({ rail, config, txHash, symbol }) => {
      const tokenSymbol = describeSponsoredActivationPaymentTokenSymbol({
        settlement_rail: rail,
        usdc_asset_config: config,
      });
      expect(tokenSymbol).toBe(symbol);
      const row = confirmedRow(rail, txHash);

      render(
        <ConfirmedSettlementsTable rows={[row]} tokenSymbol={tokenSymbol} />
      );

      expect(screen.getByText(`12.50 ${symbol}`)).toBeInTheDocument();
      expect(screen.getByText(row.redemptionId)).toBeInTheDocument();
      const txLink = screen.getByRole('link');
      expect(txLink).toHaveAttribute('href', row.explorerTxUrl);
      expect(txLink.getAttribute('href')).not.toContain('solscan');
    }
  );
});
