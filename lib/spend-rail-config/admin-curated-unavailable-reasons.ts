/**
 * Maps internal operational diagnostic strings to short, admin-safe copy.
 * Never forwards env var names or signer identifiers to clients.
 */
export function mapSpendRailOperationalReasonToAdminCurated(
  reason: string
): string {
  const s = reason;
  const lower = s.toLowerCase();

  if (lower.includes('base_usdc rail is disabled')) {
    return 'Base USDC is turned off in configuration.';
  }
  if (lower.includes('stellar_usdc rail is disabled')) {
    return 'Stellar USDC is turned off in configuration.';
  }
  if (lower.includes('privy_server_wallet_id')) {
    return 'The backend signing wallet is not configured.';
  }
  if (lower.includes('treasury_wallet_address')) {
    if (lower.includes('missing')) {
      return 'Treasury wallet is not configured.';
    }
    return 'Treasury wallet address is not valid.';
  }
  if (lower.includes('receiving_wallet_address')) {
    if (lower.includes('missing')) {
      return 'Receiving wallet is not configured.';
    }
    return 'Receiving wallet address is not valid.';
  }
  if (lower.includes('stellar_usdc_receiving')) {
    if (lower.includes('missing')) {
      return 'Receiving wallet is not configured.';
    }
    return 'Receiving wallet address is not valid.';
  }
  if (lower.includes('treasury_address') && lower.includes('not a valid')) {
    return 'Treasury wallet address is not valid.';
  }
  if (lower.includes('usdc_contract')) {
    return 'USDC token contract configuration is not valid.';
  }
  if (lower.includes('base') && lower.includes('explorer template')) {
    return 'Block explorer link template for Base is not valid.';
  }
  if (lower.includes('stellar') && lower.includes('explorer template')) {
    return 'Block explorer link template for Stellar is not valid.';
  }
  if (lower.includes('rpc url resolved empty')) {
    return 'Base network RPC endpoint is not configured.';
  }
  if (lower.includes('stellar_network') || lower.includes('stellar network')) {
    return 'Stellar network is not configured.';
  }
  if (lower.includes('horizon_url')) {
    return 'Stellar API endpoint URL is not valid.';
  }

  return 'Additional configuration is required for this payment network.';
}
