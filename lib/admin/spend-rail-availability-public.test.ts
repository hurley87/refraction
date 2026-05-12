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

  it('maps invalid Stellar Horizon URL diagnostics to the Horizon message, not wallet copy', () => {
    expect(
      spendRailDiagnosticsToPublicUnavailableReason({
        operational: false,
        unavailableReasons: [
          'NEXT_PUBLIC_STELLAR_HORIZON_URL is not a valid URL',
        ],
      })
    ).toBe('The Stellar Horizon URL setting is invalid.');
  });

  it('maps invalid Stellar public key diagnostics to the wallet message', () => {
    expect(
      spendRailDiagnosticsToPublicUnavailableReason({
        operational: false,
        unavailableReasons: [
          'SPEND_RAIL_STELLAR_USDC_RECEIVING_ADDRESS is not a valid Stellar public key',
        ],
      })
    ).toBe('A configured wallet address for this network is invalid.');
  });
});
