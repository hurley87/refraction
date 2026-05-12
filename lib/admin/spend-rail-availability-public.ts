import { getSpendRailOperationalDiagnostics } from '@/lib/spend-rail-config';
import type { SpendRailOperationalDiagnostics } from '@/lib/spend-rail-config/types';
import type { SpendRail } from '@/lib/types';

export type SpendRailAvailabilityClientRow = {
  operational: boolean;
  /** Short admin-facing summary when `operational` is false (no secrets). */
  unavailableReason: string | null;
};

export type SpendRailsAvailabilityClientPayload = {
  rails: Record<SpendRail, SpendRailAvailabilityClientRow>;
};

/**
 * Maps internal diagnostics to browser-safe copy (no env values, keys, or URLs).
 */
export function spendRailDiagnosticsToPublicUnavailableReason(
  diagnostics: SpendRailOperationalDiagnostics
): string | null {
  if (diagnostics.operational) return null;
  const r = diagnostics.unavailableReasons;
  if (r.some((x) => /disabled/i.test(x))) {
    return 'This payment network is turned off in platform settings.';
  }
  if (r.some((x) => /missing/i.test(x))) {
    return 'Required configuration for this network is incomplete.';
  }
  if (r.some((x) => /HORIZON_URL/i.test(x))) {
    return 'The Stellar Horizon URL setting is invalid.';
  }
  if (r.some((x) => /not a valid/i.test(x))) {
    return 'A configured wallet address for this network is invalid.';
  }
  if (r.some((x) => /explorer template/i.test(x))) {
    return 'Transaction explorer settings for this network are misconfigured.';
  }
  if (r.some((x) => /RPC URL/i.test(x))) {
    return 'Base RPC configuration is invalid.';
  }
  return 'This payment network is not operational right now.';
}

export function buildSpendRailsAvailabilityClientPayload(): SpendRailsAvailabilityClientPayload {
  const base = getSpendRailOperationalDiagnostics('base_usdc');
  const stellar = getSpendRailOperationalDiagnostics('stellar_usdc');
  return {
    rails: {
      base_usdc: {
        operational: base.operational,
        unavailableReason: spendRailDiagnosticsToPublicUnavailableReason(base),
      },
      stellar_usdc: {
        operational: stellar.operational,
        unavailableReason:
          spendRailDiagnosticsToPublicUnavailableReason(stellar),
      },
    },
  };
}
