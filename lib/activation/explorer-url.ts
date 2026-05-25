import type { SponsoredActivationRow } from '@/lib/db/sponsored-activations';
import type { SettlementExplorerRail } from '@/lib/spend-rail-config';
import {
  formatSettlementWalletExplorerUrl,
  getSettlementExplorerTxUrlTemplate,
} from '@/lib/spend-rail-config';

export { formatSettlementExplorerTxUrl } from '@/lib/spend-rail-config';

export type SponsoredActivationExplorerPack = {
  campaign_wallet_explorer_url: string | null;
  venue_settlement_wallet_explorer_url: string | null;
  settlement_explorer_tx_url_template: string;
};

export function sponsoredActivationExplorerPack(
  row: Pick<
    SponsoredActivationRow,
    | 'settlement_rail'
    | 'campaign_wallet_address'
    | 'venue_settlement_wallet_address'
  >
): SponsoredActivationExplorerPack {
  const rail = row.settlement_rail as SettlementExplorerRail;
  return {
    campaign_wallet_explorer_url: formatSettlementWalletExplorerUrl(
      rail,
      row.campaign_wallet_address
    ),
    venue_settlement_wallet_explorer_url: formatSettlementWalletExplorerUrl(
      rail,
      row.venue_settlement_wallet_address
    ),
    settlement_explorer_tx_url_template:
      getSettlementExplorerTxUrlTemplate(rail),
  };
}

export function sponsoredActivationAdminEnvelope(
  row: SponsoredActivationRow
): SponsoredActivationRow & SponsoredActivationExplorerPack {
  return { ...row, ...sponsoredActivationExplorerPack(row) };
}
