import { describe, expect, it } from 'vitest';
import { spendRailDiagnosticsToPublicUnavailableReason } from './spend-rail-availability-public';

describe('spendRailDiagnosticsToPublicUnavailableReason', () => {
  it('returns null when operational', () => {
    expect(
      spendRailDiagnosticsToPublicUnavailableReason({
        operational: true,
        unavailableReasons: [],
      })
    ).toBeNull();
  });

  it('maps disabled rails to a public message', () => {
    expect(
      spendRailDiagnosticsToPublicUnavailableReason({
        operational: false,
        unavailableReasons: [
          'stellar_usdc rail is disabled (SPEND_RAIL_STELLAR_USDC_ENABLED)',
        ],
      })
    ).toBe('This payment network is turned off in platform settings.');
  });

  it('maps missing configuration without echoing env keys', () => {
    const msg = spendRailDiagnosticsToPublicUnavailableReason({
      operational: false,
      unavailableReasons: [
        'SPEND_RAIL_STELLAR_USDC_RECEIVING_ADDRESS is missing',
      ],
    });
    expect(msg).toBe('Required configuration for this network is incomplete.');
    expect(msg).not.toMatch(/SPEND_RAIL/);
  });
});
