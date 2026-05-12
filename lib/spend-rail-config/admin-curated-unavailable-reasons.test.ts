import { describe, it, expect } from 'vitest';
import { mapSpendRailOperationalReasonToAdminCurated } from '@/lib/spend-rail-config/admin-curated-unavailable-reasons';

describe('mapSpendRailOperationalReasonToAdminCurated', () => {
  it('maps Privy server wallet diagnostic without exposing secrets in output', () => {
    const out = mapSpendRailOperationalReasonToAdminCurated(
      'SPEND_RAIL_BASE_USDC_PRIVY_SERVER_WALLET_ID is missing'
    );
    expect(out).toMatch(/signing wallet/i);
    expect(out.toLowerCase()).not.toContain('privy');
  });

  it('maps disabled rails', () => {
    expect(
      mapSpendRailOperationalReasonToAdminCurated(
        'base_usdc rail is disabled (SPEND_RAIL_BASE_USDC_ENABLED)'
      )
    ).toContain('Base USDC');
    expect(
      mapSpendRailOperationalReasonToAdminCurated(
        'stellar_usdc rail is disabled (SPEND_RAIL_STELLAR_USDC_ENABLED)'
      )
    ).toContain('Stellar USDC');
  });
});
